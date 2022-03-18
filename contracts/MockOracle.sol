pragma solidity 0.6.12;
import './interfaces/IOracle.sol';

contract MockOracle is IOracle {
    function update() public override {}

    function consult(address token, uint256 amountIn)
    external
    view
    override
    returns (uint144 amountOut)
    {
        return price;
    }

    function twap(address token, uint256 amountIn)
    external
    view
    override
    returns (uint144 amountOut)
    {
        return price;
    }

    uint144 private price = 10**18;

    function setPrice(uint144 price_) external {
        price = price_;
    }
}