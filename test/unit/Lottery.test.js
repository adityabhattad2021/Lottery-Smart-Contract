// Ideally there should be one assert per "it" in "describe".

const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
	? describe.skip
	: describe("Lottery Unit Tests", function () {
			let lottery, vrfCoordinatorV2Mock, lotteryEntranceFee, deployer, interval;
			const chainId = network.config.chainId;

			beforeEach(async function () {
				deployer = (await getNamedAccounts()).deployer;
				await deployments.fixture(["all"]);
				lottery = await ethers.getContract("Lottery", deployer);
				vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
				lotteryEntranceFee = await lottery.getEntrenceFee();
				interval = await lottery.getInterval();
			});

			describe("Constructor", function () {
				it("Initializes the lottery correctly.", async () => {
					const lotteryState = await lottery.getLotteryState();
					assert.equal(lotteryState.toString(), "0");
					console.log(`Time interval ${interval}`);
					assert.equal(
						interval.toString(),
						networkConfig[chainId]["lotteryTimeInterval"]
					);
				});
			});
			describe("Enter the Lottery", function () {
				it("Reverts when not paid enough.", async () => {
					await expect(lottery.enterLottery()).to.be.revertedWith(
						"Lottery__NotEnoughETHEntered"
					);
				});
				it("Reverts when lottery is in closed state", async () => {
					await lottery.enterLottery({ value: lotteryEntranceFee });
					await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);

					// I did not understand its purpose yet code is working perfectly fine without this line.
					await network.provider.send("evm_mine", []);
					// For testing sake we pretend to be a chainlink keeper and call perform upkeep.
					await lottery.performUpkeep([]);
					await expect(
						lottery.enterLottery({ value: lotteryEntranceFee })
					).to.be.revertedWith("Lottery__CurrentlyClosed");
				});
				it("Records player when they enter correctly.", async () => {
					await lottery.enterLottery({ value: lotteryEntranceFee });
					const playerFromContract = await lottery.getPlayer(0);
					assert.equal(playerFromContract, deployer);
				});
				it("Emits an event when player enters the lottery.", async () => {
					const transectionResponse = await lottery.enterLottery({
						value: lotteryEntranceFee,
					});
					const transectionRecipt = await transectionResponse.wait(1);
					const playerAddressinEvent = transectionRecipt.events[0].args.player;
					assert.equal(playerAddressinEvent, deployer);
				});
			});
			describe("CheckUpKeep", function () {
				it("Returns false is people have't yet entered the lottery.", async () => {
					await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
					await network.provider.send("evm_mine", []);
					const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
					assert(!upkeepNeeded);
				});
				it("Returns true if lottery is open, appropriate time has passed, lottery has sufficient player and has some balance.", async () => {
					await lottery.enterLottery({ value: lotteryEntranceFee });
					await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
					await network.provider.send("evm_mine", []);
					const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);

					assert(upkeepNeeded);
				});
			});
			describe("performUpKeep", function () {
				it("It will be reverted when checkUpKeep is false.", async () => {
					await expect(lottery.performUpkeep([])).to.be.revertedWith(
						"Lottery__UpkeepNotNeeded"
					);
				});
				it("It will only run if checkupkeep is true.", async () => {
					await lottery.enterLottery({ value: lotteryEntranceFee });
					await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
					await network.provider.send("evm_mine", []);
					const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
					// assert(upkeepNeeded);
					const transection = await lottery.performUpkeep([]);

					assert(upkeepNeeded && transection);
				});
				it("Updates the lottery state, emits the event, and calls the vrfCoordinator when upkeepNeeded is true.", async () => {
					await lottery.enterLottery({ value: lotteryEntranceFee });
					await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
					await network.provider.send("evm_mine", []);
					const transectionResponse = await lottery.performUpkeep([]);
					const transectionRecipt = await transectionResponse.wait(1);
					const lotteryState = (await lottery.getLotteryState()).toString();
					const requestIdFromLottery = transectionRecipt.events[1].args.requestId;

					assert(requestIdFromLottery.toNumber() > 0);
					assert.equal(lotteryState, "1");
				});
			});
			describe("FullfillRandomWords", function () {
				beforeEach(async function () {
					await lottery.enterLottery({ value: lotteryEntranceFee });
					await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
					await network.provider.send("evm_mine", []);
				});
				it("Can only be called after perform upKeep.", async () => {
					await expect(
						vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)
					).to.be.revertedWith("nonexistent request");
					await expect(
						vrfCoordinatorV2Mock.fulfillRandomWords(1, lottery.address)
					).to.be.revertedWith("nonexistent request");
				});
				it("Picks a winner, resets the lottery and sends money to the winner", async () => {
					// Sequence of execution:
					// 1.
					const additionalPlayers = 3;
					// As deployer will be at 0th index.
					const startingAccountIndex = 1;
					const accounts = await ethers.getSigners();

					for (
						let i = startingAccountIndex;
						i < startingAccountIndex + additionalPlayers;
						i++
					) {
						const accountConnectedToLottery = lottery.connect(accounts[i]);
						await accountConnectedToLottery.enterLottery({ value: lotteryEntranceFee });
					}
					const startingTimeStamp = await lottery.getLatestTimeStamp();
					// 2.
					await new Promise(async (resolve, reject) => {
						lottery.once("WinnerPicked", async () => {
							// 4.
							console.log("Event Found.");
							try {
								const recentWinner = await lottery.getRecentWinner();
								const lotteryState = await lottery.getLotteryState();
								const endingTimeStamp = await lottery.getLatestTimeStamp();
								const numberOfPlayer = await lottery.getNumberOfPlayers();
								const winnerFinalBalance = await accounts[1].getBalance();

								// console.log(recentWinner);
								// console.log(accounts[0].address);
								// console.log(accounts[1].address);
								// console.log(accounts[2].address);
								// console.log(accounts[3].address);
								assert.equal(numberOfPlayer.toString(), "0");
								assert.equal(lotteryState.toString(), "0");
								assert(endingTimeStamp > startingTimeStamp);
								assert.equal(
									winnerFinalBalance.toString(),
									winnerInitialBalance.add(
										lotteryEntranceFee
											.mul(additionalPlayers)
											.add(lotteryEntranceFee)
											.toString()
									)
								);
							} catch (error) {
								reject(error);
							}
							resolve();
						});

						// 3.
						const transectionResponse = await lottery.performUpkeep([]);
						const transectionRecipt = await transectionResponse.wait(1);
						console.log(`----------------------------------------------`);
						console.log("Theses are the following events emitted.");
						console.log(transectionRecipt.events);
						console.log(`----------------------------------------------`);
						const winnerInitialBalance = await accounts[1].getBalance();

						await vrfCoordinatorV2Mock.fulfillRandomWords(
							transectionRecipt.events[1].args.requestId,
							lottery.address
						);
					});
				});
			});
	  });
