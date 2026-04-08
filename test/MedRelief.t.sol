// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MedRelief.sol";

contract MedReliefTest is Test {
    MedRelief public medRelief;

    address public validator1 = address(2);
    address public validator2 = address(3);
    address public requester = address(4);
    address public donor = address(5);

    function setUp() public {
        medRelief = new MedRelief();

        vm.deal(validator1, 1 ether);
        vm.deal(validator2, 1 ether);

        vm.prank(validator1);
        medRelief.stakeToValidate{value: 0.1 ether}();

        vm.prank(validator2);
        medRelief.stakeToValidate{value: 0.1 ether}();

        vm.deal(donor, 10 ether);
        vm.deal(requester, 1 ether);
    }

    function test_Deposit() public {
        vm.prank(donor);
        medRelief.deposit{value: 5 ether}();

        assertEq(address(medRelief).balance, 5.2 ether);
    }

    function test_CreateRequest() public {
        vm.prank(donor);
        medRelief.deposit{value: 5 ether}();

        vm.prank(requester);
        medRelief.createRequest(1 ether, "Emergency surgery");

        (
            address reqAddress,
            uint256 amount,
            string memory reason,
            uint256 approvals,
            uint256 deadline,
            bool executed
        ) = medRelief.requests(0);

        assertEq(reqAddress, requester);
        assertEq(amount, 1 ether);
        assertEq(reason, "Emergency surgery");
        assertEq(approvals, 0);
        assertTrue(deadline > block.timestamp);
        assertEq(executed, false);
    }

    function test_CooldownPreventsRequest() public {
        // ✅ FIX: deposit first so pool has enough balance
        vm.prank(donor);
        medRelief.deposit{value: 5 ether}();

        vm.prank(requester);
        medRelief.createRequest(1 ether, "First request");

        // second request immediately should fail cooldown
        vm.prank(requester);
        vm.expectRevert("Cooldown active");
        medRelief.createRequest(1 ether, "Second request too soon");
    }

    function test_ApproveAndExecuteRequest() public {
        vm.prank(donor);
        medRelief.deposit{value: 5 ether}();

        // ✅ FIX: create request first, warp cooldown AFTER
        vm.prank(requester);
        medRelief.createRequest(1 ether, "Emergency surgery");

        vm.prank(validator1);
        medRelief.approveRequest(0);

        vm.prank(validator2);
        medRelief.approveRequest(0);

        uint256 requesterBalanceBefore = requester.balance;
        medRelief.executeRequest(0);

        assertEq(requester.balance, requesterBalanceBefore + 1 ether);

        (, , , , , bool executed) = medRelief.requests(0);
        assertTrue(executed);

        assertEq(medRelief.validatorScore(validator1), 1);
        assertEq(medRelief.validatorScore(validator2), 1);
    }

    function test_Fail_ExecuteWithoutEnoughApprovals() public {
        vm.prank(donor);
        medRelief.deposit{value: 5 ether}();

        // ✅ FIX: don't warp before approving
        vm.prank(requester);
        medRelief.createRequest(1 ether, "Emergency surgery");

        vm.prank(validator1);
        medRelief.approveRequest(0);

        vm.expectRevert("Approval threshold not reached");
        medRelief.executeRequest(0);
    }

    function test_ValidatorCannotCreateRequest() public {
        vm.prank(validator1);
        vm.expectRevert("Validators cannot request");
        medRelief.createRequest(1 ether, "Fraud attempt");
    }

    function test_CannotApproveTwice() public {
        vm.prank(donor);
        medRelief.deposit{value: 5 ether}();

        // ✅ FIX: don't warp before approving
        vm.prank(requester);
        medRelief.createRequest(1 ether, "Emergency");

        vm.prank(validator1);
        medRelief.approveRequest(0);

        vm.prank(validator1);
        vm.expectRevert("Already approved by this validator");
        medRelief.approveRequest(0);
    }

    function test_StakeLock() public {
        vm.prank(donor);
        medRelief.deposit{value: 5 ether}();

        // ✅ FIX: create request first, approve, THEN warp
        vm.prank(requester);
        medRelief.createRequest(1 ether, "Emergency");

        vm.prank(validator1);
        medRelief.approveRequest(0);

        // Try to unstake immediately — should be locked
        vm.prank(validator1);
        vm.expectRevert("Stake locked");
        medRelief.unstake();

        // Warp past lock period, now unstake should work
        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(validator1);
        medRelief.unstake();
    }

    function test_UserProfile() public {
        vm.prank(requester);
        medRelief.setProfile("Alice", "QmIPFSHash", "@alice");

        (string memory name, string memory ipfs, string memory social) = medRelief.profiles(requester);
        assertEq(name, "Alice");
        assertEq(ipfs, "QmIPFSHash");
        assertEq(social, "@alice");
    }
}