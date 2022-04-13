// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20Snapshot.sol";
import "./AuthorizableNoOperator.sol";
import "./interfaces/IERC20Lockable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./interfaces/ITheoretics.sol";
import "./utils/ContractGuard.sol";

contract Master is ERC20Snapshot, AuthorizableNoOperator, ContractGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20Lockable;
    using SafeERC20 for IERC20;


    struct UserInfo
    {
        uint256 lockToTime;
        uint256 chosenLockTime;
        address approveTransferFrom;
        uint256 lastTotalGameClaimed;
    }

    mapping(address => UserInfo) public userInfo;
    uint256 public totalGameClaimed;
    IERC20Lockable public theory;
    IERC20Lockable public game;
    ITheoretics public theoretics;
    address public communityFund;
    uint256 public minLockTime;

    uint256 public extraTheoryAdded;

    event RewardPaid(address indexed user, uint256 reward, uint256 lockAmount);
    event Deposit(address indexed user, uint256 amountInTheory, uint256 amountOutMaster);
    event Withdraw(address indexed user, uint256 amountInMaster, uint256 amountOutTheory);

    //Permissions needed: game (Game)
    constructor(IERC20Lockable _theory,
                IERC20Lockable _game,
                ITheoretics _theoretics,
                address _communityFund) public ERC20("Master Token", "MASTER") {
        theory = _theory;
        game = _game;
        theoretics = _theoretics;
        communityFund = _communityFund;
        minLockTime = 365 days;
    }

    //TODO: Administrative setters for every variable.


    //For THEORY -> MASTER (forked from https://github.com/DefiKingdoms/contracts/blob/main/contracts/Bank.sol)
    function theoryToMaster(uint256 _amount) public view returns (uint256)
    {
        // Gets the amount of GovernanceToken locked in the contract
        uint256 totalGovernanceToken = theoretics.balanceOf(address(this)); //TODO: add theory.balanceOf, because of the new epoch system.
        // Gets the amount of xGovernanceToken in existence
        uint256 totalShares = totalSupply();
        // If no xGovernanceToken exists, it is 1:1
        if (totalShares == 0 || totalGovernanceToken == 0) {
            return _amount;
        }
        // Calculates the amount of xGovernanceToken the GovernanceToken is worth. The ratio will change overtime, as xGovernanceToken is burned/minted and GovernanceToken deposited + gained from fees / withdrawn.
        uint256 what = _amount.mul(totalShares).div(totalGovernanceToken);
        return what;
    }

    //For MASTER -> THEORY (forked from https://github.com/DefiKingdoms/contracts/blob/main/contracts/Bank.sol)
    function masterToTheory(uint256 _share) public view returns (uint256)
    {
        // Gets the amount of GovernanceToken locked in the contract
        uint256 totalGovernanceToken = theoretics.balanceOf(address(this)); //TODO: add theory.balanceOf, because of the new epoch system.
        // Gets the amount of xGovernanceToken in existence
        uint256 totalShares = totalSupply();
        // If no xGovernanceToken exists, it is 1:1
        if (totalShares == 0 || totalGovernanceToken == 0) {
            return _share;
        }
        // Calculates the amount of GovernanceToken the xGovernanceToken is worth
        uint256 what = _share.mul(totalGovernanceToken).div(totalShares);
        return what;
    }

    function _lock(address user, uint256 lockTo) internal
    {
        userInfo[user].lockToTime = lockTo;
    }

    function lockAndTransferFrom(address from, address to, uint256 amount, uint256 lockTo, bool lockAfter) public onlyAuthorized onlyOneBlock returns (bool)
    {
        bool result = false;
        if(!lockAfter) _lock(to, lockTo);

        if(from == msg.sender) result = transfer(to, amount);
        else result = transferFrom(from, to, amount);

        if(lockAfter) _lock(to, lockTo);

        return result;
    }

    function _transfer(address from, address to, uint256 amount) internal virtual override {
        if(!(authorized[msg.sender] || owner() == msg.sender || authorized[to] || owner() == to))
        {
            UserInfo storage user = userInfo[to];
            require(user.approveTransferFrom == from, "Receiver did not approve transfer.");
            user.approveTransferFrom = address(0);
            uint256 nextTime = block.timestamp.add(minLockTime);
            if(nextTime > user.lockToTime) _lock(to, nextTime);
        }
        super._transfer(from, to, amount);

    }

    function buyFromTheory(uint256 amountInTheory, uint256 lockTime) public onlyOneBlock
    {
        require(amountInTheory > 0, "No zero amount allowed.");

        //Lock
        if(lockTime < minLockTime) lockTime = minLockTime;
        //Just in case we want bonuses/airdrops for those who lock longer. This would have to be done outside of this contract, as it provides no bonuses by itself.
        uint256 nextTime = block.timestamp.add(lockTime);
        UserInfo storage user = userInfo[msg.sender];
        user.chosenLockTime = lockTime;
        if(nextTime > user.lockToTime) _lock(msg.sender, nextTime);

        //Mint
        uint256 what = theoryToMaster(amountInTheory);
        _mint(msg.sender, what);
        theory.safeTransferFrom(msg.sender, address(this), amountInTheory);
        theoretics.stake(amountInTheory);

        emit Deposit(msg.sender, amountInTheory, what);
    }

    function _claimGame(uint256 withdrawAmount) internal
    {
        //Unlock all LGAME, transfer GAME, then relock at normal rate.
        uint256 initialBalance = game.totalBalanceOf(address(this));
        //uint256 _withdrawLockupEpochs = theoretics.withdrawLockupEpochs();
        //uint256 _rewardLockupEpochs = theoretics.rewardLockupEpochs();
        //uint256 _pegMaxUnlock = theoretics.pegMaxUnlock();
        //theoretics.setLockUp(0, 0, _pegMaxUnlock); //Can't use these because of onlyOneBlock.

        //We may have had a saving grace: But we do have a saving grace: farm.getLockPercentage(). If that is at 95%, then we have 0 lockups.
        //But I was TOO anal about security: The function returns 0 after the pool ends, no matter what.

        //TODO: Instead, we must limit claiming and staking to every getCurrentWithdrawEpochs() epochs with a window of 5 hours and 30 minutes.
        //TODO: Instead of withdrawing/claiming from theoretics here, we store withdraw requests and withdraw the full amount for everybody at once after 5 hours and 30 minutes.
        //TODO: If there are no withdraw requests, just claim and stake instead of withdrawing and staking. If there are no claim/withdraw requests, just stake. If there are no stake requests, fail the function.
        //TODO: The user can then come back at any time after to receive their withdraw/claim.
        //TODO: If getCurrentWithdrawEpochs() is 0, just call the initiator function immediately.

        //TODO: If you claim GAME after your lock time is over, you are locked up for 30 more days.
        if(withdrawAmount == 0) theoretics.claimReward();
        else theoretics.withdraw(withdrawAmount);
        //theoretics.setLockUp(_withdrawLockupEpochs, _rewardLockupEpochs, _pegMaxUnlock);
        //Unlock
        game.unlockForUser(address(this), game.lockOf(address(this)));
        uint256 newBalance = game.totalBalanceOf(address(this));
        uint256 newGameClaimed = newBalance.sub(initialBalance);

        //Calculate amount to earn
        totalGameClaimed = totalGameClaimed.add(newGameClaimed);
        //Act as if everyone has claimed when you did so that you don't get the full pool if you have already claimed, only newly added GAME.
        UserInfo storage user = userInfo[msg.sender];
        uint256 totalEarned = totalGameClaimed.sub(user.lastTotalGameClaimed);
        user.lastTotalGameClaimed = totalGameClaimed;

        //Get percentage to transfer
        uint256 percentage = balanceOf(msg.sender).mul(1 ether).div(totalSupply());
        //Get amount to transfer
        uint256 reward = totalEarned.mul(percentage).div(1 ether);
        //Transfer
        game.transfer(msg.sender, reward);
        //Relock according to usual lock amount.
        uint256 lockAmount = 0;
        uint256 lockPercentage = theoretics.getLockPercentage();
        require(lockPercentage <= 100, "Invalid lock percentage, check Theoretics contract.");
        lockAmount = reward.mul(lockPercentage).div(100);
        if(lockAmount > 0) game.lock(msg.sender, lockAmount);
        emit RewardPaid(msg.sender, reward, lockAmount);
    }

    function sellToTheory(uint256 amountInMaster, bool emergency) public onlyOneBlock
    {
        require(block.timestamp >= userInfo[msg.sender].lockToTime, "Still locked!");
        require(amountInMaster > 0, "No zero amount allowed.");

        //Burn
        uint256 what = masterToTheory(amountInMaster);
        _burn(msg.sender, amountInMaster); //This will handle exceeded balance.

        uint256 initialBalance = theory.balanceOf(address(this));

        _claimGame(what);

        uint256 newBalance = theory.balanceOf(address(this));
        uint256 whatAfterWithdrawFee = newBalance.sub(initialBalance);

        if(!emergency)
        {
            //Transfer what we are really owed. Deny any withdraw fees.
            uint256 withdrawFee = what.sub(whatAfterWithdrawFee);
            //Could also send withdrawFee + whatAfterWithdrawFee straight to user.
            if(withdrawFee > 0) theory.safeTransferFrom(communityFund, address(this), withdrawFee); //Send withdraw fee back to us.
            theory.safeTransfer(msg.sender, what); //Send entire amount to user.
            emit Withdraw(msg.sender, amountInMaster, what);
        }
        else
        {
            //Transfer new balance that we just withdrew. Accept any withdraw fees.
            theory.safeTransfer(msg.sender, whatAfterWithdrawFee);
            emit Withdraw(msg.sender, amountInMaster, whatAfterWithdrawFee);
        }
    }

    function claimGame() public onlyOneBlock
    {
        _claimGame(0);
    }

    function transferOtherToken(IERC20 _token, address to, uint256 amount) external onlyAuthorized onlyOneBlock {
        //Required in order move THEORY and other tokens if they get stuck in the contract.
        //User tokens are automatically staked so they cannot be drained this way.
        _token.safeTransfer(to, amount);
    }

    function stakeExternalTheory(uint256 amount) external onlyAuthorized onlyOneBlock {  //TODO: Request stake instead of stake. Keep track of THEORY that was recently requested to stake.
        extraTheoryAdded = extraTheoryAdded.add(amount);
        theoretics.stake(amount);
    }

    function withdrawExternalTheory(uint256 amount) external onlyAuthorized onlyOneBlock { //TODO: Change this function to request withdrawal.
        //This doesn't prevent all damage to people who got in after 1.0x, but it prevents a full withdrawal.
        require(amount >= extraTheoryAdded, "Can't withdraw past 1.0x.");
        extraTheoryAdded = extraTheoryAdded.sub(amount);
        uint256 initialBalance = theory.balanceOf(address(this));
        theoretics.withdraw(amount);
        uint256 newBalance = theory.balanceOf(address(this));
        theory.safeTransfer(communityFund, newBalance.sub(initialBalance)); //No worries about withdraw fees if we send straight to community fund.
    }
}
