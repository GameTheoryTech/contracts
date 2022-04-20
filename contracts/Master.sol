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
        uint256 gameLocked;
        uint256 gameLockFrom;
        uint256 gameLastUnlockTime;
    }

    mapping(address => UserInfo) public userInfo;
    IERC20Lockable private theory;
    IERC20Lockable private game;
    ITheoretics private theoretics;
    ITreasury private treasury;
    uint256 public minLockTime;
    uint256 public unlockedClaimPenalty;

    //uint256 public extraTheoryAdded;
    //uint256 public extraTheoryStakeRequested;
    //uint256 public extraTheoryWithdrawRequested;

    uint256 public totalStakeRequestedInTheory;
    uint256 public totalWithdrawRequestedInTheory;
    uint256 public totalWithdrawRequestedInMaster;
    uint256 public totalWithdrawUnclaimedInTheory;
    uint256 public totalGameUnclaimed;
    uint256 private lastInitiatePart1Epoch;
    uint256 private lastInitiatePart2Epoch;
    uint256 private lastInitiatePart1Block;
    uint256 private lastInitiatePart2Block;
    uint256 public totalGameLocked;
    struct MasterSnapshot {
        uint256 time;
        uint256 rewardReceived;
        uint256 rewardPerShare;
    }
    MasterSnapshot[] public masterHistory;
    address[] private whitelistedTokens;
    bool private emergencyUnlock;


    event RewardPaid(address indexed user, uint256 reward, uint256 lockAmount);
    event Deposit(address indexed user, uint256 amountInTheory, uint256 amountOutMaster);
    event Withdraw(address indexed user, uint256 amountInMaster, uint256 amountOutTheory);
    event WithdrawRequest(address indexed user, uint256 amountInMaster, uint256 amountOutTheory);
    event LockGame(address indexed to, uint256 value);
    event UnlockGame(address indexed to, uint256 value);

    //Permissions needed: game (Game)
    constructor(IERC20Lockable _theory,
                IERC20Lockable _game,
                ITheoretics _theoretics,
                ITreasury _treasury,
                address[] memory _whitelist) public ERC20("Master Token", "MASTER") {
        theory = _theory;
        game = _game;
        theoretics = _theoretics;
        treasury = _treasury;
        minLockTime = 365 days;
        unlockedClaimPenalty = 30 days;
        MasterSnapshot memory genesisSnapshot = MasterSnapshot({time : block.number, rewardReceived : 0, rewardPerShare : 0});
        masterHistory.push(genesisSnapshot);
        whitelistedTokens = _whitelist;
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

    function canUnlockAmountGame(address _holder) public view returns (uint256) {
        uint256 lockTime = game.lockTime();
        UserInfo memory user = userInfo[_holder];
        if (block.timestamp <= user.gameLockFrom) {
            return 0;
        } else if (block.timestamp >= user.gameLockFrom.add(lockTime)) {
            return user.gameLocked;
        } else {
            uint256 releaseTime = block.timestamp.sub(user.gameLastUnlockTime);
            uint256 numberLockTime = user.gameLockFrom.add(lockTime).sub(user.gameLastUnlockTime);
            return user.gameLocked.mul(releaseTime).div(numberLockTime);
        }
    }

    function totalCanUnlockAmountGame(address _holder) external view returns (uint256) {
       return game.canUnlockAmount(_holder).add(canUnlockAmountGame(_holder));
    }

    function totalBalanceOfGame(address _holder) external view returns (uint256) {
        return userInfo[_holder].gameLocked.add(game.totalBalanceOf(_holder));
    }

    function lockOfGame(address _holder) external view returns (uint256) {
        return game.lockOf(_holder).add(userInfo[_holder].gameLocked);
    }

    function totalLockGame() external view returns (uint256) {
        return totalGameLocked.add(game.totalLock());
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
    function setAdmin(uint256 lockTime, uint256 penalty, bool emergency) external onlyAuthorized
    {
        //Default: 1 year/365 days
        //Lock time too high.
        require(lockTime <= 730 days, "LT"); //730 days/2 years = length from beginning of emissions to full LTHEORY unlock.  No need to be higher than that.
        //Penalty too high.
        require(penalty <= lockTime, "PT"); //No higher than lock time.
        minLockTime = lockTime;
        unlockedClaimPenalty = penalty;
        emergencyUnlock = emergency;
    }

    function unlockGameForUser(address account, uint256 amount) public onlyAuthorized {
        // First we need to unlock all tokens the address is eligible for.
        uint256 pendingLocked = canUnlockAmountGame(account);
        if (pendingLocked > 0) {
            _unlockGame(account, pendingLocked);
        }

        // Then unlock GAME in the Game contract
        uint256 pendingLockOf = game.lockOf(account); //Lock before
        if (pendingLockOf > game.canUnlockAmount(msg.sender))
        {
            game.unlockForUser(account, 0); //Unlock amount naturally first.
            pendingLockOf = game.lockOf(account);
        }
        if(pendingLockOf > 0)
        {
            game.unlockForUser(account, amount);
            uint256 amountUnlocked = pendingLockOf.sub(game.lockOf(account)); //Lock before - lock after
            if(amount > amountUnlocked) amount = amount.sub(amountUnlocked); //Don't unlock the amount already unlocked
            else amount = 0; // <= 0? = 0
        }

        // Now that that's done, we can unlock the extra amount passed in.
        if(amount > 0 && userInfo[account].gameLocked > 0) _unlockGame(account, amount);
    }

    //Not required as no payable function.
//    function transferFTM(address payable to, uint256 amount) external onlyAuthorized onlyOneBlock
//    {
//        to.transfer(amount);
//    }

    function transferToken(IERC20 _token, address to, uint256 amount) external onlyAuthorized {
        //Required in order move MASTER and other tokens if they get stuck in the contract.
        //Some security measures in place for MASTER and THEORY.
        require(address(_token) != address(this) || amount <= balanceOf(address(this)).sub(totalWithdrawRequestedInMaster), "AF"); //Cannot transfer more than accidental funds.
        //require(address(_token) != address(theory) || amount <= theory.balanceOf(address(this)).sub(totalStakeRequested.add(totalWithdrawUnclaimed)), "Cannot withdraw pending funds."); //To prevent a number of issues that crop up when extra THEORY is removed, this function as been disabled. THEORY sent here is essentially donated to MASTER if staked. Otherwise, it is out of circulation.
        require(address(_token) != address(theory), "MP-"); //Cannot bring down price of MASTER.
        require(address(_token) != address(game) || amount <= game.balanceOf(address(this)).sub(totalGameUnclaimed).sub(totalGameLocked), "AF"); //Cannot transfer more than accidental funds.
        //WHITELIST BEGIN (Initiated in constructor due to contract size limits)
        bool isInList = false;
        uint256 i;
        uint256 len = whitelistedTokens.length;
        for(i = 0; i < len; ++i)
        {
            if(address(_token) == whitelistedTokens[i])
            {
                isInList = true;
                break;
            }
        }
        require(address(_token) == address(this) //MASTER
            || address(_token) == address(game) //GAME
            || isInList, "WL"); //Can only transfer whitelisted tokens.

        //WHITELIST END
        _token.safeTransfer(to, amount);
    }

    function stakeExternalTheory(uint256 amount) external onlyAuthorized onlyOneBlock {
        require(amount <= theory.balanceOf(address(this)).sub(totalStakeRequestedInTheory.add(totalWithdrawUnclaimedInTheory)), "PF"); //Cannot stake pending funds.
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

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal updateReward(from) updateReward(to) virtual override {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal virtual override {
        address daoFund = treasury.daoFund();
        address own = owner();
        UserInfo storage user = userInfo[to];
        if(user.lockToTime == 0 || !(authorized[msg.sender] || own == msg.sender || daoFund == msg.sender || address(this) == msg.sender
        || authorized[from] || own == from || daoFund == from || address(this) == from
        || authorized[to] || own == to || daoFund == to || address(this) == to))
        {
            require(user.lockToTime == 0 || user.approveTransferFrom == from, "Receiver did not approve transfer.");
            user.approveTransferFrom = address(0);
            uint256 nextTime = block.timestamp.add(minLockTime);
            if(nextTime > user.lockToTime) user.lockToTime = nextTime;
        }
        super._transfer(from, to, amount);

    }

    function lockGame(address _holder, uint256 _amount) internal
    {
        UserInfo storage user = userInfo[_holder];
        uint256 amount = canUnlockAmountGame(_holder);

        if(user.gameLocked > 0) _unlockGame(_holder, amount); //Before we lock more, make sure we unlock everything we can, even if noUnlockBeforeTransfer is set.

        uint256 _lockFromTime = block.timestamp;
        user.gameLockFrom = _lockFromTime;

        user.gameLocked = user.gameLocked.add(_amount);
        totalGameLocked = totalGameLocked.add(_amount);
        if (user.gameLastUnlockTime < user.gameLockFrom) {
            user.gameLastUnlockTime = user.gameLockFrom;
        }
        emit LockGame(_holder, _amount);
    }

    function _unlockGame(address holder, uint256 amount) internal {
        UserInfo storage user = userInfo[holder];
        require(user.gameLocked > 0, "ILT"); //Insufficient locked tokens

        // Make sure they aren't trying to unlock more than they have locked.
        if (amount > user.gameLocked) {
            amount = user.gameLocked;
        }

        // If the amount is greater than the total balance, set it to max.
        if (amount > totalGameLocked) {
            amount = totalGameLocked;
        }
        game.safeTransfer(holder, amount);
        user.gameLocked = user.gameLocked.sub(amount);
        user.gameLastUnlockTime = block.timestamp;
        totalGameLocked = totalGameLocked.sub(amount);

        emit UnlockGame(holder, amount);
    }
    function _claimGame() internal
    {
        uint256 reward = userInfo[msg.sender].rewardEarned;
        if (reward > 0) {
            userInfo[msg.sender].rewardEarned = 0;
            totalGameUnclaimed = totalGameUnclaimed.sub(reward);
            // GAME can always be locked.
            uint256 lockAmount = 0;
            uint256 lockPercentage = theoretics.getLockPercentage();
            require(lockPercentage <= 100, "LP"); //Invalid lock percentage, check Theoretics contract.
            lockAmount = reward.mul(lockPercentage).div(100);
            //if(lockAmount > 0) game.lock(msg.sender, lockAmount); //Due to security measures, this won't work. We have to make separate LGAME.
            lockGame(msg.sender, lockAmount);
            game.safeTransfer(msg.sender, reward.sub(lockAmount));
            emit RewardPaid(msg.sender, reward, lockAmount);
        }
    }

    function _initiatePart1(bool allowEmergency) internal
    {
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

                uint256 newBalanceTheory = theory.balanceOf(address(this));
                uint256 whatAfterWithdrawFee = newBalanceTheory.sub(initialBalanceTheory);

                uint256 withdrawFee = what.sub(whatAfterWithdrawFee);
                address daoFund = treasury.daoFund();
                if(!allowEmergency || withdrawFee > 0 && theory.allowance(daoFund, address(this)) >= withdrawFee) theory.safeTransferFrom(daoFund, address(this), withdrawFee); //Send withdraw fee back to us. Don't allow this function to hold up funds.

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
        totalGameUnclaimed = totalGameUnclaimed.add(amount);

        //Calculate amount to earn
        // Create & add new snapshot
        uint256 prevRPS = getLatestSnapshot().rewardPerShare;
        uint256 supply = totalSupply();
        //Nobody earns any GAME if everyone withdraws. If that's the case, all GAME goes to the treasury's daoFund.
        uint256 nextRPS = supply == 0 ? prevRPS : prevRPS.add(amount.mul(1e18).div(supply)); //Otherwise, GAME is distributed amongst those who have not yet burned their MASTER.

        if(supply == 0)
        {
            game.safeTransfer(treasury.daoFund(), amount);
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
        //require(block.timestamp >= user.lockToTime, "Still locked!"); //Allow locked people to withdraw since it no longer counts towards their rewards.
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
        uint256 withdrawEpochs = theoretics.getCurrentWithdrawEpochs();
        require(user.withdrawRequestedInMaster == 0 && (withdrawEpochs == 0 || user.lastWithdrawRequestBlock == 0 || lastInitiatePart1Block > user.lastWithdrawRequestBlock), "Cannot stake with a withdraw pending.");

        //Lock
        if(lockTime < minLockTime) lockTime = minLockTime;
        //Just in case we want bonuses/airdrops for those who lock longer. This would have to be done outside of this contract, as it provides no bonuses by itself.
        uint256 nextTime = block.timestamp.add(lockTime);

        user.chosenLockTime = lockTime;
        if(nextTime > user.lockToTime) user.lockToTime = nextTime;

        //Mint
        uint256 what = theoryToMaster(amountInTheory);
        theory.safeTransferFrom(msg.sender, address(this), amountInTheory);

        _mint(msg.sender, what); //Don't delay mint, since price has to stay the same or higher (or else withdraws could be borked). Delayed buys could make it go lower.
        if(lastInitiatePart2Epoch == theoretics.epoch() || withdrawEpochs == 0)
        {
            address theoreticsAddress = address(theoretics);
            theory.safeApprove(theoreticsAddress, 0);
            theory.safeApprove(theoreticsAddress, amountInTheory);
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
        require(block.timestamp >= user.lockToTime || emergencyUnlock, "Still locked!");
        require(amountInMaster > 0, "No zero amount allowed.");
        uint256 withdrawEpochs = theoretics.getCurrentWithdrawEpochs();
        require(withdrawEpochs == 0 || user.lastStakeRequestBlock == 0 || lastInitiatePart2Block > user.lastStakeRequestBlock, "Cannot withdraw with a stake pending.");

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
        totalWithdrawUnclaimedInTheory = totalWithdrawUnclaimedInTheory.add(what);

        user.lastWithdrawRequestBlock = block.number;
        emit WithdrawRequest(msg.sender, amountInMaster, what);
        if(withdrawEpochs == 0)
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
        uint256 withdrawEpochs = theoretics.getCurrentWithdrawEpochs();
        uint256 nextEpochPoint = theoretics.nextEpochPoint();
        uint256 epoch = theoretics.epoch();
        //Every getCurrentWithdrawEpochs() epochs
        require(withdrawEpochs == 0 || epoch.mod(withdrawEpochs) == 0, "WE"); // Must call at a withdraw epoch.
        //Only in last 30 minutes of the epoch.
        require(block.timestamp > nextEpochPoint || nextEpochPoint.sub(block.timestamp) <= 30 minutes, "30"); //Must be called at most 30 minutes before epoch ends.
        //No calling twice within the epoch.
        require(lastInitiatePart1Epoch != epoch, "AC"); //Already called.
       _initiatePart1(allowEmergency);
    }

    function initiatePart2() public onlyOneBlock
    {
        uint256 withdrawEpochs = theoretics.getCurrentWithdrawEpochs();
        uint256 nextEpochPoint = theoretics.nextEpochPoint();
        uint256 epoch = theoretics.epoch();
        //Every getCurrentWithdrawEpochs() epochs
        require(withdrawEpochs == 0 || epoch.mod(withdrawEpochs) == 0, "WE"); //Must call at a withdraw epoch.
        //Only in last 30 minutes of the epoch.
        require(block.timestamp > nextEpochPoint || nextEpochPoint.sub(block.timestamp) <= 30 minutes, "30"); //Must be called at most 30 minutes before epoch ends.
        //No calling twice within the epoch.
        require(lastInitiatePart2Epoch != epoch, "AC"); //Already called.
        //No calling before part 1.
        require(lastInitiatePart1Epoch == epoch, "IP1"); //Initiate part 1 first.
        if(totalStakeRequestedInTheory > 0)
        {
            address theoreticsAddress = address(theoretics);
            theory.safeApprove(theoreticsAddress, 0);
            theory.safeApprove(theoreticsAddress, totalStakeRequestedInTheory);
            theoretics.stake(totalStakeRequestedInTheory);
            //extraTheoryAdded = extraTheoryAdded.add(extraTheoryStakeRequested); //Track extra theory that we have staked.
            //extraTheoryStakeRequested = 0;
            totalStakeRequestedInTheory = 0;
        }
        lastInitiatePart2Epoch = epoch;
        lastInitiatePart2Block = block.number;
    }

    function approveTransferFrom(address from) public
    {
        userInfo[msg.sender].approveTransferFrom = from;
    }

    function unlockGame() public {
        uint256 amount = canUnlockAmountGame(msg.sender);
        uint256 lockOf = game.lockOf(msg.sender);
        uint256 gameAmount = game.canUnlockAmount(msg.sender);
        UserInfo memory user = userInfo[msg.sender];
        require(user.gameLocked > 0 || lockOf > gameAmount, "ILT"); //Insufficient locked tokens
        if (user.gameLocked > 0) _unlockGame(msg.sender, amount);
        //Unlock GAME in smart contract as well (only if it won't revert), otherwise still have to call unlock() first.
        if (lockOf > gameAmount) game.unlockForUser(msg.sender, 0);
    }
}
