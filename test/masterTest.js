const { ethers } = require('hardhat');
const { expect, assert, should, eventually } = require('chai');
const { smockit } = require('@defi-wonderland/smock');
const { intToBuffer } = require('ethjs-util');
const { BigNumber } = require('@ethersproject/bignumber');
const { smock } = require('@defi-wonderland/smock');
const chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
const { solidity } = require("ethereum-waffle");
chai.use(solidity);
const hre = require("hardhat");
const {setTime, advanceTime} = require("./shared/utilities");
const {getCurrentTimestamp} = require("hardhat/internal/hardhat-network/provider/utils/getCurrentTimestamp");

chai.use(chaiAsPromised);

async function latestBlocktime(provider) {
    const { timestamp } = await provider.getBlock('latest');
    return timestamp;
}
async function latestBlockNumber(provider) {
    const { number } = await provider.getBlock('latest');
    return number;
}

describe('masterTests', function () {
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
    var gToken;
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

        const TheoryToken = await smock.mock("Theory");
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

        const Master = await smock.mock("Master");
        gToken = await Master.deploy(sToken.address,
            pToken.address,
            theoretics.address,
            treasuryDAO.address,
            ["0xFfF54fcdFc0E4357be9577D8BC2B4579ce9D5C88",
            "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E" ,
            "0x168e509FE5aae456cDcAC39bEb6Fd56B6cb8912e" ,
            "0xF69FCB51A13D4Ca8A58d5a8D964e7ae5d9Ca8594" ,
            "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75" ,
            "0x82f0B8B456c1A451378467398982d4834b6829c1" ,
            "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83" ,
            "0x74b23882a30290451A17c44f4F05243b6b58C76d"]);
        await gToken.deployed();
        const gTokenDecimals = await gToken.decimals();
        console.log("- MasterToken deployed to:", gToken.address);
        console.log("MasterToken decimals:", gTokenDecimals);

        await pToken.addAuthorized(gToken.address);
        await sToken.connect(daofund).approve(gToken.address, BigNumber.from("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"));

        await setTime(ethers.provider, startTime.toNumber());
        //await ethers.provider.send('evm_mine');
        //expect(await pendingBlocktime(ethers.provider)).to.equal(startTime);
    });

    describe('Master', () => {
        it("setAdmin SUCCESS", async () => {
            await gToken.setAdmin(days.mul(366), days.mul(31), false);
            expect(await gToken.minLockTime()).to.equal(days.mul(366));
            expect(await gToken.unlockedClaimPenalty()).to.equal(days.mul(31));
            await gToken.setAdmin(days.mul(730), days.mul(730), true);
            expect(await gToken.minLockTime()).to.equal(days.mul(730));
            expect(await gToken.unlockedClaimPenalty()).to.equal(days.mul(730));
        });
        it("setAdmin not authorized FAILURE", async () => {
            await gToken.renounceOwnership();
            await expect(gToken.setAdmin(days.mul(366), days.mul(31), false)).to.be.revertedWith('caller is not authorized');
        });
        it("setAdmin lockTime too high FAILURE", async () => {
            await expect(gToken.setAdmin(days.mul(731), days.mul(31), false)).to.be.revertedWith('LT');
        });
        it("setAdmin penalty too high FAILURE", async () => {
            await expect(gToken.setAdmin(days.mul(366), days.mul(367), false)).to.be.revertedWith('PT');
        });
        //Not required as no payable function.
        // it("transferFTM SUCCESS", async () => {
        //     await deployer.sendTransaction({
        //         to: gToken.address,
        //         value: one
        //     });
        //     expect(await ethers.provider.getBalance(gToken.address)).to.equal(one);
        //     await gToken.transferFTM(deployer.address, one);
        //     expect(await ethers.provider.getBalance(gToken.address)).to.equal(zero);
        // });
        // it("transferFTM not authorized FAILURE", async () => {
        //     await gToken.renounceOwnership();
        //     await expect(gToken.transferFTM(gToken.address, deployer.address, one)).to.be.revertedWith('caller is not authorized');
        // });
        it("transferToken SUCCESS", async () => {
            let balances = {};
            balances[gToken.address] = oneBillion;
            await gToken.setVariable("_balances", balances);
            await gToken.setVariable("_totalSupply", oneBillion);
            await gToken.transferToken(gToken.address, deployer.address, one);
            expect(await gToken.balanceOf(gToken.address)).to.equal(oneBillion.sub(one));
            expect(await gToken.balanceOf(deployer.address)).to.equal(one);
        });
        it("transferToken not authorized FAILURE", async () => {
            await gToken.renounceOwnership();
            await expect(gToken.transferToken(gToken.address, deployer.address, one)).to.be.revertedWith('caller is not authorized');
        });
        //MASTER failure will be tested in another test.
        it("transferToken THEORY FAILURE", async () => {
            await expect(gToken.transferToken(sToken.address, deployer.address, one)).to.be.revertedWith('MP-');
        });
        //GAME failure will be tested in another test.
        it("transferToken whitelist FAILURE", async () => {
            await expect(gToken.transferToken("0x049d68029688eAbF473097a2fC38ef61633A3C7A", deployer.address, one)).to.be.revertedWith('WL');
        });
        it("stakeExternalTheory SUCCESS", async () => {
            await sToken.transfer(gToken.address, one);
            expect(await sToken.balanceOf(gToken.address)).to.equal(one);
            await gToken.stakeExternalTheory(one);
            expect(await sToken.balanceOf(gToken.address)).to.equal(zero);
            expect(await theoretics.balanceOf(gToken.address)).to.equal(one);
            expect(await sToken.balanceOf(deployer.address)).to.equal(zero);
        });
        it("stakeExternalTheory not authorized FAILURE", async () => {
            await gToken.renounceOwnership();
            await expect(gToken.stakeExternalTheory(one)).to.be.revertedWith('caller is not authorized');
        });
        //THEORY failure will be tested in another test.

        //Transfer will be tested in another test.
        //earned will be tested in another test.
        //_claimGame will be tested in another test.
        //_initiatePart1 will be tested in another test.
        //sellToTheory will be tested in another test.
        it("requests 0 epoch SUCCESS", async () => {
            let balances = {};
            balances[deployer.address] = oneBillion;
            await sToken.setVariable("_balances", balances);
            await sToken.setVariable("_totalSupply", oneBillion);
            await gToken.setAdmin(days, hours, false);
            await expect(gToken.claimGame()).to.be.revertedWith("No GAME to claim.");

            await sToken.approve(gToken.address, one);
            expect(await gToken.masterToTheory(one)).to.equal(one);
            expect(await gToken.theoryToMaster(one)).to.equal(one);
            await gToken.buyFromTheory(one, zero);
            let user = await gToken.userInfo(deployer.address);
            let lastLockToTimeDeployer = user.lockToTime;
            expect(user.lockToTime.gte(startTime.add(days))).to.equal(true);
            expect(user.chosenLockTime).to.equal(days);
            expect(user.approveTransferFrom).to.equal("0x0000000000000000000000000000000000000000");
            expect(user.lastSnapshotIndex).to.equal(0);
            expect(user.rewardEarned).to.equal(0);
            expect(user.withdrawRequestedInMaster).to.equal(0);
            expect(user.withdrawRequestedInTheory).to.equal(0);
            expect(user.lastStakeRequestBlock).to.not.equal(0);
            expect(user.lastWithdrawRequestBlock).to.equal(0);
            expect(await gToken.balanceOf(deployer.address)).to.equal(one);
            expect(await theoretics.balanceOf(gToken.address)).to.equal(one);
            expect(await gToken.masterToTheory(one)).to.equal(one);
            expect(await gToken.theoryToMaster(one)).to.equal(one);

            await sToken.transfer(gToken.address, one.mul(2));
            await sToken.transfer(devfund.address, one);
            expect(await gToken.masterToTheory(one)).to.equal(one);
            expect(await gToken.theoryToMaster(one)).to.equal(one);
            sToken = sToken.connect(devfund);
            gToken = gToken.connect(devfund);
            theoretics = theoretics.connect(devfund);

            await sToken.approve(gToken.address, one);
            await gToken.buyFromTheory(one, zero);
            user = await gToken.userInfo(devfund.address);
            expect(user.lockToTime.gte(startTime.add(days))).to.equal(true);
            expect(user.chosenLockTime).to.equal(days);
            expect(user.approveTransferFrom).to.equal("0x0000000000000000000000000000000000000000");
            expect(user.lastSnapshotIndex).to.equal(0);
            expect(user.rewardEarned).to.equal(0);
            expect(user.withdrawRequestedInMaster).to.equal(0);
            expect(user.withdrawRequestedInTheory).to.equal(0);
            expect(user.lastStakeRequestBlock).to.not.equal(0);
            expect(user.lastWithdrawRequestBlock).to.equal(0);
            expect(await gToken.balanceOf(devfund.address)).to.equal(one);
            expect(await theoretics.balanceOf(gToken.address)).to.equal(one.mul(2));
            expect(await gToken.masterToTheory(one)).to.equal(one);
            expect(await gToken.theoryToMaster(one)).to.equal(one);

            sToken = sToken.connect(deployer);
            gToken = gToken.connect(deployer);
            theoretics = theoretics.connect(deployer);

            await gToken.stakeExternalTheory(one.mul(2));
            expect(await gToken.masterToTheory(one)).to.equal(one.mul(2));
            expect(await gToken.theoryToMaster(one.mul(2))).to.equal(one);

            await gToken.renounceOwnership();
            await expect(gToken.transfer(devfund.address, one)).to.be.revertedWith("Receiver did not approve transfer.");
            await gToken.connect(devfund).approveTransferFrom(deployer.address);
            let lastLockToTime = user.lockToTime
            await gToken.transfer(devfund.address, half);

            user = await gToken.userInfo(devfund.address);
            expect(user.lockToTime.gt(lastLockToTime)).to.equal(true);

            expect(await gToken.balanceOf(deployer.address)).to.equal(half, false);

            await expect(gToken.requestSellToTheory(half, false)).to.be.revertedWith("Still locked!");
            await advanceTime(ethers.provider, days.toNumber());
            expect(gToken.sellToTheory()).to.be.revertedWith("Call requestSellToTheory instead.")
            await gToken.requestSellToTheory(half, false);

            user = await gToken.userInfo(deployer.address);
            expect(user.lockToTime).to.equal(lastLockToTimeDeployer);
            expect(user.chosenLockTime).to.equal(days);
            expect(user.approveTransferFrom).to.equal("0x0000000000000000000000000000000000000000");
            expect(user.lastSnapshotIndex).to.equal(0);
            expect(user.rewardEarned).to.equal(0);
            expect(user.withdrawRequestedInMaster).to.equal(0);
            expect(user.withdrawRequestedInTheory).to.equal(0);
            expect(user.lastStakeRequestBlock).to.not.equal(0);
            expect(user.lastWithdrawRequestBlock).to.not.equal(0);

            expect(await gToken.balanceOf(deployer.address)).to.equal(zero);
            expect(await sToken.balanceOf(gToken.address)).to.equal(zero);
            expect(await theoretics.balanceOf(gToken.address)).to.equal(one.mul(3));
            expect(await gToken.masterToTheory(one)).to.equal(one.mul(2));
            expect(await gToken.theoryToMaster(one.mul(2))).to.equal(one);

            await gToken.connect(devfund).requestSellToTheory(one.add(half), false);
            expect(await gToken.masterToTheory(one)).to.equal(one);
            expect(await gToken.theoryToMaster(one)).to.equal(one);

        });
        it("requests 6 epoch SUCCESS", async () => {
            let balances = {};
            balances[deployer.address] = oneBillion;
            await sToken.setVariable("_balances", balances);
            await sToken.setVariable("_totalSupply", oneBillion);

            await sToken.approve(theoretics.address, half);
            await advanceTime(ethers.provider, years.toNumber());
            await theoretics.stake(half);

            await treasuryDAO.allocateSeigniorage();

            let blockTime = BigNumber.from(await latestBlocktime(ethers.provider));
            expect(await theoryRewardPool.getLockPercentage(blockTime.sub(1), blockTime)).to.equal(zero);
            expect(await theoretics.getCurrentWithdrawEpochs()).to.equal(6);

            await sToken.approve(gToken.address, one);
            expect(await gToken.masterToTheory(one)).to.equal(one);
            expect(await gToken.theoryToMaster(one)).to.equal(one);
            await gToken.buyFromTheory(one, zero);
            let user = await gToken.userInfo(deployer.address);
            expect(user.lockToTime.gte(startTime.add(years))).to.equal(true);
            expect(user.chosenLockTime).to.equal(years);
            expect(user.approveTransferFrom).to.equal("0x0000000000000000000000000000000000000000");
            expect(user.lastSnapshotIndex).to.equal(0);
            expect(user.rewardEarned).to.equal(0);
            expect(user.withdrawRequestedInMaster).to.equal(0);
            expect(user.withdrawRequestedInTheory).to.equal(0);
            expect(user.lastStakeRequestBlock).to.not.equal(0);
            expect(user.lastWithdrawRequestBlock).to.equal(0);

            expect(await sToken.balanceOf(deployer.address)).to.equal(oneBillion.sub(half).sub(one));
            expect(await gToken.balanceOf(deployer.address)).to.equal(one);
            expect(await theoretics.balanceOf(gToken.address)).to.equal(zero);
            expect(await theoretics.totalSupply()).to.equal(half);
            expect(await gToken.masterToTheory(one)).to.equal(one);
            expect(await gToken.theoryToMaster(one)).to.equal(one);
            expect(await gToken.totalStakeRequestedInTheory()).to.equal(one);
            expect(await sToken.balanceOf(gToken.address)).to.equal(one);

            //stakeExternalTheory FAILURE
            await expect(gToken.stakeExternalTheory(one)).to.be.revertedWith("PF");

            //Sell request
            await expect(gToken.requestSellToTheory(one, false)).to.be.revertedWith("Still locked!");

            await advanceTime(ethers.provider, years.toNumber());
            await expect(gToken.requestSellToTheory(zero, false)).to.be.revertedWith("No zero amount allowed.");
            await expect(gToken.sellToTheory()).to.be.revertedWith("No zero amount allowed.");
            await expect(gToken.requestSellToTheory(one, false)).to.be.revertedWith("Cannot withdraw with a stake pending.");

            await expect(gToken.initiatePart1(false)).to.be.revertedWith("WE");
            await expect(gToken.initiatePart2()).to.be.revertedWith("WE");

            while(!((await theoretics.epoch()).eq(6))) await treasuryDAO.allocateSeigniorage();

            await expect(gToken.initiatePart2()).to.be.revertedWith("IP1");
            await gToken.initiatePart1(false);
            expect(await sToken.balanceOf(deployer.address)).to.equal(oneBillion.sub(half).sub(one));
            expect(await gToken.balanceOf(deployer.address)).to.equal(one);
            expect(await theoretics.balanceOf(gToken.address)).to.equal(zero);
            expect(await theoretics.totalSupply()).to.equal(half);
            expect(await gToken.masterToTheory(one)).to.equal(one);
            expect(await gToken.theoryToMaster(one)).to.equal(one);
            expect(await gToken.totalStakeRequestedInTheory()).to.equal(one);
            expect(await sToken.balanceOf(gToken.address)).to.equal(one);

            await gToken.initiatePart2();
            expect(await sToken.balanceOf(deployer.address)).to.equal(oneBillion.sub(half).sub(one));
            expect(await gToken.balanceOf(deployer.address)).to.equal(one);
            expect(await theoretics.balanceOf(gToken.address)).to.equal(one);
            expect(await theoretics.totalSupply()).to.equal(half.add(one));
            expect(await gToken.masterToTheory(one)).to.equal(one);
            expect(await gToken.theoryToMaster(one)).to.equal(one);
            expect(await gToken.totalStakeRequestedInTheory()).to.equal(zero);
            expect(await sToken.balanceOf(gToken.address)).to.equal(zero);

            await gToken.requestSellToTheory(one, false);
            expect(await sToken.balanceOf(deployer.address)).to.equal(oneBillion.sub(half).sub(one));
            expect(await gToken.balanceOf(deployer.address)).to.equal(zero);
            expect(await theoretics.balanceOf(gToken.address)).to.equal(one);
            expect(await theoretics.totalSupply()).to.equal(half.add(one));
            expect(await gToken.masterToTheory(one)).to.equal(one);
            expect(await gToken.theoryToMaster(one)).to.equal(one);
            expect(await gToken.totalStakeRequestedInTheory()).to.equal(zero);
            expect(await sToken.balanceOf(gToken.address)).to.equal(zero);
            expect(await gToken.totalWithdrawRequestedInMaster()).to.equal(one);
            expect(await gToken.balanceOf(gToken.address)).to.equal(one);

            user = await gToken.userInfo(deployer.address);
            expect(user.lockToTime.gte(startTime.add(years))).to.equal(true);
            expect(user.chosenLockTime).to.equal(years);
            expect(user.approveTransferFrom).to.equal("0x0000000000000000000000000000000000000000");
            expect(user.lastSnapshotIndex).to.equal(1);
            expect(user.rewardEarned).to.equal(0);
            expect(user.withdrawRequestedInMaster).to.equal(one);
            expect(user.withdrawRequestedInTheory).to.equal(one);
            expect(user.lastStakeRequestBlock).to.not.equal(0);
            expect(user.lastWithdrawRequestBlock).to.not.equal(0);

            await expect(gToken.initiatePart1(false)).to.be.revertedWith("AC");
            await expect(gToken.initiatePart2()).to.be.revertedWith("AC");

            await expect(gToken.transferToken(gToken.address, deployer.address, one)).to.be.revertedWith("AF");

            while(!((await theoretics.epoch()).eq(12))) await treasuryDAO.allocateSeigniorage();

            await theoretics.exit();
            await sToken.transfer(devfund.address, one);

            expect(await gToken.masterToTheory(one)).to.equal(one);
            expect(await gToken.theoryToMaster(one)).to.equal(one);
            expect(await sToken.balanceOf(devfund.address)).to.equal(one);

            sToken = sToken.connect(devfund);
            gToken = gToken.connect(devfund);
            theoretics = theoretics.connect(devfund);

            await sToken.approve(gToken.address, one);
            await gToken.buyFromTheory(one, zero);

            expect(await sToken.balanceOf(deployer.address)).to.equal("999999997999950000000000000");
            expect(await sToken.balanceOf(devfund.address)).to.equal(zero);
            expect(await gToken.balanceOf(devfund.address)).to.equal(one);
            expect(await theoretics.balanceOf(gToken.address)).to.equal(one);
            expect(await theoretics.totalSupply()).to.equal(one);
            expect(await gToken.masterToTheory(one)).to.equal(one);
            expect(await gToken.theoryToMaster(one)).to.equal(one);
            expect(await gToken.totalStakeRequestedInTheory()).to.equal(one);
            expect(await sToken.balanceOf(gToken.address)).to.equal(one);
            expect(await gToken.totalWithdrawRequestedInMaster()).to.equal(one);

            user = await gToken.userInfo(devfund.address);
            expect(user.lockToTime.gte(startTime.add(years))).to.equal(true);
            expect(user.chosenLockTime).to.equal(years);
            expect(user.approveTransferFrom).to.equal("0x0000000000000000000000000000000000000000");
            expect(user.lastSnapshotIndex).to.equal(1);
            expect(user.rewardEarned).to.equal(0);
            expect(user.withdrawRequestedInMaster).to.equal(0);
            expect(user.withdrawRequestedInTheory).to.equal(0);
            expect(user.lastStakeRequestBlock).to.not.equal(0);
            expect(user.lastWithdrawRequestBlock).to.equal(0);

            sToken = sToken.connect(deployer);
            gToken = gToken.connect(deployer);
            theoretics = theoretics.connect(deployer);

            await gToken.initiatePart1(false);

            await gToken.initiatePart2();

            await sToken.transfer(gToken.address, one);
            await gToken.stakeExternalTheory(one);

            let previousBalance = await sToken.balanceOf(deployer.address);
            await gToken.sellToTheory();
            expect(await sToken.balanceOf(deployer.address)).to.equal(previousBalance.add(one));

            expect(await gToken.masterToTheory(one)).to.equal(one.add(one));

            sToken = sToken.connect(devfund);
            gToken = gToken.connect(devfund);
            theoretics = theoretics.connect(devfund);


            //Sell fully
            await advanceTime(ethers.provider, years.toNumber());
            await gToken.requestSellToTheory(one, false);

            while(!((await theoretics.epoch()).eq(18))) await treasuryDAO.allocateSeigniorage();

            await gToken.initiatePart1(false);
            await gToken.initiatePart2();

            await gToken.sellToTheory();
            expect(await sToken.balanceOf(devfund.address)).to.equal(one.add(one));
            expect(await gToken.masterToTheory(one)).to.equal(one)

            //DONE: Test extra THEORY
            //DONE: Test initiate >= 30 minutes
            //DONE: Test initiate <= 30 minutes, and > 0 minutes
            //DONE: Test claim/distribution.  Make sure GAME gotten is the same as Theoretics when 1 to 1, and make sure GAME gotten is larger when not 1 to 1. Also make sure the GAME is split properly between MASTER holders.
            //DONE: Double check and make sure _beforeTokenTransfer calls updateReward (check lastSnapshotIndex).
            //DONE: Test stakeExternalTheory and transferToken (MASTER) failures
            //DONE: Test one person trying to withdraw and stake at the same time
            //DONE: Test multiple people withdrawing and staking at the same time

        });

        it("claim 1 to 1, 6 epoch SUCCESS", async () => {
            let balances = {};
            balances[deployer.address] = oneBillion;
            await sToken.setVariable("_balances", balances);
            await sToken.setVariable("_totalSupply", oneBillion);

            await sToken.approve(theoretics.address, one);
            await theoretics.stake(one);
            await sToken.approve(gToken.address, one);
            await gToken.buyFromTheory(one, zero);
            expect(await theoretics.totalSupply()).to.equal(one.mul(2));

            await advanceTime(ethers.provider, hours.mul(6).toNumber());

            await treasuryDAO.allocateSeigniorage();
            await gToken.initiatePart1(false);
            await gToken.initiatePart2();

            await expect(await gToken.earned(deployer.address)).to.equal(await theoretics.earned(deployer.address));

            await advanceTime(ethers.provider, hours.mul(6).toNumber());

            await treasuryDAO.allocateSeigniorage();
            await gToken.initiatePart1(false);
            await gToken.initiatePart2();

            await expect(await gToken.earned(deployer.address)).to.equal(await theoretics.earned(deployer.address));
            await expect(await gToken.earned(deployer.address)).to.not.equal(zero);

        });
        it("claim 2 to 1, 6 epoch SUCCESS", async () => {
            let balances = {};
            balances[deployer.address] = oneBillion;
            await sToken.setVariable("_balances", balances);
            await sToken.setVariable("_totalSupply", oneBillion);

            await sToken.approve(theoretics.address, one);
            await theoretics.stake(one);
            await sToken.approve(gToken.address, one);
            await gToken.buyFromTheory(one, zero);
            await sToken.transfer(gToken.address, one);
            await gToken.stakeExternalTheory(one);
            expect(await theoretics.totalSupply()).to.equal(one.mul(3));

            await advanceTime(ethers.provider, hours.mul(6).toNumber());

            await treasuryDAO.allocateSeigniorage();
            await gToken.initiatePart1(false);
            await gToken.initiatePart2();

            await expect(await gToken.earned(deployer.address)).to.equal((await theoretics.earned(deployer.address)).mul(2));

            await advanceTime(ethers.provider, hours.mul(6).toNumber());

            await treasuryDAO.allocateSeigniorage();
            await gToken.initiatePart1(false);
            await gToken.initiatePart2();

            await expect(await gToken.earned(deployer.address)).to.equal((await theoretics.earned(deployer.address)).mul(2));
            await expect(await gToken.earned(deployer.address)).to.not.equal(zero);

        });

        it("claim 1 to 1, split, 6 epoch SUCCESS", async () => {
            let balances = {};
            balances[deployer.address] = oneBillion;
            await sToken.setVariable("_balances", balances);
            await sToken.setVariable("_totalSupply", oneBillion);

            await sToken.transfer(devfund.address, one);
            await sToken.approve(theoretics.address, one);
            await theoretics.stake(one);
            await sToken.approve(gToken.address, one);
            await gToken.buyFromTheory(one, zero);
            await sToken.connect(devfund).approve(gToken.address, one);
            await gToken.connect(devfund).buyFromTheory(one, zero);
            expect(await theoretics.totalSupply()).to.equal(one.mul(3));

            await advanceTime(ethers.provider, hours.mul(6).toNumber());

            await treasuryDAO.allocateSeigniorage();
            await gToken.initiatePart1(false);
            await gToken.initiatePart2();

            await expect(await gToken.earned(deployer.address)).to.equal(await theoretics.earned(deployer.address));
            await expect(await gToken.earned(devfund.address)).to.equal(await theoretics.earned(deployer.address));

            await advanceTime(ethers.provider, hours.mul(6).toNumber());

            await treasuryDAO.allocateSeigniorage();
            await gToken.initiatePart1(false);
            await gToken.initiatePart2();

            let tokenOwed = await gToken.earned(deployer.address);
            await expect(tokenOwed).to.equal(await theoretics.earned(deployer.address));
            await expect(await gToken.earned(devfund.address)).to.equal(await theoretics.earned(deployer.address));
            await expect(await gToken.earned(deployer.address)).to.not.equal(zero);

            await gToken.claimGame();
            expect(await gToken.totalBalanceOfGame(deployer.address)).to.equal(tokenOwed.add(one));
            expect(await gToken.lockOfGame(deployer.address)).to.equal(tokenOwed.mul(95).div(100));
            expect(await pToken.balanceOf(deployer.address)).to.equal(tokenOwed.add(one).sub(tokenOwed.mul(95).div(100)));
            expect(await gToken.earned(deployer.address)).to.equal(zero);
        });

        it("initiate timing SUCCESS", async () => {
            let balances = {};
            balances[deployer.address] = oneBillion;
            await sToken.setVariable("_balances", balances);
            await sToken.setVariable("_totalSupply", oneBillion);

            await sToken.approve(theoretics.address, one);
            await theoretics.stake(one);
            await sToken.approve(gToken.address, one);
            await gToken.buyFromTheory(one, zero);
            expect(await theoretics.totalSupply()).to.equal(one.mul(2));

            await theoryRewardPool.lockUpdate([0])

            await treasuryDAO.allocateSeigniorage();

            let currentTime = BigNumber.from(await latestBlocktime(ethers.provider));
            expect(await theoryRewardPool.getLockPercentage(currentTime.sub(1), currentTime)).to.equal(zero);
            expect(await theoretics.getCurrentWithdrawEpochs()).to.equal(6);

            while(!((await theoretics.epoch()).eq(6)))
            {
                await advanceTime(ethers.provider, hours.mul(6).toNumber());
                await treasuryDAO.allocateSeigniorage();
            }

            await expect(gToken.initiatePart1(false)).to.be.revertedWith("30");
            await expect(gToken.initiatePart2()).to.be.revertedWith("30");

            await advanceTime(ethers.provider, hours.mul(5).add(minutes.mul(30)).toNumber());

            await gToken.initiatePart1(true);
            await gToken.initiatePart2();
        });

        it("claim 1 to 1, check transfer, 6 epoch SUCCESS", async () => {
            let balances = {};
            balances[deployer.address] = oneBillion;
            await sToken.setVariable("_balances", balances);
            await sToken.setVariable("_totalSupply", oneBillion);

            await sToken.approve(theoretics.address, one);
            await theoretics.stake(one);
            await sToken.approve(gToken.address, one);
            await gToken.buyFromTheory(one, zero);
            expect(await theoretics.totalSupply()).to.equal(one.mul(2));

            await advanceTime(ethers.provider, hours.mul(6).toNumber());

            await treasuryDAO.allocateSeigniorage();
            await gToken.initiatePart1(false);
            await gToken.initiatePart2();

            await expect(await gToken.earned(deployer.address)).to.equal(await theoretics.earned(deployer.address));

            await advanceTime(ethers.provider, hours.mul(6).toNumber());

            await treasuryDAO.allocateSeigniorage();
            await gToken.initiatePart1(false);
            await gToken.initiatePart2();

            await expect(await gToken.earned(deployer.address)).to.equal(await theoretics.earned(deployer.address));
            await expect(await gToken.earned(deployer.address)).to.not.equal(zero);

            let user = await gToken.userInfo(deployer.address);
            expect(user.lastSnapshotIndex).to.equal(0);

            gToken.transfer(devfund.address, one);
            user = await gToken.userInfo(deployer.address);
            expect(user.lastSnapshotIndex).to.equal(2);

            let tokenOwed = await gToken.earned(deployer.address);
            await expect(tokenOwed).to.equal(await theoretics.earned(deployer.address));
            await expect(await gToken.earned(deployer.address)).to.not.equal(zero);

            await expect(gToken.transferToken(pToken.address, deployer.address, tokenOwed)).to.be.revertedWith("AF");
            await expect(gToken.transferToken(pToken.address, deployer.address, one.add(tokenOwed))).to.be.revertedWith("AF");
            await expect(gToken.transferToken(pToken.address, deployer.address, one)).to.be.revertedWith("AF");
            await pToken.transfer(gToken.address, one);
            await expect(gToken.transferToken(pToken.address, deployer.address, one.add(tokenOwed))).to.be.revertedWith("AF");
            await gToken.transferToken(pToken.address, deployer.address, one);
            await expect(await gToken.totalGameUnclaimed()).to.equal(tokenOwed);

            //Whoops, forgot to add this in at the end, and Master doesn't like it. Oh well, we can calculate it ourselves.
            //await expect(await gToken.expectedClaimableGameThisEpoch()).to.equal(tokenOwed);

            await gToken.claimGame();
            await expect(await gToken.totalGameUnclaimed()).to.equal(zero);
            expect(await gToken.totalBalanceOfGame(deployer.address)).to.equal(tokenOwed.add(one));
            expect(await gToken.lockOfGame(deployer.address)).to.equal(tokenOwed.mul(95).div(100));
            expect(await pToken.balanceOf(deployer.address)).to.equal(tokenOwed.add(one).sub(tokenOwed.mul(95).div(100)));
            expect(await gToken.earned(deployer.address)).to.equal(zero);

            await expect(gToken.connect(devfund).claimGame()).to.be.revertedWith("No GAME to claim.");

            //Test all new GAME lock functions
            user = await gToken.userInfo(deployer.address);
            let gameToUnlock = await gToken.canUnlockAmountGame(deployer.address);
            expect(gameToUnlock).to.equal(await gToken.totalCanUnlockAmountGame(deployer.address));
            //expect(user.gameLocked).to.equal(await gToken.lockedSupplyGame());
            expect(user.gameLocked).to.equal(await gToken.totalLockGame());
            let balanceBefore = await pToken.balanceOf(deployer.address);
            let canUnlock = await gToken.totalCanUnlockAmountGame(deployer.address);
            await gToken.unlockGame();
            expect((await pToken.balanceOf(deployer.address)).gte(balanceBefore.add(canUnlock))).to.equal(true);
            balanceBefore = await pToken.balanceOf(deployer.address);
            let lockOf = await gToken.lockOfGame(deployer.address);
            await gToken.unlockGameForUser(deployer.address, lockOf)
            expect(await pToken.balanceOf(deployer.address)).to.equal(balanceBefore.add(lockOf))
            await gToken.renounceOwnership();
            await expect(gToken.unlockGameForUser(deployer.address, lockOf)).to.be.revertedWith('caller is not authorized');
        });
    });
});