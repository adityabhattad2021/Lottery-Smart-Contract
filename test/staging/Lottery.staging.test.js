const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
	? describe.skip
	: describe("Lottery Staging Tests", function () {
			let lottery, lotteryEntranceFee, deployer;

			beforeEach(async () => {
				deployer = (await getNamedAccounts()).deployer;
				lottery = await ethers.getContract("Lottery", deployer);
				lotteryEntranceFee = await lottery.getEntrenceFee();
			});

			describe("FullfillRandomWords", function () {
				it("Works live with Chainlink Keepers nad Chainlink VRF, and Pick a random winner", async () => {
					const startingTimeStamp = await lottery.getLatestTimeStamp();
					const accounts = await ethers.getSigners();
					await new Promise(async (resolve, reject) => {
						lottery.once("WinnerPicked", async () => {
							console.log("WinnerPicked Event Detected!");
							try {
								const recentWinner = await lottery.getRecentWinner();
								const lotteryState = (await lottery.getLotteryState()).toString();
								const winnerFinalBalance = await accounts[0].getBalance();
								const endingTimeStamp = await lottery.getLatestTimeStamp();

								await expect(lottery.getPlayer(0)).to.be.reverted;
								assert.equal(recentWinner.toString(), accounts[0].address);
                                assert.equal(lotteryState, "0");
                                
                                // TODO: Substract gas fees included over here.
								assert.equal(
									winnerFinalBalance.toString(),
									winnerStartingBalance.add(lotteryEntranceFee).toString()
								);
								resolve();
							} catch (error) {
								console.log(error);
								reject(error);
							}
						});
						await lottery.enterLottery({ value: lotteryEntranceFee });
						const winnerStartingBalance = await accounts[0].getBalance();
					});
				});
			});
	  });
