const {  ethers, network } = require("hardhat");


// A reminder to do it like this "yarn hardhat run scripts/mockOffChain.js --network localhost" on localhost.
async function main() {
    
    // const { deployer } = await getNamedAccounts();
    const lottery = await ethers.getContract("Lottery");
    const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""))
    const { upkeepNeeded } = await lottery.callStatic.checkUpkeep(checkData)
    console.log(upkeepNeeded);
    if (upkeepNeeded) {
        const transectionResponse =await lottery.performUpkeep(checkData)
        // console.log(transectionResponse);
        const transectionRecipt = await transectionResponse.wait(1)
        const requestId = transectionRecipt.events[1].args.requestId
        console.log(("-----------------------------------"));
        console.log(transectionRecipt.events[1].args);
        console.log(("-----------------------------------"));
        console.log(`Performed Upkeep with RequestId: ${requestId}`);
        if (network.config.chainId = 1337) {
            await mockVRF(requestId,lottery)
        }
    } else {
        console.log("UpKeep Not Needed!");
    }
}


async function mockVRF(requestId, lottery) {
    console.log("LocalHost detected, mocking off chain.");
    const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
    await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, lottery.address)
    console.log("Responded Successfully");
    const recentWinner = await lottery.getRecentWinner()
    console.log(`The winner is ${recentWinner}`);
}


main().then(() => {
    process.exit(0)
}).catch((error) => {
    console.log(error);
    process.exit(1)
})