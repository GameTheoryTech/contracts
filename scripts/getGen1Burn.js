/* eslint-disable */
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {BigNumber} = require("@ethersproject/bignumber");
const {smock} = require("@defi-wonderland/smock");

async function main() {
    const [deployer, daofund, devfund] = await hre.ethers.getSigners();

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

    let theoryUnlockerGen1 = await hre.ethers.getContractAt("TheoryUnlockerGen1", "0x0329AF552A7541616e4f238d9697adC5b5FE2d06");

    // Get the filter event
    let filter = theoryUnlockerGen1.filters.Mint()
    // {
    //   address: "0x314159265dD8dbb310642f98f50C066173C1259b",
    //   topics: [ "0xd4735d920b0f87494915f556dd9b54c8f309026070caea5c737245152564d266" ]
    // }

    // Oryou could pass in a parameter to the above call to filter by node, sine it is indexed,
    // let filter = ens.filters.Transfer(ethers.utils.namehash("ricmoo.firefly.eth"));

    // Now you can specify fromBlock and toBlock (you may pass in promises; no need to await)
        filter.fromBlock = 35264865;//provider.getBlockNumber().then((b) => b - 10000);
        filter.toBlock = "latest";

    // And query:
        let totalBurned = zero;
        ethers.provider.getLogs(filter).then((logs) => {
            for(let log of logs)
            {
                let data = theoryUnlockerGen1.interface.parseLog(log);
                totalBurned = totalBurned.add(data.args[2].mul(oneHundred).mul(5).mul(1000).div(10000));
                console.log(data.args[2]);
            }
            console.log(totalBurned);
            console.log((+totalBurned)/10**18)
        });

        const game = await hre.ethers.getContractAt("Game", "0x56EbFC2F3873853d799C155AF9bE9Cb8506b7817");
        filter = game.filters.Transfer();
        filter.topics = [
            ethers.utils.id("Transfer(address,address,uint256)"),
            ethers.utils.hexZeroPad(theoryUnlockerGen1.address, 32),
            ethers.utils.hexZeroPad("0x0000000000000000000000000000000000000000", 32)
        ]
        // {
        //   address: "0x314159265dD8dbb310642f98f50C066173C1259b",
        //   topics: [ "0xd4735d920b0f87494915f556dd9b54c8f309026070caea5c737245152564d266" ]
        // }

        // Oryou could pass in a parameter to the above call to filter by node, sine it is indexed,
        // let filter = ens.filters.Transfer(ethers.utils.namehash("ricmoo.firefly.eth"));

        // Now you can specify fromBlock and toBlock (you may pass in promises; no need to await)
        filter.fromBlock = 35264865;//provider.getBlockNumber().then((b) => b - 10000);
        filter.toBlock = "latest";

        totalBurned = zero;
        ethers.provider.getLogs(filter).then((logs) => {
        for(let log of logs)
        {
            let data = game.interface.parseLog(log);
            totalBurned = totalBurned.add(data.args[2]);
            console.log(data.args[2]);
        }
        console.log(totalBurned);
        console.log((+totalBurned)/10**18)
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});