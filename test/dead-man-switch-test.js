const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DeadManSwitch", function () {
  let owner;
  let nominee;
  let deadmanswitch;

  beforeEach(async function () {
    [owner, nominee] = await ethers.getSigners();
    const DeadManSwitch = await ethers.getContractFactory("DeadManSwitch");
    deadmanswitch = await DeadManSwitch.deploy(nominee.address);
    await deadmanswitch.deployed();
  });

  describe("deployment", function () {
    it("should set owner as address used for contract deployement", async function () {
      expect(await deadmanswitch.owner()).to.equal(owner.address);
    }); 

    it("should set nominee as passed nominee address", async function () {
      expect(await deadmanswitch.nominee()).to.equal(nominee.address);
    })

    it("should set last_alive_block to block in which contract is deployed", async function () {
      const block_number = await ethers.provider.getBlockNumber();
      expect(await deadmanswitch.last_alive_block()).to.equal(block_number);
    })
  });
  
  describe("getOwnerAdd", function () {
    it("should return current owner of smart contract", async function () {
      const ownerAdd = await deadmanswitch.getOwnerAdd() 
      expect(ownerAdd).to.equal(owner.address);
    });
  });

  describe("stillAlive", function () {
    it("should update last_alive_block number to the current block number", async function () {
      await deadmanswitch.stillAlive();
      const currentBlockNumber = await ethers.provider.getBlockNumber();
      expect(await deadmanswitch.last_alive_block()).to.equal(currentBlockNumber);
    });
  });

  describe("deadManSwitch", function () {
    describe("when stillAlive was not called in last 10 blocks", function (){
      it("should transfer funds to nominee", async function () {
        const balanceBefore = await ethers.provider.getBalance(nominee.address);
        
        await owner.sendTransaction({
          to: deadmanswitch.address,
          value: ethers.utils.parseEther("1.0"),
        });

        async function mineNBlocks(n) {
          for (let index = 0; index < n; index++) {
            await ethers.provider.send('evm_mine');
          }
        }
        await mineNBlocks(9);
        
        await deadmanswitch.deadManSwitch();
        
        const balanceAfter = await ethers.provider.getBalance(nominee.address);
        expect(balanceAfter.sub(balanceBefore)).to.equal(ethers.utils.parseEther("1.0"));
      })
    })

    describe("when stillAlive was called in last 10 blocks", function (){
      it("should not transfer funds to nominee", async function () {
        const balanceBefore = await ethers.provider.getBalance(nominee.address);
        
        async function mineNBlocks(n) {
          for (let index = 0; index < n; index++) {
            await ethers.provider.send('evm_mine');
          }
        }
        await mineNBlocks(9);
        
        await deadmanswitch.stillAlive();

        await expect(deadmanswitch.deadManSwitch()).to.be.revertedWith("DeadManSwitch: stillAlive was not called in last 10 blocks");

        const balanceAfter = await ethers.provider.getBalance(nominee.address);
        expect(balanceAfter.sub(balanceBefore)).to.equal(0);
      })
    })
  })
});
