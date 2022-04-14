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
        uint256 withdrawRequested;
        uint256 lastStakeRequestBlock;
        uint256 lastWithdrawRequestBlock;
    }

    mapping(address => UserInfo) public userInfo;
    uint256 public totalGameClaimed;
    IERC20Lockable public theory;
    IERC20Lockable public game;
    ITheoretics public theoretics;
    address public communityFund;
    uint256 public minLockTime;
    uint256 public unlockedClaimPenalty;

    uint256 public extraTheoryAdded;
    uint256 public extraTheoryStakeRequested;
    uint256 public extraTheoryWithdrawRequested;

    uint256 totalStakeRequested;
    uint256 totalWithdrawRequested;
    uint256 totalWithdrawUnclaimed;
    uint256 totalMasterUnclaimed;
    uint256 lastInitiatePart1Epoch;
    uint256 lastInitiatePart2Epoch;
    uint256 lastInitiatePart1Block;
    uint256 lastInitiatePart2Block;
    uint256 totalGovernanceTokenAtWithdraw;
    uint256 totalSharesAtWithdraw;


    event RewardPaid(address indexed user, uint256 reward, uint256 lockAmount);
    event Deposit(address indexed user, uint256 amountInTheory, uint256 amountOutMaster);
    event Withdraw(address indexed user, uint256 amountInMaster, uint256 amountOutTheory);
    event WithdrawRequest(address indexed user, uint256 amountInMaster);

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
        unlockedClaimPenalty = 30 days;
    }


    //View functions
    //For THEORY -> MASTER (forked from https://github.com/DefiKingdoms/contracts/blob/main/contracts/Bank.sol)
    function theoryToMaster(uint256 _amount) public view returns (uint256)
    {
        // Gets the amount of GovernanceToken locked in the contract
        uint256 totalGovernanceToken = theoretics.balanceOf(address(this)).add(theory.balanceOf(address(this)));
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
        uint256 totalGovernanceToken = theoretics.balanceOf(address(this)).add(theory.balanceOf(address(this)));
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

    //For THEORY -> MASTER (forked from https://github.com/DefiKingdoms/contracts/blob/main/contracts/Bank.sol)
    function theoryToMasterOwed(uint256 _amount, uint256 totalGovernanceToken, uint256 totalShares) public view returns (uint256)
    {
        // If no xGovernanceToken exists, it is 1:1
        if (totalShares == 0 || totalGovernanceToken == 0) {
            return _amount;
        }
        // Calculates the amount of xGovernanceToken the GovernanceToken is worth. The ratio will change overtime, as xGovernanceToken is burned/minted and GovernanceToken deposited + gained from fees / withdrawn.
        uint256 what = _amount.mul(totalShares).div(totalGovernanceToken);
        return what;
    }

    //For MASTER -> THEORY (forked from https://github.com/DefiKingdoms/contracts/blob/main/contracts/Bank.sol)
    function masterToTheoryOwed(uint256 _share, uint256 totalGovernanceToken, uint256 totalShares) public view returns (uint256)
    {
        // If no xGovernanceToken exists, it is 1:1
        if (totalShares == 0 || totalGovernanceToken == 0) {
            return _share;
        }
        // Calculates the amount of GovernanceToken the xGovernanceToken is worth
        uint256 what = _share.mul(totalGovernanceToken).div(totalShares);
        return what;
    }

    //Admin functions
    //TODO: Administrative setters for every variable.
    function lockAndTransferFrom(address from, address to, uint256 amount, uint256 lockTo, bool lockAfter) public onlyAuthorized onlyOneBlock returns (bool)
    {
        bool result = false;
        if(!lockAfter) _lock(to, lockTo);

        if(from == msg.sender) result = transfer(to, amount);
        else result = transferFrom(from, to, amount);

        if(lockAfter) _lock(to, lockTo);

        return result;
    }

    function transferToken(IERC20 _token, address to, uint256 amount) external onlyAuthorized onlyOneBlock {
        //Required in order move THEORY and other tokens if they get stuck in the contract.
        //Some security measures in place for THEORY.
        require(address(_token) != address(this) || amount <= balanceOf(address(this)) - totalMasterUnclaimed);
        require(address(_token) != address(theory) || amount <= theory.balanceOf(address(this)) - (totalStakeRequested.add(totalWithdrawUnclaimed)), "Cannot withdraw pending funds.");
        _token.safeTransfer(to, amount);
    }

    function stakeExternalTheory(uint256 amount) external onlyAuthorized onlyOneBlock {
        require(amount <= theory.balanceOf(address(this)) - (totalStakeRequested.add(totalWithdrawUnclaimed)), "Cannot stake pending funds.");
        if(lastInitiatePart2Epoch == theoretics.epoch() || theoretics.getCurrentWithdrawEpochs() == 0)
        {
            extraTheoryAdded = extraTheoryAdded.add(amount); //Track extra theory that we will stake immediately.
            theoretics.stake(amount); //Stake if we already have staked this epoch or are at 0 withdraw epochs.
        }
        else
        {
            totalStakeRequested = totalStakeRequested.add(amount);
            extraTheoryStakeRequested = extraTheoryStakeRequested.add(amount);
        }
    }

    function withdrawExternalTheory(uint256 amount) external onlyAuthorized onlyOneBlock {
        //This doesn't prevent all damage to people who got in after 1.0x, but it prevents a full withdrawal.
        require(amount >= extraTheoryAdded, "Can't withdraw past 1.0x.");
        extraTheoryAdded = extraTheoryAdded.sub(amount); //Subtract early so we don't go over max amount.
        extraTheoryWithdrawRequested = extraTheoryWithdrawRequested.add(amount);
    }

    //Internal functions
    function _lock(address user, uint256 lockTo) internal
    {
        userInfo[user].lockToTime = lockTo;
    }

    function _transfer(address from, address to, uint256 amount) internal virtual override {
        if(!(authorized[msg.sender] || owner() == msg.sender || communityFund == msg.sender || address(this) == msg.sender || authorized[to] || owner() == to || communityFund == to || address(this) == to))
        {
            UserInfo storage user = userInfo[to];
            require(user.approveTransferFrom == from, "Receiver did not approve transfer.");
            user.approveTransferFrom = address(0);
            uint256 nextTime = block.timestamp.add(minLockTime);
            if(nextTime > user.lockToTime) _lock(to, nextTime);
        }
        super._transfer(from, to, amount);

    }

    //Also counting locked. Get lock percentage from theoretics if you want the ratio.
    function gameAvailableToClaim(address userAddress) public view returns (uint256)
    {
        if(balanceOf(userAddress) == 0) return 0;
        UserInfo storage user = userInfo[userAddress];
        uint256 totalEarned = totalGameClaimed.sub(user.lastTotalGameClaimed);
        if (totalEarned == 0) return 0;
        uint256 supply = totalSupply();
        if (supply == 0) return 0;

        //Get percentage to transfer
        uint256 percentage = balanceOf(msg.sender).mul(1 ether).div(supply);
        //Get amount to transfer
        uint256 reward = totalEarned.mul(percentage).div(1 ether);
        return reward;
    }

    function anyGameAvailableToClaim(address userAddress) public view returns (bool)
    {
        if(balanceOf(userAddress) == 0) return false;
        UserInfo storage user = userInfo[userAddress];
        uint256 totalEarned = totalGameClaimed.sub(user.lastTotalGameClaimed);
        if (totalEarned == 0) return false;
        uint256 supply = totalSupply();
        if (supply == 0) return false;
        return true;
    }

    function _claimGame() internal
    {
        //Act as if everyone has claimed when you did so that you don't get the full pool if you have already claimed, only newly added GAME.
        UserInfo storage user = userInfo[msg.sender];
        uint256 totalEarned = totalGameClaimed.sub(user.lastTotalGameClaimed);
        user.lastTotalGameClaimed = totalGameClaimed;

        //Get percentage to transfer. Include all MASTER that we "own" but have not burned.
        uint256 percentage = (balanceOf(msg.sender).add(user.withdrawRequested)).mul(1 ether).div(totalSupply());
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

    function _initiatePart1() internal
    {
        uint256 withdrawEpochs = theoretics.getCurrentWithdrawEpochs();
        //Every getCurrentWithdrawEpochs() epochs
        require(withdrawEpochs == 0 || theoretics.epoch().mod(withdrawEpochs) == 0, "Must call at a withdraw epoch.");
        //Only in last 30 minutes of the epoch.
        require(withdrawEpochs == 0 || theoretics.nextEpochPoint().sub(block.timestamp) <= 30 minutes, "Must be called 30 minutes before epoch ends.");
        //No calling twice within the epoch.
        require(withdrawEpochs == 0 || lastInitiatePart1Epoch != theoretics.epoch(), "Already called.");
        //Unlock all LGAME, transfer GAME, then relock at normal rate.
        uint256 initialBalance = game.totalBalanceOf(address(this));
        //uint256 _withdrawLockupEpochs = theoretics.withdrawLockupEpochs();
        //uint256 _rewardLockupEpochs = theoretics.rewardLockupEpochs();
        //uint256 _pegMaxUnlock = theoretics.pegMaxUnlock();
        //theoretics.setLockUp(0, 0, _pegMaxUnlock); //Can't use these because of onlyOneBlock.

        //We may have had a saving grace: But we do have a saving grace: farm.getLockPercentage(). If that is at 95%, then we have 0 lockups.
        //But I was TOO anal about security: The function returns 0 after the pool ends, no matter what.

        //Instead, we must limit claiming and staking to every getCurrentWithdrawEpochs() epochs with a window of 5 hours and 30 minutes (you can request at any time, but it will execute once after this window).
        //Instead of withdrawing/claiming from theoretics here, we store withdraw requests and withdraw the full amount for everybody at once after 5 hours and 30 minutes.
        //If there are no withdraw requests, just claim and stake instead of withdrawing and staking. If there are no claim/withdraw requests, just stake. If there are no stake requests, fail the function.
        //The user can then come back at any time after to receive their withdraw/claim.
        //If getCurrentWithdrawEpochs() is 0, just call the initiator function immediately.

        if(totalWithdrawRequested.add(extraTheoryWithdrawRequested) == 0) theoretics.claimReward();
        else
        {
            uint256 initialBalanceTheory = theory.balanceOf(address(this));
            totalGovernanceTokenAtWithdraw = theoretics.balanceOf(address(this)).add(theory.balanceOf(address(this)));
            totalSharesAtWithdraw = totalSupply();
            uint256 what = masterToTheory(totalWithdrawRequested.add(extraTheoryWithdrawRequested));

            theoretics.withdraw(what);
            totalWithdrawRequested = 0;
            totalWithdrawUnclaimed = totalWithdrawUnclaimed.add(what);

            uint256 newBalanceTheory = theory.balanceOf(address(this));
            uint256 whatAfterWithdrawFee = newBalanceTheory.sub(initialBalanceTheory);

            uint256 withdrawFee = what.sub(whatAfterWithdrawFee);
            if(withdrawFee > 0 && theory.allowance(communityFund, address(this)) > 0) theory.safeTransferFrom(communityFund, address(this), withdrawFee); //Send withdraw fee back to us. Don't allow this function to hold up funds.

            if(extraTheoryWithdrawRequested > 0)
            {
                theory.safeTransfer(communityFund, extraTheoryWithdrawRequested);
                extraTheoryWithdrawRequested = 0;
            }
        }
        //theoretics.setLockUp(_withdrawLockupEpochs, _rewardLockupEpochs, _pegMaxUnlock);
        //Unlock
        game.unlockForUser(address(this), game.lockOf(address(this)));
        uint256 newBalance = game.totalBalanceOf(address(this));
        uint256 newGameClaimed = newBalance.sub(initialBalance);

        //Calculate amount to earn
        totalGameClaimed = totalGameClaimed.add(newGameClaimed);

        lastInitiatePart1Epoch = theoretics.epoch();
        lastInitiatePart1Block = block.number;
    }

    function _sellToTheory() internal
    {
        UserInfo storage user = userInfo[msg.sender];
        require(block.timestamp >= user.lockToTime, "Still locked!");
        require(user.withdrawRequested > 0, "No zero amount allowed.");
        require(theoretics.getCurrentWithdrawEpochs() == 0 || lastInitiatePart1Block > user.lastWithdrawRequestBlock, "Initiator Part 1 not yet called or called too soon.");

        //Burn
        uint256 what = masterToTheoryOwed(user.withdrawRequested, totalGovernanceTokenAtWithdraw, totalSharesAtWithdraw);
        //In an emergency, there might be people who fail here.
        //However, there is a balance between user security and protocol security.
        //Keeping it simple to avoid potential exploits.
        //This has already gotten way more complicated due to the epoch system.

        totalWithdrawUnclaimed = totalWithdrawUnclaimed.sub(what);
        totalMasterUnclaimed = totalMasterUnclaimed.sub(user.withdrawRequested);
        if(balanceOf(msg.sender) == 0) _claimGame(); //Get final GAME.
        _burn(address(this), user.withdrawRequested);
        user.withdrawRequested = 0;
        theory.safeTransfer(msg.sender, what);
        emit Withdraw(msg.sender, user.withdrawRequested, what);
    }

    //Public functions
    function buyFromTheory(uint256 amountInTheory, uint256 lockTime) public onlyOneBlock
    {
        require(amountInTheory > 0, "No zero amount allowed.");
        UserInfo storage user = userInfo[msg.sender];
        require(user.withdrawRequested == 0 && lastInitiatePart1Block > user.lastWithdrawRequestBlock, "Cannot stake with a withdraw pending.");

        //Lock
        if(lockTime < minLockTime) lockTime = minLockTime;
        //Just in case we want bonuses/airdrops for those who lock longer. This would have to be done outside of this contract, as it provides no bonuses by itself.
        uint256 nextTime = block.timestamp.add(lockTime);

        user.chosenLockTime = lockTime;
        if(nextTime > user.lockToTime) _lock(msg.sender, nextTime);

        //Mint
        uint256 what = theoryToMaster(amountInTheory);
        _mint(msg.sender, what);
        theory.safeTransferFrom(msg.sender, address(this), amountInTheory);

        if(lastInitiatePart2Epoch == theoretics.epoch() || theoretics.getCurrentWithdrawEpochs() == 0) theoretics.stake(amountInTheory); //Stake if we already have staked this epoch or are at 0 withdraw epochs.
        else
        {
            totalStakeRequested = totalStakeRequested.add(amountInTheory);
        }

        emit Deposit(msg.sender, amountInTheory, what);
    }

    function sellToTheory() public onlyOneBlock
    {
        require(theoretics.getCurrentWithdrawEpochs() != 0, "Call requestSellToTheory instead.");
        _sellToTheory();
    }

    function requestSellToTheory(uint256 amountInMaster) public onlyOneBlock
    {
        UserInfo storage user = userInfo[msg.sender];
        require(block.timestamp >= user.lockToTime, "Still locked!");
        require(amountInMaster > 0, "No zero amount allowed.");
        require(lastInitiatePart2Block > user.lastStakeRequestBlock, "Cannot withdraw with a stake pending.");

        //Add. Since we have to transfer here to avoid transfer exploits, we cannot do a replace.
        _transfer(msg.sender, address(this), amountInMaster); //This will handle exceeded balance.
        user.withdrawRequested = user.withdrawRequested.add(amountInMaster);
        totalWithdrawRequested = totalWithdrawRequested.add(amountInMaster);
        totalMasterUnclaimed = totalMasterUnclaimed.add(amountInMaster);
        user.lastWithdrawRequestBlock = block.number;
        emit WithdrawRequest(msg.sender, amountInMaster);
        if(theoretics.getCurrentWithdrawEpochs() == 0)
        {
            _initiatePart1();
            _sellToTheory();
        }
    }

    function claimGame() public onlyOneBlock
    {
        require(anyGameAvailableToClaim(msg.sender), "No GAME to claim.");
        //If you claim GAME after your lock time is over, you are locked up for 30 more days by default.
        UserInfo storage user = userInfo[msg.sender];
        if(block.timestamp >= user.lockToTime)
        {
            user.lockToTime = block.timestamp.add(unlockedClaimPenalty);
        }
        _claimGame();
    }

    function initiatePart1() public onlyOneBlock
    {
       _initiatePart1();
    }

    function initiatePart2() public onlyOneBlock
    {
        uint256 withdrawEpochs = theoretics.getCurrentWithdrawEpochs();
        //Every getCurrentWithdrawEpochs() epochs
        require(withdrawEpochs == 0 || theoretics.epoch().mod(withdrawEpochs) == 0, "Must call at a withdraw epoch.");
        //Only in last 30 minutes of the epoch.
        require(withdrawEpochs == 0 || theoretics.nextEpochPoint().sub(block.timestamp) <= 30 minutes, "Must be called 30 minutes before epoch ends.");
        //No calling twice within the epoch.
        require(withdrawEpochs == 0 || lastInitiatePart2Epoch != theoretics.epoch(), "Already called.");
        //No calling before part 1.
        require(theoretics.getCurrentWithdrawEpochs() == 0 || lastInitiatePart1Epoch == theoretics.epoch(), "Initiate part 1 first.");
        if(totalStakeRequested > 0)
        {
            theoretics.stake(totalStakeRequested);
            extraTheoryAdded = extraTheoryAdded.add(extraTheoryStakeRequested); //Track extra theory that we have staked.
            extraTheoryStakeRequested = 0;
            totalStakeRequested = 0;
        }
        lastInitiatePart2Epoch = theoretics.epoch();
        lastInitiatePart2Block = block.number;
    }
}
