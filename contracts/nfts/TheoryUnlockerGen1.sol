pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../AuthorizableNoOperator.sol";
import "../interfaces/IERC20Lockable.sol";
import "../utils/ContractGuard.sol";
import "../interfaces/ITheoryUnlocker.sol";
pragma experimental ABIEncoderV2; //https://docs.soliditylang.org/en/v0.6.9/layout-of-source-files.html?highlight=experimental#abiencoderv2

//When deploying: Every 15 days 5 max levels, max max level is 50. Initial price and buy per level = 500 worth of THEORY [determined at deploy time].
//Deploy with same timeframe as Gen 0
contract TheoryUnlockerGen1 is ERC721, AuthorizableNoOperator, ContractGuard {
    using Counters for Counters.Counter;
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    Counters.Counter private _tokenIds;

    struct TokenInfo
    {
        uint256 level;
        uint256 creationTime;
        uint256 lastLevelTime;
        bool merged;
    }

    mapping(uint256 => TokenInfo) public tokenInfo;

    //UserInfo is shared with Gen 0, so below is not needed.
    //mapping(address => UserInfo) public userInfo;

    uint256[] public levelURIsLevel; // Used like feeStageTime
    string[] public levelURIsURI; // Used like feeStagePercentage
    uint256[] public levelURIsMax; // Used like feeStagePercentage
    uint256[] public levelURIsSupply; // Used like feeStagePercentage

    uint256[] public maxLevelTime; // Used like feeStageTime
    uint256[] public maxLevelLevel; // Used like feeStagePercentage
    IERC20 public buyToken;
    uint256 public initialPrice; //Price for level 1.
    uint256 public buyTokenPerLevel;
    address public communityFund;
    uint256 public timeToLevel;
    IERC20Lockable public theory;
    bool public disableMint; // Limited time only?! Would give more worth in marketplace the for our early investors.
    bool public emergencyDisableUnlock; // EMERGENCY ONLY.
    ITheoryUnlocker TheoryUnlockerGen0;

    //Construction
    constructor(IERC20 _buy, uint256 _initialBuy, uint256 _buyPerLevel, IERC20Lockable _theory, address _communityFund, ITheoryUnlocker _gen0, uint256[] memory _maxLevelTime, uint256[] memory _maxLevelLevel, uint256[] memory _levelURIsLevel, string[] memory _levelURIsURI, uint256[] memory _levelURIsMax) ERC721("THEORY Unlocker Gen 1", "TUG1") public {
        buyToken = _buy;
        require(_initialBuy >= _buyPerLevel, "Initial price must be lower than buy per level.");
        initialPrice = _initialBuy;
        buyTokenPerLevel = _buyPerLevel;
        require(_levelURIsLevel.length > 0
        && _levelURIsLevel[0] == 0
            && _levelURIsURI.length == _levelURIsLevel.length
            && _levelURIsMax.length == _levelURIsLevel.length,
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
        levelURIsMax = _levelURIsMax;

        len = levelURIsLevel.length;
        for(i = 0; i < len; i += 1)
        {
            levelURIsSupply.push(0);
        }

        maxLevelTime = _maxLevelTime;
        maxLevelLevel = _maxLevelLevel;
        communityFund = _communityFund;
        timeToLevel = 3 days;
        theory = _theory;
        disableMint = false;
        emergencyDisableUnlock = false;
        TheoryUnlockerGen0 = _gen0;
    }

    //Administrative functions
    function setBuyToken(IERC20 _buy) public onlyAuthorized
    {
        buyToken = _buy;
    }

    function setPrices(uint256 _initial, uint256 _perLevel) public onlyAuthorized
    {
        require(_initial >= _perLevel, "Initial price must be lower than buy per level.");
        initialPrice = _initial;
        buyTokenPerLevel = _perLevel;
    }

    //Be careful with this and any function modifying supply. It must match up.
    function setLevelURIs(uint256[] memory _levelURIsLevel, string[] memory _levelURIsURI, uint256[] memory _levelURIsMax, uint256[] memory _levelURIsSupply) public onlyAuthorized
    {
        require(_levelURIsLevel.length > 0
        && _levelURIsLevel[0] == 0
            && _levelURIsURI.length == _levelURIsLevel.length
            && _levelURIsMax.length == _levelURIsLevel.length
            && _levelURIsSupply.length == _levelURIsLevel.length,
            "Level URI arrays must be equal in non-zero length and level should start at 0.");
        //Require _levelURIsURI must be unique. This is easier to forget (and more harmful) than the fact that levels should be in order, so check it.
//        mapping (bytes32 => bool) storage uniq;
//        //mapping (string => bool) memory uniq;
//        uint256 i;
//        uint256 len = _levelURIsURI.length;
//        for(i = 0; i < len; i++)
//        {
//            bytes32 hash = keccak256(bytes(_levelURIsURI[i]));
//            require(!uniq[hash], "All URIs must be unique.");
//            uniq[hash] = true;
//            //TODO: Test gas cost of this vs the above
//            //string memory URI = _levelURIsURI[i];
//            //require(uniq[URI] == false);
//            //uniq[URI] = true;
//        }
        levelURIsLevel = _levelURIsLevel;
        levelURIsURI = _levelURIsURI;
        levelURIsMax = _levelURIsMax;
        levelURIsSupply = _levelURIsSupply;
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

    function setDisableMint(bool _disable) public onlyAuthorized
    {
        disableMint = _disable;
    }

    //EMERGENCY ONLY. To stop an unlock bug/exploit (since it calls an external contract) and/or protect investors' funds.
    function setEmergencyDisableUnlock(bool _disable) public onlyAuthorized
    {
        emergencyDisableUnlock = _disable;
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
        TheoryUnlockerGen0.setLastUnlockTime(user, time);
    }

    function setLastLockAmount(address user, uint256 amount) public onlyAuthorized
    {
        TheoryUnlockerGen0.setLastLockAmount(user, amount);
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

    function supply(uint256 level) public view returns (uint256)
    {
        uint256 supply = 0;
        uint256 len = levelURIsLevel.length;
        uint256 n;
        uint256 i;
        for (n = len; n > 0; n -= 1) {
            i = n-1;
            if(level >= levelURIsLevel[i])
            {
                supply = levelURIsSupply[i];
                break;
            }
        }
        return supply;
    }

    function maxSupply(uint256 level) public view returns (uint256)
    {
        uint256 maxSupply = 0;
        uint256 len = levelURIsLevel.length;
        uint256 n;
        uint256 i;
        for (n = len; n > 0; n -= 1) {
            i = n-1;
            if(level >= levelURIsLevel[i])
            {
                maxSupply = levelURIsMax[i];
                break;
            }
        }
        return maxSupply;
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

    //This or theory.canUnlockAmount > 0? Enable button.
    function canUnlockAmount(address player, uint256 tokenId) external view returns (uint256)
    {
        ITheoryUnlocker.UserInfo memory user = TheoryUnlockerGen0.userInfo(player);

        uint256 amountLocked = theory.lockOf(player);
        if(amountLocked == 0)
        {
            return 0;
        }

        uint256 pendingUnlock = theory.canUnlockAmount(player);
        if(!(amountLocked > pendingUnlock))
        {
            return 0;
        }

        amountLocked = amountLocked.sub(pendingUnlock); //Amount after unlocking naturally.
        if(!(amountLocked > user.lastLockAmount)) //Can't unlock in good faith.
        {
            return 0;
        }

        amountLocked = amountLocked.sub(user.lastLockAmount); //Amount after taking into account amount already unlocked.

        //Amount to unlock = Level% of locked amount calculated above
        uint256 amountToUnlock = amountLocked.mul(tokenInfo[tokenId].level).div(100);

        return amountToUnlock;
    }

    //Internal functions
    function addSupply(uint256 level, uint256 amount) internal
    {
        uint256 len = levelURIsLevel.length;
        uint256 n;
        uint256 i;
        for (n = len; n > 0; n -= 1) {
            i = n-1;
            if(level >= levelURIsLevel[i])
            {
                levelURIsSupply[i] += amount;
                break;
            }
        }
    }

    //From: https://ethereum.stackexchange.com/questions/30912/how-to-compare-strings-in-solidity by Joel M Ward
    function memcmp(bytes memory a, bytes memory b) internal pure returns(bool){
        return (a.length == b.length) && (keccak256(a) == keccak256(b));
    }
    function strcmp(string memory a, string memory b) internal pure returns(bool){
        return memcmp(bytes(a), bytes(b));
    }

    function removeSupply(string memory URI, uint256 amount) internal
    {
        uint256 len = levelURIsURI.length;
        uint256 n;
        uint256 i;
        for (n = len; n > 0; n -= 1) {
            i = n-1;
            if(strcmp(URI, levelURIsURI[i]))
            {
                levelURIsSupply[i] -= amount;
                break;
            }
        }
    }

    //Core functionality
    function mint(uint256 level) onlyOneBlock public returns (uint256) {
        require(!disableMint, "You can no longer mint this NFT.");
        require(level > 0 && level <= maxLevel(), "Level must be > 0 and <= max level.");
        address player = msg.sender;
        uint256 amount = initialPrice.add(buyTokenPerLevel.mul(level.sub(1)));
        buyToken.safeTransferFrom(msg.sender, communityFund, amount);
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        TokenInfo storage token = tokenInfo[newItemId];
        token.creationTime = block.timestamp;
        token.lastLevelTime = block.timestamp;
        addSupply(level, 1);
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
        require(!tokenInfo[tokenId1].merged, "Token 1 has already been merged. Gen 1 NFTs can only be merged once.");
        require(!tokenInfo[tokenId2].merged, "Token 2 has already been merged. Gen 1 NFTs can only be merged once.");
        uint256 level = tokenInfo[tokenId1].level.add(tokenInfo[tokenId2].level); //Add the two levels together.
        require(level > 0 && level <= maxLevel(), "Level must be > 0 and <= max level.");
        address player = ownerOf(tokenId1);
        string memory _tokenURI = tokenURI(tokenId1); //Takes the URI of the FIRST token. Make sure to warn users of this.
        //Burn originals.
        _burn(tokenId1); //Don't need to change tokenURI supply because we are adding one.
        removeSupply(tokenURI(tokenId2), 1);
        _burn(tokenId2);

        //Mint a new one.
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        TokenInfo storage token = tokenInfo[newItemId];
        token.creationTime = block.timestamp;
        token.lastLevelTime = block.timestamp;
        _mint(player, newItemId);
        token.level = level;
        token.merged = true;
        require(bytes(_tokenURI).length > 0, "Token URI is invalid.");
        _setTokenURI(newItemId, _tokenURI);

        return newItemId;
    }

    function _levelInternal(uint256 tokenId) internal {
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
        //string memory tokenURI = levelURI(level);
        //require(bytes(tokenURI).length > 0, "Token URI is invalid.");
        //_setTokenURI(tokenId, tokenURI);
    }

    function levelUp(uint256 tokenId) onlyOneBlock public {
        _levelInternal(tokenId);
    }

    function levelUpTo(uint256 tokenId, uint256 theLevel) onlyOneBlock public {
        require(theLevel > tokenInfo[tokenId].level && theLevel <= maxLevel(), "Level must be lower than max level and higher than current.");
        require(block.timestamp >= tokenInfo[tokenId].lastLevelTime.add(timeToLevel), "Too early to level up.");
        while(tokenInfo[tokenId].level < theLevel && block.timestamp >= tokenInfo[tokenId].lastLevelTime.add(timeToLevel))
        {
            _levelInternal(tokenId);
        }
    }

    function levelUpToMax(uint256 tokenId) onlyOneBlock public {
        require(block.timestamp >= tokenInfo[tokenId].lastLevelTime.add(timeToLevel), "Too early to level up.");
        while(block.timestamp >= tokenInfo[tokenId].lastLevelTime.add(timeToLevel))
        {
            _levelInternal(tokenId);
        }
    }

    //Should be called:
    //When lockOf(player) == 0 - Instead of theory.unlock() [disabled on website]
    //When lockOf(player) <= theory.canUnlockAmount(player) - After theory.unlock() [to avoid revert, knew I should have listened to my gut and put a check for the second _unlock]
    //When lockOf(player) > theory.canUnlockAmount(player) - Instead of theory.unlock()
    function nftUnlock(uint256 tokenId) onlyOneBlock public { //Find the best tokenId to use off the blockchain using tokenOfOwnerByIndex and balanceOf
        require(!emergencyDisableUnlock, "NFT unlocking has been disabled in an emergency.");
        require(ownerOf(tokenId) == msg.sender || authorized[msg.sender] || owner() == msg.sender, "Not enough permissions.");
        address player = ownerOf(tokenId);
        ITheoryUnlocker.UserInfo memory pastUserInfo = TheoryUnlockerGen0.userInfo(player);
        require(block.timestamp > pastUserInfo.lastUnlockTime, "Logic error.");

        uint256 amountLocked = theory.lockOf(player);
        if(amountLocked == 0)
        {
            TheoryUnlockerGen0.setLastUnlockTime(player, block.timestamp);
            TheoryUnlockerGen0.setLastLockAmount(player, amountLocked); //Only update.
            return;
        }

        uint256 pendingUnlock = theory.canUnlockAmount(player);
        require(amountLocked > pendingUnlock, "Too much to unlock naturally, please call unlock() first."); //Can't update, just revert.

        amountLocked = amountLocked.sub(pendingUnlock); //Amount after unlocking naturally.
        if(!(amountLocked > pastUserInfo.lastLockAmount)) //Can't unlock in good faith. Only time this would happen (currently), the lock rate is 0 anyways.
        {
            theory.unlockForUser(player, 0); //Unlock the natural amount.
            TheoryUnlockerGen0.setLastUnlockTime(player, block.timestamp);
            TheoryUnlockerGen0.setLastLockAmount(player, theory.lockOf(player)); //Update so that the player may unlock in the future.
            return;
        }

        amountLocked = amountLocked.sub(pastUserInfo.lastLockAmount); //Amount after taking into account amount already unlocked.

        //Amount to unlock = Level% of locked amount calculated above
        uint256 amountToUnlock = amountLocked.mul(tokenInfo[tokenId].level).div(100);

        theory.unlockForUser(player, amountToUnlock);

        TheoryUnlockerGen0.setLastUnlockTime(player, block.timestamp);
        TheoryUnlockerGen0.setLastLockAmount(player, theory.lockOf(player)); //Set to lock amount AFTER unlock. Can only unlock any more locked will be used.
    }
}