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
describe('tests', function () {
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

        await setTime(ethers.provider, startTime.toNumber());
        //await ethers.provider.send('evm_mine');
        //expect(await pendingBlocktime(ethers.provider)).to.equal(startTime);
    });

    describe('bonds', () => {
        it("Can't buy when above 0", async () => {
            var price = onePointTen;

            await oracle.setPrice(price);
            //await pToken.mint(deployer.address, one);
            await pToken.approve(treasuryDAO.address, one);
            var buyBonds = treasuryDAO.buyBonds(one, price);

            expect(buyBonds).eventually.to.rejectedWith(
                Error,
                "VM Exception while processing transaction: reverted with reason string 'Treasury: gamePrice not eligible for bond purchase'"
            );
        });

        it("Can't buy when below 0 and all bonds bought for epoch", async () => {
            var price = ethers.utils.parseEther('0.1');
            const numBonds1 = ethers.utils.parseEther('0.15');
            const numBonds2 = ethers.utils.parseEther('0.1');

            await oracle.setPrice(price);
            await pToken.approve(
                treasuryDAO.address,
                ethers.utils.parseEther('1')
            );

            await treasuryDAO.setMaxSupplyContractionPercent(1500); // 15% percent
            await treasuryDAO.setMaxDebtRatioPercent(10000); // 100%

            await sToken.approve(theoretics.address, one);
            await theoretics.stake(one);

            await treasuryDAO.allocateSeigniorage();
            await treasuryDAO.buyBonds(numBonds1, price);

            await expect(treasuryDAO.buyBonds(numBonds2, price)).to.be.revertedWith(
                'Treasury: Not enough bonds left to purchase'
            );

            var btdBalance = await pToken.balanceOf(deployer.address);
            var btbBalance = await bToken.balanceOf(deployer.address);

            assert.equal(btdBalance.toString(), one.sub(numBonds1).toString());
            assert.equal(btbBalance.toString(), numBonds1.toString());
        });

        it("Can't buy when below 0, bonds available for epoch and max debt hit", async () => {
            var price = ethers.utils.parseEther('0.1');
            const numBonds1 = ethers.utils.parseEther('0.15');
            const numBonds2 = ethers.utils.parseEther('0.1');

            await oracle.setPrice(price);
            //await pToken.mint(deployer.address, ethers.utils.parseEther('1'));
            await pToken.approve(
                treasuryDAO.address,
                ethers.utils.parseEther('1')
            );

            await treasuryDAO.setMaxSupplyContractionPercent(1500); // 15% percent
            await treasuryDAO.setMaxDebtRatioPercent(1500); // 15% percent

            await sToken.approve(theoretics.address, one);
            await theoretics.stake(one);

            await treasuryDAO.allocateSeigniorage();
            await treasuryDAO.buyBonds(numBonds1, price);

            await ethers.provider.send('evm_increaseTime', [
                (await treasuryDAO.PERIOD()).toNumber(),
            ]);
            await ethers.provider.send('evm_mine');
            await treasuryDAO.allocateSeigniorage();

            await expect(treasuryDAO.buyBonds(numBonds2, price)).to.be.revertedWith(
                'over max debt ratio'
            );

            var btdBalance = await pToken.balanceOf(deployer.address);
            var btbBalance = await bToken.balanceOf(deployer.address);

            assert.equal(btdBalance.toString(), one.sub(numBonds1).toString());
            assert.equal(btbBalance.toString(), numBonds1.toString());
        });

        it('Can buy when below 0, bonds available for epoch and max debt not hit', async () => {
            var price = ethers.utils.parseEther('0.1');
            const numBonds1 = ethers.utils.parseEther('0.1');
            const numBonds2 = ethers.utils.parseEther('0.05');

            await oracle.setPrice(price);

            await pToken.approve(
                treasuryDAO.address,
                ethers.utils.parseEther('1')
            );

            await treasuryDAO.setMaxSupplyContractionPercent(1500); // 15% percent
            await treasuryDAO.setMaxDebtRatioPercent(3000); // 30% percent

            await sToken.approve(theoretics.address, one);
            await theoretics.stake(one);

            await treasuryDAO.allocateSeigniorage();
            await treasuryDAO.buyBonds(numBonds1, price);
            await treasuryDAO.buyBonds(numBonds2, price);

            var btdBalance = await pToken.balanceOf(deployer.address);
            var btbBalance = await bToken.balanceOf(deployer.address);

            assert.equal(
                btdBalance.toString(),
                one.sub(numBonds1).sub(numBonds2).toString()
            );
            assert.equal(
                btbBalance.toString(),
                numBonds1.add(numBonds2).toString()
            );
        });

        it("Can't buy more bonds than I have GAME", async () => {
            var price = oneTenth;

            await oracle.setPrice(price);
            await pToken.transfer(daofund.address, ethers.utils.parseEther('0.95'));

            await treasuryDAO.setMaxSupplyContractionPercent(1500); // 15% percent
            await treasuryDAO.setMaxDebtRatioPercent(10000); // 100% percent

            await sToken.approve(theoretics.address, one);
            await theoretics.stake(one);

            await treasuryDAO.allocateSeigniorage();

            await pToken.approve(treasuryDAO.address, one);
            await expect(treasuryDAO.buyBonds(ethers.utils.parseEther('0.1'), price)).to.be.revertedWith(
                'ERC20: burn amount exceeds balance'
            );
        });

        it("Can't redeem when above $1.01 and GAME not allocated", async () => {
            await oracle.setPrice(onePointTen);

            await bToken.approve(treasuryDAO.address, one);

            var redeemBonds = treasuryDAO.redeemBonds(one, onePointTen);

            expect(redeemBonds).eventually.to.rejectedWith(
                Error,
                "VM Exception while processing transaction: reverted with reason string 'Treasury: treasury has no more budget'"
            );
        });

        it("Can't redeem when above $1.01 and treasury has no GAME", async () => {
            await oracle.setPrice(onePointTen);

            await bToken.approve(treasuryDAO.address, one);
            await treasuryDAO.setVariable('seigniorageSaved', one);
            var redeemBonds = treasuryDAO.redeemBonds(one, onePointTen);

            expect(redeemBonds).eventually.to.rejectedWith(
                Error,
                "VM Exception while processing transaction: reverted with reason string 'Treasury: treasury has no more budget'"
            );
        });

        it("Can't redeem when equal $1.01 and BTD allocated", async () => {
            await pToken.transfer(treasuryDAO.address, one);
            await oracle.setPrice(pTokenPriceCeiling);

            await bToken.approve(treasuryDAO.address, one);
            await treasuryDAO.setVariable('seigniorageSaved', one);

            var redeemBonds = treasuryDAO.redeemBonds(one, pTokenPriceCeiling);

            expect(redeemBonds).eventually.to.rejectedWith(
                Error,
                "VM Exception while processing transaction: reverted with reason string 'Treasury: gamePrice not eligible for bond redemption'"
            );
        });

        it("Can't redeem when below $1.01 and BTD allocated", async () => {
            await pToken.transfer(treasuryDAO.address, one);
            await oracle.setPrice(one);

            await bToken.approve(treasuryDAO.address, one);
            await treasuryDAO.setVariable('seigniorageSaved', one);

            var redeemBonds = treasuryDAO.redeemBonds(one, one);

            expect(redeemBonds).eventually.to.rejectedWith(
                Error,
                "VM Exception while processing transaction: reverted with reason string 'Treasury: gamePrice not eligible for bond redemption'"
            );
        });
    });
    describe('allocateSeigniorage', () => {
        it('allocateSeigniorage does nothing to pToken when price at $1.01', async function () {
            var daofundBalance = oneTenth;
            await pToken.transfer(daofund.address, daofundBalance);
            await oracle.setPrice(pTokenPriceCeiling);
            await sToken.approve(theoretics.address, one);
            await treasuryDAO.setVariable('bootstrapEpochs', 0);
            await theoretics.stake(one);
            await treasuryDAO.allocateSeigniorage();
            var btdTheoreticsBalance = await pToken.balanceOf(theoretics.address);
            var btsTheoreticsBalance = await sToken.balanceOf(theoretics.address);
            var btdBalanceAfterSeig = await pToken.balanceOf(daofund.address);

            assert.equal(
                daofundBalance.toString(),
                btdBalanceAfterSeig.toString()
            );
            assert.equal(btdTheoreticsBalance, 0);
            expect(btsTheoreticsBalance).to.equal(one);
        });

        it('allocateSeigniorage does nothing to pToken when price at $1.00', async function () {
            var daofundBalance = oneTenth;
            await pToken.transfer(daofund.address, daofundBalance);
            await oracle.setPrice(one);
            await sToken.approve(theoretics.address, one);
            await treasuryDAO.setVariable('bootstrapEpochs', 0);
            await theoretics.stake(one);
            await treasuryDAO.allocateSeigniorage();
            var theoreticsBalance = await pToken.balanceOf(theoretics.address);
            var btsTheoreticsBalance = await sToken.balanceOf(theoretics.address);
            var btdBalanceAfterSeig = await pToken.balanceOf(daofund.address);

            assert.equal(
                daofundBalance.toString(),
                btdBalanceAfterSeig.toString()
            );
            assert.equal(theoreticsBalance, 0);
            expect(btsTheoreticsBalance).to.equal(one);
        });

        it('allocateSeigniorage prints over $1.01 with no debt', async function () {
            var daofundBalance = oneTenth;
            await pToken.transfer(daofund.address, daofundBalance);
            var oldSupply = await pToken.totalSupply();
            var _percentage = BigNumber.from(450).mul(BigNumber.from(10).pow(14));
            var gameSupply = await treasuryDAO.getGameCirculatingSupply();
            await oracle.setPrice(onePointTen);
            await sToken.approve(theoretics.address, one);
            await treasuryDAO.setVariable('bootstrapEpochs', 0);
            await theoretics.stake(one);
            await treasuryDAO.allocateSeigniorage();
            var theoreticsBalance = await pToken.balanceOf(theoretics.address);
            var btsTheoreticsBalance = await sToken.balanceOf(theoretics.address);
            var btdBalanceAfterSeig = await pToken.balanceOf(daofund.address);
            var totalSupply = await pToken.totalSupply();

            assert.equal(totalSupply.toString(), oldSupply.add(gameSupply.mul(_percentage).div(BigNumber.from(10).pow(18))));
            expect(btsTheoreticsBalance).to.equal(one);
        });

        it('allocateSeigniorage prints over $1.01 and pays all debt when able', async function () {
            var debt = BigNumber.from('10000000000');
            var daofundBalance = ten;
            await pToken.burn(one);
            var currentTotalSupply = await pToken.totalSupply();
            await pToken.setVariable('_totalSupply', currentTotalSupply.add(daofundBalance));
            await bToken.setVariable('_totalSupply', debt);
            await oracle.setPrice(onePointTen);
            await sToken.approve(theoretics.address, one);
            await treasuryDAO.setVariable('bootstrapEpochs', 0);
            await theoretics.stake(one);

            var gameSupply = await treasuryDAO.getGameCirculatingSupply();
            var _percentage = BigNumber.from(450).mul(BigNumber.from(10).pow(14));
            var _seigniorage = gameSupply.mul(_percentage).div(BigNumber.from(10).pow(18));
            var _savedForTheoretics = _seigniorage.mul(3500).div(10000);
            var _savedForBond = _seigniorage.sub(_savedForTheoretics);

            await treasuryDAO.allocateSeigniorage();

            var btsTheoreticsBalance = await sToken.balanceOf(theoretics.address);
            var theoreticsBalance = await pToken.balanceOf(theoretics.address);
            var btdBalanceAfterSeig = await pToken.balanceOf(daofund.address);
            var totalSupply = await pToken.totalSupply();

            var forBonds = await treasuryDAO.getReserve();

            assert.equal(debt <= forBonds, true);
        });
    });
    // Skipping pool stuff for now (for functions that I haven't changed). I've changed most of the important stuff to test anyways.

    // Now time for the things that I've changed!
    describe('Game Theory Changes: GAME', () => {
        it('setLockTime SUCCESS', async function () {
            await pToken.setLockTime(BigNumber.from(364).mul(days));
            expect(await pToken.lockTime()).to.equal(BigNumber.from(364).mul(days));
        });
        it('setLockTime time FAILURE', async function () {
            await expect(pToken.setLockTime(BigNumber.from(366).mul(days))).to.be.revertedWith(
                        'Lock time must not be greater than 365 days.'
                    );
        });
        it('setLockTime not authorized FAILURE', async function () {
            await pToken.renounceOwnership();
            await expect(pToken.setLockTime(BigNumber.from(364).mul(days))).to.be.revertedWith(
                'caller is not authorized'
            );
        });
        it('setNoUnlockBeforeTransfer SUCCESS', async function () {
            await pToken.setNoUnlockBeforeTransfer(true);
            expect(await pToken.doesNotUnlockBeforeTransfer(deployer.address)).to.equal(true);
        });
        it('transfer with unlock SUCCESS', async function () {
             //Make sure unlock.
             await pToken.lock(deployer.address, half);
             expect(await pToken.balanceOf(deployer.address)).to.equal(half);
             await advanceTime(ethers.provider, years.toNumber())
             await pToken.transfer(daofund.address, half);
             expect(await pToken.balanceOf(daofund.address)).to.equal(half);
             expect(await pToken.balanceOf(deployer.address)).to.equal(half);
             await pToken.connect(daofund).transfer(deployer.address, half);
             expect(await pToken.balanceOf(deployer.address)).to.equal(one);
         });
        it('transfer with unlock partial SUCCESS', async function () {
            //Make sure unlock.
            await pToken.lock(deployer.address, half);
            expect(await pToken.balanceOf(deployer.address)).to.equal(half);
            await advanceTime(ethers.provider, years.div(5).toNumber())
            await pToken.transfer(daofund.address, half);
            expect(await pToken.balanceOf(daofund.address)).to.equal(half);
            expect(await pToken.balanceOf(deployer.address)).to.equal(half.div(5));
            expect(await pToken.lockOf(deployer.address)).to.equal(half.sub(half.div(5)));
            expect(await pToken.totalBalanceOf(deployer.address)).to.equal(half);
            await pToken.connect(daofund).transfer(deployer.address, half);
            expect(await pToken.balanceOf(deployer.address)).to.equal(half.add(half.div(5)));
        });
        it('transfer with unlock FAILURE', async function () {
            //Improper balance.
            await pToken.lock(deployer.address, half);
            await pToken.transfer(daofund.address, half)
            await expect(pToken.transfer(daofund.address, half)).to.be.revertedWith(
                'ERC20: transfer amount exceeds balance');
        });
        it('transfer with unlock partial FAILURE', async function () {
            //Make sure unlock.
            await pToken.lock(deployer.address, half);
            await expect(pToken.transfer(daofund.address, one)).to.be.revertedWith(
                'ERC20: transfer amount exceeds balance');
        });
        it('transfer noUnlockBeforeTransfer SUCCESS', async function () {
            await pToken.setNoUnlockBeforeTransfer(true);
            await pToken.lock(deployer.address, half);
            expect(await pToken.balanceOf(deployer.address)).to.equal(half);
            await advanceTime(ethers.provider, years.toNumber())
            await pToken.transfer(daofund.address, half);
            expect(await pToken.balanceOf(deployer.address)).to.equal(zero);

        });
        it('transfer noUnlockBeforeTransfer FAILURE', async function () {
            await pToken.setNoUnlockBeforeTransfer(true);
            await pToken.lock(deployer.address, half);
            expect(await pToken.balanceOf(deployer.address)).to.equal(half);
            await advanceTime(ethers.provider, years.toNumber())
            // None should be unlocked before transfer.
            await expect(pToken.transfer(daofund.address, one)).to.be.revertedWith('ERC20: transfer amount exceeds balance');
        });
        //Counterpart to above
        it('transfer without noUnlockBeforeTransfer SUCCESS', async function () {
            await pToken.setNoUnlockBeforeTransfer(false);
            await pToken.lock(deployer.address, half);
            expect(await pToken.balanceOf(deployer.address)).to.equal(half);
            await advanceTime(ethers.provider, years.toNumber())
            await pToken.transfer(daofund.address, one); // All should be unlocked before transfer.
            expect(await pToken.balanceOf(deployer.address)).to.equal(zero);
        });
        it('transfer without unlock SUCCESS', async function () {
            //Make sure only small unlock. (Can't get exact due to test rpc limitations)
            await pToken.lock(deployer.address, half);
            expect(await pToken.balanceOf(deployer.address)).to.equal(half);
            await advanceTime(ethers.provider, years.div(5).toNumber())
            await pToken.transfer(daofund.address, half.add(half.div(5)));
            expect((await pToken.balanceOf(deployer.address)).lte(BigNumber.from("0x03b1068377"))).to.equal(true);
        });
        it('transfer without unlock SUCCESS 2', async function () {
            //Make sure only small unlock. (Can't get exact due to test rpc limitations)
            await pToken.lock(deployer.address, half);
            expect(await pToken.balanceOf(deployer.address)).to.equal(half);
            await pToken.transfer(daofund.address, half);
            expect((await pToken.balanceOf(deployer.address)).lte(BigNumber.from("0x03b1068377"))).to.equal(true);
        });
        it('transfer without unlock FAILURE', async function () {
            //Improper balance.
            expect(await pToken.balanceOf(deployer.address)).to.equal(one);
            await advanceTime(ethers.provider, years.toNumber())
            await expect(pToken.transfer(daofund.address, one.mul(2))).to.be.revertedWith('ERC20: transfer amount exceeds balance');
        });
        it('distributeReward SUCCESS', async function () {
            //Make sure distributed is set.
            //await pToken.distributeReward(genesisPool.address, theoretics.address);
            expect(await pToken.distributed()).to.equal(genesisPool.address);
            expect(await pToken.theoretics()).to.equal(theoretics.address);
            expect(await pToken.balanceOf(genesisPool.address)).to.equal(await genesisPool.getRequiredAllocation());
        });
        it('distributeReward dupe FAILURE', async function () {
            //Can't do it twice
            await expect(pToken.distributeReward(genesisPool.address, theoretics.address)).to.be.revertedWith('only can distribute once');
        });
        it('distributeReward zero address FAILURE', async function () {
            //Can't set to zero address
            const GameToken = await smock.mock("Game");
            pToken = await GameToken.deploy();
            await pToken.deployed();
            await expect(pToken.distributeReward("0x0000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000")).to.be.revertedWith('!_genesisPool');
        });
        it('governanceRecoverUnsupported not operator SUCCESS', async function () {
            //Make sure we can transfer other tokens as authorized.
            expect(await iToken.balanceOf(pToken.address)).to.equal(zero);
            await iToken.transfer(pToken.address, one);
            expect(await iToken.balanceOf(pToken.address)).to.equal(one);
            await pToken.governanceRecoverUnsupported(iToken.address, one, daofund.address);
            expect(await iToken.balanceOf(pToken.address)).to.equal(zero);
            expect(await iToken.balanceOf(daofund.address)).to.equal(one);
        });
        it('governanceRecoverUnsupported operator SUCCESS', async function () {
            //Make sure we can transfer 'this' as operator.
            const GameToken = await smock.mock("Game");
            pToken = await GameToken.deploy();
            await pToken.deployed();
            expect(await pToken.balanceOf(pToken.address)).to.equal(zero);
            await pToken.transfer(pToken.address, one);
            expect(await pToken.balanceOf(pToken.address)).to.equal(one);
            await pToken.governanceRecoverUnsupported(pToken.address, one, daofund.address);
            expect(await pToken.balanceOf(pToken.address)).to.equal(zero);
            expect(await pToken.balanceOf(daofund.address)).to.equal(one);
        });
        it('governanceRecoverUnsupported not operator FAILURE', async function () {
            //Make sure we can't transfer 'this' as authorized but not operator.
            expect(await pToken.balanceOf(pToken.address)).to.equal(zero);
            await pToken.transfer(pToken.address, one);
            expect(await pToken.balanceOf(pToken.address)).to.equal(one);
            await expect(pToken.governanceRecoverUnsupported(pToken.address, one, daofund.address)).to.be.revertedWith(
                'Invalid permissions.'
            );
        });
        it('governanceRecoverUnsupported operator FAILURE', async function () {
            //Make sure we can't transfer if we don't have balance.
            const GameToken = await smock.mock("Game");
            pToken = await GameToken.deploy();
            await pToken.deployed();
            expect(await pToken.balanceOf(pToken.address)).to.equal(zero);
            await expect(pToken.governanceRecoverUnsupported(pToken.address, one, daofund.address)).to.be.revertedWith(
                'ERC20: transfer amount exceeds balance'
            );
        });
        it('governanceRecoverUnsupported not authorized FAILURE', async function () {
            //Make sure we can't transfer at all if we're not authorized.
            await pToken.renounceOwnership();
            await expect(pToken.governanceRecoverUnsupported(pToken.address, one, daofund.address)).to.be.revertedWith(
                'caller is not authorized'
            );
        });
        it('lockFromUpdate SUCCESS', async function () {
            let timestamp = getCurrentTimestamp();
            await pToken.lockFromUpdate(deployer.address, timestamp);
            expect(await pToken.getLockFromTime(deployer.address)).to.equal(timestamp);
        });
        it('lockFromUpdate FAILURE', async function () {
            await pToken.renounceOwnership();
            await expect(pToken.lockFromUpdate(deployer.address, getCurrentTimestamp())).to.be.revertedWith(
                'caller is not authorized'
            );
        });
        it('lock max amount operator SUCCESS', async function () {
            const GameToken = await smock.mock("Game");
            pToken = await GameToken.deploy();
            await pToken.deployed();
            await pToken.lock(deployer.address, one);
            expect(await pToken.lockOf(deployer.address)).to.equal(one);
        });
        it('lock max amount theoretics SUCCESS', async function () {
            const GameToken = await smock.mock("Game");
            pToken = await GameToken.deploy();
            await pToken.deployed();
            await pToken.distributeReward(genesisPool.address, deployer.address)
            await pToken.transferOperator(treasuryDAO.address);
            await pToken.renounceOwnership();
            await pToken.lock(deployer.address, one);
            expect(await pToken.lockOf(deployer.address)).to.equal(one);
        });
        it('lock max amount FAILURE', async function () {
            await expect(pToken.lock(deployer.address, one)).to.be.revertedWith(
                'Lock amount over 95% of total balance');
        });
        it('lock not authorized FAILURE', async function () {
            await pToken.renounceOwnership();
            await expect(pToken.lock(deployer.address, one)).to.be.revertedWith(
                'caller is not authorized'
            );
        });
        //Tested lock and unlock base cases already above.
    });
    describe('Game Theory Changes: THEORY', () => {
        it('claimRewards SUCCESS', async function () {
            await setTime(ethers.provider, startTime.add(years.mul(2)).toNumber());
            await ethers.provider.send('evm_mine', []);
            const fundCom = await sToken.unclaimedTreasuryFund();
            expect(fundCom).to.equal(BigNumber.from("0x060bfd20d9ce62f4ee00"));
            const fundDev = await sToken.unclaimedDevFund();
            expect(fundDev).to.equal(BigNumber.from("0x057f4335653dda352a80"));
            await sToken.claimRewards();
            expect(await sToken.balanceOf(daofund.address)).to.equal(fundCom);
            expect(await sToken.balanceOf(devfund.address)).to.equal(fundDev);
        });
        it('setNoUnlockBeforeTransfer SUCCESS', async function () {
            await pToken.setNoUnlockBeforeTransfer(true);
            expect(await pToken.doesNotUnlockBeforeTransfer(deployer.address)).to.equal(true);
        });
        it('transfer with unlock SUCCESS', async function () {
            //Make sure unlock.
            await sToken.lock(deployer.address, half);
            expect(await sToken.balanceOf(deployer.address)).to.equal(half);
            await setTime(ethers.provider, startTime.add(years.mul(2)).toNumber());
            await sToken.transfer(daofund.address, half);
            expect(await sToken.balanceOf(daofund.address)).to.equal(half);
            expect(await sToken.balanceOf(deployer.address)).to.equal(half);
            await sToken.connect(daofund).transfer(deployer.address, half);
            expect(await sToken.balanceOf(deployer.address)).to.equal(one);
        });
        it('transfer with unlock partial SUCCESS', async function () {
            //Make sure unlock.
            await sToken.lock(deployer.address, half);
            expect(await sToken.balanceOf(deployer.address)).to.equal(half);
            await setTime(ethers.provider, startTime.add(years).add(years.div(5)).toNumber());
            await sToken.transfer(daofund.address, half);
            expect(await sToken.balanceOf(daofund.address)).to.equal(half);
            expect(await sToken.balanceOf(deployer.address)).to.equal(half.div(5));
            expect(await sToken.lockOf(deployer.address)).to.equal(half.sub(half.div(5)));
            expect(await sToken.totalBalanceOf(deployer.address)).to.equal(half);
            await sToken.connect(daofund).transfer(deployer.address, half);
            expect(await sToken.balanceOf(deployer.address)).to.equal(half.add(half.div(5)));
        });
        it('transfer with unlock FAILURE', async function () {
            //Improper balance.
            await sToken.lock(deployer.address, half);
            await sToken.transfer(daofund.address, half)
            await expect(sToken.transfer(daofund.address, half)).to.be.revertedWith(
                'ERC20: transfer amount exceeds balance');
        });
        it('transfer with unlock partial FAILURE', async function () {
            //Make sure unlock.
            await sToken.lock(deployer.address, half);
            await expect(sToken.transfer(daofund.address, one)).to.be.revertedWith(
                'ERC20: transfer amount exceeds balance');
        });
        it('transfer noUnlockBeforeTransfer SUCCESS', async function () {
            await sToken.setNoUnlockBeforeTransfer(true);
            await sToken.lock(deployer.address, half);
            expect(await sToken.balanceOf(deployer.address)).to.equal(half);
            await setTime(ethers.provider, startTime.add(years.mul(2)).toNumber());
            await sToken.transfer(daofund.address, half);
            expect(await sToken.balanceOf(deployer.address)).to.equal(zero);

        });
        it('transfer noUnlockBeforeTransfer FAILURE', async function () {
            await sToken.setNoUnlockBeforeTransfer(true);
            await sToken.lock(deployer.address, half);
            expect(await sToken.balanceOf(deployer.address)).to.equal(half);
            await setTime(ethers.provider, startTime.add(years.mul(2)).toNumber());
            // None should be unlocked before transfer.
            await expect(sToken.transfer(daofund.address, one)).to.be.revertedWith('ERC20: transfer amount exceeds balance');
        });
        //Counterpart to above
        it('transfer without noUnlockBeforeTransfer SUCCESS', async function () {
            await sToken.setNoUnlockBeforeTransfer(false);
            await sToken.lock(deployer.address, half);
            expect(await sToken.balanceOf(deployer.address)).to.equal(half);
            await setTime(ethers.provider, startTime.add(years.mul(2)).toNumber());
            await sToken.transfer(daofund.address, one); // All should be unlocked before transfer.
            expect(await sToken.balanceOf(deployer.address)).to.equal(zero);
        });
        it('transfer without unlock SUCCESS', async function () {
            //Make sure no unlock.
            await sToken.lock(deployer.address, half);
            expect(await sToken.balanceOf(deployer.address)).to.equal(half);
            await setTime(ethers.provider, startTime.add(years).toNumber());
            await sToken.transfer(daofund.address, half);
            expect(await sToken.balanceOf(deployer.address)).to.equal(zero);
        });
        it('transfer without unlock FAILURE', async function () {
            //Improper balance.
            expect(await sToken.balanceOf(deployer.address)).to.equal(one);
            await setTime(ethers.provider, startTime.add(years.mul(2)).toNumber());
            await expect(sToken.transfer(daofund.address, one.mul(2))).to.be.revertedWith('ERC20: transfer amount exceeds balance');
        });
        it('distributeReward SUCCESS', async function () {
            //Make sure distributed is set.
            //await sToken.distributeReward(theoryRewardPool.address);
            expect(await sToken.distributed()).to.equal(theoryRewardPool.address);
            expect(await sToken.balanceOf(theoryRewardPool.address)).to.equal(await theoryRewardPool.getRequiredAllocation());
        });
        it('distributeReward dupe FAILURE', async function () {
            //Can't do it twice
            await expect(sToken.distributeReward(theoryRewardPool.address)).to.be.revertedWith('only can distribute once');
        });
        it('distributeReward zero address FAILURE', async function () {
            //Can't set to zero address
            const TheoryToken = await smock.mock("Theory");
            const blockTime = await latestBlocktime(ethers.provider);
            startTime = BigNumber.from(blockTime).add(period);
            sToken = await TheoryToken.deploy(startTime, daofund.address, devfund.address, startTime.add(years), startTime.add(years.mul(2)));
            await sToken.deployed();
            await expect(sToken.distributeReward("0x0000000000000000000000000000000000000000")).to.be.revertedWith('!_farmingIncentiveFund');
        });
        it('governanceRecoverUnsupported not operator SUCCESS', async function () {
            //Make sure we can transfer other tokens as authorized.
            expect(await iToken.balanceOf(sToken.address)).to.equal(zero);
            await iToken.transfer(sToken.address, one);
            expect(await iToken.balanceOf(sToken.address)).to.equal(one);
            await sToken.governanceRecoverUnsupported(iToken.address, one, daofund.address);
            expect(await iToken.balanceOf(sToken.address)).to.equal(zero);
            expect(await iToken.balanceOf(daofund.address)).to.equal(one);
        });
        it('governanceRecoverUnsupported operator SUCCESS', async function () {
            //Make sure we can transfer 'this' as operator.
            const TheoryToken = await smock.mock("Theory");
            const blockTime = await latestBlocktime(ethers.provider);
            startTime = BigNumber.from(blockTime).add(period);
            sToken = await TheoryToken.deploy(startTime, daofund.address, devfund.address, startTime.add(years), startTime.add(years.mul(2)));
            await sToken.deployed();
            const devAndTreasuryAmount = BigNumber.from("54514764700000000000000");
            expect(await sToken.balanceOf(sToken.address)).to.equal(devAndTreasuryAmount);
            await sToken.transfer(sToken.address, one);
            expect(await sToken.balanceOf(sToken.address)).to.equal(devAndTreasuryAmount.add(one));
            await sToken.governanceRecoverUnsupported(sToken.address, one, daofund.address);
            expect(await sToken.balanceOf(sToken.address)).to.equal(devAndTreasuryAmount);
            expect(await sToken.balanceOf(daofund.address)).to.equal(one);
        });
        it('governanceRecoverUnsupported not operator FAILURE', async function () {
            //Make sure we can't transfer 'this' as authorized but not operator.
            const devAndTreasuryAmount = BigNumber.from("54514764700000000000000");
            expect(await sToken.balanceOf(sToken.address)).to.equal(devAndTreasuryAmount);
            await sToken.transfer(sToken.address, one);
            expect(await sToken.balanceOf(sToken.address)).to.equal(devAndTreasuryAmount.add(one));
            await expect(sToken.governanceRecoverUnsupported(sToken.address, one, daofund.address)).to.be.revertedWith(
                'Invalid permissions.'
            );
        });
        it('governanceRecoverUnsupported operator FAILURE', async function () {
            //Make sure we can't transfer if we don't have balance.
            const TheoryToken = await smock.mock("Theory");
            const blockTime = await latestBlocktime(ethers.provider);
            startTime = BigNumber.from(blockTime).add(period);
            sToken = await TheoryToken.deploy(startTime, daofund.address, devfund.address, startTime.add(years), startTime.add(years.mul(2)));
            await sToken.deployed();
            const devAndTreasuryAmount = BigNumber.from("54514764700000000000000");
            expect(await sToken.balanceOf(sToken.address)).to.equal(devAndTreasuryAmount);
            await expect(sToken.governanceRecoverUnsupported(sToken.address, devAndTreasuryAmount.add(one), daofund.address)).to.be.revertedWith(
                'ERC20: transfer amount exceeds balance'
            );
        });
        it('governanceRecoverUnsupported not authorized FAILURE', async function () {
            //Make sure we can't transfer at all if we're not authorized.
            await sToken.renounceOwnership();
            await expect(sToken.governanceRecoverUnsupported(sToken.address, one, daofund.address)).to.be.revertedWith(
                'caller is not authorized'
            );
        });
        it('lockFromUpdate SUCCESS', async function () {
            let timestamp = getCurrentTimestamp();
            await sToken.lockFromUpdate(timestamp);
            expect(await sToken.lockFromTime()).to.equal(timestamp);
            expect(await sToken.lockToTime()).to.equal(BigNumber.from(timestamp).add(years));
        });
        it('lockFromUpdate FAILURE', async function () {
            await sToken.renounceOwnership();
            await expect(sToken.lockFromUpdate(getCurrentTimestamp())).to.be.revertedWith(
                'caller is not authorized'
            );
        });
        it('lockToUpdate SUCCESS', async function () {
            const time = (await sToken.lockFromTime()).add(BigNumber.from(364).mul(days));
            await sToken.lockToUpdate(time);
            expect(await sToken.lockToTime()).to.equal(time);
        });
        it('lockToUpdate time FAILURE', async function () {
            await expect(sToken.lockToUpdate((await sToken.lockFromTime()).add(BigNumber.from(366).mul(days)))).to.be.revertedWith(
                'Lock time must not be greater than 365 days.'
            );
        });
        it('lockToUpdate reverse time FAILURE', async function () {
            await expect(sToken.lockToUpdate((await sToken.lockFromTime()).sub(1))).to.be.revertedWith(
                'Lock to must be greater than lock from.'
            );
        });
        it('lockToUpdate not authorized FAILURE', async function () {
            await sToken.renounceOwnership();
            await expect(sToken.lockToUpdate((await sToken.lockFromTime()).add(BigNumber.from(364).mul(days)))).to.be.revertedWith(
                'caller is not authorized'
            );
        });
        it('lock max amount operator SUCCESS', async function () {
            const TheoryToken = await smock.mock("Theory");
            const blockTime = await latestBlocktime(ethers.provider);
            startTime = BigNumber.from(blockTime).add(period);
            sToken = await TheoryToken.deploy(startTime, daofund.address, devfund.address, startTime.add(years), startTime.add(years.mul(2)));
            await sToken.deployed();
            await sToken.lock(deployer.address, one);
            expect(await sToken.lockOf(deployer.address)).to.equal(one);
        });
        it('lock max amount distributed SUCCESS', async function () {
            const TheoryToken = await smock.mock("Theory");
            const blockTime = await latestBlocktime(ethers.provider);
            startTime = BigNumber.from(blockTime).add(period);
            sToken = await TheoryToken.deploy(startTime, daofund.address, devfund.address, startTime.add(years), startTime.add(years.mul(2)));
            await sToken.deployed();
            await sToken.setVariable('distributed', deployer.address)
            await sToken.transferOperator(treasuryDAO.address);
            await sToken.renounceOwnership();
            await sToken.lock(deployer.address, one);
            expect(await sToken.lockOf(deployer.address)).to.equal(one);
        });
        it('lock max amount FAILURE', async function () {
            await expect(sToken.lock(deployer.address, one)).to.be.revertedWith(
                'Lock amount over 95% of total balance');
        });
        it('lock not authorized FAILURE', async function () {
            await sToken.renounceOwnership();
            await expect(sToken.lock(deployer.address, one)).to.be.revertedWith(
                'caller is not authorized'
            );
        });
        // Tested lock and unlock base cases already above.
    });

    describe('Game Theory Changes: Treasury', () => {
        it("shouldAllocateSeigniorage", async () => {
            var price = ethers.utils.parseEther('0.1');
            const numBonds1 = ethers.utils.parseEther('0.15');
            const numBonds2 = ethers.utils.parseEther('0.1');

            await oracle.setPrice(price);
            await pToken.approve(
                treasuryDAO.address,
                ethers.utils.parseEther('1')
            );

            await treasuryDAO.setMaxSupplyContractionPercent(1500); // 15% percent
            await treasuryDAO.setMaxDebtRatioPercent(10000); // 100%

            await sToken.approve(theoretics.address, one);
            await theoretics.stake(one);

            expect(await treasuryDAO.shouldAllocateSeigniorage()).to.equal(true);
            await treasuryDAO.allocateSeigniorage();
            expect(await treasuryDAO.shouldAllocateSeigniorage()).to.equal(false);
        });
        it('setStartTime SUCCESS', async function () {
            await ethers.provider.send('evm_mine', []);
            const Treasury = await smock.mock("Treasury");
            treasuryDAO = await Treasury.deploy();
            await treasuryDAO.deployed();
            let timestamp = BigNumber.from(await latestBlocktime(ethers.provider));
            startTime = timestamp.add(3600);
            await treasuryDAO.initialize(pToken.address, bToken.address, sToken.address, oracle.address, theoretics.address, genesisPool.address, daofund.address, devfund.address, startTime);
            await treasuryDAO.setStartTime(timestamp.add(7200));
            expect(await treasuryDAO.startTime()).to.equal(timestamp.add(7200));
        });
        it('setPoolStartTime not operator FAILURE', async function () {
            await treasuryDAO.setOperator(daofund.address);
            await expect(treasuryDAO.setStartTime(getCurrentTimestamp())).to.be.revertedWith(
                'Treasury: caller is not the operator'
            );
        });
        it('setPoolStartTime started FAILURE', async function () {
            await expect(treasuryDAO.setStartTime(getCurrentTimestamp())).to.be.revertedWith(
                'Already started.'
            );
        });
        it('setPoolStartTime early FAILURE', async function () {
            await ethers.provider.send('evm_mine', []);
            const Treasury = await smock.mock("Treasury");
            treasuryDAO = await Treasury.deploy();
            await treasuryDAO.deployed();
            let timestamp = BigNumber.from(await latestBlocktime(ethers.provider));
            startTime = timestamp.add(3600);
            await treasuryDAO.initialize(pToken.address, bToken.address, sToken.address, oracle.address, theoretics.address, genesisPool.address, daofund.address, devfund.address, startTime);
            await expect(treasuryDAO.setStartTime(timestamp.sub(7200))).to.be.revertedWith('Time input is too early.');
        });
    });
    describe('Game Theory Changes: Theoretics', () => {
        it("setFeeStages SUCCESS", async () => {
            const feeStageTime = [zero, hours, days, days.mul(3), days.mul(4), days.mul(5), days.mul(6)];
            const feeStagePercentage = [BigNumber.from(800), BigNumber.from(799), BigNumber.from(300), BigNumber.from(100), BigNumber.from(50), BigNumber.from(25), BigNumber.from(1)];
            await theoretics.setFeeStages(feeStageTime, feeStagePercentage);
            expect(await theoretics.feeStageTime(6)).to.equal(feeStageTime[6]);
            expect(await theoretics.feeStagePercentage(1)).to.equal(feeStagePercentage[1]);
        });
        it("setFeeStages time FAILURE", async () => {
            const feeStageTime = [one, hours, days, days.mul(3), days.mul(4), days.mul(5), days.mul(6)];
            const feeStagePercentage = [BigNumber.from(800), BigNumber.from(300), BigNumber.from(200), BigNumber.from(100), BigNumber.from(50), BigNumber.from(25), BigNumber.from(1)];
            expect(theoretics.setFeeStages(feeStageTime, feeStagePercentage)).to.be.revertedWith(
                'Fee stage arrays must be equal in non-zero length and time should start at 0.');
        });
        it("setFeeStages length FAILURE", async () => {
            const feeStageTime = [];
            const feeStagePercentage = [];
            expect(theoretics.setFeeStages(feeStageTime, feeStagePercentage)).to.be.revertedWith(
                'Fee stage arrays must be equal in non-zero length and time should start at 0.');
        });
        it("setFeeStages not equal FAILURE", async () => {
            const feeStageTime = [zero, hours, days, days.mul(3), days.mul(4), days.mul(5)];
            const feeStagePercentage = [BigNumber.from(800), BigNumber.from(300), BigNumber.from(200), BigNumber.from(100), BigNumber.from(50), BigNumber.from(25), BigNumber.from(1)];
            expect(theoretics.setFeeStages(feeStageTime, feeStagePercentage)).to.be.revertedWith(
                'Fee stage arrays must be equal in non-zero length and time should start at 0.');
        });
        it("setFeeStages fee FAILURE", async () => {
            const feeStageTime = [zero, hours, days, days.mul(3), days.mul(4), days.mul(5), days.mul(6)];
            const feeStagePercentage = [BigNumber.from(800), BigNumber.from(900), BigNumber.from(200), BigNumber.from(100), BigNumber.from(50), BigNumber.from(25), BigNumber.from(1)];
            expect(theoretics.setFeeStages(feeStageTime, feeStagePercentage)).to.be.revertedWith(
                "Fee can't be higher than 8%.");
        });
        it("setSameBlockFee SUCCESS", async () => {
            await theoretics.setSameBlockFee(2499);
            expect(await theoretics.sameBlockFee()).to.equal(2499);
            await theoretics.setSameBlockFee(2500);
            expect(await theoretics.sameBlockFee()).to.equal(2500);
        });
        it("setSameBlockFee FAILURE", async () => {
            expect(theoretics.setSameBlockFee(2501)).to.be.revertedWith(
                "Fee can't be higher than 25%.");
        });
        it("getWithdrawFeeOf SUCCESS", async () => {
            await sToken.approve(theoretics.address, one);
            await theoretics.stake(one);
            expect(await theoretics.getWithdrawFeeOf(deployer.address)).to.equal(2500);
            await ethers.provider.send('evm_mine',[]);
            expect(await theoretics.getWithdrawFeeOf(deployer.address)).to.equal(800);
            await advanceTime(ethers.provider, hours.toNumber());
            await ethers.provider.send('evm_mine',[]);
            expect(await theoretics.getWithdrawFeeOf(deployer.address)).to.equal(400);
            await advanceTime(ethers.provider, days.toNumber());
            await ethers.provider.send('evm_mine',[]);
            expect(await theoretics.getWithdrawFeeOf(deployer.address)).to.equal(200);
            await advanceTime(ethers.provider, years.toNumber());
            await ethers.provider.send('evm_mine',[]);
            expect(await theoretics.getWithdrawFeeOf(deployer.address)).to.equal(1);
        });
        it("setLockUp changed value SUCCESS", async () => {
            expect(await theoretics.withdrawLockupEpochs()).to.equal(6);
            expect(await theoretics.rewardLockupEpochs()).to.equal(3);
            expect(await theoretics.pegMaxUnlock()).to.equal(one.mul(4));
            await theoretics.setLockUp(4, 1, one.mul(2))
            expect(await theoretics.withdrawLockupEpochs()).to.equal(4);
            expect(await theoretics.rewardLockupEpochs()).to.equal(1);
            expect(await theoretics.pegMaxUnlock()).to.equal(one.mul(2));
        });
        it("setLockUp initial value SUCCESS", async () => {
            expect(await theoretics.withdrawLockupEpochs()).to.equal(6);
            expect(await theoretics.rewardLockupEpochs()).to.equal(3);
            expect(await theoretics.pegMaxUnlock()).to.equal(one.mul(4));
            await theoretics.setLockUp(6, 3, one.mul(4))
            expect(await theoretics.withdrawLockupEpochs()).to.equal(6);
            expect(await theoretics.rewardLockupEpochs()).to.equal(3);
            expect(await theoretics.pegMaxUnlock()).to.equal(one.mul(4));
        });
        it("setLockUp withdraw not greater FAILURE", async () => {
            expect(await theoretics.withdrawLockupEpochs()).to.equal(6);
            expect(await theoretics.rewardLockupEpochs()).to.equal(3);
            expect(await theoretics.pegMaxUnlock()).to.equal(one.mul(4));
            await expect(theoretics.setLockUp(1, 2, one.mul(2))).to.be.revertedWith('lockup epochs out of range');
        });
        it("setLockUp withdraw greater than 6 FAILURE", async () => {
            expect(await theoretics.withdrawLockupEpochs()).to.equal(6);
            expect(await theoretics.rewardLockupEpochs()).to.equal(3);
            expect(await theoretics.pegMaxUnlock()).to.equal(one.mul(4));
            await expect(theoretics.setLockUp(7, 3, one.mul(2))).to.be.revertedWith('lockup epochs out of range');
        });
        it("setLockUp reward greater than 3 FAILURE", async () => {
            expect(await theoretics.withdrawLockupEpochs()).to.equal(6);
            expect(await theoretics.rewardLockupEpochs()).to.equal(3);
            expect(await theoretics.pegMaxUnlock()).to.equal(one.mul(4));
            await expect(theoretics.setLockUp(6, 4, one.mul(2))).to.be.revertedWith('lockup epochs out of range');
        });
        it("setLockUp pegMaxUnlock lower than ceiling FAILURE", async () => {
            expect(await theoretics.withdrawLockupEpochs()).to.equal(6);
            expect(await theoretics.rewardLockupEpochs()).to.equal(3);
            expect(await theoretics.pegMaxUnlock()).to.equal(one.mul(4));
            await expect(theoretics.setLockUp(6, 3, one)).to.be.revertedWith('Max peg unlock must be greater than the GAME ceiling and lower than the price of one GAME times 4.');
        });
        it("setLockUp pegMaxUnlock greater than 4 FAILURE", async () => {
            expect(await theoretics.withdrawLockupEpochs()).to.equal(6);
            expect(await theoretics.rewardLockupEpochs()).to.equal(3);
            expect(await theoretics.pegMaxUnlock()).to.equal(one.mul(4));
            await expect(theoretics.setLockUp(6, 3, one.mul(4).add(1))).to.be.revertedWith('Max peg unlock must be greater than the GAME ceiling and lower than the price of one GAME times 4.');
        });
        it("getLockPercentage SUCCESS", async () => {
            await oracle.setPrice(one.mul(101).div(100));
            expect(await theoretics.getLockPercentage()).to.equal(95);
            await oracle.setPrice(one.mul(2));
            expect(await theoretics.getLockPercentage()).to.equal(64);
            await oracle.setPrice(one.mul(4));
            expect(await theoretics.getLockPercentage()).to.equal(0);
            await oracle.setPrice(one.mul(5));
            expect(await theoretics.getLockPercentage()).to.equal(0);
        });
        it("getCurrentWithdrawEpochs SUCCESS", async () => {
            await ethers.provider.send('evm_mine');
            expect(await theoretics.getCurrentWithdrawEpochs()).to.equal(0);
            await advanceTime(ethers.provider, years.div(2).toNumber());
            await ethers.provider.send('evm_mine',[]);
            expect(await theoretics.getCurrentWithdrawEpochs()).to.equal(3);
            await advanceTime(ethers.provider, years.div(2).toNumber());
            await ethers.provider.send('evm_mine',[]);
            expect(await theoretics.getCurrentWithdrawEpochs()).to.equal(6);
        });
        it("getCurrentClaimEpochs SUCCESS", async () => {
            await ethers.provider.send('evm_mine');
            expect(await theoretics.getCurrentClaimEpochs()).to.equal(0);
            await advanceTime(ethers.provider, years.div(2).toNumber());
            await ethers.provider.send('evm_mine',[]);
            expect(await theoretics.getCurrentClaimEpochs()).to.equal(1);
            await advanceTime(ethers.provider, years.div(2).toNumber());
            await ethers.provider.send('evm_mine',[]);
            expect(await theoretics.getCurrentClaimEpochs()).to.equal(3);
        });
        // Most of this was already tested on the frontend. Only testing time-based or suspicious ones here.
    });
    describe('Game Theory Changes: GameGenesisRewardPool', () => {
        it('setPoolStartTime, setPoolEndTime, runningTime SUCCESS', async function () {
            await ethers.provider.send('evm_mine', []);
            const GenesisPool = await hre.ethers.getContractFactory("GameGenesisRewardPool");
            let timestamp = BigNumber.from(await latestBlocktime(ethers.provider));
            startTime = timestamp.add(3600);
            genesisPool = await GenesisPool.deploy(pToken.address, treasuryDAO.address, startTime);
            await genesisPool.deployed();
            await genesisPool.setPoolStartTime(timestamp.add(7200));
            expect(await genesisPool.poolStartTime()).to.equal(timestamp.add(7200));
            await genesisPool.setPoolEndTime(timestamp.add(9600));
            expect(await genesisPool.poolEndTime()).to.equal(timestamp.add(9600));
            expect(await genesisPool.runningTime()).to.equal(2400);
        });
        it('setPoolStartTime not operator FAILURE', async function () {
            await genesisPool.transferOperator(treasuryDAO.address);
            await genesisPool.renounceOwnership();
            await expect(genesisPool.setPoolStartTime(getCurrentTimestamp())).to.be.revertedWith(
                'caller is not authorized'
            );
        });
        it('setPoolStartTime started FAILURE', async function () {
            await expect(genesisPool.setPoolStartTime(getCurrentTimestamp())).to.be.revertedWith(
                'Already started.'
            );
        });
        it('setPoolStartTime early FAILURE', async function () {
            await ethers.provider.send('evm_mine', []);
            const GenesisPool = await hre.ethers.getContractFactory("GameGenesisRewardPool");
            let timestamp = BigNumber.from(await latestBlocktime(ethers.provider));
            startTime = timestamp.add(3600);
            genesisPool = await GenesisPool.deploy(pToken.address, treasuryDAO.address, startTime);
            await genesisPool.deployed();
            await expect(genesisPool.setPoolStartTime(timestamp.sub(7200))).to.be.revertedWith('Time input is too early.');
        });
        it('setPoolEndTime not operator FAILURE', async function () {
            await genesisPool.transferOperator(treasuryDAO.address);
            await genesisPool.renounceOwnership();
            await expect(genesisPool.setPoolEndTime(getCurrentTimestamp())).to.be.revertedWith(
                'caller is not authorized'
            );
        });
        it('setPoolEndTime started FAILURE', async function () {
            await expect(genesisPool.setPoolEndTime(getCurrentTimestamp())).to.be.revertedWith(
                'Already started.'
            );
        });
        it('setPoolEndTime early FAILURE', async function () {
            await ethers.provider.send('evm_mine', []);
            const GenesisPool = await hre.ethers.getContractFactory("GameGenesisRewardPool");
            let timestamp = BigNumber.from(await latestBlocktime(ethers.provider));
            startTime = timestamp.add(3600);
            genesisPool = await GenesisPool.deploy(pToken.address, treasuryDAO.address, startTime);
            await genesisPool.deployed();
            await expect(genesisPool.setPoolEndTime(timestamp.sub(7200))).to.be.revertedWith('Time input is too early.');
        });
        /*// Only enable when setting to public for testing
        // it('checkPoolDuplicate FAILURE', async function () {
        //     await expect(genesisPool.checkPoolDuplicate(iToken.address)).to.be.revertedWith('GameGenesisRewardPool: existing pool?');
        // });*/
        it('setDepositFee SUCCESS', async function () {
            await genesisPool.setDepositFee(99);
            expect(await genesisPool.depositFee()).to.equal(99);
            await genesisPool.setDepositFee(100);
            expect(await genesisPool.depositFee()).to.equal(100);
        })
        it('setDepositFee FAILURE', async function () {
            await expect(genesisPool.setDepositFee(101)).to.be.revertedWith('Deposit fee must be less than 1%');
        })
        // Most of this was already tested on the frontend. Only testing time-based or suspicious ones here.
    });
    describe('Game Theory Changes: TheoryRewardPool', () => {
        it("setFeeStages SUCCESS", async () => {
            const feeStageTime = [zero, hours, days, days.mul(3), days.mul(4), days.mul(5), days.mul(6)];
            const feeStagePercentage = [BigNumber.from(800), BigNumber.from(799), BigNumber.from(300), BigNumber.from(100), BigNumber.from(50), BigNumber.from(25), BigNumber.from(1)];
            await theoryRewardPool.setFeeStages(feeStageTime, feeStagePercentage);
            expect(await theoryRewardPool.feeStageTime(6)).to.equal(feeStageTime[6]);
            expect(await theoryRewardPool.feeStagePercentage(1)).to.equal(feeStagePercentage[1]);
        });
        it("setFeeStages time FAILURE", async () => {
            const feeStageTime = [one, hours, days, days.mul(3), days.mul(4), days.mul(5), days.mul(6)];
            const feeStagePercentage = [BigNumber.from(800), BigNumber.from(300), BigNumber.from(200), BigNumber.from(100), BigNumber.from(50), BigNumber.from(25), BigNumber.from(1)];
            expect(theoryRewardPool.setFeeStages(feeStageTime, feeStagePercentage)).to.be.revertedWith(
                'Fee stage arrays must be equal in non-zero length and time should start at 0.');
        });
        it("setFeeStages length FAILURE", async () => {
            const feeStageTime = [];
            const feeStagePercentage = [];
            expect(theoryRewardPool.setFeeStages(feeStageTime, feeStagePercentage)).to.be.revertedWith(
                'Fee stage arrays must be equal in non-zero length and time should start at 0.');
        });
        it("setFeeStages not equal FAILURE", async () => {
            const feeStageTime = [zero, hours, days, days.mul(3), days.mul(4), days.mul(5)];
            const feeStagePercentage = [BigNumber.from(800), BigNumber.from(300), BigNumber.from(200), BigNumber.from(100), BigNumber.from(50), BigNumber.from(25), BigNumber.from(1)];
            expect(theoryRewardPool.setFeeStages(feeStageTime, feeStagePercentage)).to.be.revertedWith(
                'Fee stage arrays must be equal in non-zero length and time should start at 0.');
        });
        it("setFeeStages fee FAILURE", async () => {
            const feeStageTime = [zero, hours, days, days.mul(3), days.mul(4), days.mul(5), days.mul(6)];
            const feeStagePercentage = [BigNumber.from(800), BigNumber.from(801), BigNumber.from(200), BigNumber.from(100), BigNumber.from(50), BigNumber.from(25), BigNumber.from(1)];
            expect(theoryRewardPool.setFeeStages(feeStageTime, feeStagePercentage)).to.be.revertedWith(
                "Fee can't be higher than 8%.");
        });
        it("setSameBlockFee SUCCESS", async () => {
            await theoryRewardPool.setSameBlockFee(2499);
            expect(await theoryRewardPool.sameBlockFee()).to.equal(2499);
            await theoryRewardPool.setSameBlockFee(2500);
            expect(await theoryRewardPool.sameBlockFee()).to.equal(2500);
        });
        it("setSameBlockFee FAILURE", async () => {
            expect(theoryRewardPool.setSameBlockFee(2501)).to.be.revertedWith(
                "Fee can't be higher than 25%.");
        });
        it("getMultiplier SUCCESS", async () => {
            await ethers.provider.send('evm_mine',[]);
            let blockTime = (await theoryRewardPool.poolStartTime()).add(1);
            expect(await theoryRewardPool.getMultiplier(blockTime.sub(1), blockTime)).to.equal(256);
            blockTime = blockTime.add(weeks).add(1);
            expect(await theoryRewardPool.getMultiplier(blockTime.sub(1), blockTime)).to.equal(128);
            blockTime = blockTime.add(weeks).add(1);
            expect(await theoryRewardPool.getMultiplier(blockTime.sub(1), blockTime)).to.equal(96);
            blockTime = blockTime.add(years);
            expect(await theoryRewardPool.getMultiplier(blockTime.sub(1), blockTime)).to.equal(4);
        });
        it("getWithdrawFeeOf SUCCESS", async () => {
            (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", pTokenPairAddress)).approve(theoryRewardPool.address, half);
            await theoryRewardPool.deposit(0, half);
            expect(await theoryRewardPool.getWithdrawFeeOf(0, deployer.address)).to.equal(2500);
            await ethers.provider.send('evm_mine',[]);
            expect(await theoryRewardPool.getWithdrawFeeOf(0, deployer.address)).to.equal(800);
            await advanceTime(ethers.provider, hours.toNumber());
            await ethers.provider.send('evm_mine',[]);
            expect(await theoryRewardPool.getWithdrawFeeOf(0, deployer.address)).to.equal(400);
            await advanceTime(ethers.provider, days.toNumber());
            await ethers.provider.send('evm_mine',[]);
            expect(await theoryRewardPool.getWithdrawFeeOf(0, deployer.address)).to.equal(200);
            await advanceTime(ethers.provider, years.toNumber());
            await ethers.provider.send('evm_mine',[]);
            expect(await theoryRewardPool.getWithdrawFeeOf(0, deployer.address)).to.equal(1);
        });
        it("getLockPercentage SUCCESS", async () => {
            await ethers.provider.send('evm_mine',[]);
            let blockTime = (await theoryRewardPool.poolStartTime()).add(1);
            expect(await theoryRewardPool.getLockPercentage(blockTime.sub(1), blockTime)).to.equal(95);
            blockTime = blockTime.add(weeks).add(1);
            expect(await theoryRewardPool.getLockPercentage(blockTime.sub(1), blockTime)).to.equal(93);
            blockTime = blockTime.add(weeks).add(1);
            expect(await theoryRewardPool.getLockPercentage(blockTime.sub(1), blockTime)).to.equal(91);
            blockTime = blockTime.add(years);
            expect(await theoryRewardPool.getLockPercentage(blockTime.sub(1), blockTime)).to.equal(0);
        });
        it('setPoolStartTime, setPoolEndTime, runningTime SUCCESS', async function () {
            await ethers.provider.send('evm_mine', []);
            let timestamp = BigNumber.from(await latestBlocktime(ethers.provider));
            startTime = timestamp.add(3600);
            const TheoryRewardPool = await hre.ethers.getContractFactory("TheoryRewardPool");
            theoryRewardPool = await TheoryRewardPool.deploy(
                sToken.address,
                treasuryDAO.address,
                startTime,
                weeks, // 7 days
                [BigNumber.from(256),BigNumber.from(128),BigNumber.from(96),BigNumber.from(64),BigNumber.from(56),BigNumber.from(48),BigNumber.from(40),BigNumber.from(32),BigNumber.from(28),BigNumber.from(24),BigNumber.from(20),BigNumber.from(16),BigNumber.from(15),BigNumber.from(14),BigNumber.from(13),BigNumber.from(12),BigNumber.from(11),BigNumber.from(10),BigNumber.from(9),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4)],
                [BigNumber.from(95), BigNumber.from(93), BigNumber.from(91), BigNumber.from(89), BigNumber.from(87), BigNumber.from(85), BigNumber.from(83), BigNumber.from(81), BigNumber.from(79), BigNumber.from(77), BigNumber.from(75), BigNumber.from(73), BigNumber.from(71), BigNumber.from(69), BigNumber.from(67), BigNumber.from(65), BigNumber.from(63), BigNumber.from(61), BigNumber.from(59), BigNumber.from(57), BigNumber.from(55), BigNumber.from(53), BigNumber.from(51), BigNumber.from(49), BigNumber.from(47), BigNumber.from(45), BigNumber.from(43), BigNumber.from(41), BigNumber.from(39), BigNumber.from(37), BigNumber.from(35), BigNumber.from(33), BigNumber.from(31), BigNumber.from(29), BigNumber.from(27), BigNumber.from(25), BigNumber.from(23), BigNumber.from(21), BigNumber.from(19), BigNumber.from(17), BigNumber.from(15), BigNumber.from(13), BigNumber.from(11), BigNumber.from(9), BigNumber.from(7), BigNumber.from(5), BigNumber.from(3), BigNumber.from(1)]);
            await theoryRewardPool.deployed();
            await theoryRewardPool.setPoolStartTime(timestamp.add(7200));
            expect(await theoryRewardPool.poolStartTime()).to.equal(timestamp.add(7200));
            await theoryRewardPool.setPoolEndTime(timestamp.add(9600));
            expect(await theoryRewardPool.poolEndTime()).to.equal(timestamp.add(9600));
            expect(await theoryRewardPool.runningTime()).to.equal(2400);
        });
        it('setPoolStartTime not operator FAILURE', async function () {
            await theoryRewardPool.transferOperator(treasuryDAO.address);
            await theoryRewardPool.renounceOwnership();
            await expect(theoryRewardPool.setPoolStartTime(getCurrentTimestamp())).to.be.revertedWith(
                'caller is not authorized'
            );
        });
        it('setPoolStartTime started FAILURE', async function () {
            await expect(theoryRewardPool.setPoolStartTime(getCurrentTimestamp())).to.be.revertedWith(
                'Already started.'
            );
        });
        it('setPoolStartTime early FAILURE', async function () {
            await ethers.provider.send('evm_mine', []);
            let timestamp = BigNumber.from(await latestBlocktime(ethers.provider));
            startTime = timestamp.add(3600);
            const TheoryRewardPool = await hre.ethers.getContractFactory("TheoryRewardPool");
            theoryRewardPool = await TheoryRewardPool.deploy(
                sToken.address,
                treasuryDAO.address,
                startTime,
                weeks, // 7 days
                [BigNumber.from(256),BigNumber.from(128),BigNumber.from(96),BigNumber.from(64),BigNumber.from(56),BigNumber.from(48),BigNumber.from(40),BigNumber.from(32),BigNumber.from(28),BigNumber.from(24),BigNumber.from(20),BigNumber.from(16),BigNumber.from(15),BigNumber.from(14),BigNumber.from(13),BigNumber.from(12),BigNumber.from(11),BigNumber.from(10),BigNumber.from(9),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4)],
                [BigNumber.from(95), BigNumber.from(93), BigNumber.from(91), BigNumber.from(89), BigNumber.from(87), BigNumber.from(85), BigNumber.from(83), BigNumber.from(81), BigNumber.from(79), BigNumber.from(77), BigNumber.from(75), BigNumber.from(73), BigNumber.from(71), BigNumber.from(69), BigNumber.from(67), BigNumber.from(65), BigNumber.from(63), BigNumber.from(61), BigNumber.from(59), BigNumber.from(57), BigNumber.from(55), BigNumber.from(53), BigNumber.from(51), BigNumber.from(49), BigNumber.from(47), BigNumber.from(45), BigNumber.from(43), BigNumber.from(41), BigNumber.from(39), BigNumber.from(37), BigNumber.from(35), BigNumber.from(33), BigNumber.from(31), BigNumber.from(29), BigNumber.from(27), BigNumber.from(25), BigNumber.from(23), BigNumber.from(21), BigNumber.from(19), BigNumber.from(17), BigNumber.from(15), BigNumber.from(13), BigNumber.from(11), BigNumber.from(9), BigNumber.from(7), BigNumber.from(5), BigNumber.from(3), BigNumber.from(1)]);
            await theoryRewardPool.deployed();
            await expect(theoryRewardPool.setPoolStartTime(timestamp.sub(7200))).to.be.revertedWith('Time input is too early.');
        });
        it('setPoolEndTime not authorized FAILURE', async function () {
            await theoryRewardPool.transferOperator(treasuryDAO.address);
            await theoryRewardPool.renounceOwnership();
            await expect(theoryRewardPool.setPoolEndTime(getCurrentTimestamp())).to.be.revertedWith(
                'caller is not authorized'
            );
        });
        it('setPoolEndTime started FAILURE', async function () {
            await expect(theoryRewardPool.setPoolEndTime(getCurrentTimestamp())).to.be.revertedWith(
                'Already started.'
            );
        });
        it('setPoolEndTime early FAILURE', async function () {
            await ethers.provider.send('evm_mine', []);
            let timestamp = BigNumber.from(await latestBlocktime(ethers.provider));
            startTime = timestamp.add(3600);
            const TheoryRewardPool = await hre.ethers.getContractFactory("TheoryRewardPool");
            theoryRewardPool = await TheoryRewardPool.deploy(
                sToken.address,
                treasuryDAO.address,
                startTime,
                weeks, // 7 days
                [BigNumber.from(256),BigNumber.from(128),BigNumber.from(96),BigNumber.from(64),BigNumber.from(56),BigNumber.from(48),BigNumber.from(40),BigNumber.from(32),BigNumber.from(28),BigNumber.from(24),BigNumber.from(20),BigNumber.from(16),BigNumber.from(15),BigNumber.from(14),BigNumber.from(13),BigNumber.from(12),BigNumber.from(11),BigNumber.from(10),BigNumber.from(9),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4)],
                [BigNumber.from(95), BigNumber.from(93), BigNumber.from(91), BigNumber.from(89), BigNumber.from(87), BigNumber.from(85), BigNumber.from(83), BigNumber.from(81), BigNumber.from(79), BigNumber.from(77), BigNumber.from(75), BigNumber.from(73), BigNumber.from(71), BigNumber.from(69), BigNumber.from(67), BigNumber.from(65), BigNumber.from(63), BigNumber.from(61), BigNumber.from(59), BigNumber.from(57), BigNumber.from(55), BigNumber.from(53), BigNumber.from(51), BigNumber.from(49), BigNumber.from(47), BigNumber.from(45), BigNumber.from(43), BigNumber.from(41), BigNumber.from(39), BigNumber.from(37), BigNumber.from(35), BigNumber.from(33), BigNumber.from(31), BigNumber.from(29), BigNumber.from(27), BigNumber.from(25), BigNumber.from(23), BigNumber.from(21), BigNumber.from(19), BigNumber.from(17), BigNumber.from(15), BigNumber.from(13), BigNumber.from(11), BigNumber.from(9), BigNumber.from(7), BigNumber.from(5), BigNumber.from(3), BigNumber.from(1)]);
            await theoryRewardPool.deployed();
            await expect(theoryRewardPool.setPoolEndTime(timestamp.sub(7200))).to.be.revertedWith('Time input is too early.');
        });
        // /*// Only enable when setting to public for testing
        // // it('checkPoolDuplicate FAILURE', async function () {
        // //     await expect(genesisPool.checkPoolDuplicate(iToken.address)).to.be.revertedWith('GameGenesisRewardPool: existing pool?');
        // // });*/
        // Most of this was already tested on the frontend. Only testing time-based or suspicious ones here.
    });
});