// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20Lockable is IERC20 {
    function lock(address _holder, uint256 _amount) external;
    function lockOf(address account) external view returns (uint256);
    function canUnlockAmount(address account) external view returns (uint256);
    function unlockForUser(address account, uint256 amount) external;
    function burn(uint256 amount) external;
}
