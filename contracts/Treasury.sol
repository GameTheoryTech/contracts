// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./lib/Babylonian.sol";
import "./owner/Operator.sol";
import "./utils/ContractGuard.sol";
import "./interfaces/IBasisAsset.sol";
import "./interfaces/IOracle.sol";
import "./interfaces/ITheoretics.sol";
import "./interfaces/IERC20Burnable.sol";

contract Treasury is ContractGuard {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    /* ========= CONSTANT VARIABLES ======== */

    uint256 public constant PERIOD = 6 hours;

    /* ========== STATE VARIABLES ========== */

    // governance
    address public operator;

    // flags
    bool public initialized = false;

    // epoch
    uint256 public startTime;
    uint256 public epoch = 0;
    uint256 public epochSupplyContractionLeft = 0;

    // exclusions from total supply
    address[] public excludedFromTotalSupply;

    // core components
    address public game;
    address public hodl;
    address public theory;

    address public theoretics;
    address public bondTreasury;
    address public gameOracle;

    // price
    uint256 public gamePriceOne;
    uint256 public gamePriceCeiling;

    uint256 public seigniorageSaved;

    uint256[] public supplyTiers;
    uint256[] public maxExpansionTiers;

    uint256 public maxSupplyExpansionPercent;
    uint256 public bondDepletionFloorPercent;
    uint256 public seigniorageExpansionFloorPercent;
    uint256 public maxSupplyContractionPercent;
    uint256 public maxDebtRatioPercent;

    uint256 public bondSupplyExpansionPercent;

    // 28 first epochs (1 week) with 4.5% expansion regardless of GAME price
    uint256 public bootstrapEpochs;
    uint256 public bootstrapSupplyExpansionPercent;

    /* =================== Added variables =================== */
    uint256 public previousEpochGamePrice;
    uint256 public maxDiscountRate; // when purchasing bond
    uint256 public maxPremiumRate; // when redeeming bond
    uint256 public discountPercent;
    uint256 public premiumThreshold;
    uint256 public premiumPercent;
    uint256 public mintingFactorForPayingDebt; // print extra GAME during debt phase

    address public daoFund;
    uint256 public daoFundSharedPercent;

    address public devFund;
    uint256 public devFundSharedPercent;

    /* =================== Events =================== */

    event Initialized(address indexed executor, uint256 at);
    event BurnedBonds(address indexed from, uint256 bondAmount);
    event RedeemedBonds(address indexed from, uint256 gameAmount, uint256 bondAmount);
    event BoughtBonds(address indexed from, uint256 gameAmount, uint256 bondAmount);
    event TreasuryFunded(uint256 timestamp, uint256 seigniorage);
    event theoreticsFunded(uint256 timestamp, uint256 seigniorage);
    event DaoFundFunded(uint256 timestamp, uint256 seigniorage);
    event DevFundFunded(uint256 timestamp, uint256 seigniorage);

    /* =================== Modifier =================== */

    modifier onlyOperator() {
        require(operator == msg.sender, "Treasury: caller is not the operator");
        _;
    }

    modifier checkCondition {
        require(block.timestamp >= startTime, "Treasury: not started yet");

        _;
    }

    modifier checkEpoch {
        require(block.timestamp >= nextEpochPoint(), "Treasury: not opened yet");

        _;

        epoch = epoch.add(1);
        epochSupplyContractionLeft = (getGamePrice() > gamePriceCeiling) ? 0 : getGameCirculatingSupply().mul(maxSupplyContractionPercent).div(10000);
    }

    modifier checkOperator {
        require(
            IBasisAsset(game).operator() == address(this) &&
                IBasisAsset(hodl).operator() == address(this) &&
                IBasisAsset(theory).operator() == address(this) &&
                Operator(theoretics).operator() == address(this),
            "Treasury: need more permission"
        );

        _;
    }

    modifier notInitialized {
        require(!initialized, "Treasury: already initialized");

        _;
    }

    /* ========== VIEW FUNCTIONS ========== */

    function isInitialized() public view returns (bool) {
        return initialized;
    }

    // epoch
    function nextEpochPoint() public view returns (uint256) {
        return startTime.add(epoch.mul(PERIOD));
    }

    function shouldAllocateSeigniorage() external view returns (bool) // For bots.
    {
        return block.timestamp >= startTime && block.timestamp >= nextEpochPoint() && ITheoretics(theoretics).totalSupply() > 0;
    }

    // oracle
    function getGamePrice() public view returns (uint256 gamePrice) {
        try IOracle(gameOracle).consult(game, 1e18) returns (uint144 price) {
            return uint256(price);
        } catch {
            revert("Treasury: failed to consult GAME price from the oracle");
        }
    }

    function getGameUpdatedPrice() public view returns (uint256 _gamePrice) {
        try IOracle(gameOracle).twap(game, 1e18) returns (uint144 price) {
            return uint256(price);
        } catch {
            revert("Treasury: failed to consult GAME price from the oracle");
        }
    }

    // budget
    function getReserve() public view returns (uint256) {
        return seigniorageSaved;
    }

    function getBurnableGameLeft() public view returns (uint256 _burnableGameLeft) {
        uint256 _gamePrice = getGamePrice();
        if (_gamePrice <= gamePriceOne) {
            uint256 _gameSupply = getGameCirculatingSupply();
            uint256 _bondMaxSupply = _gameSupply.mul(maxDebtRatioPercent).div(10000);
            uint256 _bondSupply = IERC20(hodl).totalSupply();
            if (_bondMaxSupply > _bondSupply) {
                uint256 _maxMintableBond = _bondMaxSupply.sub(_bondSupply);
                uint256 _maxBurnableGame = _maxMintableBond.mul(_gamePrice).div(1e18);
                _burnableGameLeft = Math.min(epochSupplyContractionLeft, _maxBurnableGame);
            }
        }
    }

    function getRedeemableBonds() public view returns (uint256 _redeemableBonds) {
        uint256 _gamePrice = getGamePrice();
        if (_gamePrice > gamePriceCeiling) {
            uint256 _totalGame = IERC20(game).balanceOf(address(this));
            uint256 _rate = getBondPremiumRate();
            if (_rate > 0) {
                _redeemableBonds = _totalGame.mul(1e18).div(_rate);
            }
        }
    }

    function getBondDiscountRate() public view returns (uint256 _rate) {
        uint256 _gamePrice = getGamePrice();
        if (_gamePrice <= gamePriceOne) {
            if (discountPercent == 0) {
                // no discount
                _rate = gamePriceOne;
            } else {
                uint256 _bondAmount = gamePriceOne.mul(1e18).div(_gamePrice); // to burn 1 GAME
                uint256 _discountAmount = _bondAmount.sub(gamePriceOne).mul(discountPercent).div(10000);
                _rate = gamePriceOne.add(_discountAmount);
                if (maxDiscountRate > 0 && _rate > maxDiscountRate) {
                    _rate = maxDiscountRate;
                }
            }
        }
    }

    function getBondPremiumRate() public view returns (uint256 _rate) {
        uint256 _gamePrice = getGamePrice();
        if (_gamePrice > gamePriceCeiling) {
            uint256 _gamePricePremiumThreshold = gamePriceOne.mul(premiumThreshold).div(100);
            if (_gamePrice >= _gamePricePremiumThreshold) {
                //Price > 1.10
                uint256 _premiumAmount = _gamePrice.sub(gamePriceOne).mul(premiumPercent).div(10000);
                _rate = gamePriceOne.add(_premiumAmount);
                if (maxPremiumRate > 0 && _rate > maxPremiumRate) {
                    _rate = maxPremiumRate;
                }
            } else {
                // no premium bonus
                _rate = gamePriceOne;
            }
        }
    }

    /* ========== GOVERNANCE ========== */

    function initialize(
        address _game,
        address _hodl,
        address _theory,
        address _gameOracle,
        address _theoretics,
        address _genesisPool,
        address _daoFund,
        address _devFund,
        uint256 _startTime
    ) public notInitialized {
        initialized = true;
        // We could require() for all of these...
        game = _game;
        hodl = _hodl;
        theory = _theory;
        gameOracle = _gameOracle;
        theoretics = _theoretics;
        daoFund = _daoFund;
        devFund = _devFund;
        require(block.timestamp < _startTime, "late");
        startTime = _startTime;

        gamePriceOne = 10**18;
        gamePriceCeiling = gamePriceOne.mul(101).div(100);

        // exclude contracts from total supply
        excludedFromTotalSupply.push(_genesisPool);

        // Dynamic max expansion percent
        supplyTiers = [0 ether, 500000 ether, 1000000 ether, 1500000 ether, 2000000 ether, 5000000 ether, 10000000 ether, 20000000 ether, 50000000 ether];
        maxExpansionTiers = [450, 400, 350, 300, 250, 200, 150, 125, 100];

        maxSupplyExpansionPercent = 400; // Upto 4.0% supply for expansion

        bondDepletionFloorPercent = 10000; // 100% of Bond supply for depletion floor
        seigniorageExpansionFloorPercent = 3500; // At least 35% of expansion reserved for theoretics
        maxSupplyContractionPercent = 300; // Upto 3.0% supply for contraction (to burn GAME and mint HODL)
        maxDebtRatioPercent = 3500; // Upto 35% supply of HODL to purchase

        bondSupplyExpansionPercent = 500; // maximum 5% emissions per epoch for POL bonds

        premiumThreshold = 110;
        premiumPercent = 7000;

        // First 12 epochs with 5% expansion
        bootstrapEpochs = 12;
        bootstrapSupplyExpansionPercent = 500;

        // set seigniorageSaved to it's balance
        seigniorageSaved = IERC20(game).balanceOf(address(this));

        operator = msg.sender;
        emit Initialized(msg.sender, block.number);
    }

    function setOperator(address _operator) external onlyOperator {
        operator = _operator;
    }

    function setTheoretics(address _theoretics) external onlyOperator { // Scary function, but also can be used to upgrade. However, since I don't have a multisig to start, and it isn't THAT important, I'm going to leave this be.
        theoretics = _theoretics;
    }

    function setGameOracle(address _gameOracle) external onlyOperator { // See above.
        gameOracle = _gameOracle;
    }

    function setGamePriceCeiling(uint256 _gamePriceCeiling) external onlyOperator { // I don't see this changing, so I'm going to leave this be.
        require(_gamePriceCeiling >= gamePriceOne && _gamePriceCeiling <= gamePriceOne.mul(120).div(100), "out of range"); // [$1.0, $1.2]
        gamePriceCeiling = _gamePriceCeiling;
    }

    function setMaxSupplyExpansionPercents(uint256 _maxSupplyExpansionPercent) external onlyOperator { // I don't see this changing, so I'm going to leave this be.
        require(_maxSupplyExpansionPercent >= 10 && _maxSupplyExpansionPercent <= 1000, "_maxSupplyExpansionPercent: out of range"); // [0.1%, 10%]
        maxSupplyExpansionPercent = _maxSupplyExpansionPercent;
    }

    function setSupplyTiersEntry(uint8 _index, uint256 _value) external onlyOperator returns (bool) {
        require(_index >= 0, "Index has to be higher than 0");
        require(_index < 9, "Index has to be lower than count of tiers");
        if (_index > 0) {
            require(_value > supplyTiers[_index - 1]);
        }
        if (_index < 8) {
            require(_value < supplyTiers[_index + 1]);
        }
        supplyTiers[_index] = _value;
        return true;
    }

    function setMaxExpansionTiersEntry(uint8 _index, uint256 _value) external onlyOperator returns (bool) {
        require(_index >= 0, "Index has to be higher than 0");
        require(_index < 9, "Index has to be lower than count of tiers");
        require(_value >= 10 && _value <= 1000, "_value: out of range"); // [0.1%, 10%]
        maxExpansionTiers[_index] = _value;
        return true;
    }

    function setBondDepletionFloorPercent(uint256 _bondDepletionFloorPercent) external onlyOperator {
        require(_bondDepletionFloorPercent >= 500 && _bondDepletionFloorPercent <= 10000, "out of range"); // [5%, 100%]
        bondDepletionFloorPercent = _bondDepletionFloorPercent;
    }

    function setMaxSupplyContractionPercent(uint256 _maxSupplyContractionPercent) external onlyOperator {
        require(_maxSupplyContractionPercent >= 100 && _maxSupplyContractionPercent <= 1500, "out of range"); // [0.1%, 15%]
        maxSupplyContractionPercent = _maxSupplyContractionPercent;
    }

    function setMaxDebtRatioPercent(uint256 _maxDebtRatioPercent) external onlyOperator {
        require(_maxDebtRatioPercent >= 1000 && _maxDebtRatioPercent <= 10000, "out of range"); // [10%, 100%]
        maxDebtRatioPercent = _maxDebtRatioPercent;
    }

    function setBootstrap(uint256 _bootstrapEpochs, uint256 _bootstrapSupplyExpansionPercent) external onlyOperator {
        require(_bootstrapEpochs <= 120, "_bootstrapEpochs: out of range"); // <= 1 month
        require(_bootstrapSupplyExpansionPercent >= 100 && _bootstrapSupplyExpansionPercent <= 1000, "_bootstrapSupplyExpansionPercent: out of range"); // [1%, 10%]
        bootstrapEpochs = _bootstrapEpochs;
        bootstrapSupplyExpansionPercent = _bootstrapSupplyExpansionPercent;
    }

    function setExtraFunds(
        address _daoFund,
        uint256 _daoFundSharedPercent,
        address _devFund,
        uint256 _devFundSharedPercent
    ) external onlyOperator {
        require(_daoFund != address(0), "zero");
        require(_daoFundSharedPercent <= 3000, "out of range"); // <= 30%
        require(_devFund != address(0), "zero");
        require(_devFundSharedPercent <= 1000, "out of range"); // <= 10%
        daoFund = _daoFund;
        daoFundSharedPercent = _daoFundSharedPercent;
        devFund = _devFund;
        devFundSharedPercent = _devFundSharedPercent;
    }

    function setMaxDiscountRate(uint256 _maxDiscountRate) external onlyOperator {
        maxDiscountRate = _maxDiscountRate;
    }

    function setMaxPremiumRate(uint256 _maxPremiumRate) external onlyOperator {
        maxPremiumRate = _maxPremiumRate;
    }

    function setDiscountPercent(uint256 _discountPercent) external onlyOperator {
        require(_discountPercent <= 20000, "_discountPercent is over 200%");
        discountPercent = _discountPercent;
    }

    function setPremiumThreshold(uint256 _premiumThreshold) external onlyOperator {
        require(_premiumThreshold >= gamePriceCeiling, "_premiumThreshold exceeds gamePriceCeiling");
        require(_premiumThreshold <= 150, "_premiumThreshold is higher than 1.5");
        premiumThreshold = _premiumThreshold;
    }

    function setPremiumPercent(uint256 _premiumPercent) external onlyOperator {
        require(_premiumPercent <= 20000, "_premiumPercent is over 200%");
        premiumPercent = _premiumPercent;
    }

    function setMintingFactorForPayingDebt(uint256 _mintingFactorForPayingDebt) external onlyOperator {
        require(_mintingFactorForPayingDebt == 0 || (_mintingFactorForPayingDebt >= 10000 && _mintingFactorForPayingDebt <= 20000), "_mintingFactorForPayingDebt: out of range"); // [100%, 200%]
        mintingFactorForPayingDebt = _mintingFactorForPayingDebt;
    }

    function setBondSupplyExpansionPercent(uint256 _bondSupplyExpansionPercent) external onlyOperator {
        bondSupplyExpansionPercent = _bondSupplyExpansionPercent;
    }

    /* ========== MUTABLE FUNCTIONS ========== */

    function _updateGamePrice() internal {
        try IOracle(gameOracle).update() {} catch {}
    }

    function getGameCirculatingSupply() public view returns (uint256) {
        IERC20 gameErc20 = IERC20(game);
        uint256 totalSupply = gameErc20.totalSupply();
        uint256 balanceExcluded = 0;
        uint256 entryId;
        uint256 len = excludedFromTotalSupply.length;
        for (entryId = 0; entryId < len; entryId += 1) {
            balanceExcluded = balanceExcluded.add(gameErc20.balanceOf(excludedFromTotalSupply[entryId]));
        }
        return totalSupply.sub(balanceExcluded);
    }

    function buyBonds(uint256 _gameAmount, uint256 targetPrice) external onlyOneBlock checkCondition checkOperator {
        require(_gameAmount > 0, "Treasury: cannot purchase bonds with zero amount");

        uint256 gamePrice = getGamePrice();
        require(gamePrice == targetPrice, "Treasury: GAME price moved");
        require(
            gamePrice < gamePriceOne, // price < $1
            "Treasury: gamePrice not eligible for bond purchase"
        );

        require(_gameAmount <= epochSupplyContractionLeft, "Treasury: Not enough bonds left to purchase");

        uint256 _rate = getBondDiscountRate();
        require(_rate > 0, "Treasury: invalid bond rate");

        uint256 _bondAmount = _gameAmount.mul(_rate).div(1e18);
        uint256 gameSupply = getGameCirculatingSupply();
        uint256 newBondSupply = IERC20(hodl).totalSupply().add(_bondAmount);
        require(newBondSupply <= gameSupply.mul(maxDebtRatioPercent).div(10000), "over max debt ratio");

        IBasisAsset(game).burnFrom(msg.sender, _gameAmount);
        IBasisAsset(hodl).mint(msg.sender, _bondAmount);

        epochSupplyContractionLeft = epochSupplyContractionLeft.sub(_gameAmount);
        _updateGamePrice();

        emit BoughtBonds(msg.sender, _gameAmount, _bondAmount);
    }

    function redeemBonds(uint256 _bondAmount, uint256 targetPrice) external onlyOneBlock checkCondition checkOperator {
        require(_bondAmount > 0, "Treasury: cannot redeem bonds with zero amount");

        uint256 gamePrice = getGamePrice();
        require(gamePrice == targetPrice, "Treasury: GAME price moved");
        require(
            gamePrice > gamePriceCeiling, // price > $1.01
            "Treasury: gamePrice not eligible for bond purchase"
        );

        uint256 _rate = getBondPremiumRate();
        require(_rate > 0, "Treasury: invalid bond rate");

        uint256 _gameAmount = _bondAmount.mul(_rate).div(1e18);
        require(IERC20(game).balanceOf(address(this)) >= _gameAmount, "Treasury: treasury has no more budget");

        seigniorageSaved = seigniorageSaved.sub(Math.min(seigniorageSaved, _gameAmount));

        IBasisAsset(hodl).burnFrom(msg.sender, _bondAmount);
        IERC20(game).safeTransfer(msg.sender, _gameAmount);

        _updateGamePrice();

        emit RedeemedBonds(msg.sender, _gameAmount, _bondAmount);
    }

    function _sendToTheoretics(uint256 _amount) internal {
        IBasisAsset(game).mint(address(this), _amount);

        uint256 _daoFundSharedAmount = 0;
        if (daoFundSharedPercent > 0) {
            _daoFundSharedAmount = _amount.mul(daoFundSharedPercent).div(10000);
            IERC20(game).transfer(daoFund, _daoFundSharedAmount);
            emit DaoFundFunded(block.timestamp, _daoFundSharedAmount);
        }

        uint256 _devFundSharedAmount = 0;
        if (devFundSharedPercent > 0) {
            _devFundSharedAmount = _amount.mul(devFundSharedPercent).div(10000);
            IERC20(game).transfer(devFund, _devFundSharedAmount);
            emit DevFundFunded(block.timestamp, _devFundSharedAmount);
        }

        _amount = _amount.sub(_daoFundSharedAmount).sub(_devFundSharedAmount);

        IERC20(game).safeApprove(theoretics, 0);
        IERC20(game).safeApprove(theoretics, _amount);
        ITheoretics(theoretics).allocateSeigniorage(_amount);
        emit theoreticsFunded(block.timestamp, _amount);
    }

    function _calculateMaxSupplyExpansionPercent(uint256 _gameSupply) internal returns (uint256) {
        for (uint8 tierId = 8; tierId >= 0; --tierId) {
            if (_gameSupply >= supplyTiers[tierId]) {
                maxSupplyExpansionPercent = maxExpansionTiers[tierId];
                break;
            }
        }
        return maxSupplyExpansionPercent;
    }

    function allocateSeigniorage() external onlyOneBlock checkCondition checkEpoch checkOperator {
        _updateGamePrice();
        previousEpochGamePrice = getGamePrice();
        uint256 gameSupply = getGameCirculatingSupply().sub(seigniorageSaved);
        if (epoch < bootstrapEpochs) {
            // 28 first epochs with 4.5% expansion
            _sendToTheoretics(gameSupply.mul(bootstrapSupplyExpansionPercent).div(10000));
        } else {
            if (previousEpochGamePrice > gamePriceCeiling) {
                // Expansion ($GAME Price > 1 $FTM): there is some seigniorage to be allocated
                uint256 bondSupply = IERC20(hodl).totalSupply();
                uint256 _percentage = previousEpochGamePrice.sub(gamePriceOne);
                uint256 _savedForBond = 0;
                uint256 _savedForTheoretics;
                uint256 _mse = _calculateMaxSupplyExpansionPercent(gameSupply).mul(1e14);
                if (_percentage > _mse) {
                    _percentage = _mse;
                }
                if (seigniorageSaved >= bondSupply.mul(bondDepletionFloorPercent).div(10000)) {
                    // saved enough to pay debt, mint as usual rate
                    _savedForTheoretics = gameSupply.mul(_percentage).div(1e18);
                } else {
                    // have not saved enough to pay debt, mint more
                    uint256 _seigniorage = gameSupply.mul(_percentage).div(1e18);
                    _savedForTheoretics = _seigniorage.mul(seigniorageExpansionFloorPercent).div(10000);
                    _savedForBond = _seigniorage.sub(_savedForTheoretics);
                    if (mintingFactorForPayingDebt > 0) {
                        _savedForBond = _savedForBond.mul(mintingFactorForPayingDebt).div(10000);
                    }
                }
                if (_savedForTheoretics > 0) {
                    _sendToTheoretics(_savedForTheoretics);
                }
                if (_savedForBond > 0) {
                    seigniorageSaved = seigniorageSaved.add(_savedForBond);
                    IBasisAsset(game).mint(address(this), _savedForBond);
                    emit TreasuryFunded(block.timestamp, _savedForBond);
                }
            }
        }
    }

    function governanceRecoverUnsupported(
        IERC20 _token,
        uint256 _amount,
        address _to
    ) external onlyOperator {
        // do not allow to drain core tokens
        require(address(_token) != address(game), "game");
        require(address(_token) != address(hodl), "bond");
        require(address(_token) != address(theory), "share");
        _token.safeTransfer(_to, _amount);
    }

    function theoreticsSetOperator(address _operator) external onlyOperator {
        ITheoretics(theoretics).setOperator(_operator);
    }

    function theoreticsSetLockUp(uint256 _withdrawLockupEpochs, uint256 _rewardLockupEpochs, uint256 _pegMaxUnlock) external onlyOperator {
        ITheoretics(theoretics).setLockUp(_withdrawLockupEpochs, _rewardLockupEpochs, _pegMaxUnlock);
    }

    function theoreticsAllocateSeigniorage(uint256 amount) external onlyOperator {
        ITheoretics(theoretics).allocateSeigniorage(amount);
    }

    function theoreticsGetCurrentWithdrawEpochs() public view returns (uint256) {
        return ITheoretics(theoretics).getCurrentWithdrawEpochs();
    }

    function theoreticsGetCurrentClaimEpochs() public view returns (uint256) {
        return ITheoretics(theoretics).getCurrentClaimEpochs();
    }

    function theoreticsGetWithdrawFeeOf(address _user) public view returns (uint256) {
        return ITheoretics(theoretics).getWithdrawFeeOf(_user);
    }

    function theoreticsGovernanceRecoverUnsupported(
        address _token,
        uint256 _amount,
        address _to
    ) external onlyOperator {
        ITheoretics(theoretics).governanceRecoverUnsupported(_token, _amount, _to);
    }

    function theoreticsGetLockPercentage() public view returns (uint256) {
        return ITheoretics(theoretics).getLockPercentage();
    }

    function burn(
        address _token,
        uint256 _amount
    ) external onlyOperator {
        IERC20Burnable(_token).burn(_amount); // Burn any token that we own! Now we can burn THEORY and such with no problem to deflate it.
    }

    // Allow us to delay or begin earlier if we have not started yet.
    function setStartTime(
        uint256 _time
    ) public onlyOperator
    {
        require(block.timestamp < startTime, "Already started.");
        require(block.timestamp < _time, "Time input is too early.");
        startTime = _time;
    }
}
