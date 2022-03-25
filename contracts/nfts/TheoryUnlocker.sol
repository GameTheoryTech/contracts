pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../AuthorizableNoOperator.sol";
import "../interfaces/IERC20Lockable.sol";
import "../utils/ContractGuard.sol";
pragma experimental ABIEncoderV2; //https://docs.soliditylang.org/en/v0.6.9/layout-of-source-files.html?highlight=experimental#abiencoderv2

//When deploying: Every 15 days 5 max levels, max max level is 50. Initial price = 100, buy per level = 500.
contract TheoryUnlocker is ERC721, AuthorizableNoOperator, ContractGuard {
    using Counters for Counters.Counter;
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    Counters.Counter private _tokenIds;

    struct TokenInfo
    {
        uint256 level;
        uint256 creationTime;
        uint256 lastLevelTime;
    }

    mapping(uint256 => TokenInfo) public tokenInfo;

    struct UserInfo
    {
        uint256 lastUnlockTime;
        uint256 lastLockAmount;
    }
    mapping(address => UserInfo) public userInfo;

    uint256[] public levelURIsLevel; // Used like feeStageTime
    string[] public levelURIsURI; // Used like feeStagePercentage
    uint256[] public maxLevelTime; // Used like feeStageTime
    uint256[] public maxLevelLevel; // Used like feeStagePercentage
    IERC20 public buyToken;
    uint256 public initialPrice; //Price for level 1.
    uint256 public buyTokenPerLevel;
    address public communityFund;
    uint256 public timeToLevel;
    IERC20Lockable public theory;

    //Construction
    constructor(IERC20 _buy, uint256 _initialBuy, uint256 _buyPerLevel, IERC20Lockable _theory, address _communityFund, uint256[] memory _maxLevelTime, uint256[] memory _maxLevelLevel, uint256[] memory _levelURIsLevel, string[] memory _levelURIsURI) ERC721("THEORY Unlocker", "GU") public {
        buyToken = _buy;
        initialPrice = _initialBuy;
        buyTokenPerLevel = _buyPerLevel;
        require(_levelURIsLevel.length > 0
        && _levelURIsLevel[0] == 0
            && _levelURIsURI.length == _levelURIsLevel.length,
            "Level URI arrays must be equal in non-zero length and level should start at 0.");
        require(_maxLevelTime.length > 0
        && _maxLevelTime[0] == 0
            && _maxLevelLevel.length == _maxLevelTime.length,
            "Max level arrays must be equal in non-zero length and time should start at 0.");
        uint256 i;
        uint256 len = _maxLevelLevel.length;
        for(i = 0; i < len; i += 1)
        {
            require(_maxLevelLevel[i] <= 100, "Max level can't be higher than 100."); //In practice, this will be 50, but there is no point in making it lower here, does more harm than good.
        }
        levelURIsLevel = _levelURIsLevel;
        levelURIsURI = _levelURIsURI;
        maxLevelTime = _maxLevelTime;
        maxLevelLevel = _maxLevelLevel;
        communityFund = _communityFund;
        timeToLevel = 3 days;
        theory = _theory;
    }

    //Administrative functions
    function setBuyToken(IERC20 _buy) public onlyAuthorized
    {
        buyToken = _buy;
    }

    function setInitialPrice(uint256 _initial) public onlyAuthorized
    {
        initialPrice = _initial;
    }

    function setBuyTokenPerLevel(uint256 _perLevel) public onlyAuthorized
    {
        buyTokenPerLevel = _perLevel;
    }

    function setLevelURIs(uint256[] memory _levelURIsLevel, string[] memory _levelURIsURI) public onlyAuthorized
    {
        require(_levelURIsLevel.length > 0
        && _levelURIsLevel[0] == 0
            && _levelURIsURI.length == _levelURIsLevel.length,
            "Level URI arrays must be equal in non-zero length and level should start at 0.");
        levelURIsLevel = _levelURIsLevel;
        levelURIsURI = _levelURIsURI;
    }

    function setMaxLevel(uint256[] memory _maxLevelTime, uint256[] memory _maxLevelLevel) public onlyAuthorized
    {
        require(_maxLevelTime.length > 0
        && _maxLevelTime[0] == 0
            && _maxLevelLevel.length == _maxLevelTime.length,
            "Max level arrays must be equal in non-zero length and time should start at 0.");
        uint256 i;
        uint256 len = _maxLevelLevel.length;
        for(i = 0; i < len; i += 1)
        {
            require(_maxLevelLevel[i] <= 100, "Max level can't be higher than 100."); //In practice, this will be 50, but there is no point in making it lower here, does more harm than good.
        }
        maxLevelTime = _maxLevelTime;
        maxLevelLevel = _maxLevelLevel;
    }

    function setCommunityFund(address _fund) public onlyAuthorized
    {
        communityFund = _fund;
    }
    //setTheory? //Maybe not, can't think of a reason why we'd need this as THEORY can't be redeployed.
    function setTimeToLevel(uint256 _time) public onlyAuthorized
    {
        timeToLevel = _time;
    }

    function setTokenLevel(uint256 tokenId, uint256 level) public onlyAuthorized
    {
        require(level > 0 && level <= maxLevel(), "Level must be > 0 and <= max level.");
        tokenInfo[tokenId].level = level;
    }

    function setCreationTime(uint256 tokenId, uint256 time) public onlyAuthorized
    {
        tokenInfo[tokenId].creationTime = time;
    }

    function setLastLevelTime(uint256 tokenId, uint256 time) public onlyAuthorized
    {
        tokenInfo[tokenId].lastLevelTime = time;
    }

    function setLastUnlockTime(address user, uint256 time) public onlyAuthorized
    {
        userInfo[user].lastUnlockTime = time;
    }

    function setLastLockAmount(address user, uint256 amount) public onlyAuthorized
    {
        userInfo[user].lastLockAmount = amount;
    }

    //Data functions
    function maxLevel() public view returns (uint256)
    {
        uint256 maxLevel = 0;
        uint256 len = maxLevelTime.length;
        uint256 n;
        uint256 i;
        for (n = len; n > 0; n -= 1) {
            i = n-1;
            if(block.timestamp >= maxLevelTime[i])
            {
                maxLevel = maxLevelLevel[i];
                break;
            }
        }
        return maxLevel;
    }

    function levelURI(uint256 level) public view returns (string memory)
    {
        string memory URI = '';
        uint256 len = levelURIsLevel.length;
        uint256 n;
        uint256 i;
        for (n = len; n > 0; n -= 1) {
            i = n-1;
            if(level >= levelURIsLevel[i])
            {
                URI = levelURIsURI[i];
                break;
            }
        }
        return URI;
    }

    function costOf(uint256 level) external view returns (uint256)
    {
        return initialPrice.add(buyTokenPerLevel.mul(level.sub(1)));
    }

    function timeLeftToLevel(uint256 tokenId) external view returns (uint256)
    {
        uint256 nextLevelTime = tokenInfo[tokenId].lastLevelTime.add(timeToLevel);
        if(block.timestamp >= nextLevelTime)
        {
            return 0;
        }
        return nextLevelTime.sub(block.timestamp);
    }

    function nextLevelTime(uint256 tokenId) external view returns (uint256)
    {
        return tokenInfo[tokenId].lastLevelTime.add(timeToLevel);
    }

    //Core functionality
    function mint(uint256 level) onlyOneBlock public returns (uint256) {
        require(level > 0 && level <= maxLevel(), "Level must be > 0 and <= max level.");
        address player = msg.sender;
        uint256 amount = initialPrice.add(buyTokenPerLevel.mul(level.sub(1)));
        buyToken.safeTransferFrom(msg.sender, communityFund, amount);
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        TokenInfo storage token = tokenInfo[newItemId];
        token.creationTime = block.timestamp;
        token.lastLevelTime = block.timestamp;
        _mint(player, newItemId);
        token.level = level;
        string memory tokenURI = levelURI(level);
        require(bytes(tokenURI).length > 0, "Token URI is invalid.");
        _setTokenURI(newItemId, tokenURI);

        return newItemId;
    }

    //Make sure to have a warning on the website if they try to merge while one of these tokens can level up!
    function merge(uint256 tokenId1, uint256 tokenId2) onlyOneBlock public returns (uint256) {
        require(ownerOf(tokenId1) == msg.sender || authorized[msg.sender] || owner() == msg.sender, "Not enough permissions for token 1.");
        require(ownerOf(tokenId2) == msg.sender || authorized[msg.sender] || owner() == msg.sender, "Not enough permissions for token 2.");
        require(ownerOf(tokenId1) == ownerOf(tokenId2), "Both tokens must have the same owner.");
        uint256 level = tokenInfo[tokenId1].level.add(tokenInfo[tokenId2].level); //Add the two levels together.
        require(level > 0 && level <= maxLevel(), "Level must be > 0 and <= max level.");
        address player = ownerOf(tokenId1);
        //Burn originals.
        _burn(tokenId1);
        _burn(tokenId2);

        //Mint a new one.
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        TokenInfo storage token = tokenInfo[newItemId];
        token.creationTime = block.timestamp;
        token.lastLevelTime = block.timestamp;
        _mint(player, newItemId);
        token.level = level;
        string memory tokenURI = levelURI(level);
        require(bytes(tokenURI).length > 0, "Token URI is invalid.");
        _setTokenURI(newItemId, tokenURI);

        return newItemId;
    }

    function levelUp(uint256 tokenId) onlyOneBlock public {
        require(ownerOf(tokenId) == msg.sender || authorized[msg.sender] || owner() == msg.sender, "Not enough permissions.");
        TokenInfo storage token = tokenInfo[tokenId];
        require(token.level < maxLevel(), "Level must be lower than max level.");
        uint256 nextLevelTime = token.lastLevelTime.add(timeToLevel);
        require(block.timestamp >= nextLevelTime, "Too early to level up.");

        //Level up.
        //creationTime[newItemId] = block.timestamp; //Same creation time.
        token.lastLevelTime = nextLevelTime;
        //_mint(player, newItemId); //Same ID.
        uint256 level = token.level.add(1);
        token.level = level;
        string memory tokenURI = levelURI(level);
        require(bytes(tokenURI).length > 0, "Token URI is invalid.");
        _setTokenURI(tokenId, tokenURI);
    }

    //Should be called:
    //When lockOf(player) == 0 - Instead of theory.unlock() [disabled on website]
    //When lockOf(player) <= theory.canUnlockAmount(player) - After theory.unlock() [to avoid revert, knew I should have listened to my gut and put a check for the second _unlock]
    //When lockOf(player) > theory.canUnlockAmount(player) - Instead of theory.unlock()
    function nftUnlock(uint256 tokenId) onlyOneBlock public { //Find the best tokenId to use off the blockchain using tokenOfOwnerByIndex and balanceOf
        require(ownerOf(tokenId) == msg.sender || authorized[msg.sender] || owner() == msg.sender, "Not enough permissions.");
        address player = ownerOf(tokenId);
        UserInfo storage user = userInfo[player];
        require(block.timestamp > user.lastUnlockTime, "Logic error.");

        uint256 amountLocked = theory.lockOf(player);
        if(amountLocked == 0)
        {
            user.lastUnlockTime = block.timestamp;
            user.lastLockAmount = amountLocked; //Only update.
            return;
        }

        uint256 pendingLocked = theory.canUnlockAmount(player);
        require(amountLocked > pendingLocked, "Too much to unlock naturally, please call unlock() first."); //Can't update, just revert.

        amountLocked = amountLocked.sub(pendingLocked); //Amount after unlocking naturally.
        if(!(amountLocked > user.lastLockAmount)) //Can't unlock in good faith.
        {
            theory.unlockForUser(player, 0); //Unlock the natural amount.
            user.lastUnlockTime = block.timestamp;
            user.lastLockAmount = theory.lockOf(player); //Update so that the player may unlock in the future.
            return;
        }

        amountLocked = amountLocked.sub(user.lastLockAmount); //Amount after taking into account amount already unlocked.

        //Amount to unlock = Level% of locked amount calculated above
        uint256 amountToUnlock = amountLocked.mul(tokenInfo[tokenId].level).div(100);

        theory.unlockForUser(player, amountToUnlock);

        user.lastUnlockTime = block.timestamp;
        user.lastLockAmount = theory.lockOf(player); //Set to lock amount AFTER unlock. Can only unlock any more locked will be used.
    }
}