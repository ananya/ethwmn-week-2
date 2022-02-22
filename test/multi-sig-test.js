const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSig", function () {
  let signer1;
  let signer2;
  let signer3;
  let signer4;
  let signer5;
  let multisig;

  beforeEach(async function () {
    [signer1, signer2, signer3, signer4, signer5] = await ethers.getSigners();

    const MultiSig = await ethers.getContractFactory("MultiSig");
    const initialSigners = [signer1.address, signer2.address, signer3.address];

    const signerAddresses = initialSigners;
    multisig = await MultiSig.deploy(signerAddresses, 2);
    await multisig.deployed();
  });

  describe("deployment", function () {
    it("should set signers threshold", async function () {
      expect(await multisig.threshold()).to.equal(2);
    });

    it("should set signers", async function () {
      const signers = await multisig.getSigners();
      expect(signers).to.deep.equal([signer1.address, signer2.address, signer3.address]);
    });

    it("should raise error if threshold is more than signers", async function () {
      const MultiSig = await ethers.getContractFactory("MultiSig");
      await expect( MultiSig.deploy(
        [signer1.address, signer2.address, signer3.address], 4
        )).to.be.revertedWith("Threshold must be less than or equal to the number of signers");
    })
  });

  describe("getSigner", function () {
    it ("should return all the current signers", async function () {
      const signers = await multisig.getSigners();
      expect(signers).to.deep.equal([signer1.address, signer2.address, signer3.address]);
    })
  })

  describe("getThreshold", function () {
    it("should return current threshold", async function () {
      expect(await multisig.threshold()).to.equal(2);
    })
  });

  describe("addSignerAndThreshold", function () {
    it("should add new signer and update threshold", async function () {
      await multisig.addSignerAndThreshold(signer4.address, 4);
      const newSigners = await multisig.getSigners();
      const newThreshold = await multisig.threshold();

      expect(newSigners).to.deep.equal([signer1.address, signer2.address, signer3.address, signer4.address]);
      expect(newThreshold).to.equal(4);
    });
    
    it("should raise error if function not called by already existing signers", async function () {
      const currentSigners = await multisig.getSigners();
      const currentThreshold = await multisig.threshold();

      await expect(multisig.connect(signer5).addSignerAndThreshold(signer4.address, 3)).to.be.revertedWith("Only signers can call this function");
      expect(await multisig.getSigners()).to.deep.equal(currentSigners);
      expect(await multisig.threshold()).to.equal(currentThreshold);
    })

    it("should raise error if threshold is more than signers", async function () {
      await expect(multisig.addSignerAndThreshold(signer4.address, 5)).to.be.revertedWith("Threshold must be less than or equal to the number of signers");
      expect(await multisig.threshold()).to.equal(2);
    })
  });

  describe("removeSignerAndThreshold", function () {
    it("should remove signer and update threshold", async function () {
      await multisig.removeSignerAndThreshold(signer2.address, 2);
      const newSigners = await multisig.getSigners();
      const newThreshold = await multisig.threshold();

      expect(newSigners).to.deep.equal([signer1.address, signer3.address]);
      expect(newThreshold).to.equal(2);
    })

    it("should raise error if function not called by already existing signers", async function () {
      const currentSigners = await multisig.getSigners();
      const currentThreshold = await multisig.threshold();

      await expect(multisig.connect(signer5).removeSignerAndThreshold(signer2.address, 1)).to.be.revertedWith("Only signers can call this function");
      expect(await multisig.getSigners()).to.deep.equal(currentSigners);
      expect(await multisig.threshold()).to.equal(currentThreshold);
    })

    it("should raise error if threshold is more than signers", async function () {
      await expect(multisig.removeSignerAndThreshold(signer2.address, 3)).to.be.revertedWith("Threshold must be less than or equal to the number of signers");
      expect(await multisig.threshold()).to.equal(2);
    })
  });

  describe("submitTransaction", function () {
    it("should raise error if function not called by already existing signers", async function () {
      await expect(multisig.connect(signer5).submitTransaction(signer4.address, 1, [])).to.be.revertedWith("Only signers can call this function");
    })

    it("should add transaction to Transaction array", async function () {
      await multisig.submitTransaction(signer4.address, 1);
      const transaction = await multisig.getTransaction(0);
      expect(transaction.to).to.equal(signer4.address);
      expect(transaction.value).to.equal(1);
      expect(transaction.executed).to.equal(false);
      expect(transaction.confirmations).to.equal(0);
    })
  });

  describe("confirmTransaction", function () {
    it("should raise error if function not called by already existing signers", async function () {
      await expect(multisig.connect(signer5).confirmTransaction(0)).to.be.revertedWith("Only signers can call this function");
    })

    it("should add confirmations to transaction", async function () {
      await multisig.submitTransaction(signer4.address, 1);
      await multisig.confirmTransaction(0);
      const transaction = await multisig.getTransaction(0);
      expect(transaction.confirmations).to.deep.equal(1);
    })

    it("should add mapping transaction -> signer -> status", async function (){
      await multisig.submitTransaction(signer4.address, 1);
      await multisig.confirmTransaction(0);
      const status = await multisig.isConfirmed(0, signer1.address);
      expect(status).to.equal(true);
    })

    it("should raise error if transaction not found", async function () {
      await expect(multisig.confirmTransaction(1)).to.be.revertedWith("Transaction does not exist");
    })

    it("should raise error if transaction already confirmed", async function () {
      await multisig.submitTransaction(signer4.address, 1);
      await multisig.confirmTransaction(0);
      await expect(multisig.confirmTransaction(0)).to.be.revertedWith("Transaction has already been confirmed by you");
    })

    // it.only("should raise error if transaction already executed", async function () {
    //   await multisig.submitTransaction(signer4.address, 1);
    //   await multisig.confirmTransaction(0);
    //   await multisig.connect(signer2).confirmTransaction(0);
    //   await multisig.executeTransaction(0);
    //   const transaction = await multisig.getTransaction(0);
    //   expect(transaction.executed).to.equal(true);
    //   await expect(multisig.connect(signer3).confirmTransaction(0)).to.be.revertedWith("Transaction has already been executed");
    // })
  })

  describe("executeTransaction", function () {
    it("should raise error if function not called by already existing signers", async function () {
      await expect(multisig.connect(signer5).executeTransaction(0)).to.be.revertedWith("Only signers can call this function");
    })

    // it.only("should execute transaction if threshold met", async function () {
    //   await multisig.submitTransaction(signer4.address, 1);
    //   await multisig.confirmTransaction(0);
    //   await multisig.connect(signer2).confirmTransaction(0);
    //   await multisig.executeTransaction(0);
    //   const transaction = await multisig.getTransaction(0);
    //   expect(transaction.executed).to.equal(true);
    // })

    it("should raise error if threshold not met", async function () {
      await multisig.submitTransaction(signer4.address, 1);
      await expect(multisig.executeTransaction(0)).to.be.revertedWith("Threshold not met");
    })

    it("should raise error if transaction not found", async function () {
      await expect(multisig.executeTransaction(1)).to.be.revertedWith("Transaction does not exist");
    })

    // it("should raise error if transaction already executed", async function () {
    //   await multisig.submitTransaction(signer4.address, 1);
    //   await multisig.confirmTransaction(0);
    //   await multisig.connect(signer2).confirmTransaction(0);
    //   await multisig.executeTransaction(0);
    //   await expect(multisig.executeTransaction(0)).to.be.revertedWith("Transaction has already been executed");
    // })
  })
})