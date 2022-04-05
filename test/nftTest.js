const { ethers } = require('hardhat');
const { expect, assert, should, eventually } = require('chai');
const { smockit } = require('@defi-wonderland/smock');
const { intToBuffer } = require('ethjs-util');
const { BigNumber } = require('@ethersproject/bignumber');
const { smock } = require('@defi-wonderland/smock');
const chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
const hre = require("hardhat");
const {setTime, advanceTime} = require("./shared/utilities");
const {getCurrentTimestamp} = require("hardhat/internal/hardhat-network/provider/utils/getCurrentTimestamp");

chai.use(chaiAsPromised);

async function latestBlocktime(provider) {
    const { timestamp } = await provider.getBlock('latest');
    return timestamp;
}
//TODO: Check lock
//TODO: Check lock decay
//TODO: Check multiplier
//TODO: Make sure no lock after pools are over
//TODO: Test slashing fees
//TODO: Test all new set functions (lock, fees, multiplier, etc.)
describe('nftTests', function () {
    var pToken;
    var bToken;
    var sToken;
    var treasuryDAO;
    var theoretics;
    var oracle;
    var genesisPool;
    var theoryRewardPool;
    var iToken;
    var pTokenPairAddress;
    var sTokenPairAddress;
    var deployer;
    var daofund;
    var devfund;
    var theoryUnlocker;
    var theoryUnlockerGen1;
    var spookySwapFactory;
    var spookySwapRouter;
    var startTime;
    const seconds = BigNumber.from(1);
    const minutes = seconds.mul(60);
    const hours = minutes.mul(60);
    const days = hours.mul(24);
    const weeks = days.mul(7);
    const years = days.mul(365);

    const onePointTen = BigNumber.from('1100000000000000000');
    const one = BigNumber.from('1000000000000000000');
    const half = BigNumber.from('500000000000000000');
    const ten = BigNumber.from('10000000000000000000');
    const oneHundred = BigNumber.from('100000000000000000000');
    const oneTenth = BigNumber.from('100000000000000000');
    const oneHundredth = BigNumber.from('10000000000000000');
    const zero = BigNumber.from('0');
    const oneBillion = BigNumber.from('1000000000000000000000000000');
    const pTokenPriceCeiling = BigNumber.from('1010000000000000000');
    const period = hours.mul(6);

    beforeEach('deploy new treasury', async () => {
        [deployer, daofund, devfund] = await ethers.getSigners();

        this.timeout(0);
        const MockInvestToken = await hre.ethers.getContractFactory("DummyToken");
        iToken = await MockInvestToken.deploy();
        await iToken.deployed();
        const iTokenDecimals = await iToken.decimals();
        console.log("- MockInvestToken deployed to:", iToken.address);
        console.log("MockInvestToken decimals:", iTokenDecimals);

        const GameToken = await smock.mock("Game");
        pToken = await GameToken.deploy();
        await pToken.deployed();
        const pTokenDecimals = await pToken.decimals();
        console.log("- GameToken deployed to:", pToken.address);
        console.log("GameToken decimals:", pTokenDecimals);

        const bondToken = await smock.mock("HODL");
        bToken = await bondToken.deploy();
        await bToken.deployed();
        const bTokenDecimals = await bToken.decimals();
        console.log("- HODLToken deployed to:", bToken.address);
        console.log("HODLToken decimals:", bTokenDecimals);

        const blockTime = await latestBlocktime(ethers.provider);
        startTime = BigNumber.from(blockTime).add(period);

        const TheoryToken = await hre.ethers.getContractFactory("Theory");
        // Start unlocking after 365 days, and fully unlock 365 days after that.
        sToken = await TheoryToken.deploy(startTime, daofund.address, devfund.address, startTime.add(years), startTime.add(years.mul(2)));
        await sToken.deployed();
        const sTokenDecimals = await sToken.decimals();
        console.log("- TheoryToken deployed to:", sToken.address);
        console.log("TheoryToken decimals:", sTokenDecimals);

        const Treasury = await smock.mock("Treasury");
        treasuryDAO = await Treasury.deploy();
        await treasuryDAO.deployed();
        console.log("-- DAO Treasury deployed to:", treasuryDAO.address);

        const Theoretics = await hre.ethers.getContractFactory("Theoretics");
        theoretics = await Theoretics.deploy();
        await theoretics.deployed();
        console.log("-- Theoretics deployed to:", theoretics.address);

        const GenesisPool = await hre.ethers.getContractFactory("GameGenesisRewardPool");
        genesisPool = await GenesisPool.deploy(pToken.address, treasuryDAO.address, startTime);
        await genesisPool.deployed();
        console.log("-- Genesis Pool deployed to:", genesisPool.address);

        const TheoryRewardPool = await hre.ethers.getContractFactory("TheoryRewardPool");
        theoryRewardPool = await TheoryRewardPool.deploy(
            sToken.address,
            treasuryDAO.address,
            startTime,
            weeks, // 7 days
            [BigNumber.from(256),BigNumber.from(128),BigNumber.from(96),BigNumber.from(64),BigNumber.from(56),BigNumber.from(48),BigNumber.from(40),BigNumber.from(32),BigNumber.from(28),BigNumber.from(24),BigNumber.from(20),BigNumber.from(16),BigNumber.from(15),BigNumber.from(14),BigNumber.from(13),BigNumber.from(12),BigNumber.from(11),BigNumber.from(10),BigNumber.from(9),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4)],
            [BigNumber.from(95), BigNumber.from(93), BigNumber.from(91), BigNumber.from(89), BigNumber.from(87), BigNumber.from(85), BigNumber.from(83), BigNumber.from(81), BigNumber.from(79), BigNumber.from(77), BigNumber.from(75), BigNumber.from(73), BigNumber.from(71), BigNumber.from(69), BigNumber.from(67), BigNumber.from(65), BigNumber.from(63), BigNumber.from(61), BigNumber.from(59), BigNumber.from(57), BigNumber.from(55), BigNumber.from(53), BigNumber.from(51), BigNumber.from(49), BigNumber.from(47), BigNumber.from(45), BigNumber.from(43), BigNumber.from(41), BigNumber.from(39), BigNumber.from(37), BigNumber.from(35), BigNumber.from(33), BigNumber.from(31), BigNumber.from(29), BigNumber.from(27), BigNumber.from(25), BigNumber.from(23), BigNumber.from(21), BigNumber.from(19), BigNumber.from(17), BigNumber.from(15), BigNumber.from(13), BigNumber.from(11), BigNumber.from(9), BigNumber.from(7), BigNumber.from(5), BigNumber.from(3), BigNumber.from(1)]);
        await theoryRewardPool.deployed();
        console.log("-- Theory Reward Pool deployed to:", theoryRewardPool.address);

        pTokenPairAddress = (await MockInvestToken.deploy()).address;
        console.log("-- GAME-DAI LP deployed to:", pTokenPairAddress);
        sTokenPairAddress = (await MockInvestToken.deploy()).address;
        console.log("-- THEORY-DAI LP deployed to:", sTokenPairAddress);

        const Oracle = await hre.ethers.getContractFactory("MockOracle");
        oracle = await Oracle.deploy();
        await oracle.deployed();
        console.log("-- Oracle deployed to:", oracle.address);

        //TODO: In prod, change start times.
        await treasuryDAO.initialize(pToken.address, bToken.address, sToken.address, oracle.address, theoretics.address, genesisPool.address, daofund.address, devfund.address, startTime);
        await theoretics.initialize(pToken.address, sToken.address, treasuryDAO.address, theoryRewardPool.address);
        await pToken.distributeReward(genesisPool.address, theoretics.address)
        await sToken.distributeReward(theoryRewardPool.address)

        await genesisPool.add(7500,
            iToken.address,
            false,
            startTime);

        await theoryRewardPool.add(35500,
            pTokenPairAddress,
            false,
            startTime);

        await theoryRewardPool.add(24000,
            sTokenPairAddress,
            false,
            startTime);

        await pToken.transferOperator(treasuryDAO.address);
        await bToken.transferOperator(treasuryDAO.address);
        await sToken.transferOperator(treasuryDAO.address) ;
        await theoretics.transferOperator(treasuryDAO.address);

        const TheoryUnlocker = await smock.mock("TheoryUnlocker");
        theoryUnlocker = await TheoryUnlocker.deploy(iToken.address, oneHundred.mul(5), oneHundred.mul(5), sToken.address, daofund.address, 
            [zero, startTime.add(days.mul(15)), startTime.add(days.mul(15).mul(2)), startTime.add(days.mul(15).mul(3)), startTime.add(days.mul(15).mul(4)), startTime.add(days.mul(15).mul(5)), startTime.add(days.mul(15).mul(6)), startTime.add(days.mul(15).mul(7)), startTime.add(days.mul(15).mul(8)), startTime.add(days.mul(15).mul(9))],
            [BigNumber.from(5),BigNumber.from(10),BigNumber.from(15),BigNumber.from(20),BigNumber.from(25),BigNumber.from(30),BigNumber.from(35),BigNumber.from(40),BigNumber.from(45),BigNumber.from(50)],
            [zero,BigNumber.from(20),BigNumber.from(40),BigNumber.from(50)], ["bronze","silver","gold","platinum"]);
        await theoryUnlocker.deployed();
        console.log("-- Theory Unlocker deployed to:", theoryUnlocker.address);
        await sToken.addAuthorized(theoryUnlocker.address);

        spookySwapFactory = await ethers.getContractAt("UniswapV2Factory", "0xEE4bC42157cf65291Ba2FE839AE127e3Cc76f741");
        spookySwapRouter = await ethers.getContractAt("UniswapV2Router02", "0xa6AD18C2aC47803E193F75c3677b14BF19B94883");

        const TheoryUnlockerGen1 = await smock.mock("TheoryUnlockerGen1");
        theoryUnlockerGen1 = await TheoryUnlockerGen1.deploy(iToken.address, [oneHundred.mul(5), oneHundred.mul(5)], [sToken.address, pToken.address], daofund.address, theoryUnlocker.address, spookySwapRouter.address,
            [zero, startTime.add(days.mul(15)), startTime.add(days.mul(15).mul(2)), startTime.add(days.mul(15).mul(3)), startTime.add(days.mul(15).mul(4)), startTime.add(days.mul(15).mul(5)), startTime.add(days.mul(15).mul(6)), startTime.add(days.mul(15).mul(7)), startTime.add(days.mul(15).mul(8)), startTime.add(days.mul(15).mul(9))],
            [BigNumber.from(5),BigNumber.from(10),BigNumber.from(15),BigNumber.from(20),BigNumber.from(25),BigNumber.from(30),BigNumber.from(35),BigNumber.from(40),BigNumber.from(45),BigNumber.from(50)],
            [zero,BigNumber.from(20),BigNumber.from(40),BigNumber.from(50)], ["bronze","silver","gold","platinum"],
            [BigNumber.from(300),BigNumber.from(100),BigNumber.from(50),BigNumber.from(10)]);
        await theoryUnlockerGen1.deployed();
        console.log("-- Theory Unlocker Gen 1 deployed to:", theoryUnlockerGen1.address);
        await sToken.addAuthorized(theoryUnlockerGen1.address);
        await theoryUnlocker.addAuthorized(theoryUnlockerGen1.address);

        await setTime(ethers.provider, startTime.toNumber());
        //await ethers.provider.send('evm_mine');
        //expect(await pendingBlocktime(ethers.provider)).to.equal(startTime);
    });

    describe('TheoryUnlocker', () => {
        it("constructor SUCCESS", async () => {
            expect(await theoryUnlocker.buyToken()).to.equal(iToken.address);
            expect(await theoryUnlocker.initialPrice()).to.equal(oneHundred.mul(5));
            expect(await theoryUnlocker.buyTokenPerLevel()).to.equal(oneHundred.mul(5));
            expect(await theoryUnlocker.levelURIsLevel(1)).to.equal(BigNumber.from(20));
            expect(await theoryUnlocker.levelURIsURI(1)).to.equal("silver");
            expect(await theoryUnlocker.maxLevelTime(1)).to.equal(startTime.add(days.mul(15)));
            expect(await theoryUnlocker.maxLevelLevel(1)).to.equal(BigNumber.from(10));
            expect(await theoryUnlocker.communityFund()).to.equal(daofund.address);
            expect(await theoryUnlocker.timeToLevel()).to.equal(days.mul(3));
            expect(await theoryUnlocker.theory()).to.equal(sToken.address);
        });
        it("constructor levelURI zero length FAILURE", async () => {
            const TheoryUnlocker = await smock.mock("TheoryUnlocker");
            await expect(TheoryUnlocker.deploy(iToken.address, oneHundred.mul(5), oneHundred.mul(5), sToken.address, daofund.address,
                [zero, startTime.add(days.mul(15)), startTime.add(days.mul(15).mul(2)), startTime.add(days.mul(15).mul(3)), startTime.add(days.mul(15).mul(4)), startTime.add(days.mul(15).mul(5)), startTime.add(days.mul(15).mul(6)), startTime.add(days.mul(15).mul(7)), startTime.add(days.mul(15).mul(8)), startTime.add(days.mul(15).mul(9))],
                [BigNumber.from(5),BigNumber.from(10),BigNumber.from(15),BigNumber.from(20),BigNumber.from(25),BigNumber.from(30),BigNumber.from(35),BigNumber.from(40),BigNumber.from(45),BigNumber.from(50)],
                [], [])).to.be.revertedWith("Level URI arrays must be equal in non-zero length and level should start at 0.");
        });
        it("constructor levelURI not zero FAILURE", async () => {
            const TheoryUnlocker = await smock.mock("TheoryUnlocker");
            await expect(TheoryUnlocker.deploy(iToken.address, oneHundred.mul(5), oneHundred.mul(5), sToken.address, daofund.address,
                [zero, startTime.add(days.mul(15)), startTime.add(days.mul(15).mul(2)), startTime.add(days.mul(15).mul(3)), startTime.add(days.mul(15).mul(4)), startTime.add(days.mul(15).mul(5)), startTime.add(days.mul(15).mul(6)), startTime.add(days.mul(15).mul(7)), startTime.add(days.mul(15).mul(8)), startTime.add(days.mul(15).mul(9))],
                [BigNumber.from(5),BigNumber.from(10),BigNumber.from(15),BigNumber.from(20),BigNumber.from(25),BigNumber.from(30),BigNumber.from(35),BigNumber.from(40),BigNumber.from(45),BigNumber.from(50)],
                [one,BigNumber.from(20),BigNumber.from(40),BigNumber.from(50)], ["bronze","silver","gold","platinum"])).to.be.revertedWith("Level URI arrays must be equal in non-zero length and level should start at 0.");
        });
        it("constructor levelURI not equal length FAILURE", async () => {
            const TheoryUnlocker = await smock.mock("TheoryUnlocker");
            await expect(TheoryUnlocker.deploy(iToken.address, oneHundred.mul(5), oneHundred.mul(5), sToken.address, daofund.address,
                [zero, startTime.add(days.mul(15)), startTime.add(days.mul(15).mul(2)), startTime.add(days.mul(15).mul(3)), startTime.add(days.mul(15).mul(4)), startTime.add(days.mul(15).mul(5)), startTime.add(days.mul(15).mul(6)), startTime.add(days.mul(15).mul(7)), startTime.add(days.mul(15).mul(8)), startTime.add(days.mul(15).mul(9))],
                [BigNumber.from(5),BigNumber.from(10),BigNumber.from(15),BigNumber.from(20),BigNumber.from(25),BigNumber.from(30),BigNumber.from(35),BigNumber.from(40),BigNumber.from(45),BigNumber.from(50)],
                [zero,BigNumber.from(20),BigNumber.from(40),BigNumber.from(50)], ["silver","gold","platinum"])).to.be.revertedWith("Level URI arrays must be equal in non-zero length and level should start at 0.");
        });
        it("constructor maxLevel zero length FAILURE", async () => {
            const TheoryUnlocker = await smock.mock("TheoryUnlocker");
            await expect(TheoryUnlocker.deploy(iToken.address, oneHundred.mul(5), oneHundred.mul(5), sToken.address, daofund.address,
                [],
                [],
                [zero,BigNumber.from(20),BigNumber.from(40),BigNumber.from(50)], ["bronze","silver","gold","platinum"])).to.be.revertedWith("Max level arrays must be equal in non-zero length and time should start at 0.");
        });
        it("constructor maxLevel not zero FAILURE", async () => {
            const TheoryUnlocker = await smock.mock("TheoryUnlocker");
            await expect(TheoryUnlocker.deploy(iToken.address, oneHundred.mul(5), oneHundred.mul(5), sToken.address, daofund.address,
                [one, startTime.add(days.mul(15)), startTime.add(days.mul(15).mul(2)), startTime.add(days.mul(15).mul(3)), startTime.add(days.mul(15).mul(4)), startTime.add(days.mul(15).mul(5)), startTime.add(days.mul(15).mul(6)), startTime.add(days.mul(15).mul(7)), startTime.add(days.mul(15).mul(8)), startTime.add(days.mul(15).mul(9))],
                [BigNumber.from(5),BigNumber.from(10),BigNumber.from(15),BigNumber.from(20),BigNumber.from(25),BigNumber.from(30),BigNumber.from(35),BigNumber.from(40),BigNumber.from(45),BigNumber.from(50)],
                [zero,BigNumber.from(20),BigNumber.from(40),BigNumber.from(50)], ["bronze","silver","gold","platinum"])).to.be.revertedWith("Max level arrays must be equal in non-zero length and time should start at 0.");
        });
        it("constructor maxLevel not equal length FAILURE", async () => {
            const TheoryUnlocker = await smock.mock("TheoryUnlocker");
            await expect(TheoryUnlocker.deploy(iToken.address, oneHundred.mul(5), oneHundred.mul(5), sToken.address, daofund.address,
                [zero, startTime.add(days.mul(15)), startTime.add(days.mul(15).mul(2)), startTime.add(days.mul(15).mul(3)), startTime.add(days.mul(15).mul(4)), startTime.add(days.mul(15).mul(5)), startTime.add(days.mul(15).mul(6)), startTime.add(days.mul(15).mul(7)), startTime.add(days.mul(15).mul(8)), startTime.add(days.mul(15).mul(9))],
                [BigNumber.from(5),BigNumber.from(15),BigNumber.from(20),BigNumber.from(25),BigNumber.from(30),BigNumber.from(35),BigNumber.from(40),BigNumber.from(45),BigNumber.from(50)],
                [zero,BigNumber.from(20),BigNumber.from(40),BigNumber.from(50)], ["bronze","silver","gold","platinum"])).to.be.revertedWith("Max level arrays must be equal in non-zero length and time should start at 0.");
        });
        it("constructor maxLevel > 100 FAILURE", async () => {
            const TheoryUnlocker = await smock.mock("TheoryUnlocker");
            await expect(TheoryUnlocker.deploy(iToken.address, oneHundred.mul(5), oneHundred.mul(5), sToken.address, daofund.address,
                [zero, startTime.add(days.mul(15)), startTime.add(days.mul(15).mul(2)), startTime.add(days.mul(15).mul(3)), startTime.add(days.mul(15).mul(4)), startTime.add(days.mul(15).mul(5)), startTime.add(days.mul(15).mul(6)), startTime.add(days.mul(15).mul(7)), startTime.add(days.mul(15).mul(8)), startTime.add(days.mul(15).mul(9))],
                [BigNumber.from(5),BigNumber.from(10),BigNumber.from(110),BigNumber.from(20),BigNumber.from(25),BigNumber.from(30),BigNumber.from(35),BigNumber.from(40),BigNumber.from(45),BigNumber.from(50)],
                [zero,BigNumber.from(20),BigNumber.from(40),BigNumber.from(50)], ["bronze","silver","gold","platinum"])).to.be.revertedWith("Max level can't be higher than 100.");
        });
        it("setBuyToken SUCCESS", async () => {
            await theoryUnlocker.setBuyToken(sToken.address);
            expect(await theoryUnlocker.buyToken()).to.equal(sToken.address);
        });
        it("setBuyToken not authorized FAILURE", async () => {
            await theoryUnlocker.renounceOwnership();
            await expect(theoryUnlocker.setBuyToken(sToken.address)).to.be.revertedWith('caller is not authorized');
        });
        it("setInitialPrice SUCCESS", async () => {
            await theoryUnlocker.setInitialPrice(one);
            expect(await theoryUnlocker.initialPrice()).to.equal(one);
        });
        it("setInitialPrice not authorized FAILURE", async () => {
            await theoryUnlocker.renounceOwnership();
            await expect(theoryUnlocker.setInitialPrice(one)).to.be.revertedWith('caller is not authorized');
        });
        it("setBuyTokenPerLevel SUCCESS", async () => {
            await theoryUnlocker.setBuyTokenPerLevel(one);
            expect(await theoryUnlocker.buyTokenPerLevel()).to.equal(one);
        });
        it("setBuyTokenPerLevel not authorized FAILURE", async () => {
            await theoryUnlocker.renounceOwnership();
            await expect(theoryUnlocker.setBuyTokenPerLevel(one)).to.be.revertedWith('caller is not authorized');
        });
        it("setLevelURIs SUCCESS", async () => {
            await theoryUnlocker.setLevelURIs([zero,BigNumber.from(70)],["blah", "something"]);
            expect(await theoryUnlocker.levelURIsLevel(1)).to.equal(BigNumber.from(70));
            expect(await theoryUnlocker.levelURIsURI(1)).to.equal("something");
        });
        it("setLevelURIs zero length FAILURE", async () => {
            await expect(theoryUnlocker.setLevelURIs([],[])).to.be.revertedWith('Level URI arrays must be equal in non-zero length and level should start at 0.');
        });
        it("setLevelURIs not zero FAILURE", async () => {
            await expect(theoryUnlocker.setLevelURIs([one,BigNumber.from(70)],["blah", "something"])).to.be.revertedWith('Level URI arrays must be equal in non-zero length and level should start at 0.');
        });
        it("setLevelURIs not equal length FAILURE", async () => {
            await expect(theoryUnlocker.setLevelURIs([zero],["blah", "something"])).to.be.revertedWith('Level URI arrays must be equal in non-zero length and level should start at 0.');
        });
        it("setLevelURIs not authorized FAILURE", async () => {
            await theoryUnlocker.renounceOwnership();
            await expect(theoryUnlocker.setLevelURIs([zero,BigNumber.from(70)],["blah", "something"])).to.be.revertedWith('caller is not authorized');
        });
        it("setMaxLevel SUCCESS", async () => {
            await theoryUnlocker.setMaxLevel([zero,hours],[BigNumber.from(50),BigNumber.from(100)]);
            expect(await theoryUnlocker.maxLevelTime(1)).to.equal(hours);
            expect(await theoryUnlocker.maxLevelLevel(1)).to.equal(BigNumber.from(100));
        });
        it("setMaxLevel zero length FAILURE", async () => {
            await expect(theoryUnlocker.setMaxLevel([],[])).to.be.revertedWith('Max level arrays must be equal in non-zero length and time should start at 0.');
        });
        it("setMaxLevel not zero FAILURE", async () => {
            await expect(theoryUnlocker.setMaxLevel([minutes,hours],[BigNumber.from(25),BigNumber.from(50)])).to.be.revertedWith('Max level arrays must be equal in non-zero length and time should start at 0.');
        });
        it("setMaxLevel not equal length FAILURE", async () => {
            await expect(theoryUnlocker.setMaxLevel([zero,hours],[BigNumber.from(50)])).to.be.revertedWith('Max level arrays must be equal in non-zero length and time should start at 0.');
        });
        it("setMaxLevel > 100 FAILURE", async () => {
            await expect(theoryUnlocker.setMaxLevel([zero,hours],[BigNumber.from(25),BigNumber.from(999)])).to.be.revertedWith("Max level can't be higher than 100.");
        });
        it("setMaxLevel not authorized FAILURE", async () => {
            await theoryUnlocker.renounceOwnership();
            await expect(theoryUnlocker.setMaxLevel([zero,hours],[BigNumber.from(25),BigNumber.from(50)])).to.be.revertedWith('caller is not authorized');
        });
        it("setCommunityFund SUCCESS", async () => {
            await theoryUnlocker.setCommunityFund(devfund.address);
            expect(await theoryUnlocker.communityFund()).to.equal(devfund.address);
        });
        it("setCommunityFund not authorized FAILURE", async () => {
            await theoryUnlocker.renounceOwnership();
            await expect(theoryUnlocker.setCommunityFund(devfund.address)).to.be.revertedWith('caller is not authorized');
        });
        it("setTimeToLevel SUCCESS", async () => {
            await theoryUnlocker.setTimeToLevel(hours);
            expect(await theoryUnlocker.timeToLevel()).to.equal(hours);
        });
        it("setTimeToLevel not authorized FAILURE", async () => {
            await theoryUnlocker.renounceOwnership();
            await expect(theoryUnlocker.setTimeToLevel(hours)).to.be.revertedWith('caller is not authorized');
        });
        it("setDisableMint SUCCESS", async () => {
            await theoryUnlocker.setDisableMint(true);
            expect(await theoryUnlocker.disableMint()).to.equal(true);
        });
        it("setDisableMint not authorized FAILURE", async () => {
            await theoryUnlocker.renounceOwnership();
            await expect(theoryUnlocker.setDisableMint(true)).to.be.revertedWith('caller is not authorized');
        });
        it("setTokenLevel SUCCESS", async () => {
            await theoryUnlocker.setTokenLevel(BigNumber.from(1), BigNumber.from(5));
            expect((await theoryUnlocker.tokenInfo(BigNumber.from(1))).level).to.equal(BigNumber.from(5));
        });
        it("setTokenLevel zero FAILURE", async () => {
            await expect(theoryUnlocker.setTokenLevel(BigNumber.from(1), BigNumber.from(0))).to.be.revertedWith('Level must be > 0 and <= max level.');
        });
        it("setTokenLevel greater than max FAILURE", async () => {
            await expect(theoryUnlocker.setTokenLevel(BigNumber.from(1), BigNumber.from(6))).to.be.revertedWith('Level must be > 0 and <= max level.');
        });
        it("setTokenLevel not authorized FAILURE", async () => {
            await theoryUnlocker.renounceOwnership();
            await expect(theoryUnlocker.setTokenLevel(BigNumber.from(1), BigNumber.from(5))).to.be.revertedWith('caller is not authorized');
        });
        it("setCreationTime SUCCESS", async () => {
            await theoryUnlocker.setCreationTime(BigNumber.from(1), hours);
            expect((await theoryUnlocker.tokenInfo(BigNumber.from(1))).creationTime).to.equal(hours);
        });
        it("setCreationTime not authorized FAILURE", async () => {
            await theoryUnlocker.renounceOwnership();
            await expect(theoryUnlocker.setCreationTime(BigNumber.from(1), hours)).to.be.revertedWith('caller is not authorized');
        });
        it("setLastLevelTime SUCCESS", async () => {
            await theoryUnlocker.setLastLevelTime(BigNumber.from(2), minutes);
            expect((await theoryUnlocker.tokenInfo(BigNumber.from(2))).lastLevelTime).to.equal(minutes);
        });
        it("setLastLevelTime not authorized FAILURE", async () => {
            await theoryUnlocker.renounceOwnership();
            await expect(theoryUnlocker.setLastLevelTime(BigNumber.from(2), minutes)).to.be.revertedWith('caller is not authorized');
        });
        it("setLastUnlockTime SUCCESS", async () => {
            await theoryUnlocker.setLastUnlockTime(devfund.address, minutes);
            expect((await theoryUnlocker.userInfo(devfund.address)).lastUnlockTime).to.equal(minutes);
        });
        it("setLastUnlockTime not authorized FAILURE", async () => {
            await theoryUnlocker.renounceOwnership();
            await expect(theoryUnlocker.setLastUnlockTime(devfund.address, minutes)).to.be.revertedWith('caller is not authorized');
        });
        it("setLastLockAmount SUCCESS", async () => {
            await theoryUnlocker.setLastLockAmount(devfund.address, oneHundred.mul(5));
            expect((await theoryUnlocker.userInfo(devfund.address)).lastLockAmount).to.equal(oneHundred.mul(5));
        });
        it("setLastLockAmount not authorized FAILURE", async () => {
            await theoryUnlocker.renounceOwnership();
            await expect(theoryUnlocker.setLastLockAmount(devfund.address, oneHundred.mul(5))).to.be.revertedWith('caller is not authorized');
        });
        it("maxLevel SUCCESS", async () => {
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlocker.maxLevel()).to.equal(BigNumber.from(5));
            await advanceTime(ethers.provider, days.mul(15).toNumber());
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlocker.maxLevel()).to.equal(BigNumber.from(10));
            await advanceTime(ethers.provider, days.mul(15).toNumber());
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlocker.maxLevel()).to.equal(BigNumber.from(15));
            await advanceTime(ethers.provider, days.mul(15).toNumber());
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlocker.maxLevel()).to.equal(BigNumber.from(20));
            await advanceTime(ethers.provider, days.mul(15).toNumber());
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlocker.maxLevel()).to.equal(BigNumber.from(25));
            await advanceTime(ethers.provider, days.mul(15).toNumber());
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlocker.maxLevel()).to.equal(BigNumber.from(30));
            await advanceTime(ethers.provider, days.mul(15).toNumber());
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlocker.maxLevel()).to.equal(BigNumber.from(35));
            await advanceTime(ethers.provider, days.mul(15).toNumber());
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlocker.maxLevel()).to.equal(BigNumber.from(40));
            await advanceTime(ethers.provider, days.mul(15).toNumber());
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlocker.maxLevel()).to.equal(BigNumber.from(45));
            await advanceTime(ethers.provider, days.mul(15).toNumber());
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlocker.maxLevel()).to.equal(BigNumber.from(50));
            await advanceTime(ethers.provider, days.mul(15).toNumber());
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlocker.maxLevel()).to.equal(BigNumber.from(50));
        });
        it("levelURI SUCCESS", async () => {
            expect(await theoryUnlocker.levelURI(1)).to.equal("bronze");
            expect(await theoryUnlocker.levelURI(10)).to.equal("bronze");
            expect(await theoryUnlocker.levelURI(20)).to.equal("silver");
            expect(await theoryUnlocker.levelURI(30)).to.equal("silver");
            expect(await theoryUnlocker.levelURI(40)).to.equal("gold");
            expect(await theoryUnlocker.levelURI(45)).to.equal("gold");
            expect(await theoryUnlocker.levelURI(50)).to.equal("platinum");
            expect(await theoryUnlocker.levelURI(100)).to.equal("platinum");
        });
        it("costOf SUCCESS", async () => {
            expect(await theoryUnlocker.costOf(1)).to.equal(oneHundred.mul(5));
            expect(await theoryUnlocker.costOf(2)).to.equal(oneHundred.mul(5).add(oneHundred.mul(5)));
            expect(await theoryUnlocker.costOf(10)).to.equal(oneHundred.mul(5).add(oneHundred.mul(5).mul(9)));
            expect(await theoryUnlocker.costOf(20)).to.equal(oneHundred.mul(5).add(oneHundred.mul(5).mul(19)));
            expect(await theoryUnlocker.costOf(30)).to.equal(oneHundred.mul(5).add(oneHundred.mul(5).mul(29)));
            expect(await theoryUnlocker.costOf(40)).to.equal(oneHundred.mul(5).add(oneHundred.mul(5).mul(39)));
            expect(await theoryUnlocker.costOf(50)).to.equal(oneHundred.mul(5).add(oneHundred.mul(5).mul(49)));
            expect(await theoryUnlocker.costOf(100)).to.equal(oneHundred.mul(5).add(oneHundred.mul(5).mul(99)));
        });
        it("timeLeftToLevel SUCCESS", async () => {
            await iToken.approve(theoryUnlocker.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlocker.mint(1);
            expect(await theoryUnlocker.timeLeftToLevel(1)).to.equal(days.mul(3));
        });
        it("nextLevelTime SUCCESS", async () => {
            await iToken.approve(theoryUnlocker.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlocker.mint(1);
            expect(await theoryUnlocker.nextLevelTime(1)).to.equal(BigNumber.from(await latestBlocktime(ethers.provider)).add(days.mul(3)));
        });
        it("mint SUCCESS", async () => {
            await iToken.approve(theoryUnlocker.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            let initialBalance = await iToken.balanceOf(await theoryUnlocker.communityFund());
            expect(await theoryUnlocker.totalSupply()).to.equal(zero);
            await theoryUnlocker.mint(5);
            expect(await iToken.balanceOf(await theoryUnlocker.communityFund())).to.equal(initialBalance.add(oneHundred.mul(5).add(oneHundred.mul(5).mul(4))));
            expect(await theoryUnlocker.totalSupply()).to.equal(BigNumber.from(1));
            let timestamp = await latestBlocktime(ethers.provider);
            expect((await theoryUnlocker.tokenInfo(1)).creationTime).to.equal(timestamp);
            expect((await theoryUnlocker.tokenInfo(1)).lastLevelTime).to.equal(timestamp);
            expect((await theoryUnlocker.tokenInfo(1)).level).to.equal(BigNumber.from(5));
            expect(await theoryUnlocker.tokenURI(1)).to.equal("bronze");
        });
        it("mint disabled FAILURE", async () => {
            await iToken.approve(theoryUnlocker.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlocker.setDisableMint(true);
            await expect(theoryUnlocker.mint(1)).to.be.revertedWith('You can no longer mint this NFT.');
        });
        it("mint zero FAILURE", async () => {
            await iToken.approve(theoryUnlocker.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await expect(theoryUnlocker.mint(0)).to.be.revertedWith('Level must be > 0 and <= max level.');
        });
        it("mint > max level FAILURE", async () => {
            await iToken.approve(theoryUnlocker.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await expect(theoryUnlocker.mint(100)).to.be.revertedWith('Level must be > 0 and <= max level.');
        });

        it("merge SUCCESS", async () => {
            await iToken.approve(theoryUnlocker.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            expect(await theoryUnlocker.totalSupply()).to.equal(zero);
            await theoryUnlocker.mint(1);
            expect(await theoryUnlocker.totalSupply()).to.equal(BigNumber.from(1));
            await theoryUnlocker.mint(2);
            expect(await theoryUnlocker.totalSupply()).to.equal(BigNumber.from(2));
            await theoryUnlocker.merge(1,2);
            expect(await theoryUnlocker.totalSupply()).to.equal(BigNumber.from(1));
            let timestamp = await latestBlocktime(ethers.provider);
            expect((await theoryUnlocker.tokenInfo(3)).creationTime).to.equal(timestamp);
            expect((await theoryUnlocker.tokenInfo(3)).lastLevelTime).to.equal(timestamp);
            expect((await theoryUnlocker.tokenInfo(3)).level).to.equal(BigNumber.from(3));
            expect(await theoryUnlocker.tokenURI(3)).to.equal("bronze");
        });
        it("merge > max level FAILURE", async () => {
            await iToken.approve(theoryUnlocker.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlocker.mint(5);
            await theoryUnlocker.mint(5);
            await expect(theoryUnlocker.merge(1,2)).to.be.revertedWith('Level must be > 0 and <= max level.');
        });
        it("merge not same owner FAILURE", async () => {
            await iToken.approve(theoryUnlocker.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlocker.mint(5);
            await theoryUnlocker.mint(5);
            await theoryUnlocker.transferFrom(deployer.address, daofund.address, 2);
            await expect(theoryUnlocker.merge(1,2)).to.be.revertedWith('Both tokens must have the same owner.');
        });
        it("merge invalid permissions FAILURE", async () => {
            await iToken.approve(theoryUnlocker.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlocker.mint(5);
            await theoryUnlocker.mint(5);
            await theoryUnlocker.transferFrom(deployer.address, daofund.address, 2);
            await theoryUnlocker.renounceOwnership();
            await expect(theoryUnlocker.merge(2,1)).to.be.revertedWith('Not enough permissions for token 1.');
            await expect(theoryUnlocker.merge(1,2)).to.be.revertedWith('Not enough permissions for token 2.');
        });

        it("levelUp SUCCESS", async () => {
            await theoryUnlocker.renounceOwnership();
            await iToken.approve(theoryUnlocker.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await advanceTime(ethers.provider, years.toNumber());
            await theoryUnlocker.mint(19);
            expect(await theoryUnlocker.tokenURI(1)).to.equal("bronze");
            let timestamp1 = await latestBlocktime(ethers.provider);
            await advanceTime(ethers.provider, days.mul(3).toNumber());
            await theoryUnlocker.levelUp(1);
            let timestamp2 = await latestBlocktime(ethers.provider);
            expect((await theoryUnlocker.tokenInfo(1)).creationTime).to.equal(timestamp1);
            expect((await theoryUnlocker.tokenInfo(1)).lastLevelTime).to.equal(timestamp2);
            expect((await theoryUnlocker.tokenInfo(1)).level).to.equal(BigNumber.from(20));
            //expect(await theoryUnlocker.tokenURI(1)).to.equal("silver");
            expect(await theoryUnlocker.tokenURI(1)).to.equal("bronze");
        });
        it("levelUp invalid permissions FAILURE", async () => {
            await iToken.approve(theoryUnlocker.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlocker.mint(5);
            await advanceTime(ethers.provider, days.mul(3).toNumber());
            await theoryUnlocker.transferFrom(deployer.address, devfund.address, 1);
            await theoryUnlocker.renounceOwnership();
            await expect(theoryUnlocker.levelUp(1)).to.be.revertedWith('Not enough permissions.');
        });
        it("levelUp > maxLevel FAILURE", async () => {
            await iToken.approve(theoryUnlocker.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlocker.mint(5);
            await advanceTime(ethers.provider, days.mul(3).toNumber());
            await expect(theoryUnlocker.levelUp(1)).to.be.revertedWith('Level must be lower than max level.');
        });
        it("levelUp too early FAILURE", async () => {
            await iToken.approve(theoryUnlocker.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlocker.mint(1);
            await expect(theoryUnlocker.levelUp(1)).to.be.revertedWith('Too early to level up.');
            await advanceTime(ethers.provider, days.mul(6).toNumber());
            await theoryUnlocker.levelUp(1);
            expect((await theoryUnlocker.tokenInfo(1)).level).to.equal(BigNumber.from(2));
            await theoryUnlocker.levelUp(1)
            expect((await theoryUnlocker.tokenInfo(1)).level).to.equal(BigNumber.from(3));
            await expect(theoryUnlocker.levelUp(1)).to.be.revertedWith('Too early to level up.');
        });
        it("nftUnlock part 1 SUCCESS", async () => {
            await iToken.approve(theoryUnlocker.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlocker.mint(1);
            let lockAmount = one.mul(10).div(100);
            await sToken.lock(deployer.address, lockAmount);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount);
            await theoryUnlocker.nftUnlock(1);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount.sub(lockAmount.div(100)));
            expect((await theoryUnlocker.userInfo(deployer.address)).lastLockAmount).to.equal(lockAmount.sub(lockAmount.div(100)));
            //Test twice
            await theoryUnlocker.nftUnlock(1);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount.sub(lockAmount.div(100)));
            expect((await theoryUnlocker.userInfo(deployer.address)).lastLockAmount).to.equal(lockAmount.sub(lockAmount.div(100)));

            let extraLock = one.mul(10).div(100);
            await sToken.lock(deployer.address, extraLock);
            let oldLock = lockAmount.sub(lockAmount.div(100));
            lockAmount = oldLock.add(extraLock);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount);
            expect(await theoryUnlocker.canUnlockAmount(deployer.address, 1)).to.equal(extraLock.div(100));
            await theoryUnlocker.nftUnlock(1);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount.sub(extraLock.div(100)));
            expect((await theoryUnlocker.userInfo(deployer.address)).lastLockAmount).to.equal(lockAmount.sub(extraLock.div(100)));
            await theoryUnlocker.renounceOwnership();
            await theoryUnlocker.nftUnlock(1);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount.sub(extraLock.div(100)));
            expect((await theoryUnlocker.userInfo(deployer.address)).lastLockAmount).to.equal(lockAmount.sub(extraLock.div(100)));
        });
        it("nftUnlock part 2 SUCCESS", async () => {
            await iToken.approve(theoryUnlocker.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlocker.mint(1);
            let lockAmount = one.mul(10).div(100);
            await sToken.lock(deployer.address, lockAmount);
            await theoryUnlocker.setLastLockAmount(deployer.address, lockAmount.add(one));
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount);
            expect((await theoryUnlocker.userInfo(deployer.address)).lastLockAmount).to.equal(lockAmount.add(one));
            await theoryUnlocker.nftUnlock(1);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount);
            expect((await theoryUnlocker.userInfo(deployer.address)).lastLockAmount).to.equal(lockAmount);

            //More locked
            let extraLock = one.mul(10).div(100);
            await sToken.lock(deployer.address, extraLock);
            let oldLock = lockAmount;
            lockAmount = oldLock.add(extraLock);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount);
            await theoryUnlocker.nftUnlock(1);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount.sub(extraLock.div(100)));
            expect((await theoryUnlocker.userInfo(deployer.address)).lastLockAmount).to.equal(lockAmount.sub(extraLock.div(100)));
        });
        it("nftUnlock amountLocked == 0 SUCCESS", async () => {
            await iToken.approve(theoryUnlocker.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlocker.mint(1);
            expect(await sToken.lockOf(deployer.address)).to.equal(zero);
            expect((await theoryUnlocker.userInfo(deployer.address)).lastLockAmount).to.equal(zero);
            await theoryUnlocker.nftUnlock(1);
            expect(await sToken.lockOf(deployer.address)).to.equal(zero);
            expect((await theoryUnlocker.userInfo(deployer.address)).lastLockAmount).to.equal(zero);
        });
        it("nftUnlock too much to unlock naturally FAILURE", async () => {
            await iToken.approve(theoryUnlocker.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlocker.mint(1);
            let lockAmount = one.mul(95).div(100);
            await sToken.lock(deployer.address, lockAmount);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount);
            await advanceTime(ethers.provider, years.mul(2).toNumber());
            await expect(theoryUnlocker.nftUnlock(1)).to.be.revertedWith('Too much to unlock naturally, please call unlock() first.');
        });
        it("nftUnlock not authorized FAILURE", async () => {
            await theoryUnlocker.renounceOwnership();
            await iToken.approve(theoryUnlocker.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlocker.mint(1);
            await theoryUnlocker.transferFrom(deployer.address, daofund.address, 1);
            expect(await sToken.lockOf(deployer.address)).to.equal(zero);
            expect((await theoryUnlocker.userInfo(deployer.address)).lastLockAmount).to.equal(zero);
            await expect(theoryUnlocker.nftUnlock(1)).to.be.revertedWith('Not enough permissions.');
        });
    });
    describe('TheoryUnlockerGen1', () => {
        it("constructor SUCCESS", async () => {
            expect(await theoryUnlockerGen1.buyToken()).to.equal(iToken.address);
            expect(await theoryUnlockerGen1.initialPrice()).to.equal(oneHundred.mul(5));
            expect(await theoryUnlockerGen1.buyTokenPerLevel()).to.equal(oneHundred.mul(5));
            expect(await theoryUnlockerGen1.levelURIsLevel(1)).to.equal(BigNumber.from(20));
            expect(await theoryUnlockerGen1.levelURIsURI(1)).to.equal("silver");
            expect(await theoryUnlockerGen1.levelURIsMax(1)).to.equal(BigNumber.from(100));
            expect(await theoryUnlockerGen1.levelURIsSupply(3)).to.equal(zero);
            expect(await theoryUnlockerGen1.levelURIsMinted(3)).to.equal(zero);
            expect(await theoryUnlockerGen1.maxLevelTime(1)).to.equal(startTime.add(days.mul(15)));
            expect(await theoryUnlockerGen1.maxLevelLevel(1)).to.equal(BigNumber.from(10));
            expect(await theoryUnlockerGen1.communityFund()).to.equal(daofund.address);
            expect(await theoryUnlockerGen1.timeToLevel()).to.equal(days.mul(3));
            expect(await theoryUnlockerGen1.theory()).to.equal(sToken.address);
            expect(await theoryUnlockerGen1.game()).to.equal(pToken.address);
            expect(await theoryUnlockerGen1.emergencyDisableUnlock()).to.equal(false);
            expect(await theoryUnlockerGen1.TheoryUnlockerGen0()).to.equal(theoryUnlocker.address);
            expect(await theoryUnlockerGen1.burnPercentage()).to.equal(BigNumber.from(1000));
            expect(await theoryUnlockerGen1.router()).to.equal(spookySwapRouter.address);
            expect(await theoryUnlockerGen1.gameCostPerLevel()).to.equal(one);
            expect(await theoryUnlockerGen1.extraGameCostLevel(1)).to.equal(BigNumber.from(5));
            expect(await theoryUnlockerGen1.extraGameCostAmount(1)).to.equal(ten);

        });
        it("constructor levelURI zero length FAILURE", async () => {
            const TheoryUnlockerGen1 = await smock.mock("TheoryUnlockerGen1");
            await expect(TheoryUnlockerGen1.deploy(iToken.address, [oneHundred.mul(5), oneHundred.mul(5)], [sToken.address, pToken.address], daofund.address, theoryUnlocker.address, devfund.address,
                [zero, startTime.add(days.mul(15)), startTime.add(days.mul(15).mul(2)), startTime.add(days.mul(15).mul(3)), startTime.add(days.mul(15).mul(4)), startTime.add(days.mul(15).mul(5)), startTime.add(days.mul(15).mul(6)), startTime.add(days.mul(15).mul(7)), startTime.add(days.mul(15).mul(8)), startTime.add(days.mul(15).mul(9))],
                [BigNumber.from(5),BigNumber.from(10),BigNumber.from(15),BigNumber.from(20),BigNumber.from(25),BigNumber.from(30),BigNumber.from(35),BigNumber.from(40),BigNumber.from(45),BigNumber.from(50)],
                [], [],
                [])).to.be.revertedWith("Level URI arrays must be equal in non-zero length and level should start at 0.");
        });
        it("constructor levelURI not zero FAILURE", async () => {
            const TheoryUnlockerGen1 = await smock.mock("TheoryUnlockerGen1");
            await expect(TheoryUnlockerGen1.deploy(iToken.address, [oneHundred.mul(5), oneHundred.mul(5)], [sToken.address, pToken.address], daofund.address, theoryUnlocker.address, devfund.address,
                [zero, startTime.add(days.mul(15)), startTime.add(days.mul(15).mul(2)), startTime.add(days.mul(15).mul(3)), startTime.add(days.mul(15).mul(4)), startTime.add(days.mul(15).mul(5)), startTime.add(days.mul(15).mul(6)), startTime.add(days.mul(15).mul(7)), startTime.add(days.mul(15).mul(8)), startTime.add(days.mul(15).mul(9))],
                [BigNumber.from(5),BigNumber.from(10),BigNumber.from(15),BigNumber.from(20),BigNumber.from(25),BigNumber.from(30),BigNumber.from(35),BigNumber.from(40),BigNumber.from(45),BigNumber.from(50)],
                [BigNumber.from(1),BigNumber.from(20),BigNumber.from(40),BigNumber.from(50)], ["bronze","silver","gold","platinum"],
                [BigNumber.from(300),BigNumber.from(100),BigNumber.from(50),BigNumber.from(10)])).to.be.revertedWith("Level URI arrays must be equal in non-zero length and level should start at 0.");
        });
        it("constructor levelURI not equal length FAILURE", async () => {
            const TheoryUnlockerGen1 = await smock.mock("TheoryUnlockerGen1");
            await expect(TheoryUnlockerGen1.deploy(iToken.address, [oneHundred.mul(5), oneHundred.mul(5)], [sToken.address, pToken.address], daofund.address, theoryUnlocker.address, devfund.address,
                [zero, startTime.add(days.mul(15)), startTime.add(days.mul(15).mul(2)), startTime.add(days.mul(15).mul(3)), startTime.add(days.mul(15).mul(4)), startTime.add(days.mul(15).mul(5)), startTime.add(days.mul(15).mul(6)), startTime.add(days.mul(15).mul(7)), startTime.add(days.mul(15).mul(8)), startTime.add(days.mul(15).mul(9))],
                [BigNumber.from(5),BigNumber.from(10),BigNumber.from(15),BigNumber.from(20),BigNumber.from(25),BigNumber.from(30),BigNumber.from(35),BigNumber.from(40),BigNumber.from(45),BigNumber.from(50)],
                [zero,BigNumber.from(20),BigNumber.from(40),BigNumber.from(50)], ["bronze","silver","gold","platinum"],
                [BigNumber.from(300),BigNumber.from(100),BigNumber.from(50)])).to.be.revertedWith("Level URI arrays must be equal in non-zero length and level should start at 0.");
        });
        it("constructor maxLevel zero length FAILURE", async () => {
            const TheoryUnlockerGen1 = await smock.mock("TheoryUnlockerGen1");
            await expect(TheoryUnlockerGen1.deploy(iToken.address, [oneHundred.mul(5), oneHundred.mul(5)], [sToken.address, pToken.address], daofund.address, theoryUnlocker.address, devfund.address,
                [],
                [],
                [zero,BigNumber.from(20),BigNumber.from(40),BigNumber.from(50)], ["bronze","silver","gold","platinum"],
                [BigNumber.from(300),BigNumber.from(100),BigNumber.from(50),BigNumber.from(10)])).to.be.revertedWith("Max level arrays must be equal in non-zero length and time should start at 0.");
        });
        it("constructor maxLevel not zero FAILURE", async () => {
            const TheoryUnlockerGen1 = await smock.mock("TheoryUnlockerGen1");
            await expect(TheoryUnlockerGen1.deploy(iToken.address, [oneHundred.mul(5), oneHundred.mul(5)], [sToken.address, pToken.address], daofund.address, theoryUnlocker.address, devfund.address,
                [one, startTime.add(days.mul(15)), startTime.add(days.mul(15).mul(2)), startTime.add(days.mul(15).mul(3)), startTime.add(days.mul(15).mul(4)), startTime.add(days.mul(15).mul(5)), startTime.add(days.mul(15).mul(6)), startTime.add(days.mul(15).mul(7)), startTime.add(days.mul(15).mul(8)), startTime.add(days.mul(15).mul(9))],
                [BigNumber.from(5),BigNumber.from(10),BigNumber.from(15),BigNumber.from(20),BigNumber.from(25),BigNumber.from(30),BigNumber.from(35),BigNumber.from(40),BigNumber.from(45),BigNumber.from(50)],
                [zero,BigNumber.from(20),BigNumber.from(40),BigNumber.from(50)], ["bronze","silver","gold","platinum"],
                [BigNumber.from(300),BigNumber.from(100),BigNumber.from(50),BigNumber.from(10)])).to.be.revertedWith("Max level arrays must be equal in non-zero length and time should start at 0.");
        });
        it("constructor maxLevel not equal length FAILURE", async () => {
            const TheoryUnlockerGen1 = await smock.mock("TheoryUnlockerGen1");
            await expect(TheoryUnlockerGen1.deploy(iToken.address, [oneHundred.mul(5), oneHundred.mul(5)], [sToken.address, pToken.address], daofund.address, theoryUnlocker.address, devfund.address,
                [zero, startTime.add(days.mul(15)), startTime.add(days.mul(15).mul(2)), startTime.add(days.mul(15).mul(3)), startTime.add(days.mul(15).mul(4)), startTime.add(days.mul(15).mul(5)), startTime.add(days.mul(15).mul(6)), startTime.add(days.mul(15).mul(7)), startTime.add(days.mul(15).mul(8)), startTime.add(days.mul(15).mul(9))],
                [BigNumber.from(10),BigNumber.from(15),BigNumber.from(20),BigNumber.from(25),BigNumber.from(30),BigNumber.from(35),BigNumber.from(40),BigNumber.from(45),BigNumber.from(50)],
                [zero,BigNumber.from(20),BigNumber.from(40),BigNumber.from(50)], ["bronze","silver","gold","platinum"],
                [BigNumber.from(300),BigNumber.from(100),BigNumber.from(50),BigNumber.from(10)])).to.be.revertedWith("Max level arrays must be equal in non-zero length and time should start at 0.");
        });
        it("constructor maxLevel > 100 FAILURE", async () => {
            const TheoryUnlockerGen1 = await smock.mock("TheoryUnlockerGen1");
            await expect(TheoryUnlockerGen1.deploy(iToken.address, [oneHundred.mul(5), oneHundred.mul(5)], [sToken.address, pToken.address], daofund.address, theoryUnlocker.address, devfund.address,
                [zero, startTime.add(days.mul(15)), startTime.add(days.mul(15).mul(2)), startTime.add(days.mul(15).mul(3)), startTime.add(days.mul(15).mul(4)), startTime.add(days.mul(15).mul(5)), startTime.add(days.mul(15).mul(6)), startTime.add(days.mul(15).mul(7)), startTime.add(days.mul(15).mul(8)), startTime.add(days.mul(15).mul(9))],
                [BigNumber.from(5),BigNumber.from(10),BigNumber.from(110),BigNumber.from(20),BigNumber.from(25),BigNumber.from(30),BigNumber.from(35),BigNumber.from(40),BigNumber.from(45),BigNumber.from(50)],
                [zero,BigNumber.from(20),BigNumber.from(40),BigNumber.from(50)], ["bronze","silver","gold","platinum"],
                [BigNumber.from(300),BigNumber.from(100),BigNumber.from(50),BigNumber.from(10)])).to.be.revertedWith("Max level can't be higher than 100.");
        });
        it("setBuyToken SUCCESS", async () => {
            await theoryUnlockerGen1.setBuyToken(sToken.address);
            expect(await theoryUnlockerGen1.buyToken()).to.equal(sToken.address);
        });
        it("setBuyToken not authorized FAILURE", async () => {
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.setBuyToken(sToken.address)).to.be.revertedWith('caller is not authorized');
        });
        it("setBurnPercentage SUCCESS", async () => {
            await theoryUnlockerGen1.setBurnPercentage(BigNumber.from(5000));
            expect(await theoryUnlockerGen1.burnPercentage()).to.equal(BigNumber.from(5000));
            await theoryUnlockerGen1.setBurnPercentage(BigNumber.from(10000));
            expect(await theoryUnlockerGen1.burnPercentage()).to.equal(BigNumber.from(10000));
        });
        it("setBurnPercentage not authorized FAILURE", async () => {
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.setBurnPercentage(zero)).to.be.revertedWith('caller is not authorized');
        });
        it("setBurnPercentage burnAmount FAILURE", async () => {
            await expect(theoryUnlockerGen1.setBurnPercentage(BigNumber.from(10001))).to.be.revertedWith('BA');
        });
        it("setRouter SUCCESS", async () => {
            await theoryUnlockerGen1.setRouter(devfund.address);
            expect(await theoryUnlockerGen1.router()).to.equal(devfund.address);
        });
        it("setRouter not authorized FAILURE", async () => {
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.setRouter(devfund.address)).to.be.revertedWith('caller is not authorized');
        });
        it("setPrices initialPrice SUCCESS", async () => {
            await theoryUnlockerGen1.setPrices(one, zero);
            expect(await theoryUnlockerGen1.initialPrice()).to.equal(one);
        });
        it("setPrices not authorized FAILURE", async () => {
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.setPrices(one, one)).to.be.revertedWith('caller is not authorized');
        });
        it("setPrices buyTokenPerLevel SUCCESS", async () => {
            await theoryUnlockerGen1.setPrices(one, one);
            expect(await theoryUnlockerGen1.buyTokenPerLevel()).to.equal(one);
        });
        it("setPrices initialPrice < buyTokenPerLevel FAILURE", async () => {
            await expect(theoryUnlockerGen1.setPrices(zero, one)).to.be.revertedWith('IP');
        });
        it("setLevelURIs SUCCESS", async () => {
            await theoryUnlockerGen1.setDisableMint(true);
            await theoryUnlockerGen1.setLevelURIs([zero,BigNumber.from(70)],["blah", "something"],
                [zero, BigNumber.from(79)],[zero, BigNumber.from(12)],[zero, BigNumber.from(84)]);
            expect(await theoryUnlockerGen1.levelURIsLevel(1)).to.equal(BigNumber.from(70));
            expect(await theoryUnlockerGen1.levelURIsURI(1)).to.equal("something");
            expect(await theoryUnlockerGen1.levelURIsMax(1)).to.equal(BigNumber.from(79));
            expect(await theoryUnlockerGen1.levelURIsSupply(1)).to.equal(BigNumber.from(12));
            expect(await theoryUnlockerGen1.levelURIsMinted(1)).to.equal(BigNumber.from(84));
        });
        it("setLevelURIs zero length FAILURE", async () => {
            await theoryUnlockerGen1.setDisableMint(true);
            await expect(theoryUnlockerGen1.setLevelURIs([],[],[],[],[])).to.be.revertedWith('Level URI arrays must be equal in non-zero length and level should start at 0.');
        });
        it("setLevelURIs not zero FAILURE", async () => {
            await theoryUnlockerGen1.setDisableMint(true);
            await expect(theoryUnlockerGen1.setLevelURIs([one,BigNumber.from(70)],["blah", "something"],[zero, BigNumber.from(79)],[zero, BigNumber.from(12)],[zero, BigNumber.from(84)])).to.be.revertedWith('Level URI arrays must be equal in non-zero length and level should start at 0.');
        });
        it("setLevelURIs not equal length FAILURE", async () => {
            await theoryUnlockerGen1.setDisableMint(true);
            await expect(theoryUnlockerGen1.setLevelURIs([zero],["blah", "something"],[zero, BigNumber.from(79)],[zero, BigNumber.from(12)],[zero, BigNumber.from(84)])).to.be.revertedWith('Level URI arrays must be equal in non-zero length and level should start at 0.');
        });
        it("setLevelURIs not authorized FAILURE", async () => {
            await theoryUnlockerGen1.setDisableMint(true);
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.setLevelURIs([zero,BigNumber.from(70)],["blah", "something"],[zero, BigNumber.from(79)],[zero, BigNumber.from(12)],[zero, BigNumber.from(84)])).to.be.revertedWith('caller is not authorized');
        });
        it("setLevelURIs disableMint FAILURE", async () => {
            await expect(theoryUnlockerGen1.setLevelURIs([zero,BigNumber.from(70)],["blah", "something"],[zero, BigNumber.from(79)],[zero, BigNumber.from(12)],[zero, BigNumber.from(84)])).to.be.revertedWith('DMURI');
        });
        it("setMaxLevel SUCCESS", async () => {
            await theoryUnlockerGen1.setMaxLevel([zero,hours],[BigNumber.from(50),BigNumber.from(100)]);
            expect(await theoryUnlockerGen1.maxLevelTime(1)).to.equal(hours);
            expect(await theoryUnlockerGen1.maxLevelLevel(1)).to.equal(BigNumber.from(100));
        });
        it("setMaxLevel zero length FAILURE", async () => {
            await expect(theoryUnlockerGen1.setMaxLevel([],[])).to.be.revertedWith('Max level arrays must be equal in non-zero length and time should start at 0.');
        });
        it("setMaxLevel not zero FAILURE", async () => {
            await expect(theoryUnlockerGen1.setMaxLevel([minutes,hours],[BigNumber.from(25),BigNumber.from(50)])).to.be.revertedWith('Max level arrays must be equal in non-zero length and time should start at 0.');
        });
        it("setMaxLevel not equal length FAILURE", async () => {
            await expect(theoryUnlockerGen1.setMaxLevel([zero,hours],[BigNumber.from(50)])).to.be.revertedWith('Max level arrays must be equal in non-zero length and time should start at 0.');
        });
        it("setMaxLevel > 100 FAILURE", async () => {
            await expect(theoryUnlockerGen1.setMaxLevel([zero,hours],[BigNumber.from(25),BigNumber.from(999)])).to.be.revertedWith("Max level can't be higher than 100.");
        });
        it("setMaxLevel not authorized FAILURE", async () => {
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.setMaxLevel([zero,hours],[BigNumber.from(25),BigNumber.from(50)])).to.be.revertedWith('caller is not authorized');
        });
        it("setGameCostForLevel SUCCESS", async () => {
            await theoryUnlockerGen1.setGameCostForLevel(BigNumber.from(2), [zero,hours],[BigNumber.from(50),BigNumber.from(100)]);
            expect(await theoryUnlockerGen1.gameCostPerLevel()).to.equal(BigNumber.from(2));
            expect(await theoryUnlockerGen1.extraGameCostLevel(1)).to.equal(hours);
            expect(await theoryUnlockerGen1.extraGameCostAmount(1)).to.equal(BigNumber.from(100));
        });
        it("setGameCostForLevel zero length FAILURE", async () => {
            await expect(theoryUnlockerGen1.setGameCostForLevel(BigNumber.from(1), [],[])).to.be.revertedWith('GCA');
        });
        it("setGameCostForLevel not zero FAILURE", async () => {
            await expect(theoryUnlockerGen1.setGameCostForLevel(BigNumber.from(1),[minutes,hours],[BigNumber.from(25),BigNumber.from(50)])).to.be.revertedWith('GCA');
        });
        it("setGameCostForLevel not equal length FAILURE", async () => {
            await expect(theoryUnlockerGen1.setGameCostForLevel(BigNumber.from(1),[zero,hours],[BigNumber.from(50)])).to.be.revertedWith('GCA');
        });
        // it("setGameCostForLevel > 100 FAILURE", async () => {
        //     await expect(theoryUnlockerGen1.setGameCostForLevel(BigNumber.from(1),[zero,hours],[BigNumber.from(25),BigNumber.from(999)])).to.be.revertedWith("Max level can't be higher than 100.");
        // });
        // it("setGameCostForLevel > 10 FAILURE", async () => {
        //     await expect(theoryUnlockerGen1.setGameCostForLevel(BigNumber.from(11),[zero,hours],[BigNumber.from(25),BigNumber.from(50)])).to.be.revertedWith("Extra game cost can't be higher than 100.");
        // });
        it("setGameCostForLevel not authorized FAILURE", async () => {
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.setGameCostForLevel(BigNumber.from(1), [zero,hours],[BigNumber.from(25),BigNumber.from(50)])).to.be.revertedWith('caller is not authorized');
        });
        it("setCommunityFund SUCCESS", async () => {
            await theoryUnlockerGen1.setCommunityFund(devfund.address);
            expect(await theoryUnlockerGen1.communityFund()).to.equal(devfund.address);
        });
        it("setCommunityFund not authorized FAILURE", async () => {
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.setCommunityFund(devfund.address)).to.be.revertedWith('caller is not authorized');
        });
        it("setTimeToLevel SUCCESS", async () => {
            await theoryUnlockerGen1.setTimeToLevel(hours);
            expect(await theoryUnlockerGen1.timeToLevel()).to.equal(hours);
        });
        it("setTimeToLevel not authorized FAILURE", async () => {
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.setTimeToLevel(hours)).to.be.revertedWith('caller is not authorized');
        });
        it("setDisableMint SUCCESS", async () => {
            await theoryUnlockerGen1.setDisableMint(true);
            expect(await theoryUnlockerGen1.disableMint()).to.equal(true);
        });
        it("setDisableMint not authorized FAILURE", async () => {
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.setDisableMint(true)).to.be.revertedWith('caller is not authorized');
        });
        it("setEmergencyDisableUnlock SUCCESS", async () => {
            await theoryUnlockerGen1.setEmergencyDisableUnlock(true);
            expect(await theoryUnlockerGen1.emergencyDisableUnlock()).to.equal(true);
        });
        it("setEmergencyDisableUnlock not authorized FAILURE", async () => {
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.setEmergencyDisableUnlock(true)).to.be.revertedWith('caller is not authorized');
        });
        it("setTokenLevel SUCCESS", async () => {
            await theoryUnlockerGen1.setTokenLevel(BigNumber.from(1), BigNumber.from(5));
            expect((await theoryUnlockerGen1.tokenInfo(BigNumber.from(1))).level).to.equal(BigNumber.from(5));
        });
        it("setTokenLevel zero FAILURE", async () => {
            await expect(theoryUnlockerGen1.setTokenLevel(BigNumber.from(1), BigNumber.from(0))).to.be.revertedWith('Level must be > 0 and <= max level.');
        });
        it("setTokenLevel greater than max FAILURE", async () => {
            await expect(theoryUnlockerGen1.setTokenLevel(BigNumber.from(1), BigNumber.from(6))).to.be.revertedWith('Level must be > 0 and <= max level.');
        });
        it("setTokenLevel not authorized FAILURE", async () => {
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.setTokenLevel(BigNumber.from(1), BigNumber.from(5))).to.be.revertedWith('caller is not authorized');
        });
        it("setCreationTime SUCCESS", async () => {
            await theoryUnlockerGen1.setCreationTime(BigNumber.from(1), hours);
            expect((await theoryUnlockerGen1.tokenInfo(BigNumber.from(1))).creationTime).to.equal(hours);
        });
        it("setCreationTime not authorized FAILURE", async () => {
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.setCreationTime(BigNumber.from(1), hours)).to.be.revertedWith('caller is not authorized');
        });
        it("setLastLevelTime SUCCESS", async () => {
            await theoryUnlockerGen1.setLastLevelTime(BigNumber.from(2), minutes);
            expect((await theoryUnlockerGen1.tokenInfo(BigNumber.from(2))).lastLevelTime).to.equal(minutes);
        });
        it("setLastLevelTime not authorized FAILURE", async () => {
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.setLastLevelTime(BigNumber.from(2), minutes)).to.be.revertedWith('caller is not authorized');
        });
        it("setLastUnlockTime SUCCESS", async () => {
            await theoryUnlockerGen1.setLastUnlockTime(devfund.address, minutes);
            expect((await theoryUnlocker.userInfo(devfund.address)).lastUnlockTime).to.equal(minutes);
        });
        it("setLastUnlockTime not authorized FAILURE", async () => {
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.setLastUnlockTime(devfund.address, minutes)).to.be.revertedWith('caller is not authorized');
        });
        it("setLastLockAmount SUCCESS", async () => {
            await theoryUnlockerGen1.setLastLockAmount(devfund.address, oneHundred.mul(5));
            expect((await theoryUnlocker.userInfo(devfund.address)).lastLockAmount).to.equal(oneHundred.mul(5));
        });
        it("setLastLockAmount not authorized FAILURE", async () => {
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.setLastLockAmount(devfund.address, oneHundred.mul(5))).to.be.revertedWith('caller is not authorized');
        });
        it("maxLevel SUCCESS", async () => {
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlockerGen1.maxLevel()).to.equal(BigNumber.from(5));
            await advanceTime(ethers.provider, days.mul(15).toNumber());
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlockerGen1.maxLevel()).to.equal(BigNumber.from(10));
            await advanceTime(ethers.provider, days.mul(15).toNumber());
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlockerGen1.maxLevel()).to.equal(BigNumber.from(15));
            await advanceTime(ethers.provider, days.mul(15).toNumber());
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlockerGen1.maxLevel()).to.equal(BigNumber.from(20));
            await advanceTime(ethers.provider, days.mul(15).toNumber());
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlockerGen1.maxLevel()).to.equal(BigNumber.from(25));
            await advanceTime(ethers.provider, days.mul(15).toNumber());
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlockerGen1.maxLevel()).to.equal(BigNumber.from(30));
            await advanceTime(ethers.provider, days.mul(15).toNumber());
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlockerGen1.maxLevel()).to.equal(BigNumber.from(35));
            await advanceTime(ethers.provider, days.mul(15).toNumber());
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlockerGen1.maxLevel()).to.equal(BigNumber.from(40));
            await advanceTime(ethers.provider, days.mul(15).toNumber());
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlockerGen1.maxLevel()).to.equal(BigNumber.from(45));
            await advanceTime(ethers.provider, days.mul(15).toNumber());
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlockerGen1.maxLevel()).to.equal(BigNumber.from(50));
            await advanceTime(ethers.provider, days.mul(15).toNumber());
            await ethers.provider.send('evm_mine');
            expect(await theoryUnlockerGen1.maxLevel()).to.equal(BigNumber.from(50));
        });
        it("levelURI SUCCESS", async () => {
            expect(await theoryUnlockerGen1.levelURI(1)).to.equal("bronze");
            expect(await theoryUnlockerGen1.levelURI(10)).to.equal("bronze");
            expect(await theoryUnlockerGen1.levelURI(20)).to.equal("silver");
            expect(await theoryUnlockerGen1.levelURI(30)).to.equal("silver");
            expect(await theoryUnlockerGen1.levelURI(40)).to.equal("gold");
            expect(await theoryUnlockerGen1.levelURI(45)).to.equal("gold");
            expect(await theoryUnlockerGen1.levelURI(50)).to.equal("platinum");
            expect(await theoryUnlockerGen1.levelURI(100)).to.equal("platinum");
        });
        it("supply SUCCESS", async () => {
            await theoryUnlockerGen1.mint(1, 50);
            expect(await theoryUnlockerGen1.supply(1)).to.equal(1);
            expect(await theoryUnlockerGen1.supply(10)).to.equal(1)
            await theoryUnlockerGen1.mint(20, 50);
            await theoryUnlockerGen1.mint(22, 50);
            expect(await theoryUnlockerGen1.supply(20)).to.equal(2);
            expect(await theoryUnlockerGen1.supply(30)).to.equal(2);
            await theoryUnlockerGen1.mint(41, 50);
            await theoryUnlockerGen1.mint(42, 50);
            await theoryUnlockerGen1.mint(45, 50);
            expect(await theoryUnlockerGen1.supply(40)).to.equal(3);
            expect(await theoryUnlockerGen1.supply(45)).to.equal(3);
            await theoryUnlockerGen1.mint(50, 50);
            await theoryUnlockerGen1.mint(50, 50);
            await theoryUnlockerGen1.mint(50, 50);
            await theoryUnlockerGen1.mint(50, 50);
            expect(await theoryUnlockerGen1.supply(50)).to.equal(4);
            expect(await theoryUnlockerGen1.supply(100)).to.equal(4);
            await theoryUnlockerGen1.merge(9, 10);
            expect(await theoryUnlockerGen1.supply(50)).to.equal(3);
        });
        it("minted SUCCESS", async () => {
            await theoryUnlockerGen1.mint(1, 50);
            expect(await theoryUnlockerGen1.minted(1)).to.equal(1);
            expect(await theoryUnlockerGen1.minted(10)).to.equal(1)
            await theoryUnlockerGen1.mint(20, 50);
            await theoryUnlockerGen1.mint(22, 50);
            expect(await theoryUnlockerGen1.minted(20)).to.equal(2);
            expect(await theoryUnlockerGen1.minted(30)).to.equal(2);
            await theoryUnlockerGen1.mint(41, 50);
            await theoryUnlockerGen1.mint(42, 50);
            await theoryUnlockerGen1.mint(45, 50);
            expect(await theoryUnlockerGen1.minted(40)).to.equal(3);
            expect(await theoryUnlockerGen1.minted(45)).to.equal(3);
            await theoryUnlockerGen1.mint(50, 50);
            await theoryUnlockerGen1.mint(50, 50);
            await theoryUnlockerGen1.mint(50, 50);
            await theoryUnlockerGen1.mint(50, 50);
            expect(await theoryUnlockerGen1.minted(50)).to.equal(4);
            expect(await theoryUnlockerGen1.minted(100)).to.equal(4);
            await theoryUnlockerGen1.merge(9, 10);
            expect(await theoryUnlockerGen1.minted(50)).to.equal(4);
        });
        it("maxMinted SUCCESS", async () => {
            expect(await theoryUnlockerGen1.maxMinted(1)).to.equal(300);
            expect(await theoryUnlockerGen1.maxMinted(10)).to.equal(300);
            expect(await theoryUnlockerGen1.maxMinted(20)).to.equal(100);
            expect(await theoryUnlockerGen1.maxMinted(30)).to.equal(100);
            expect(await theoryUnlockerGen1.maxMinted(40)).to.equal(50);
            expect(await theoryUnlockerGen1.maxMinted(45)).to.equal(50);
            expect(await theoryUnlockerGen1.maxMinted(50)).to.equal(10);
            expect(await theoryUnlockerGen1.maxMinted(100)).to.equal(10);
        });
        it("extraGameCost SUCCESS", async () => {
            expect(await theoryUnlockerGen1.extraGameCost(1)).to.equal(one.mul(5));
            expect(await theoryUnlockerGen1.extraGameCost(5)).to.equal(ten);
            expect(await theoryUnlockerGen1.extraGameCost(10)).to.equal(ten.mul(2));
            expect(await theoryUnlockerGen1.extraGameCost(15)).to.equal(ten.mul(4));
            expect(await theoryUnlockerGen1.extraGameCost(20)).to.equal(ten.mul(8));
            expect(await theoryUnlockerGen1.extraGameCost(25)).to.equal(ten.mul(16));
            expect(await theoryUnlockerGen1.extraGameCost(30)).to.equal(ten.mul(32));
            expect(await theoryUnlockerGen1.extraGameCost(35)).to.equal(ten.mul(64));
            expect(await theoryUnlockerGen1.extraGameCost(40)).to.equal(ten.mul(128));
            expect(await theoryUnlockerGen1.extraGameCost(45)).to.equal(ten.mul(256));
            expect(await theoryUnlockerGen1.extraGameCost(50)).to.equal(ten.mul(256));
            expect(await theoryUnlockerGen1.extraGameCost(100)).to.equal(ten.mul(256));
        });
        it("costOf SUCCESS", async () => {
            expect(await theoryUnlockerGen1.costOf(1)).to.equal(oneHundred.mul(5));
            expect(await theoryUnlockerGen1.costOf(2)).to.equal(oneHundred.mul(5).add(oneHundred.mul(5)));
            expect(await theoryUnlockerGen1.costOf(10)).to.equal(oneHundred.mul(5).add(oneHundred.mul(5).mul(9)));
            expect(await theoryUnlockerGen1.costOf(20)).to.equal(oneHundred.mul(5).add(oneHundred.mul(5).mul(19)));
            expect(await theoryUnlockerGen1.costOf(30)).to.equal(oneHundred.mul(5).add(oneHundred.mul(5).mul(29)));
            expect(await theoryUnlockerGen1.costOf(40)).to.equal(oneHundred.mul(5).add(oneHundred.mul(5).mul(39)));
            expect(await theoryUnlockerGen1.costOf(50)).to.equal(oneHundred.mul(5).add(oneHundred.mul(5).mul(49)));
            expect(await theoryUnlockerGen1.costOf(100)).to.equal(oneHundred.mul(5).add(oneHundred.mul(5).mul(99)));
        });
        it("timeLeftToLevel SUCCESS", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlockerGen1.mint(1, 50);
            expect(await theoryUnlockerGen1.timeLeftToLevel(1)).to.equal(days.mul(3));
        });
        it("nextLevelTime SUCCESS", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlockerGen1.mint(1, 50);
            expect(await theoryUnlockerGen1.nextLevelTime(1)).to.equal(BigNumber.from(await latestBlocktime(ethers.provider)).add(days.mul(3)));
        });
        it("mint admin SUCCESS", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            //let initialBalance = await iToken.balanceOf(await theoryUnlockerGen1.communityFund());
            expect(await theoryUnlockerGen1.totalSupply()).to.equal(zero);
            await theoryUnlockerGen1.mint(5, 50);
            //expect(await iToken.balanceOf(await theoryUnlockerGen1.communityFund())).to.equal(initialBalance.add(oneHundred.mul(5).add(oneHundred.mul(5).mul(4))));
            expect(await theoryUnlockerGen1.totalSupply()).to.equal(BigNumber.from(1));
            let timestamp = await latestBlocktime(ethers.provider);
            expect((await theoryUnlockerGen1.tokenInfo(1)).creationTime).to.equal(timestamp);
            expect((await theoryUnlockerGen1.tokenInfo(1)).lastLevelTime).to.equal(timestamp);
            expect((await theoryUnlockerGen1.tokenInfo(1)).level).to.equal(BigNumber.from(5));
            expect(await theoryUnlockerGen1.tokenURI(1)).to.equal("bronze");
        });
        it("mint normal SUCCESS", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            let initialBalance = await iToken.balanceOf(await theoryUnlockerGen1.communityFund());
            expect(await theoryUnlockerGen1.totalSupply()).to.equal(zero);

            let balances = {};
            balances[deployer.address] = oneBillion;
            await pToken.setVariable("_balances", balances);
            await pToken.setVariable("_totalSupply", oneBillion);

            await pToken.approve(spookySwapRouter.address, BigNumber.from("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"));
            await iToken.approve(spookySwapRouter.address, BigNumber.from("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"));
            await spookySwapRouter.addLiquidity(pToken.address, iToken.address, one.mul(100000), one.mul(100000), one.mul(100000), one.mul(100000), deployer.address, startTime.add(60 * 10));

            let initialDeployerBalance = await iToken.balanceOf(deployer.address);

            await theoryUnlockerGen1.renounceOwnership();
            await theoryUnlockerGen1.mint(5, 50);
            let price = oneHundred.mul(5).add(oneHundred.mul(5).mul(4));
            expect(await iToken.balanceOf(deployer.address)).to.equal(initialDeployerBalance.sub(price));
            expect(await iToken.balanceOf(await theoryUnlockerGen1.communityFund())).to.equal(initialBalance.add(price.sub(price.mul(1000).div(10000))));
            expect(await theoryUnlockerGen1.totalSupply()).to.equal(BigNumber.from(1));
            expect(await pToken.totalSupply()).to.be.below(oneBillion);
            let timestamp = await latestBlocktime(ethers.provider);
            expect((await theoryUnlockerGen1.tokenInfo(1)).creationTime).to.equal(timestamp);
            expect((await theoryUnlockerGen1.tokenInfo(1)).lastLevelTime).to.equal(timestamp);
            expect((await theoryUnlockerGen1.tokenInfo(1)).level).to.equal(BigNumber.from(5));
            expect(await theoryUnlockerGen1.tokenURI(1)).to.equal("bronze");
        });
        it("mint disabled FAILURE", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlockerGen1.setDisableMint(true);
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.mint(1, 50)).to.be.revertedWith('Minting unavailable.');
        });
        it("mint zero FAILURE", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await expect(theoryUnlockerGen1.mint(0, 50)).to.be.revertedWith('Level must be > 0 and <= max level.');
        });
        it("mint > max level FAILURE", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.mint(100, 50)).to.be.revertedWith('Level must be > 0 and <= max level.');
        });
        it("mint too much FAILURE", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlockerGen1.mint(50, 50);
            await theoryUnlockerGen1.mint(50, 50);
            await theoryUnlockerGen1.mint(50, 50);
            await theoryUnlockerGen1.mint(50, 50);
            await theoryUnlockerGen1.mint(50, 50);
            await theoryUnlockerGen1.mint(50, 50);
            await theoryUnlockerGen1.mint(50, 50);
            await theoryUnlockerGen1.mint(50, 50);
            await theoryUnlockerGen1.mint(50, 50);
            await theoryUnlockerGen1.mint(50, 50);
            await expect(theoryUnlockerGen1.mint(50, 50)).to.be.revertedWith('Max minted.');
        });

        it("merge SUCCESS", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            expect(await theoryUnlockerGen1.totalSupply()).to.equal(zero);
            await theoryUnlockerGen1.mint(1, 50);
            expect(await theoryUnlockerGen1.totalSupply()).to.equal(BigNumber.from(1));
            await theoryUnlockerGen1.mint(2, 50);
            expect(await theoryUnlockerGen1.totalSupply()).to.equal(BigNumber.from(2));
            await theoryUnlockerGen1.merge(1,2);
            expect(await theoryUnlockerGen1.totalSupply()).to.equal(BigNumber.from(1));
            let timestamp = await latestBlocktime(ethers.provider);
            expect((await theoryUnlockerGen1.tokenInfo(3)).creationTime).to.equal(timestamp);
            expect((await theoryUnlockerGen1.tokenInfo(3)).lastLevelTime).to.equal(timestamp);
            expect((await theoryUnlockerGen1.tokenInfo(3)).level).to.equal(BigNumber.from(3));
            expect(await theoryUnlockerGen1.tokenURI(3)).to.equal("bronze");
        });
        it("merge > max level FAILURE", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlockerGen1.mint(5, 50);
            await theoryUnlockerGen1.mint(5, 50);
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.merge(1,2)).to.be.revertedWith('Level must be > 0 and <= max level.');
        });
        it("merge not same owner FAILURE", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlockerGen1.mint(5, 50);
            await theoryUnlockerGen1.mint(5, 50);
            await theoryUnlockerGen1.transferFrom(deployer.address, daofund.address, 2);
            await expect(theoryUnlockerGen1.merge(1,2)).to.be.revertedWith('Both tokens must have the same owner.');
        });
        it("merge invalid permissions FAILURE", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlockerGen1.mint(5, 50);
            await theoryUnlockerGen1.mint(5, 50);
            await theoryUnlockerGen1.transferFrom(deployer.address, daofund.address, 2);
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.merge(2,1)).to.be.revertedWith('Not enough permissions for token 1.');
            await expect(theoryUnlockerGen1.merge(1,2)).to.be.revertedWith('Not enough permissions for token 2.');
        });
        it("merge already merged FAILURE", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlockerGen1.mint(5, 50);
            await theoryUnlockerGen1.mint(5, 50);
            await theoryUnlockerGen1.mint(5, 50);
            await theoryUnlockerGen1.merge(1,2);
            await expect(theoryUnlockerGen1.merge(4,3)).to.be.revertedWith('Token 1 has already been merged.');
            await expect(theoryUnlockerGen1.merge(3,4)).to.be.revertedWith('Token 2 has already been merged.');
        });

        it("levelUp admin SUCCESS", async () => {
            //await theoryUnlockerGen1.renounceOwnership();
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await advanceTime(ethers.provider, years.toNumber());
            await theoryUnlockerGen1.mint(19, 50);
            expect(await theoryUnlockerGen1.tokenURI(1)).to.equal("bronze");
            let timestamp1 = await latestBlocktime(ethers.provider);
            await advanceTime(ethers.provider, days.mul(3).toNumber());
            await theoryUnlockerGen1.levelUp(1);
            let timestamp2 = await latestBlocktime(ethers.provider);
            expect((await theoryUnlockerGen1.tokenInfo(1)).creationTime).to.equal(timestamp1);
            expect((await theoryUnlockerGen1.tokenInfo(1)).lastLevelTime).to.equal(timestamp2);
            expect((await theoryUnlockerGen1.tokenInfo(1)).level).to.equal(BigNumber.from(20));
            //expect(await theoryUnlockerGen1.tokenURI(1)).to.equal("silver");
            expect(await theoryUnlockerGen1.tokenURI(1)).to.equal("bronze");
            await advanceTime(ethers.provider, days.mul(6).toNumber());
            await theoryUnlockerGen1.levelUpTo(1, 22);
            expect((await theoryUnlockerGen1.tokenInfo(1)).level).to.equal(BigNumber.from(22));
            await advanceTime(ethers.provider, days.mul(12).toNumber());
            await theoryUnlockerGen1.levelUpToMax(1);
            expect((await theoryUnlockerGen1.tokenInfo(1)).level).to.equal(BigNumber.from(26));
        });

        it("levelUp normal SUCCESS", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await advanceTime(ethers.provider, years.toNumber());
            await theoryUnlockerGen1.mint(19, 50);
            expect(await theoryUnlockerGen1.tokenURI(1)).to.equal("bronze");
            let timestamp1 = await latestBlocktime(ethers.provider);
            await advanceTime(ethers.provider, days.mul(3).toNumber());
            await theoryUnlockerGen1.renounceOwnership();
            await pToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            let balances = {};
            balances[deployer.address] = oneBillion;
            await pToken.setVariable("_balances", balances);
            let balance = await pToken.balanceOf(deployer.address);
            await theoryUnlockerGen1.levelUp(1);
            let timestamp2 = await latestBlocktime(ethers.provider);
            expect((await theoryUnlockerGen1.tokenInfo(1)).creationTime).to.equal(timestamp1);
            expect((await theoryUnlockerGen1.tokenInfo(1)).lastLevelTime).to.equal(timestamp2);
            expect((await theoryUnlockerGen1.tokenInfo(1)).level).to.equal(BigNumber.from(20));
            expect(await theoryUnlockerGen1.tokenURI(1)).to.equal("bronze");
            expect(await iToken.balanceOf(deployer.address)).to.equal(balance.sub(one.mul(6)));
        });

        it("levelUp invalid permissions FAILURE", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlockerGen1.mint(5, 50);
            await advanceTime(ethers.provider, days.mul(3).toNumber());
            await theoryUnlockerGen1.transferFrom(deployer.address, devfund.address, 1);
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.levelUp(1)).to.be.revertedWith('Not enough permissions.');
        });
        it("levelUp > maxLevel FAILURE", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlockerGen1.mint(5, 50);
            await advanceTime(ethers.provider, days.mul(3).toNumber());
            await expect(theoryUnlockerGen1.levelUp(1)).to.be.revertedWith('Level must be lower than max level.');
        });
        it("levelUp too early FAILURE", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlockerGen1.mint(1, 50);
            await expect(theoryUnlockerGen1.levelUp(1)).to.be.revertedWith('Too early to level up.');
            await advanceTime(ethers.provider, days.mul(6).toNumber());
            await theoryUnlockerGen1.levelUp(1);
            expect((await theoryUnlockerGen1.tokenInfo(1)).level).to.equal(BigNumber.from(2));
            await theoryUnlockerGen1.levelUp(1)
            expect((await theoryUnlockerGen1.tokenInfo(1)).level).to.equal(BigNumber.from(3));
            await expect(theoryUnlockerGen1.levelUp(1)).to.be.revertedWith('Too early to level up.');
        });
        it("nftUnlock part 1 SUCCESS", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlockerGen1.mint(1, 50);
            let lockAmount = one.mul(10).div(100);
            await sToken.lock(deployer.address, lockAmount);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount);
            await theoryUnlockerGen1.nftUnlock(1);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount.sub(lockAmount.div(100)));
            expect((await theoryUnlocker.userInfo(deployer.address)).lastLockAmount).to.equal(lockAmount.sub(lockAmount.div(100)));
            //Test twice
            await theoryUnlockerGen1.nftUnlock(1);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount.sub(lockAmount.div(100)));
            expect((await theoryUnlocker.userInfo(deployer.address)).lastLockAmount).to.equal(lockAmount.sub(lockAmount.div(100)));

            let extraLock = one.mul(10).div(100);
            await sToken.lock(deployer.address, extraLock);
            let oldLock = lockAmount.sub(lockAmount.div(100));
            lockAmount = oldLock.add(extraLock);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount);
            expect(await theoryUnlockerGen1.canUnlockAmount(deployer.address, 1)).to.equal(extraLock.div(100));
            await theoryUnlockerGen1.nftUnlock(1);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount.sub(extraLock.div(100)));
            expect((await theoryUnlocker.userInfo(deployer.address)).lastLockAmount).to.equal(lockAmount.sub(extraLock.div(100)));
            await theoryUnlockerGen1.renounceOwnership();
            await theoryUnlockerGen1.nftUnlock(1);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount.sub(extraLock.div(100)));
            expect((await theoryUnlocker.userInfo(deployer.address)).lastLockAmount).to.equal(lockAmount.sub(extraLock.div(100)));
        });
        it("nftUnlock part 2 SUCCESS", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlockerGen1.mint(1, 50);
            let lockAmount = one.mul(10).div(100);
            await sToken.lock(deployer.address, lockAmount);
            await theoryUnlockerGen1.setLastLockAmount(deployer.address, lockAmount.add(one));
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount);
            expect((await theoryUnlocker.userInfo(deployer.address)).lastLockAmount).to.equal(lockAmount.add(one));
            await theoryUnlockerGen1.nftUnlock(1);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount);
            expect((await theoryUnlocker.userInfo(deployer.address)).lastLockAmount).to.equal(lockAmount);

            //More locked
            let extraLock = one.mul(10).div(100);
            await sToken.lock(deployer.address, extraLock);
            let oldLock = lockAmount;
            lockAmount = oldLock.add(extraLock);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount);
            await theoryUnlockerGen1.nftUnlock(1);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount.sub(extraLock.div(100)));
            expect((await theoryUnlocker.userInfo(deployer.address)).lastLockAmount).to.equal(lockAmount.sub(extraLock.div(100)));
        });
        it("nftUnlock amountLocked == 0 SUCCESS", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlockerGen1.mint(1, 50);
            expect(await sToken.lockOf(deployer.address)).to.equal(zero);
            expect((await theoryUnlocker.userInfo(deployer.address)).lastLockAmount).to.equal(zero);
            await theoryUnlockerGen1.nftUnlock(1);
            expect(await sToken.lockOf(deployer.address)).to.equal(zero);
            expect((await theoryUnlocker.userInfo(deployer.address)).lastLockAmount).to.equal(zero);
        });
        it("nftUnlock too much to unlock naturally FAILURE", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlockerGen1.mint(1, 50);
            let lockAmount = one.mul(95).div(100);
            await sToken.lock(deployer.address, lockAmount);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount);
            await advanceTime(ethers.provider, years.mul(2).toNumber());
            await expect(theoryUnlockerGen1.nftUnlock(1)).to.be.revertedWith('Too much to unlock naturally, please call unlock() first.');
        });
        it("nftUnlock not authorized FAILURE", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlockerGen1.mint(1, 50);
            await theoryUnlockerGen1.transferFrom(deployer.address, daofund.address, 1);
            expect(await sToken.lockOf(deployer.address)).to.equal(zero);
            expect((await theoryUnlocker.userInfo(deployer.address)).lastLockAmount).to.equal(zero);
            await theoryUnlockerGen1.renounceOwnership();
            await expect(theoryUnlockerGen1.nftUnlock(1)).to.be.revertedWith('Not enough permissions.');
        });
        it("nftUnlock emergencyDisableUnlock FAILURE", async () => {
            await iToken.approve(theoryUnlockerGen1.address, "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            await theoryUnlockerGen1.mint(1, 50);
            let lockAmount = one.mul(95).div(100);
            await sToken.lock(deployer.address, lockAmount);
            expect(await sToken.lockOf(deployer.address)).to.equal(lockAmount);
            await theoryUnlockerGen1.setEmergencyDisableUnlock(true);
            await expect(theoryUnlockerGen1.nftUnlock(1)).to.be.revertedWith('NFT unlocking has been disabled in an emergency.');
        });
    });
});