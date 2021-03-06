const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SplitPayment", function () {
  let splitPayment;
  let uni;
  let alice;
  let bob;
  let carol;

  beforeEach(async function () {
    const signers = await ethers.getSigners()
    alice = signers[1]
    bob = signers[2]
    carol = signers[3]

    const SplitPayment = await ethers.getContractFactory("SplitPayment")
    splitPayment = await SplitPayment.deploy([alice.address, bob.address], [30 * 1e6, 70 * 1e6])
    await splitPayment.deployed()
    const MockERC20 = await ethers.getContractFactory("MockERC20")
    uni = await MockERC20.deploy("UNI", "UNI", ethers.utils.parseEther("1000000"))
    await uni.deployed()
    await uni.transfer(carol.address, ethers.utils.parseEther("100000"))
  })

  it("only owner should update accounts ", async function () {
    await expect(splitPayment.connect(alice).updateAccounts([alice.address, bob.address, carol.address], [30 * 1e6, 50 * 1e6, 20 * 1e6]))
      .to.be.reverted
    await splitPayment.updateAccounts([alice.address, bob.address, carol.address], [30 * 1e6, 50 * 1e6, 20 * 1e6])
    expect((await splitPayment.accounts(carol.address))).to.equal(20 * 1e6);
    expect((await splitPayment.accountLen())).to.equal(3);
  })

  it("should withdraw correct amount of eth to accounts", async function () {
    await splitPayment.deposit({value: ethers.utils.parseEther("1.0")})
    await expect(await splitPayment.connect(alice).withdraw(0)).to.changeEtherBalance(alice, ethers.utils.parseEther("0.3"))
    await expect(await splitPayment.connect(bob).withdraw(0)).to.changeEtherBalance(bob, ethers.utils.parseEther("0.7"))
  })

  it("should withdraw correct amount of token to accounts", async function () {
    await uni.connect(carol).approve(splitPayment.address, ethers.utils.parseEther("1"))
    await splitPayment.connect(carol).depositToken(uni.address, ethers.utils.parseEther("1"))
    await splitPayment.connect(alice).withdrawToken(0, uni.address)
    expect(await uni.balanceOf(alice.address)).to.equal(ethers.utils.parseEther("0.3"))
    await splitPayment.connect(bob).withdrawToken(0, uni.address)
    expect(await uni.balanceOf(bob.address)).to.equal(ethers.utils.parseEther("0.7"))
  })
});
