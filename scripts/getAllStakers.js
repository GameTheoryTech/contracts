/* eslint-disable */
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {BigNumber} = require("@ethersproject/bignumber");
const {smock} = require("@defi-wonderland/smock");
const {address} = require("hardhat/internal/core/config/config-validation");

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

    let theoretics = await hre.ethers.getContractAt("Theoretics", "0x670433FB874d4B7b94CF1D16E95fa241474E6787");

    // Get the filter event
    let filter = theoretics.filters.Staked()
    // {
    //   address: "0x314159265dD8dbb310642f98f50C066173C1259b",
    //   topics: [ "0xd4735d920b0f87494915f556dd9b54c8f309026070caea5c737245152564d266" ]
    // }

    // Oryou could pass in a parameter to the above call to filter by node, sine it is indexed,
    // let filter = ens.filters.Transfer(ethers.utils.namehash("ricmoo.firefly.eth"));

    // Now you can specify fromBlock and toBlock (you may pass in promises; no need to await)
    filter.fromBlock = 33908246;//provider.getBlockNumber().then((b) => b - 10000);
    filter.toBlock = "latest";

    // And query:
        let total = [];
        let greatestAddress = "0x0000000000000000000000000000000000000000"
        let greatestAmount = zero;
        let set = new Set()
        let logs = await ethers.provider.getLogs(filter);

        {
                for(let log of logs)
                {
                    let data = theoretics.interface.parseLog(log);
                    if(set.has(data.args[0]))
                    {
                        continue;
                    }
                    set.add(data.args[0]);
                    let amount = await theoretics.balanceOf(data.args[0]);
                    if(amount.eq(0)) continue;
                    total.push({address: data.args[0], amount: +ethers.utils.formatEther(amount)});
                    console.log(amount);
                    if(amount.gt(oneHundred.mul(10)))
                    {
                        console.log(`${data.args[0]} has > 1k (${ethers.utils.formatEther(amount)}) THEORY staked.`);
                    }
                    if(amount.gt(greatestAmount))
                    {
                        greatestAddress = data.args[0];
                        greatestAmount = amount;
                    }
                }
                console.log(`Greatest address for Theoretics is ${greatestAddress} in ${ethers.utils.formatEther(greatestAmount)}`);
                let fs = require('fs');
                fs.writeFile("stakers.json", JSON.stringify(total, undefined, 2), () =>{});
            };
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});