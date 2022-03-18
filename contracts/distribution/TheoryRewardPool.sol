// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../interfaces/IERC20Lockable.sol";
import "../Authorizable.sol";
import "../interfaces/ITreasury.sol";
import "../utils/ContractGuard.sol";

// Note that this pool has no minter key of THEORY (rewards).
// Instead, the governance will call THEORY distributeReward method and send reward to this pool at the beginning.
contract TheoryRewardPool is Authorizable, ContractGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using SafeERC20 for IERC20Lockable;

    // Info of each user.
    struct UserInfo {
        uint256 amount; // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt.
        uint256 rewardDebtAtTime; // The last time that the user has staked.
        uint256 lastDepositBlock;
        uint256 lastWithdrawTime;
        uint256 firstDepositTime;
    }

    // Info of each pool.
    struct PoolInfo {
        IERC20 token; // Address of LP token contract.
        uint256 allocPoint; // How many allocation points assigned to this pool. THEORYs to distribute per block.
        uint256 lastRewardTime; // Last time that THEORYs distribution occurs.
        uint256 accTheoryPerShare; // Accumulated THEORYs per share, times 1e18.
        bool isStarted; // if lastRewardTime has passed
    }

    IERC20Lockable public theory;
    ITreasury public treasury;

    // Info of each pool.
    PoolInfo[] public poolInfo;

    // Info of each user that stakes LP tokens.
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    // Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint = 0;

    // The time when THEORY mining starts.
    uint256 public poolStartTime;

    // The time when THEORY mining ends.
    uint256 public poolEndTime;

    uint256 public baseTheoryPerSecond = 0.0004692175 ether; // Allocation is based on this.
    uint256 public runningTime = 365 days; // 365 days

    uint256 public sameBlockFee;
    uint256[] public feeStagePercentage; //In 10000s for decimal
    uint256[] public feeStageTime;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event RewardPaid(address indexed user, uint256 amount, uint256 lockAmount);

    // Bonus multiplier for early THEORY makers.
    uint256[] public REWARD_MULTIPLIER; // init in constructor function
    uint256[] public HALVING_AT_TIME; // init in constructor function
    uint256 public FINISH_BONUS_AT_TIME;

    uint256[] public PERCENT_LOCK_BONUS_REWARD; // lock xx% of bonus reward

    constructor(
        address _theory,
        ITreasury _treasury,
        uint256 _poolStartTime,
        uint256 _halvingAfterTime,
        uint256[] memory _rewardMultiplier,
        uint256[] memory _percentLockBonusRewards
    ) public {
        require(block.timestamp < _poolStartTime, "late");
        if (_theory != address(0)) theory = IERC20Lockable(_theory);
        treasury = _treasury;
        poolStartTime = _poolStartTime;
        poolEndTime = poolStartTime + runningTime;
        sameBlockFee = 2500;
        feeStageTime = [0, 1 hours, 1 days, 3 days, 5 days, 2 weeks, 4 weeks];
        feeStagePercentage = [800, 400, 200, 100, 50, 25, 1];
        REWARD_MULTIPLIER = _rewardMultiplier;
        uint256 i;
        uint256 len = _percentLockBonusRewards.length;
        for(i = 0; i < len; i += 1)
        {
            require(_percentLockBonusRewards[i] <= 95, "Lock % can't be higher than 95%.");
        }
        PERCENT_LOCK_BONUS_REWARD = _percentLockBonusRewards;
        len = REWARD_MULTIPLIER.length - 1;
        for (i = 0; i < len; i += 1) {
            uint256 halvingAtTime = _halvingAfterTime.mul(i+1).add(poolStartTime).add(1);
            HALVING_AT_TIME.push(halvingAtTime);
        }
        FINISH_BONUS_AT_TIME = _halvingAfterTime
        .mul(len)
        .add(poolStartTime);
        HALVING_AT_TIME.push(uint256(-1));
    }

    function reviseDeposit(uint256 _pid, address _user, uint256 _time) public onlyAuthorized() {
        userInfo[_pid][_user].firstDepositTime = _time;
    }

    function reviseWithdraw(uint256 _pid, address _user, uint256 _time) public onlyAuthorized() {
        userInfo[_pid][_user].lastWithdrawTime = _time;
    }

    //Careful of gas.
    function setFeeStages(uint256[] memory _feeStageTime, uint256[] memory _feeStagePercentage) public onlyAuthorized() {
        require(_feeStageTime.length > 0
        && _feeStageTime[0] == 0
            && _feeStagePercentage.length == _feeStageTime.length,
            "Fee stage arrays must be equal in non-zero length and time should start at 0.");
        feeStageTime = _feeStageTime;
        uint256 i;
        uint256 len = _feeStagePercentage.length;
        for(i = 0; i < len; i += 1)
        {
            require(_feeStagePercentage[i] <= 800, "Fee can't be higher than 8%.");
        }
        feeStagePercentage = _feeStagePercentage;
    }

    function setSameBlockFee(uint256 _fee) public onlyAuthorized() {
        require(_fee <= 2500, "Fee can't be higher than 25%.");
        sameBlockFee = _fee;
    }

    // Return reward multiplier over the given _from to _to time. Careful of gas when it is used in a transaction.
    function getMultiplier(uint256 _from, uint256 _to) public view returns (uint256) {
        uint256 result = 0;
        if (_from < poolStartTime) return 0;

        for (uint256 i = 0; i < HALVING_AT_TIME.length; i++) {
            uint256 endTime = HALVING_AT_TIME[i];
            if (i > REWARD_MULTIPLIER.length-1) return 0;

            if (_to <= endTime) {
                uint256 m = _to.sub(_from).mul(REWARD_MULTIPLIER[i]);
                return result.add(m);
            }

            if (_from < endTime) {
                uint256 m = endTime.sub(_from).mul(REWARD_MULTIPLIER[i]);
                _from = endTime;
                result = result.add(m);
            }
        }

        return result;
    }

    function getRequiredAllocation() public view returns (uint256)
    {
        uint256 _generatedReward = getGeneratedReward(poolStartTime, poolEndTime);
        return _generatedReward;
    }

    function getCurrentLockPercentage(uint256 _pid, address _user) public view returns (uint256) {
        UserInfo storage user = userInfo[_pid][_user];
        uint256 currentTime = block.timestamp;
        if (user.rewardDebtAtTime <= FINISH_BONUS_AT_TIME) {
            // If we are before the FINISH_BONUS_AT_TIME number, we need
            // to lock some of those tokens, based on the current lock
            // percentage of their tokens they just received.
            uint256 lockPercentage = getLockPercentage(currentTime > 0 ? currentTime.sub(1) : currentTime, currentTime);
            return lockPercentage;
        }
        return 0;
    }

    // Careful of gas when it is used in a transaction.
    function getLockPercentage(uint256 _from, uint256 _to) public view returns (uint256) {
        uint256 result = 0;
        if (_from < poolStartTime) return 100;
        if (_to >= poolEndTime) return 0;
        if (_to >= FINISH_BONUS_AT_TIME) return 0;

        for (uint256 i = 0; i < HALVING_AT_TIME.length; i++) {
            uint256 endTime = HALVING_AT_TIME[i];
            if (i > PERCENT_LOCK_BONUS_REWARD.length-1) return 0;

            if (_to <= endTime) {
                return PERCENT_LOCK_BONUS_REWARD[i];
            }
        }

        return result;
    }

    // Update Rewards Multiplier Array
    function rewardMulUpdate(uint256[] memory _newMulReward) public onlyAuthorized {
        REWARD_MULTIPLIER = _newMulReward;
    }

    // Update % lock for general users. Be careful of gas.
    function lockUpdate(uint256[] memory _newLock) public onlyAuthorized {
        uint256 i;
        uint256 len = _newLock.length;
        for(i = 0; i < len; i += 1)
        {
            require(_newLock[i] <= 95, "Lock % can't be higher than 95%.");
        }
        PERCENT_LOCK_BONUS_REWARD = _newLock;
    }

    // Update Finish Bonus Block
    function bonusFinishUpdate(uint256 _newFinish) public onlyAuthorized {
        FINISH_BONUS_AT_TIME = _newFinish;
    }

    // Update Halving At Block
    function halvingUpdate(uint256[] memory _newHalving) public onlyAuthorized {
        HALVING_AT_TIME = _newHalving;
    }

    function checkPoolDuplicate(IERC20 _token) internal view {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            require(poolInfo[pid].token != _token, "TheoryRewardPool: existing pool?");
        }
    }

    // Allow us to delay or begin earlier if we have not started yet. Careful of gas.
    function setPoolStartTime(
        uint256 _time
    ) public onlyAuthorized
    {
        require(block.timestamp < poolStartTime, "Already started.");
        require(block.timestamp < _time, "Time input is too early.");
        require(_time < poolEndTime, "Time is after end time, please change end time first.");
        uint256 length = poolInfo.length;
        uint256 pid = 0;
        uint256 _lastRewardTime;
        for (pid = 0; pid < length; pid += 1) {
            PoolInfo storage pool = poolInfo[pid];
            _lastRewardTime = pool.lastRewardTime;
            if (_lastRewardTime == poolStartTime || _lastRewardTime < _time) {
                pool.lastRewardTime = _time;
            }
        }
        poolStartTime = _time;
    }

    function setPoolEndTime(
        uint256 _time
    ) public onlyAuthorized
    {
        require(block.timestamp < poolStartTime, "Already started.");
        require(poolStartTime < _time, "Time input is too early.");
        poolEndTime = _time;
        runningTime = poolEndTime - poolStartTime;
    }

    // Add a new lp to the pool. Can only be called by the owner.
    function add(
        uint256 _allocPoint,
        IERC20 _token,
        bool _withUpdate,
        uint256 _lastRewardTime
    ) public onlyOperator {
        checkPoolDuplicate(_token);
        if (_withUpdate) {
            massUpdatePools();
        }
        if (block.timestamp < poolStartTime) {
            // chef is sleeping
            if (_lastRewardTime < poolStartTime) {
                _lastRewardTime = poolStartTime;
            }
        } else {
            // chef is cooking
            if (_lastRewardTime < block.timestamp) { // Why was == 0 here and above? Isn't that redundant?
                _lastRewardTime = block.timestamp;
            }
        }
        bool _isStarted =
        (_lastRewardTime <= poolStartTime) ||
        (_lastRewardTime <= block.timestamp);
        poolInfo.push(PoolInfo({
            token : _token,
            allocPoint : _allocPoint,
            lastRewardTime : _lastRewardTime,
            accTheoryPerShare : 0,
            isStarted : _isStarted
            }));
        if (_isStarted) {
            totalAllocPoint = totalAllocPoint.add(_allocPoint);
        }
    }

    // Update the given pool's THEORY allocation point. Can only be called by the owner.
    function set(uint256 _pid, uint256 _allocPoint) public onlyOperator {
        massUpdatePools();
        PoolInfo storage pool = poolInfo[_pid];
        if (pool.isStarted) {
            totalAllocPoint = totalAllocPoint.sub(pool.allocPoint).add(
                _allocPoint
            );
        }
        pool.allocPoint = _allocPoint;
    }

    function getTheoryPerSecondInPool(uint256 _pid) public view returns (uint256)
    {
        PoolInfo storage pool = poolInfo[_pid];
        uint256 _poolTheoryPerSecond = getMultiplier(block.timestamp - 1, block.timestamp).mul(baseTheoryPerSecond).mul(pool.allocPoint).div(totalAllocPoint);
        return _poolTheoryPerSecond;
    }

    function getWithdrawFeeOf(uint256 _pid, address _user) public view returns (uint256)
    {
        UserInfo storage user = userInfo[_pid][_user];
        uint256 fee = sameBlockFee;
        if(block.number != user.lastDepositBlock)
        {
            if (!(user.firstDepositTime > 0)) {
                return feeStagePercentage[0];
            }
            uint256 deltaTime = user.lastWithdrawTime > 0 ?
            block.timestamp - user.lastWithdrawTime :
            block.timestamp - user.firstDepositTime;
            uint256 len = feeStageTime.length;
            uint256 n;
            uint256 i;
            for (n = len; n > 0; n -= 1) {
                i = n-1;
                if(deltaTime >= feeStageTime[i])
                {
                    fee = feeStagePercentage[i];
                    break;
                }
            }
        }
        return fee;
    }

    // Return accumulate rewards over the given _from to _to block.
    function getGeneratedReward(uint256 _fromTime, uint256 _toTime) public view returns (uint256) {
        if (_fromTime >= _toTime) return 0;
        if (_toTime >= poolEndTime) {
            if (_fromTime >= poolEndTime) return 0;
            if (_fromTime <= poolStartTime) return getMultiplier(poolStartTime, poolEndTime).mul(baseTheoryPerSecond);
            return getMultiplier(_fromTime, poolEndTime).mul(baseTheoryPerSecond);
        } else {
            if (_toTime <= poolStartTime) return 0;
            if (_fromTime <= poolStartTime) return getMultiplier(poolStartTime, _toTime).mul(baseTheoryPerSecond);
            return getMultiplier(_fromTime, _toTime).mul(baseTheoryPerSecond);
        }
    }

    // View function to see pending THEORYs on frontend.
    function pendingShare(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accTheoryPerShare = pool.accTheoryPerShare;
        uint256 tokenSupply = pool.token.balanceOf(address(this));
        if (block.timestamp > pool.lastRewardTime && tokenSupply != 0) {
            uint256 _generatedReward = getGeneratedReward(pool.lastRewardTime, block.timestamp);
            uint256 _theoryReward = _generatedReward.mul(pool.allocPoint).div(totalAllocPoint);
            accTheoryPerShare = accTheoryPerShare.add(_theoryReward.mul(1e18).div(tokenSupply));
        }
        return user.amount.mul(accTheoryPerShare).div(1e18).sub(user.rewardDebt);
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() internal { // Too scared of scary reentrancy warnings. Internal version.
        uint256 length = poolInfo.length;
        uint256 pid = 0;
        for (pid = 0; pid < length; pid += 1) {
            updatePool(pid);
        }
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function forceMassUpdatePools() external onlyAuthorized { // Too scared of scary reentrancy warnings. External version.
        massUpdatePools();
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) internal { // Too scared of scary reentrancy warnings. Internal version.
        PoolInfo storage pool = poolInfo[_pid];
        if (block.timestamp <= pool.lastRewardTime) {
            return;
        }
        uint256 tokenSupply = pool.token.balanceOf(address(this));
        if (tokenSupply == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }
        if (!pool.isStarted) {
            pool.isStarted = true;
            totalAllocPoint = totalAllocPoint.add(pool.allocPoint);
        }
        if (totalAllocPoint > 0) {
            uint256 _generatedReward = getGeneratedReward(pool.lastRewardTime, block.timestamp);
            uint256 _theoryReward = _generatedReward.mul(pool.allocPoint).div(totalAllocPoint);
            pool.accTheoryPerShare = pool.accTheoryPerShare.add(_theoryReward.mul(1e18).div(tokenSupply));
        }
        pool.lastRewardTime = block.timestamp;
    }

    // Update reward variables of the given pool to be up-to-date.
    function forceUpdatePool(uint256 _pid) external onlyAuthorized { // Too scared of scary reentrancy warnings. External version.
        updatePool(_pid);
    }

    // Deposit LP tokens.
    function deposit(uint256 _pid, uint256 _amount) public onlyOneBlock { // Poor smart contracts, can't deposit to multiple pools at once... But my OCD will not allow this.
        address _sender = msg.sender;
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_sender];
        updatePool(_pid);
        if (user.amount > 0) {
            uint256 _pending = user.amount.mul(pool.accTheoryPerShare).div(1e18).sub(user.rewardDebt);
            if (_pending > 0) {
                safeTheoryTransfer(_sender, _pending);
                uint256 lockAmount = 0;
                uint256 currentTime = block.timestamp;
                if (user.rewardDebtAtTime <= FINISH_BONUS_AT_TIME) {
                    // If we are before the FINISH_BONUS_AT_TIME number, we need
                    // to lock some of those tokens, based on the current lock
                    // percentage of their tokens they just received.
                    uint256 lockPercentage = getLockPercentage(currentTime > 0 ? currentTime.sub(1) : currentTime, currentTime);
                    lockAmount = _pending.mul(lockPercentage).div(100);
                    if(lockAmount > 0) theory.lock(_sender, lockAmount);
                }

                // Reset the rewardDebtAtTime to the current time for the user.
                user.rewardDebtAtTime = currentTime;
                emit RewardPaid(_sender, _pending, lockAmount);
            }
        }
        else
        {
            user.rewardDebtAtTime = block.timestamp;
        }
        user.lastDepositBlock = block.number;
        if (!(user.firstDepositTime > 0)) {
            user.firstDepositTime = block.timestamp;
        }
        if (_amount > 0) {
            pool.token.safeTransferFrom(_sender, address(this), _amount);
            user.amount = user.amount.add(_amount);
        }
        user.rewardDebt = user.amount.mul(pool.accTheoryPerShare).div(1e18);
        emit Deposit(_sender, _pid, _amount);
    }

    // Withdraw LP tokens.
    function withdraw(uint256 _pid, uint256 _amount) public onlyOneBlock {
        address _sender = msg.sender;
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_sender];
        require(user.amount >= _amount, "withdraw: not good");
        updatePool(_pid);
        uint256 _pending = user.amount.mul(pool.accTheoryPerShare).div(1e18).sub(user.rewardDebt);
        if (_pending > 0) {
            safeTheoryTransfer(_sender, _pending);
            uint256 lockAmount = 0;
            uint256 currentTime = block.timestamp;
            if (user.rewardDebtAtTime <= FINISH_BONUS_AT_TIME) {
                // If we are before the FINISH_BONUS_AT_TIME number, we need
                // to lock some of those tokens, based on the current lock
                // percentage of their tokens they just received.
                uint256 lockPercentage = getLockPercentage(currentTime > 0 ? currentTime.sub(1) : currentTime, currentTime);
                lockAmount = _pending.mul(lockPercentage).div(100);
                if(lockAmount > 0) theory.lock(_sender, lockAmount);
            }

            // Reset the rewardDebtAtTime to the current time for the user.
            user.rewardDebtAtTime = currentTime;
            emit RewardPaid(_sender, _pending, lockAmount);
        }
        if (_amount > 0) {
            user.amount = user.amount.sub(_amount);
            uint256 fee = sameBlockFee;
            if(block.number != user.lastDepositBlock)
            {
                uint256 deltaTime = user.lastWithdrawTime > 0 ?
                block.timestamp - user.lastWithdrawTime :
                block.timestamp - user.firstDepositTime;
                uint256 len = feeStageTime.length;
                uint256 n;
                uint256 i;
                for (n = len; n > 0; n -= 1) {
                    i = n-1;
                    if(deltaTime >= feeStageTime[i])
                    {
                        fee = feeStagePercentage[i];
                        break;
                    }
                }
            }
            user.lastWithdrawTime = block.timestamp;
            uint256 feeAmount = _amount.mul(fee).div(10000);
            uint256 amountToGive = _amount.sub(feeAmount);
            if(feeAmount > 0) pool.token.safeTransfer(treasury.daoFund(), feeAmount);
            pool.token.safeTransfer(_sender, amountToGive);
        }
        user.rewardDebt = user.amount.mul(pool.accTheoryPerShare).div(1e18);
        emit Withdraw(_sender, _pid, _amount);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY. This has the same fee as same block withdrawals to prevent abuse of this function.
    function emergencyWithdraw(uint256 _pid) public onlyOneBlock {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        uint256 fee = sameBlockFee;
        uint256 feeAmount = user.amount.mul(fee).div(10000);
        uint256 amountToGive = user.amount.sub(feeAmount);
        user.amount = 0;
        user.rewardDebt = 0;
        pool.token.safeTransfer(msg.sender, amountToGive);
        pool.token.safeTransfer(treasury.daoFund(), feeAmount);
        emit EmergencyWithdraw(msg.sender, _pid, amountToGive);
    }

    // Safe theory transfer function, just in case if rounding error causes pool to not have enough THEORYs.
    function safeTheoryTransfer(address _to, uint256 _amount) internal {
        uint256 _theoryBal = theory.balanceOf(address(this));
        if (_theoryBal > 0) {
            if (_amount > _theoryBal) {
                theory.safeTransfer(_to, _theoryBal);
            } else {
                theory.safeTransfer(_to, _amount);
            }
        }
    }

    function governanceRecoverUnsupported(IERC20 _token, uint256 amount, address to) external onlyAuthorized { //I don't know the point of these functions if we can't even call them once the Treasury is operator, so they should all be onlyAuthorized instead.
        if (block.timestamp < poolEndTime + 90 days) {
            // do not allow to drain core token (THEORY or lps) if less than 90 days after pool ends
            require(_token != theory, "theory");
            uint256 length = poolInfo.length;
            for (uint256 pid = 0; pid < length; ++pid) {
                PoolInfo storage pool = poolInfo[pid];
                require(_token != pool.token, "pool.token");
            }
        }
        _token.safeTransfer(to, amount);
    }
}
