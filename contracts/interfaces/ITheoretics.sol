// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface ITheoretics {
    function balanceOf(address _mason) external view returns (uint256);

    function earned(address _mason) external view returns (uint256);

    function canWithdraw(address _mason) external view returns (bool);

    function canClaimReward(address theorist) external view returns (bool);

    function epoch() external view returns (uint256);

    function nextEpochPoint() external view returns (uint256);

    function getGamePrice() external view returns (uint256);

    function setOperator(address _operator) external;

    function setLockUp(uint256 _withdrawLockupEpochs, uint256 _rewardLockupEpochs, uint256 _pegMaxUnlock) external;

    function stake(uint256 _amount) external;

    function withdraw(uint256 _amount) external;

    function exit() external;

    function claimReward() external;

    function allocateSeigniorage(uint256 _amount) external;

    function governanceRecoverUnsupported(address _token, uint256 _amount, address _to) external;

    function getCurrentWithdrawEpochs() external view returns (uint256);

    function getCurrentClaimEpochs() external view returns (uint256);

    function getWithdrawFeeOf(address _user) external view returns (uint256);

    function getLockPercentage() external view returns (uint256);

    function totalSupply() external view returns (uint256);

    function getLatestSnapshot() external view returns (uint256 time, uint256 rewardReceived, uint256 rewardPerShare);

    function latestSnapshotIndex() external view returns (uint256);

    function theoreticsHistory(uint256 index) external view returns (uint256 time, uint256 rewardReceived, uint256 rewardPerShare);
}
