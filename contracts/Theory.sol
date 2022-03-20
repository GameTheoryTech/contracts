// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";

import "./Authorizable.sol";
import "./interfaces/IDistributable.sol";

contract Theory is ERC20Burnable, Authorizable {
    using SafeMath for uint256;

    // TOTAL MAX SUPPLY = farming allocation + 9.24369748% + 8.40336134% THEORYs. This is percentage of the allocations to the farming supply for Tomb Finance (59500 for Tomb, about 308917 for us). This comes out to about 363,431.
    // INITIAL PRICE SHOULD BE LIKE 3SHARES: $26000000/TOTAL_MAX_SUPPLY = $26000000/363432 = approximately $71.54
    uint256 public constant COMMUNITY_FUND_POOL_ALLOCATION = 28555.3529 ether;
    uint256 public constant DEV_FUND_POOL_ALLOCATION = 25959.4118 ether;

    uint256 public constant VESTING_DURATION = 365 days;
    uint256 public startTime;
    uint256 public endTime;

    uint256 public communityFundRewardRate;
    uint256 public devFundRewardRate;

    address public communityFund;
    address public devFund;
    address public distributed;

    uint256 public communityFundLastClaimed;
    uint256 public devFundLastClaimed;

    bool public rewardPoolDistributed = false;

    uint256 private _totalLock;
    uint256 public lockFromTime;
    uint256 public lockToTime;
    mapping(address => bool) public noUnlockBeforeTransfer;

    mapping(address => uint256) private _locks;
    mapping(address => uint256) private _lastUnlockTime;

    // Events.
    event Lock(address indexed to, uint256 value);
    event Unlock(address indexed to, uint256 value);

    constructor(uint256 _startTime, address _communityFund, address _devFund, uint256 _lockFromTime,
        uint256 _lockToTime) public ERC20("THEORY", "Game Theory (gametheory.tech): THEORY Token") {
        _mint(msg.sender, 1 ether); // mint 1 share for initial liquidity pool deployment
        _mint(address(this), COMMUNITY_FUND_POOL_ALLOCATION); // Lock up allocation for community fund. We do this initially so that supply never increases for THEORY, only GAME.
        _mint(address(this), DEV_FUND_POOL_ALLOCATION); // Lock up allocation for dev fund. We do this initially so that supply never increases for THEORY, only GAME.

        startTime = _startTime;
        endTime = startTime + VESTING_DURATION;

        communityFundLastClaimed = startTime;
        devFundLastClaimed = startTime;

        communityFundRewardRate = COMMUNITY_FUND_POOL_ALLOCATION.div(VESTING_DURATION);
        devFundRewardRate = DEV_FUND_POOL_ALLOCATION.div(VESTING_DURATION);

        require(_devFund != address(0), "Address cannot be 0");
        devFund = _devFund;

        //require(_communityFund != address(0), "Address cannot be 0");
        communityFund = _communityFund;

        lockFromTime = _lockFromTime;
        lockToTime = _lockToTime;
    }

    modifier onlyAuthorizedOrDistributed() {
        require(authorized[msg.sender] || owner() == msg.sender || operator() == msg.sender || distributed == msg.sender, "caller is not authorized");
        _;
    }

    function setTreasuryFund(address _communityFund) external {
        require(msg.sender == devFund, "!dev");
        communityFund = _communityFund;
    }

    function setDevFund(address _devFund) external {
        require(msg.sender == devFund, "!dev");
        require(_devFund != address(0), "zero");
        devFund = _devFund;
    }

    function setNoUnlockBeforeTransfer(bool _noUnlockBeforeTransfer) public {
        noUnlockBeforeTransfer[msg.sender] = _noUnlockBeforeTransfer;
    } // If for some reason it is causing problems for a specific user, they can turn it off themselves.

    function _transfer(address sender, address recipient, uint256 amount) internal override {
        if(!noUnlockBeforeTransfer[sender] && _locks[sender] > 0)
        {
            uint256 amountToUnlock = canUnlockAmount(sender);
            _unlock(sender, amountToUnlock);
        }
        super._transfer(sender, recipient, amount);
    }

    function unclaimedTreasuryFund() public view returns (uint256 _pending) {
        uint256 _now = block.timestamp;
        if (_now > endTime) _now = endTime;
        if (communityFundLastClaimed >= _now) return 0;
        _pending = _now.sub(communityFundLastClaimed).mul(communityFundRewardRate);
    }

    function unclaimedDevFund() public view returns (uint256 _pending) {
        uint256 _now = block.timestamp;
        if (_now > endTime) _now = endTime;
        if (devFundLastClaimed >= _now) return 0;
        _pending = _now.sub(devFundLastClaimed).mul(devFundRewardRate);
    }

    /**
     * @dev Claim pending rewards to community and dev fund
     */
    function claimRewards() external {
        uint256 _pending = unclaimedTreasuryFund();
        if (_pending > 0 && communityFund != address(0)) {
            _transfer(address(this), communityFund, _pending);
            communityFundLastClaimed = block.timestamp;
        }
        _pending = unclaimedDevFund();
        if (_pending > 0 && devFund != address(0)) {
            _transfer(address(this), devFund, _pending);
            devFundLastClaimed = block.timestamp;
        }
    }

    /**
     * @notice distribute to reward pool (only once)
     */
    function distributeReward(address _farmingIncentiveFund) external onlyAuthorized { // Can only do this once, so no point in having it be only operator. We can switch to treasury operator before even distributing the reward!
        require(!rewardPoolDistributed, "only can distribute once");
        require(_farmingIncentiveFund != address(0), "!_farmingIncentiveFund");
        rewardPoolDistributed = true;
        distributed = _farmingIncentiveFund;
        _mint(_farmingIncentiveFund, IDistributable(_farmingIncentiveFund).getRequiredAllocation());
    }

    function burn(uint256 amount) public override {
        super.burn(amount);
    }

    function governanceRecoverUnsupported(
        IERC20 _token,
        uint256 _amount,
        address _to
    ) external onlyAuthorized {
        require(msg.sender == operator() || _token != IERC20(this), "Invalid permissions."); // Only the operator can transfer this (though this will probably never be used as the treasury can't call this). We can now recover any tokens accidentally sent to this address.
        _token.transfer(_to, _amount);
    }

    // Update the lockFromTime
    function lockFromUpdate(uint256 _newLockFrom) public onlyAuthorized {
        uint256 lockTime = lockToTime - lockFromTime;
        lockFromTime = _newLockFrom;
        lockToTime = _newLockFrom.add(lockTime); //To respect the 365 day limit, we also change the destination time at the same moment.
    }

    // Update the lockToTime
    function lockToUpdate(uint256 _newLockTo) public onlyAuthorized {
        require(_newLockTo > lockFromTime, "Lock to must be greater than lock from.");
        uint256 lockTime = _newLockTo - lockFromTime;
        require(lockTime <= 365 days, "Lock time must not be greater than 365 days.");
        lockToTime = _newLockTo;
    }

    function totalBalanceOf(address _holder) public view returns (uint256) {
        return _locks[_holder].add(balanceOf(_holder));
    }

    function lockOf(address _holder) public view returns (uint256) {
        return _locks[_holder];
    }

    function lastUnlockTime(address _holder) public view returns (uint256) {
        return _lastUnlockTime[_holder];
    }

    function totalLock() public view returns (uint256) {
        return _totalLock;
    }

    function unlockedSupply() public view returns (uint256) {
        return totalSupply().sub(_totalLock);
    }

    function lockedSupply() public view returns (uint256) {
        return totalLock();
    }

    function circulatingSupply() public view returns (uint256) {
        return totalSupply().sub(balanceOf(distributed));
    }

    function lock(address _holder, uint256 _amount) public onlyAuthorizedOrDistributed {
        require(_holder != address(0), "Cannot lock to the zero address");
        require(_amount <= balanceOf(_holder), "Lock amount over balance");
        require(msg.sender == operator() || msg.sender == distributed || _locks[_holder].add(_amount) <= totalBalanceOf(_holder).mul(95).div(100), "Lock amount over 95% of total balance");

        if(noUnlockBeforeTransfer[_holder] && _locks[_holder] > 0) //Before we lock more, make sure we unlock everything we can, even if noUnlockBeforeTransfer is set.
        {
            uint256 amount = canUnlockAmount(_holder);
            _unlock(_holder, amount);
        }

        _transfer(_holder, address(this), _amount);

        _locks[_holder] = _locks[_holder].add(_amount);
        _totalLock = _totalLock.add(_amount);
        if (_lastUnlockTime[_holder] < lockFromTime) {
            _lastUnlockTime[_holder] = lockFromTime;
        }
        emit Lock(_holder, _amount);
    }

    function canUnlockAmount(address _holder) public view returns (uint256) {
        if (block.timestamp <= lockFromTime) {
            return 0;
        } else if (block.timestamp >= lockToTime) {
            return _locks[_holder];
        } else {
            uint256 releaseTime = block.timestamp.sub(_lastUnlockTime[_holder]);
            uint256 numberLockTime = lockToTime.sub(_lastUnlockTime[_holder]);
            return _locks[_holder].mul(releaseTime).div(numberLockTime);
        }
    }

    // Unlocks some locked tokens immediately.
    function unlockForUser(address account, uint256 amount) public onlyAuthorized {
        // First we need to unlock all tokens the address is eligible for.
        uint256 pendingLocked = canUnlockAmount(account);
        if (pendingLocked > 0) {
            _unlock(account, pendingLocked);
        }

        // Now that that's done, we can unlock the extra amount passed in.
        _unlock(account, amount);
    }

    function unlock() public {
        uint256 amount = canUnlockAmount(msg.sender);
        _unlock(msg.sender, amount);
    }

    function _unlock(address holder, uint256 amount) internal {
        require(_locks[holder] > 0, "Insufficient locked tokens");

        // Make sure they aren't trying to unlock more than they have locked.
        if (amount > _locks[holder]) {
            amount = _locks[holder];
        }

        // If the amount is greater than the total balance, set it to max.
        if (amount > balanceOf(address(this))) {
            amount = balanceOf(address(this));
        }
        _transfer(address(this), holder, amount);
        _locks[holder] = _locks[holder].sub(amount);
        _lastUnlockTime[holder] = block.timestamp;
        _totalLock = _totalLock.sub(amount);

        emit Unlock(holder, amount);
    }

    // This function is for dev address migrate all balance to a multi sig address
//    function transferAll(address _to) public onlyAuthorized {
//        _locks[_to] = _locks[_to].add(_locks[msg.sender]);
//
//        if (_lastUnlockTime[_to] < lockFromTime) {
//            _lastUnlockTime[_to] = lockFromTime;
//        }
//
//        if (_lastUnlockTime[_to] < _lastUnlockTime[msg.sender]) {
//            _lastUnlockTime[_to] = _lastUnlockTime[msg.sender];
//        }
//
//        _locks[msg.sender] = 0;
//        _lastUnlockTime[msg.sender] = 0;
//
//        _transfer(msg.sender, _to, balanceOf(msg.sender));
//    }
    // Actually, we don't need this anymore. We're vested but the vested amount isn't locked in the same way as DeFi Kingdoms.
}
