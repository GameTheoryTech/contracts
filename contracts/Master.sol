// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20Snapshot.sol";
import "./AuthorizableNoOperator.sol";
import "./interfaces/IERC20Lockable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./interfaces/ITheoretics.sol";
import "./utils/ContractGuard.sol";
import "./interfaces/ITreasury.sol";

contract Master is ERC20Snapshot, AuthorizableNoOperator, ContractGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20Lockable;
    using SafeERC20 for IERC20;


    struct UserInfo
    {
        uint256 lockToTime;
        uint256 chosenLockTime;
        address approveTransferFrom;
        uint256 lastSnapshotIndex;
        uint256 rewardEarned;
        uint256 withdrawRequestedInMaster;
        uint256 withdrawRequestedInTheory;
        uint256 lastStakeRequestBlock;
        uint256 lastWithdrawRequestBlock;
    }

    mapping(address => UserInfo) public userInfo;
    IERC20Lockable public theory;
    IERC20Lockable public game;
    ITheoretics public theoretics;
    ITreasury public treasury;
    uint256 public minLockTime;
    uint256 public unlockedClaimPenalty;

    //uint256 public extraTheoryAdded;
    //uint256 public extraTheoryStakeRequested;
    //uint256 public extraTheoryWithdrawRequested;

    uint256 public totalStakeRequestedInTheory;
    uint256 public totalWithdrawRequestedInTheory;
    uint256 public totalWithdrawRequestedInMaster;
    uint256 public totalWithdrawUnclaimedInTheory;
    uint256 public lastInitiatePart1Epoch;
    uint256 public lastInitiatePart2Epoch;
    uint256 public lastInitiatePart1Block;
    uint256 public lastInitiatePart2Block;
    struct MasterSnapshot {
        uint256 time;
        uint256 rewardReceived;
        uint256 rewardPerShare;
    }
    MasterSnapshot[] public masterHistory;


    event RewardPaid(address indexed user, uint256 reward, uint256 lockAmount);
    event Deposit(address indexed user, uint256 amountInTheory, uint256 amountOutMaster);
    event Withdraw(address indexed user, uint256 amountInMaster, uint256 amountOutTheory);
    event WithdrawRequest(address indexed user, uint256 amountInMaster, uint256 amountOutTheory);

    //Permissions needed: game (Game)
    constructor(IERC20Lockable _theory,
                IERC20Lockable _game,
                ITheoretics _theoretics,
                ITreasury _treasury) public ERC20("Master Token", "MASTER") {
        theory = _theory;
        game = _game;
        theoretics = _theoretics;
        treasury = _treasury;
        minLockTime = 365 days;
        unlockedClaimPenalty = 30 days;
        MasterSnapshot memory genesisSnapshot = MasterSnapshot({time : block.number, rewardReceived : 0, rewardPerShare : 0});
        masterHistory.push(genesisSnapshot);
    }


    //View functions
    //For THEORY -> MASTER (forked from https://github.com/DefiKingdoms/contracts/blob/main/contracts/Bank.sol)
    function theoryToMaster(uint256 _amount) public view returns (uint256)
    {
        // Gets the amount of GovernanceToken locked in the contract
        uint256 totalGovernanceToken = theoretics.balanceOf(address(this)).add(totalStakeRequestedInTheory);
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
        uint256 totalGovernanceToken = theoretics.balanceOf(address(this)).add(totalStakeRequestedInTheory);
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

    //Snapshot

    // =========== Snapshot getters

    function latestSnapshotIndex() public view returns (uint256) {
        return masterHistory.length.sub(1);
    }

    function getLatestSnapshot() internal view returns (MasterSnapshot memory) {
        return masterHistory[latestSnapshotIndex()];
    }

    function getLastSnapshotIndexOf(address theorist) public view returns (uint256) {
        return userInfo[theorist].lastSnapshotIndex;
    }

    function getLastSnapshotOf(address theorist) internal view returns (MasterSnapshot memory) {
        return masterHistory[getLastSnapshotIndexOf(theorist)];
    }

    function earned(address theorist) public view returns (uint256) {
        uint256 latestRPS = getLatestSnapshot().rewardPerShare;
        uint256 storedRPS = getLastSnapshotOf(theorist).rewardPerShare;

        return balanceOf(theorist).mul(latestRPS.sub(storedRPS)).div(1e18).add(userInfo[theorist].rewardEarned);
    }

    //Modifiers
    modifier updateReward(address theorist) {
        if (theorist != address(0)) {
            UserInfo memory user = userInfo[theorist];
            user.rewardEarned = earned(theorist);
            user.lastSnapshotIndex = latestSnapshotIndex();
            userInfo[theorist] = user;
        }
        _;
    }

    //Admin functions
    function setTimes(uint256 lockTime, uint256 penalty) external onlyAuthorized
    {
        //Default: 1 year/365 days
        require(lockTime <= 730 days, "Lock time too high."); //730 days/2 years = length from beginning of emissions to full LTHEORY unlock.  No need to be higher than that.
        require(penalty <= lockTime, "Penalty too high."); //No higher than lock time.
        minLockTime = lockTime;
        unlockedClaimPenalty = penalty;
    }

    function transferToken(IERC20 _token, address to, uint256 amount) external onlyAuthorized onlyOneBlock {
        //Required in order move MASTER and other tokens if they get stuck in the contract.
        //Some security measures in place for MASTER and THEORY.
        require(address(_token) != address(this) || amount <= balanceOf(address(this)).sub(totalWithdrawRequestedInMaster));
        //require(address(_token) != address(theory) || amount <= theory.balanceOf(address(this)).sub(totalStakeRequested.add(totalWithdrawUnclaimed)), "Cannot withdraw pending funds."); //To prevent a number of issues that crop up when extra THEORY is removed, this function as been disabled. THEORY sent here is essentially donated to MASTER if staked. Otherwise, it is out of circulation.
        require(address(_token) != address(theory), "Cannot bring down price of MASTER.");
        _token.safeTransfer(to, amount);
    }

    function stakeExternalTheory(uint256 amount) external onlyAuthorized onlyOneBlock {
        require(amount <= theory.balanceOf(address(this)).sub(totalStakeRequestedInTheory.add(totalWithdrawUnclaimedInTheory)), "Cannot stake pending funds.");
        if(lastInitiatePart2Epoch == theoretics.epoch() || theoretics.getCurrentWithdrawEpochs() == 0)
        {
            //extraTheoryAdded = extraTheoryAdded.add(amount); //Track extra theory that we will stake immediately.
            theory.safeApprove(address(theoretics), 0);
            theory.safeApprove(address(theoretics), amount);
            theoretics.stake(amount); //Stake if we already have staked this epoch or are at 0 withdraw epochs.
        }
        else
        {
            totalStakeRequestedInTheory = totalStakeRequestedInTheory.add(amount);
            //extraTheoryStakeRequested = extraTheoryStakeRequested.add(amount);
        }
    }

    //To prevent a number of issues that crop up when extra THEORY is removed, this function as been disabled. THEORY sent here is instead shared amongst the holders.
//    function withdrawExternalTheory(uint256 amount) external onlyAuthorized onlyOneBlock {
//        //This doesn't prevent all damage to people who got in after 1.0x, but it prevents a full withdrawal.
//        require(amount >= extraTheoryAdded, "Can't withdraw past 1.0x.");
//        extraTheoryAdded = extraTheoryAdded.sub(amount); //Subtract early so we don't go over max amount.
//        extraTheoryWithdrawRequested = extraTheoryWithdrawRequested.add(amount);
//    }

    //Internal functions
    function _lock(address user, uint256 lockTo) internal
    {
        userInfo[user].lockToTime = lockTo;
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal updateReward(from) updateReward(to) virtual override {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal virtual override {
        if(!(authorized[msg.sender] || owner() == msg.sender || treasury.daoFund() == msg.sender || address(this) == msg.sender || authorized[to] || owner() == to || treasury.daoFund() == to || address(this) == to))
        {
            UserInfo storage user = userInfo[to];
            require(user.approveTransferFrom == from, "Receiver did not approve transfer.");
            user.approveTransferFrom = address(0);
            uint256 nextTime = block.timestamp.add(minLockTime);
            if(nextTime > user.lockToTime) _lock(to, nextTime);
        }
        super._transfer(from, to, amount);

    }

    function _claimGame() internal
    {
        uint256 reward = userInfo[msg.sender].rewardEarned;
        if (reward > 0) {
            userInfo[msg.sender].rewardEarned = 0;
            game.safeTransfer(msg.sender, reward);
            // GAME can always be locked.
            uint256 lockAmount = 0;
            uint256 lockPercentage = theoretics.getLockPercentage();
            require(lockPercentage <= 100, "Invalid lock percentage, check this contract.");
            lockAmount = reward.mul(lockPercentage).div(100);
            if(lockAmount > 0) game.lock(msg.sender, lockAmount);
            emit RewardPaid(msg.sender, reward, lockAmount);
        }
    }

    function _initiatePart1(bool allowEmergency) internal
    {
        uint256 withdrawEpochs = theoretics.getCurrentWithdrawEpochs();
        //Every getCurrentWithdrawEpochs() epochs
        require(withdrawEpochs == 0 || theoretics.epoch().mod(withdrawEpochs) == 0, "Must call at a withdraw epoch.");
        //Only in last 30 minutes of the epoch.
        require(withdrawEpochs == 0 || block.timestamp > theoretics.nextEpochPoint() || theoretics.nextEpochPoint().sub(block.timestamp) <= 30 minutes, "Must be called at most 30 minutes before epoch ends.");
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

        if(totalWithdrawRequestedInMaster != 0)
        {
            //Burn requested master so price remains the same.
            _burn(address(this), totalWithdrawRequestedInMaster);
            totalWithdrawRequestedInMaster = 0;
        }

        if(totalWithdrawRequestedInTheory
        //.add(extraTheoryWithdrawRequested)
            == 0) theoretics.claimReward();
        else
        {
            uint256 initialBalanceTheory = theory.balanceOf(address(this));

            uint256 what = totalWithdrawRequestedInTheory
            //.add(extraTheoryWithdrawRequested);
            ;
            totalWithdrawRequestedInTheory = 0;

            //Now that I think about it, we could probably do something like this to burn immediately and avoid delayed prices altogether. But it is getting too complicated, and the current system helps MASTER holders anyways.
            if(what > totalStakeRequestedInTheory) //Withdraw > Stake: Only withdraw. We need a bit more to pay our debt.
            {
                what = what.sub(totalStakeRequestedInTheory); //Withdraw less to handle "stake". Reserves (staked amount chilling in the contract) will cover some of our debt (requested withdraws).
                totalStakeRequestedInTheory = 0; //Don't stake in part 2 anymore, as it was already technically "staked" here.
            }
            else //Stake >= Withdraw: Only stake or do nothing. We have enough THEORY in our reserves to support all the withdraws.
            {
                totalStakeRequestedInTheory = totalStakeRequestedInTheory.sub(what); //Stake less to handle "withdraw". Reserves (staked amount chilling in the contract) will cover all of our debt (requested withdraws). Stake the remaining reserves here, if any.
                what = 0; //Don't withdraw in part 1 anymore, it was already "withdrawn" here.
            }

            if(what > 0)
            {
                theoretics.withdraw(what);
                totalWithdrawUnclaimedInTheory = totalWithdrawUnclaimedInTheory.add(what);

                uint256 newBalanceTheory = theory.balanceOf(address(this));
                uint256 whatAfterWithdrawFee = newBalanceTheory.sub(initialBalanceTheory);

                uint256 withdrawFee = what.sub(whatAfterWithdrawFee);
                if(!allowEmergency || withdrawFee > 0 && theory.allowance(treasury.daoFund(), address(this)) >= withdrawFee) theory.safeTransferFrom(treasury.daoFund(), address(this), withdrawFee); //Send withdraw fee back to us. Don't allow this function to hold up funds.

    //            if(extraTheoryWithdrawRequested > 0)
    //            {
    //                theory.safeTransfer(treasury.daoFund(), extraTheoryWithdrawRequested);
    //                extraTheoryWithdrawRequested = 0;
    //            }
            }
            else
            {
                theoretics.claimReward(); //Claim.
            }
        }
        //theoretics.setLockUp(_withdrawLockupEpochs, _rewardLockupEpochs, _pegMaxUnlock);
        //Unlock
        uint256 extraLocked = game.lockOf(address(this)).sub(game.canUnlockAmount(address(this)));
        if(extraLocked > 0)
        {
            game.unlockForUser(address(this), extraLocked);
        }
        uint256 newBalance = game.totalBalanceOf(address(this));
        uint256 amount = newBalance.sub(initialBalance);

        //Calculate amount to earn
        // Create & add new snapshot
        uint256 prevRPS = getLatestSnapshot().rewardPerShare;
        uint256 supply = totalSupply();
        //Nobody earns any GAME if everyone withdraws. If that's the case, all GAME goes to the treasury's daoFund.
        uint256 nextRPS = supply == 0 ? prevRPS : prevRPS.add(amount.mul(1e18).div(supply)); //Otherwise, GAME is distributed amongst those who have not yet burned their MASTER.

        if(supply == 0)
        {
            game.transfer(treasury.daoFund(), amount);
        }

        MasterSnapshot memory newSnapshot = MasterSnapshot({
        time: block.number,
        rewardReceived: amount,
        rewardPerShare: nextRPS
        });
        masterHistory.push(newSnapshot);

        lastInitiatePart1Epoch = theoretics.epoch();
        lastInitiatePart1Block = block.number;
    }

    function _sellToTheory() internal
    {
        UserInfo storage user = userInfo[msg.sender];
        require(block.timestamp >= user.lockToTime, "Still locked!");
        require(user.withdrawRequestedInMaster > 0, "No zero amount allowed.");
        require(theoretics.getCurrentWithdrawEpochs() == 0 || lastInitiatePart1Block > user.lastWithdrawRequestBlock, "Initiator Part 1 not yet called or called too soon.");

        //Burn
        uint256 what = user.withdrawRequestedInTheory;

        totalWithdrawUnclaimedInTheory = totalWithdrawUnclaimedInTheory.sub(what);
        //We already handle burn en-masse
        uint256 amountInMaster = user.withdrawRequestedInMaster;
        user.withdrawRequestedInMaster = 0;
        user.withdrawRequestedInTheory = 0;
        theory.safeTransfer(msg.sender, what);
        emit Withdraw(msg.sender, amountInMaster, what);
    }

    //Public functions
    function buyFromTheory(uint256 amountInTheory, uint256 lockTime) public onlyOneBlock updateReward(msg.sender)
    {
        require(amountInTheory > 0, "No zero amount allowed.");
        UserInfo storage user = userInfo[msg.sender];
        require(user.withdrawRequestedInMaster == 0 && (lastInitiatePart1Block == 0 || lastInitiatePart1Block > user.lastWithdrawRequestBlock), "Cannot stake with a withdraw pending.");

        //Lock
        if(lockTime < minLockTime) lockTime = minLockTime;
        //Just in case we want bonuses/airdrops for those who lock longer. This would have to be done outside of this contract, as it provides no bonuses by itself.
        uint256 nextTime = block.timestamp.add(lockTime);

        user.chosenLockTime = lockTime;
        if(nextTime > user.lockToTime) _lock(msg.sender, nextTime);

        //Mint
        uint256 what = theoryToMaster(amountInTheory);
        theory.safeTransferFrom(msg.sender, address(this), amountInTheory);

        _mint(msg.sender, what); //Don't delay mint, since price has to stay the same or higher (or else withdraws could be borked). Delayed buys could make it go lower.
        if(lastInitiatePart2Epoch == theoretics.epoch() || theoretics.getCurrentWithdrawEpochs() == 0)
        {
            theory.safeApprove(address(theoretics), 0);
            theory.safeApprove(address(theoretics), amountInTheory);
            theoretics.stake(amountInTheory); //Stake if we already have staked this epoch or are at 0 withdraw epochs.
        }
        else
        {
            totalStakeRequestedInTheory = totalStakeRequestedInTheory.add(amountInTheory);
        }

        user.lastStakeRequestBlock = block.number;
        emit Deposit(msg.sender, amountInTheory, what);
    }

    function requestSellToTheory(uint256 amountInMaster, bool allowEmergency) public onlyOneBlock updateReward(msg.sender)
    {
        UserInfo storage user = userInfo[msg.sender];
        require(block.timestamp >= user.lockToTime, "Still locked!");
        require(amountInMaster > 0, "No zero amount allowed.");
        require(lastInitiatePart2Block == 0 || lastInitiatePart2Block > user.lastStakeRequestBlock, "Cannot withdraw with a stake pending.");

        if(amountInMaster == balanceOf(msg.sender)) _claimGame(); //Final GAME claim before moving to THEORY.

        //Add. Since we have to transfer here to avoid transfer exploits, we cannot do a replace.
        _transfer(msg.sender, address(this), amountInMaster); //This will handle exceeded balance.
        user.withdrawRequestedInMaster = user.withdrawRequestedInMaster.add(amountInMaster);
        totalWithdrawRequestedInMaster = totalWithdrawRequestedInMaster.add(amountInMaster);

        //If price increases between now and burn, the extra will be used for future withdrawals, increasing the price further.
        //Price should not be able to decrease between now and burn.
        uint256 what = masterToTheory(amountInMaster);

        user.withdrawRequestedInTheory = user.withdrawRequestedInTheory.add(what);
        totalWithdrawRequestedInTheory = totalWithdrawRequestedInTheory.add(what);

        user.lastWithdrawRequestBlock = block.number;
        emit WithdrawRequest(msg.sender, amountInMaster, what);
        if(theoretics.getCurrentWithdrawEpochs() == 0)
        {
            _initiatePart1(allowEmergency);
            _sellToTheory();
        }
    }

    function sellToTheory() public onlyOneBlock updateReward(msg.sender)
    {
        require(theoretics.getCurrentWithdrawEpochs() != 0, "Call requestSellToTheory instead.");
        _sellToTheory();
    }

    function claimGame() public onlyOneBlock updateReward(msg.sender)
    {
        require(earned(msg.sender) > 0, "No GAME to claim."); //Avoid locking yourself for nothing.
        //If you claim GAME after your lock time is over, you are locked up for 30 more days by default.
        UserInfo storage user = userInfo[msg.sender];
        if(block.timestamp >= user.lockToTime)
        {
            user.lockToTime = block.timestamp.add(unlockedClaimPenalty);
        }
        _claimGame();
    }

    function initiatePart1(bool allowEmergency) public onlyOneBlock
    {
       _initiatePart1(allowEmergency);
    }

    function initiatePart2() public onlyOneBlock
    {
        uint256 withdrawEpochs = theoretics.getCurrentWithdrawEpochs();
        //Every getCurrentWithdrawEpochs() epochs
        require(withdrawEpochs == 0 || theoretics.epoch().mod(withdrawEpochs) == 0, "Must call at a withdraw epoch.");
        //Only in last 30 minutes of the epoch.
        require(withdrawEpochs == 0 || block.timestamp > theoretics.nextEpochPoint() || theoretics.nextEpochPoint().sub(block.timestamp) <= 30 minutes, "Must be called at most 30 minutes before epoch ends.");
        //No calling twice within the epoch.
        require(withdrawEpochs == 0 || lastInitiatePart2Epoch != theoretics.epoch(), "Already called.");
        //No calling before part 1.
        require(withdrawEpochs == 0 || lastInitiatePart1Epoch == theoretics.epoch(), "Initiate part 1 first.");
        if(totalStakeRequestedInTheory > 0)
        {
            theory.safeApprove(address(theoretics), 0);
            theory.safeApprove(address(theoretics), totalStakeRequestedInTheory);
            theoretics.stake(totalStakeRequestedInTheory);
            //extraTheoryAdded = extraTheoryAdded.add(extraTheoryStakeRequested); //Track extra theory that we have staked.
            //extraTheoryStakeRequested = 0;
            totalStakeRequestedInTheory = 0;
        }
        lastInitiatePart2Epoch = theoretics.epoch();
        lastInitiatePart2Block = block.number;
    }

    function approveTransferFrom(address from) public
    {
        userInfo[msg.sender].approveTransferFrom = from;
    }
}
