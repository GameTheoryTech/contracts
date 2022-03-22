/* eslint-disable */
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {BigNumber} = require("@ethersproject/bignumber");
const { Fetcher } = require('@spookyswap/sdk/dist');
const { Route, Token } = require('@spookyswap/sdk/dist');
const axios = require("axios");

async function getTokenPriceInDAI(tokenContractAddress) {
    const dai = new Token(250, "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E", 18);
    const token = new Token(250, tokenContractAddress, 18);
    if(dai.address === tokenContractAddress) return (1).toFixed(2); //DAI is 1 to 1 with DAI.
    try {
        const daiToToken = await Fetcher.fetchPairData(token, dai, ethers.provider);
        const priceInBUSD = new Route([daiToToken], token);

        return priceInBUSD.midPrice.toFixed(2);
    } catch (err) {
        console.error(`Failed to fetch token price of ${tokenContractAddress}: ${err}`);
        return "???";
    }
}

const discordApiKey = process.env.DISCORD_API_KEY
const { Client, Intents } = require('discord.js');

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

async function getDAIPriceInUSD() {
try {
    const { data } = await axios('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=dai');
    return (data[0].current_price).toString();
} catch (err) {
    console.error(`Failed to fetch token price of DAI: ${err}`);
    return "???"
}
}

async function getPrice(address)
{
    const priceInFTM = await getTokenPriceInDAI(address);
    if(priceInFTM === "???") return priceInFTM;
    const priceOfOneFTM = await getDAIPriceInUSD();
    if(priceOfOneFTM === "???") return "???";
    const priceOfSharesInDollars = (Number(priceInFTM) * Number(priceOfOneFTM)).toFixed(2);
    return priceOfSharesInDollars.toString();
}

async function run(delay) {
    const [deployer, daofund, devfund] = await hre.ethers.getSigners();

    //const treasuryDAO = (await hre.ethers.getContractAt("Treasury", "0x23Dc7737839E3C269F40fCF714f63781188caca1")).connect(daofund);
    try
    {
        //Lazy
        for(let i = 0; i < client.guilds.cache.size; ++i)
        {
            let guild = client.guilds.cache.at(i);
            const self = await guild.members.fetch(client.user.id);
            await self.setNickname(`THEORY: $${await getPrice("0x60787C689ddc6edfc84FCC9E7d6BD21990793f06")}`);
            await client.user.setActivity(`GAME: $${await getPrice("0x56EbFC2F3873853d799C155AF9bE9Cb8506b7817")} | PEG: ${await getTokenPriceInDAI("0x56EbFC2F3873853d799C155AF9bE9Cb8506b7817")}`, { type: 'WATCHING' });
        }
    }
    catch(e)
    {
        console.error("Exception thrown", e.stack);
    }
    setTimeout(() => run(delay), delay);
}

// When the client is ready, run this code (only once)
client.once('ready', () => {
    console.log('Ready!');
    run(60000).catch(r => run(60000)).then(r => {});
});

// Login to Discord with your client's token
client.login(discordApiKey);