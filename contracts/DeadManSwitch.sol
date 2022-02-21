// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;
import "hardhat/console.sol";

contract DeadManSwitch {

   event FundReceived(address sender, uint amount);

    address public owner;
    address payable public nominee;
    uint public last_alive_block;

    constructor(address payable _nominee) {
        owner = msg.sender;
        nominee = _nominee;
        last_alive_block = block.number;
    }

    modifier onlyOwner() {
      require(msg.sender == owner, "Only owner can call this function");
      _;
    }

    modifier onlyIfDead() {
      require(block.number - last_alive_block > 10, "DeadManSwitch: stillAlive was not called in last 10 blocks");
      _;
    }

    receive() external payable onlyOwner {
      emit FundReceived(msg.sender, msg.value);
    }

    function getOwnerAdd() public view returns (address) {
        return owner;
    }

    function stillAlive() public onlyOwner {
        last_alive_block = block.number;
    }

    function deadManSwitch() public onlyIfDead {
      selfdestruct(nominee);
    }
}