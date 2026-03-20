// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MedRelief.sol";

contract MedReliefTest is Test {
    MedRelief public medRelief;
    address public admin = address(1);
    address public validator1 = address(2);
    address public validator2 = address(3);
    address public requester = address(4);
    address public donor = address(5);

    function setUp() public {
        vm.startPrank(admin);
        medRelief = new MedRelief();
        medRelief.addValidator(validator1);
        medRelief.addValidator(validator2);
        vm.stopPrank();

        vm.deal(donor, 10 ether);
        vm.deal(requester, 1 ether);
    }

    function test_Deposit() public {
        vm.prank(donor);
        medRelief.deposit{value: 5 ether}();
        assertEq(address(medRelief).balance, 5 ether);
    }

    function test_CreateRequest() public {
        vm.prank(donor);
        medRelief.deposit{value: 5 ether}();

        vm.prank(requester);
        medRelief.createRequest(1 ether, "Emergency surgery");

        (address reqAddress, uint256 amount, string memory reason, uint256 approvals, bool executed) = medRelief.requests(0);
        assertEq(reqAddress, requester);
        assertEq(amount, 1 ether);
        assertEq(reason, "Emergency surgery");
        assertEq(approvals, 0);
        assertEq(executed, false);
    }

    function test_ApproveAndExecuteRequest() public {
        vm.prank(donor);
        medRelief.deposit{value: 5 ether}();

        vm.prank(requester);
        medRelief.createRequest(1 ether, "Emergency surgery");

        vm.prank(validator1);
        medRelief.approveRequest(0);

        vm.prank(validator2);
        medRelief.approveRequest(0);

        uint256 requesterBalanceBefore = requester.balance;
        
        vm.prank(requester);
        medRelief.executeRequest(0);

        assertEq(requester.balance, requesterBalanceBefore + 1 ether);
        (, , , , bool executed) = medRelief.requests(0);
        assertTrue(executed);
    }

    function test_Fail_ExecuteWithoutEnoughApprovals() public {
        vm.prank(donor);
        medRelief.deposit{value: 5 ether}();

        vm.prank(requester);
        medRelief.createRequest(1 ether, "Emergency surgery");

        vm.prank(validator1);
        medRelief.approveRequest(0);

        vm.expectRevert("Approval threshold not reached");
        medRelief.executeRequest(0);
    }
}
