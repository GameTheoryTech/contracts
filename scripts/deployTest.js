/* eslint-disable */
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {BigNumber} = require("@ethersproject/bignumber");

async function main() {
    const [deployer, daofund, devfund] = await hre.ethers.getSigners();

    const seconds = BigNumber.from(1);
    const minutes = seconds.mul(60);
    const hours = minutes.mul(60);
    const days = hours.mul(24);
    const weeks = days.mul(7);
    const years = days.mul(365);

    // const DAOFund = await hre.ethers.getContractFactory("SimpleERCFund");
    // const daoFund = await DAOFund.connect(daofund).deploy();
    // await daoFund.deployed();
    // console.log("- daoFund deployed to:", daoFund.address);

    // const DEVFund = await hre.ethers.getContractFactory("SimpleERCFund");
    // const devFund = await DEVFund.connect(devfund).deploy();
    // await devFund.deployed();
    // console.log("- devFund deployed to:", devFund.address);

    const MockInvestToken = await hre.ethers.getContractFactory("DummyToken");
    const iToken = await MockInvestToken.connect(deployer).deploy();
    await iToken.deployed();
    const iTokenDecimals = await iToken.decimals();
    console.log("- MockInvestToken deployed to:", iToken.address);
    console.log("MockInvestToken decimals:", iTokenDecimals);

    const GameToken = await hre.ethers.getContractFactory("Game");
    const pToken = await GameToken.deploy();
    await pToken.deployed();
    const pTokenDecimals = await pToken.decimals();
    console.log("- GameToken deployed to:", pToken.address);
    console.log("GameToken decimals:", pTokenDecimals);

    const bondToken = await hre.ethers.getContractFactory("HODL");
    const bToken = await bondToken.deploy();
    await bToken.deployed();
    const bTokenDecimals = await bToken.decimals();
    console.log("- HODLToken deployed to:", bToken.address);
    console.log("HODLToken decimals:", bTokenDecimals);

    const startTime = BigNumber.from(Math.floor(Date.now() / 1000) + 60 * 5);

    const TheoryToken = await hre.ethers.getContractFactory("Theory");
    // Start unlocking after 365 days, and fully unlock 365 days after that.
    const sToken = await TheoryToken.deploy(startTime, daofund.address, devfund.address, startTime.add(years), startTime.add(years.mul(2)));
    await sToken.deployed();
    const sTokenDecimals = await sToken.decimals();
    console.log("- TheoryToken deployed to:", sToken.address);
    console.log("TheoryToken decimals:", sTokenDecimals);

    const Treasury = await hre.ethers.getContractFactory("Treasury");
    const treasuryDAO = await Treasury.deploy();
    await treasuryDAO.deployed();
    console.log("-- DAO Treasury deployed to:", treasuryDAO.address);

    const Theoretics = await hre.ethers.getContractFactory("Theoretics");
    const theoretics = await Theoretics.deploy();
    await theoretics.deployed();
    console.log("-- Theoretics deployed to:", theoretics.address);

    const GenesisPool = await hre.ethers.getContractFactory("GameGenesisRewardPool");
    const genesisPool = await GenesisPool.deploy(pToken.address, treasuryDAO.address, startTime);
    await genesisPool.deployed();
    console.log("-- Genesis Pool deployed to:", genesisPool.address);

    const TheoryRewardPool = await hre.ethers.getContractFactory("TheoryRewardPool");
    const theoryRewardPool = await TheoryRewardPool.deploy(
        sToken.address,
        treasuryDAO.address,
        startTime,
        weeks, // 7 days
        [BigNumber.from(256),BigNumber.from(128),BigNumber.from(96),BigNumber.from(64),BigNumber.from(56),BigNumber.from(48),BigNumber.from(40),BigNumber.from(32),BigNumber.from(28),BigNumber.from(24),BigNumber.from(20),BigNumber.from(16),BigNumber.from(15),BigNumber.from(14),BigNumber.from(13),BigNumber.from(12),BigNumber.from(11),BigNumber.from(10),BigNumber.from(9),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4)],
        [BigNumber.from(95), BigNumber.from(93), BigNumber.from(91), BigNumber.from(89), BigNumber.from(87), BigNumber.from(85), BigNumber.from(83), BigNumber.from(81), BigNumber.from(79), BigNumber.from(77), BigNumber.from(75), BigNumber.from(73), BigNumber.from(71), BigNumber.from(69), BigNumber.from(67), BigNumber.from(65), BigNumber.from(63), BigNumber.from(61), BigNumber.from(59), BigNumber.from(57), BigNumber.from(55), BigNumber.from(53), BigNumber.from(51), BigNumber.from(49), BigNumber.from(47), BigNumber.from(45), BigNumber.from(43), BigNumber.from(41), BigNumber.from(39), BigNumber.from(37), BigNumber.from(35), BigNumber.from(33), BigNumber.from(31), BigNumber.from(29), BigNumber.from(27), BigNumber.from(25), BigNumber.from(23), BigNumber.from(21), BigNumber.from(19), BigNumber.from(17), BigNumber.from(15), BigNumber.from(13), BigNumber.from(11), BigNumber.from(9), BigNumber.from(7), BigNumber.from(5), BigNumber.from(3), BigNumber.from(1)]);
    await theoryRewardPool.deployed();
    console.log("-- Theory Reward Pool deployed to:", theoryRewardPool.address);

    // const UniswapV2Factory = await hre.ethers.getContractFactory("UniswapV2Factory");
    // const spookySwapFactory = await UniswapV2Factory.deploy(deployer.address);
    // await spookySwapFactory.deployed();
    // console.log("-- SpookySwap Factory deployed to:", oracle.address);
    //
    // const UniswapV2Router02 = await hre.ethers.getContractFactory("UniswapV2Router02");
    // const spookySwapRouter = await UniswapV2Router02.deploy(spookySwapFactory.address, dummyToken.address);
    // await oracle.deployed();
    // console.log("-- SpookySwap Router deployed to:", oracle.address);

    const spookSwapFactory = await ethers.getContractAt("UniswapV2Factory", "0xEE4bC42157cf65291Ba2FE839AE127e3Cc76f741");
    const spookSwapRouter = await ethers.getContractAt("UniswapV2Router02", "0xa6AD18C2aC47803E193F75c3677b14BF19B94883");

    //TODO: In prod, don't deploy, get invest token.

    // Add liquidity
    //const pairAddress = await spookSwapFactory.createPair(pToken.address, iToken.address);
    await pToken.approve(spookSwapRouter.address, BigNumber.from("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"));
    await iToken.approve(spookSwapRouter.address, BigNumber.from("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"));
    await spookSwapRouter.addLiquidity(pToken.address, iToken.address, BigNumber.from(10).pow(18), BigNumber.from(10).pow(18), BigNumber.from(10).pow(18), BigNumber.from(10).pow(18), deployer.address, startTime.add(60 * 10));

    //await spookSwapFactory.createPair(sToken.address, iToken.address);
    await sToken.approve(spookSwapRouter.address, BigNumber.from("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"));
    await spookSwapRouter.addLiquidity(sToken.address, iToken.address, BigNumber.from(10).pow(18), BigNumber.from(10).pow(18).mul(71).add(BigNumber.from(10).pow(16).mul(54)), BigNumber.from(10).pow(18), BigNumber.from(10).pow(18).mul(71).add(BigNumber.from(10).pow(16).mul(54)), deployer.address, startTime.add(60 * 10));

    let pTokenPairAddress = await spookSwapFactory.getPair(pToken.address, iToken.address);
    console.log("-- GAME-DAI LP deployed to:", pTokenPairAddress);
    let sTokenPairAddress = await spookSwapFactory.getPair(sToken.address, iToken.address);
    console.log("-- THEORY-DAI LP deployed to:", sTokenPairAddress);

    const Oracle = await hre.ethers.getContractFactory("Oracle");
    const oracle = await Oracle.deploy(
            pTokenPairAddress,
            await treasuryDAO.PERIOD(),
            startTime);
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

    // TBC Initialisation
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});