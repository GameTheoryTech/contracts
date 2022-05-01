// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./AuthorizableNoOperator.sol";
import "./utils/ContractGuard.sol";
pragma experimental ABIEncoderV2;

contract Marketplace is AuthorizableNoOperator, ReentrancyGuard, ContractGuard {
    using Counters for Counters.Counter;
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    Counters.Counter private _marketItemIds;
    Counters.Counter private _tokensSold;
    Counters.Counter private _tokensCanceled;

    address public communityFund;
    IERC20 public buyToken; // Token address for buying NFT
    bool public mutex = false; // secure flag
    uint256 private feeRate = 25; // market fee in percent 2.5%, this should be integer in declare

    mapping(uint256 => MarketItem) private marketItemIdToMarketItem;

    struct MarketItem {
        uint256 marketItemId;
        address nftContractAddress; // NFT contract address
        uint256 tokenId; // NFT token ID
        uint256 genNumber; // identifier for Gen0 and Gen1
        address seller; // NFT seller address
        address owner; // NFT owner address
        uint256 price; // price for sell
        bool sold; // boolean for sold
        bool canceled; // boolean for canceled
    }

    event MarketItemCreated(
        uint256 indexed marketItemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        uint256 genNumber,
        address seller,
        address owner,
        uint256 price,
        bool sold,
        bool canceled
    );

    //Construction
    constructor(IERC20 _buy, address _communityFund) public {
        buyToken = _buy;
        communityFund = _communityFund;
    }

    //Administrative functions

    /// @notice change Buy token address
    function setBuyToken(IERC20 _buy) public onlyAuthorized {
        buyToken = _buy;
    }

    /// @notice change Market fee, it should be integer and * 1000, if 2.5%, it should be 25
    function setFeeRate(uint256 _newFeeRate) public onlyAuthorized {
        feeRate = _newFeeRate;
    }

    /// @notice get current market fee
    function getFeeRate() public view returns (uint256) {
        return feeRate;
    }

    /// @notice get market item price
    function getPrice(uint256 marketItemId) public view returns (uint256) {
        return marketItemIdToMarketItem[marketItemId].price;
    }

    /// @notice change Community Fund address
    function setCommunityFund(address _newCommunityFund) public onlyAuthorized {
        communityFund = _newCommunityFund;
    }

    /// @notice let Admin withdraw deposited any Token(Game) from this contract
    function withdrawTokens(address tokenAddress) public onlyAuthorized {
        // get balance of token in contract
        uint256 tokenBalance = IERC20(tokenAddress).balanceOf(address(this));
        require(tokenBalance > 0, "Owner has no balance to withdraw");
        // transfer token balance to communityFund
        IERC20(tokenAddress).transfer(communityFund, tokenBalance);
    }

    // Main functions

    /// @notice Creates a market item listing, transfering the NFT from msg.sender to the marketplace contract.
    function createMarketItem(
        address nftContractAddress,
        uint256 tokenId,
        uint256 genNumber,
        uint256 price
    ) public nonReentrant returns (uint256) {
        require(price > 0, "Price must be greater than 0");

        _marketItemIds.increment();
        uint256 marketItemId = _marketItemIds.current();
        // set a new market item
        marketItemIdToMarketItem[marketItemId] = MarketItem(
            marketItemId,
            nftContractAddress,
            tokenId,
            genNumber,
            msg.sender,
            address(0),
            price,
            false,
            false
        );
        // transfer a NFT from NFT owner to marketplace
        IERC721(nftContractAddress).transferFrom(
            msg.sender,
            address(this),
            tokenId
        );

        // emit a new market item event
        emit MarketItemCreated(
            marketItemId,
            nftContractAddress,
            tokenId,
            genNumber,
            msg.sender,
            address(0),
            price,
            false,
            false
        );

        return marketItemId;
    }

    /// @notice Cancel a market item
    function cancelMarketItem(address nftContractAddress, uint256 marketItemId)
        public
        nonReentrant
    {
        uint256 tokenId = marketItemIdToMarketItem[marketItemId].tokenId;
        require(tokenId > 0, "Market item has to exist");
        require(
            marketItemIdToMarketItem[marketItemId].seller == msg.sender,
            "You are not the seller"
        );
        // transfer NFT from marketplace to NFT owner
        IERC721(nftContractAddress).transferFrom(
            address(this),
            msg.sender,
            tokenId
        );
        // re-set market item owner
        marketItemIdToMarketItem[marketItemId].owner = msg.sender;
        marketItemIdToMarketItem[marketItemId].canceled = true;

        _tokensCanceled.increment();
    }

    /// @notice Get Latest Market Item by the token id
    function getLatestMarketItemByTokenId(uint256 tokenId)
        public
        view
        returns (MarketItem memory, bool)
    {
        uint256 itemsCount = _marketItemIds.current();

        for (uint256 i = itemsCount; i > 0; i--) {
            MarketItem memory item = marketItemIdToMarketItem[i];
            if (item.tokenId != tokenId) continue;
            return (item, true);
        }

        MarketItem memory emptyMarketItem;
        return (emptyMarketItem, false);
    }

    /// @notice Creates a market sale by transfering buyer's buytoken to the seller and
    /// NFT token from the marketplace to the buyer.
    /// It also sends the Market Fee to the Community Fund
    function createMarketSale(address nftContractAddress, uint256 marketItemId)
        public
        onlyOneBlock
        nonReentrant
    {
        uint256 price = marketItemIdToMarketItem[marketItemId].price;
        uint256 tokenId = marketItemIdToMarketItem[marketItemId].tokenId;
        address seller = marketItemIdToMarketItem[marketItemId].seller;
        // set flag
        require(!mutex);
        mutex = true;
        require(price > 0, "The Price must be greater than 0");
        require(
            buyToken.balanceOf(msg.sender) >= price,
            "insufficient buy token in your wallet"
        );
        // calculate the amounts to be sent in price
        uint256 fullPrice = 1000;
        uint256 amountToSeller = price.mul(fullPrice.sub(feeRate)).div(1000);
        uint256 amountToFund = price.mul(feeRate).div(1000);

        // price-fee to seller
        require(
            buyToken.transferFrom(msg.sender, seller, amountToSeller),
            "BuyToken transfer to seller failed"
        );
        // market fee to community fund
        require(
            buyToken.transferFrom(msg.sender, communityFund, amountToFund),
            "Market fee transfer failed"
        );
        // set market item params
        marketItemIdToMarketItem[marketItemId].owner = msg.sender;
        marketItemIdToMarketItem[marketItemId].sold = true;

        // send NFT to buyer
        IERC721(nftContractAddress).transferFrom(
            address(this),
            msg.sender,
            tokenId
        );

        _tokensSold.increment();
        // cancel flag
        mutex = false;
    }

    /// @notice Fetch available market items (non-sold and non-canceled)
    function fetchAvailableMarketItems()
        public
        view
        returns (MarketItem[] memory)
    {
        uint256 itemsCount = _marketItemIds.current();
        uint256 soldItemsCount = _tokensSold.current();
        uint256 canceledItemsCount = _tokensCanceled.current();
        uint256 availableItemsCount = itemsCount -
            soldItemsCount -
            canceledItemsCount;
        MarketItem[] memory marketItems = new MarketItem[](availableItemsCount);

        // get availables only
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < itemsCount; i++) {
            MarketItem memory item = marketItemIdToMarketItem[i + 1];
            if (item.owner != address(0)) continue;
            marketItems[currentIndex] = item;
            currentIndex += 1;
        }

        return marketItems;
    }

    /// @notice compare strings
    function compareStrings(string memory a, string memory b)
        private
        pure
        returns (bool)
    {
        return (keccak256(abi.encodePacked((a))) ==
            keccak256(abi.encodePacked((b))));
    }

    /// @notice this function selects the address we're looking for between "owner" and "seller"
    function getMarketItemAddressByProperty(
        MarketItem memory item,
        string memory property
    ) private pure returns (address) {
        require(
            compareStrings(property, "seller") ||
                compareStrings(property, "owner"),
            "Parameter must be 'seller' or 'owner'"
        );

        return compareStrings(property, "seller") ? item.seller : item.owner;
    }

    /// @notice Fetch market items that are being listed by the msg.sender
    function fetchSellingMarketItems()
        public
        view
        returns (MarketItem[] memory)
    {
        return fetchMarketItemsByAddressProperty("seller");
    }

    /// @notice Fetch market items that are owned by the msg.sender
    function fetchOwnedMarketItems() public view returns (MarketItem[] memory) {
        return fetchMarketItemsByAddressProperty("owner");
    }

    /// @notice Fetches market items according to the its requested address property that can be "owner" or "seller"
    function fetchMarketItemsByAddressProperty(string memory _addressProperty)
        public
        view
        returns (MarketItem[] memory)
    {
        require(
            compareStrings(_addressProperty, "seller") ||
                compareStrings(_addressProperty, "owner"),
            "Parameter must be 'seller' or 'owner'"
        );
        uint256 totalItemsCount = _marketItemIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalItemsCount; i++) {
            MarketItem storage item = marketItemIdToMarketItem[i + 1];
            address addressPropertyValue = getMarketItemAddressByProperty(
                item,
                _addressProperty
            );
            if (addressPropertyValue != msg.sender) continue;
            itemCount += 1;
        }

        MarketItem[] memory items = new MarketItem[](itemCount);

        for (uint256 i = 0; i < totalItemsCount; i++) {
            MarketItem storage item = marketItemIdToMarketItem[i + 1];
            address addressPropertyValue = getMarketItemAddressByProperty(
                item,
                _addressProperty
            );
            if (addressPropertyValue != msg.sender) continue;
            items[currentIndex] = item;
            currentIndex += 1;
        }

        return items;
    }
}
