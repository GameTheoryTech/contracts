require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("dotenv").config()
require("hardhat-abi-exporter");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-interface-generator");

module.exports = {
    networks: {
        hardhat: {},
        ropsten: {
            url: "https://ropsten.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
            accounts: process.env.DEPLOYER_PRIVATE_KEY !== undefined ? [process.env.DEPLOYER_PRIVATE_KEY, process.env.DAO_PRIVATE_KEY, process.env.DEV_PRIVATE_KEY] : [],
        },
        fantom: {
            url: "https://rpc.ftm.tools",
            gasMultiplier: 2,
            gasPrice: 200000000000,
            accounts: process.env.DEPLOYER_PRIVATE_KEY !== undefined ? [process.env.DEPLOYER_PRIVATE_KEY, process.env.DAO_PRIVATE_KEY, process.env.DEV_PRIVATE_KEY] : [],
        },
        fantomtest: {
            url: "https://xapi.testnet.fantom.network/lachesis",
            gasMultiplier: 2,
            accounts: process.env.DEPLOYER_PRIVATE_KEY !== undefined ? [process.env.DEPLOYER_PRIVATE_KEY, process.env.DAO_PRIVATE_KEY, process.env.DEV_PRIVATE_KEY] : [],
        },
    },
    etherscan: {
        apiKey: process.env.SCAN_API_KEY
    },
    solidity: {
        compilers: [{
            version: "0.6.12",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                },
                outputSelection: {
                    "*": {
                        "*": ["storageLayout"]
                    }
                }
            }
        }, {
            version: "0.8.4",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                }
            }
        }, {
            version: "0.8.7",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                }
            }
        }],
    },
    abiExporter: [
        {
            path: './abi/pretty',
            pretty: true,
        },
        {
            path: './abi/ugly',
            pretty: false,
        },
    ]
}