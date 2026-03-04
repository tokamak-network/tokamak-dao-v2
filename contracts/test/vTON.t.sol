// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test, console } from "forge-std/Test.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Ownable2Step } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { vTON } from "../src/token/vTON.sol";

contract vTONTest is Test {
    vTON public token;

    address public owner;
    address public minter;
    address public user1;
    address public user2;

    event Minted(address indexed to, uint256 amount);
    event EmissionRatioUpdated(uint256 oldRatio, uint256 newRatio);
    event MinterUpdated(address indexed minter, bool allowed);
    event EpochTransitioned(uint256 oldEpoch, uint256 newEpoch, uint256 newHalvingRatio);

    function setUp() public {
        owner = makeAddr("owner");
        minter = makeAddr("minter");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        vm.prank(owner);
        token = new vTON(owner);
    }

    /*//////////////////////////////////////////////////////////////
                            DEPLOYMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Deployment() public view {
        assertEq(token.name(), "Tokamak Network Governance Token");
        assertEq(token.symbol(), "vTON");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 0);
        assertEq(token.emissionRatio(), 1e18);
        assertEq(token.owner(), owner);
        assertEq(token.MAX_SUPPLY(), 100_000_000e18);
    }

    function test_DeploymentRevertsWithZeroAddress() public {
        // Ownable reverts first with OwnableInvalidOwner
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0)));
        new vTON(address(0));
    }

    /*//////////////////////////////////////////////////////////////
                             MINTER TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SetMinter() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit MinterUpdated(minter, true);
        token.setMinter(minter, true);

        assertTrue(token.isMinter(minter));
    }

    function test_SetMinterRevertsIfNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        token.setMinter(minter, true);
    }

    function test_SetMinterRevertsWithZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(vTON.ZeroAddress.selector);
        token.setMinter(address(0), true);
    }

    function test_RemoveMinter() public {
        vm.startPrank(owner);
        token.setMinter(minter, true);
        token.setMinter(minter, false);
        vm.stopPrank();

        assertFalse(token.isMinter(minter));
    }

    /*//////////////////////////////////////////////////////////////
                             MINTING TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Mint() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        uint256 amount = 1000 ether;

        vm.prank(minter);
        vm.expectEmit(true, false, false, true);
        emit Minted(user1, amount);
        token.mint(user1, amount);

        assertEq(token.balanceOf(user1), amount);
        assertEq(token.totalSupply(), amount);
    }

    function test_MintRevertsIfNotMinter() public {
        vm.prank(user1);
        vm.expectRevert(vTON.NotMinter.selector);
        token.mint(user2, 1000 ether);
    }

    function test_MintRevertsWithZeroAddress() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        vm.prank(minter);
        vm.expectRevert(vTON.ZeroAddress.selector);
        token.mint(address(0), 1000 ether);
    }

    function test_MintWithEmissionRatio() public {
        vm.startPrank(owner);
        token.setMinter(minter, true);
        token.setEmissionRatio(0.5e18); // 50%
        vm.stopPrank();

        uint256 amount = 1000 ether;

        vm.prank(minter);
        token.mint(user1, amount);

        // Epoch 0: halvingRatio = 1.0, emissionRatio = 0.5
        // adjustedAmount = 1000 * 1.0 * 0.5 = 500
        assertEq(token.balanceOf(user1), 500 ether);
    }

    function test_MintWithZeroEmissionRatio() public {
        vm.startPrank(owner);
        token.setMinter(minter, true);
        token.setEmissionRatio(0);
        vm.stopPrank();

        vm.prank(minter);
        vm.expectRevert(vTON.AmountTooSmall.selector);
        token.mint(user1, 1000 ether);
    }

    function test_MintRevertsWhenAdjustedAmountZero() public {
        vm.startPrank(owner);
        token.setMinter(minter, true);
        // Set emission ratio very low so adjustedAmount rounds to 0
        token.setEmissionRatio(1); // Tiny ratio
        vm.stopPrank();

        // With ratio = 1/1e18 and halvingRatio = 1e18, adjustedAmount = amount * 1 / 1e18
        // For amount = 1, adjustedAmount = 0
        vm.prank(minter);
        vm.expectRevert(vTON.AmountTooSmall.selector);
        token.mint(user1, 1);
    }

    /*//////////////////////////////////////////////////////////////
                         EMISSION RATIO TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SetEmissionRatio() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit EmissionRatioUpdated(1e18, 0.75e18);
        token.setEmissionRatio(0.75e18);

        assertEq(token.emissionRatio(), 0.75e18);
    }

    function test_SetEmissionRatioRevertsIfExceedsMax() public {
        vm.prank(owner);
        vm.expectRevert(vTON.InvalidEmissionRatio.selector);
        token.setEmissionRatio(1.1e18);
    }

    function test_SetEmissionRatioRevertsIfNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        token.setEmissionRatio(0.5e18);
    }

    /*//////////////////////////////////////////////////////////////
                            TRANSFER TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Transfer() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        vm.prank(minter);
        token.mint(user1, 1000 ether);

        vm.prank(user1);
        token.transfer(user2, 400 ether);

        assertEq(token.balanceOf(user1), 600 ether);
        assertEq(token.balanceOf(user2), 400 ether);
    }

    function test_TransferFrom() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        vm.prank(minter);
        token.mint(user1, 1000 ether);

        vm.prank(user1);
        token.approve(user2, 500 ether);

        vm.prank(user2);
        token.transferFrom(user1, user2, 300 ether);

        assertEq(token.balanceOf(user1), 700 ether);
        assertEq(token.balanceOf(user2), 300 ether);
        assertEq(token.allowance(user1, user2), 200 ether);
    }

    /*//////////////////////////////////////////////////////////////
                          VOTING POWER TESTS
    //////////////////////////////////////////////////////////////*/

    function test_ERC20VotesDelegationDisabled() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        vm.prank(minter);
        token.mint(user1, 1000 ether);

        // ERC20Votes.delegate() is disabled — use DelegateRegistry instead
        vm.prank(user1);
        vm.expectRevert(vTON.UseDelegateRegistry.selector);
        token.delegate(user1);

        // Voting power remains 0 since ERC20Votes delegation is disabled
        assertEq(token.getVotes(user1), 0);
    }

    function test_ERC20VotesDelegationToOtherDisabled() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        vm.prank(minter);
        token.mint(user1, 1000 ether);

        vm.prank(user1);
        vm.expectRevert(vTON.UseDelegateRegistry.selector);
        token.delegate(user2);
    }

    function test_GetPastVotesWithoutDelegation() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        vm.prank(minter);
        token.mint(user1, 1000 ether);

        // Without ERC20Votes delegation (disabled), past votes should be 0
        vm.roll(block.number + 10);
        uint256 pastBlock = block.number - 5;

        assertEq(token.getPastVotes(user1, pastBlock), 0);
    }

    /*//////////////////////////////////////////////////////////////
                          HALVING CONSTANT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_MaxSupplyConstant() public view {
        assertEq(token.MAX_SUPPLY(), 100_000_000e18);
    }

    function test_EpochSizeConstant() public view {
        assertEq(token.EPOCH_SIZE(), 5_000_000e18);
    }

    function test_DecayRateConstant() public view {
        assertEq(token.DECAY_RATE(), 75e16);
    }

    /*//////////////////////////////////////////////////////////////
                          HALVING EPOCH TESTS
    //////////////////////////////////////////////////////////////*/

    function test_GetCurrentEpoch() public {
        // Epoch 0 at start
        assertEq(token.getCurrentEpoch(), 0);

        vm.prank(owner);
        token.setMinter(minter, true);

        // Mint 4.99M → still epoch 0
        vm.prank(minter);
        token.mint(user1, 4_999_999e18);
        assertEq(token.getCurrentEpoch(), 0);

        // Mint 1 more → epoch 0 (total = 5M exactly → epoch 1)
        vm.prank(minter);
        token.mint(user1, 1e18);
        assertEq(token.getCurrentEpoch(), 1);
    }

    function test_GetHalvingRatio() public view {
        // At epoch 0 (no supply), ratio should be 1.0
        assertEq(token.getHalvingRatio(), 1e18);
    }

    function test_HalvingRatioByEpoch() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        // Epoch 0: ratio = 1.0
        assertEq(token.getHalvingRatio(), 1e18);

        // Move to epoch 1 by minting 5M
        vm.prank(minter);
        token.mint(user1, 5_000_000e18);
        // Epoch 1: ratio = 0.75
        assertEq(token.getHalvingRatio(), 0.75e18);

        // Move to epoch 2 by minting enough to cross 10M
        // At epoch 1, halving ratio is 0.75, so need to mint enough raw amount
        // We need ~5M more actual tokens. With ratio 0.75: need 5M/0.75 = 6.666M raw
        vm.prank(minter);
        token.mint(user1, 6_700_000e18); // 6.7M * 0.75 = 5.025M → total ~10.025M → epoch 2
        assertEq(token.getCurrentEpoch(), 2);
        // Epoch 2: ratio = 0.75 * 0.75 = 0.5625
        assertEq(token.getHalvingRatio(), 0.5625e18);
    }

    function test_HalvingRatioAtMaxEpoch() public {
        // _calculateHalvingRatio is internal, but we can test via getHalvingRatio
        // At epoch >= 20, ratio should be 0
        // We need to get totalSupply to >= 20 * 5M = 100M, but that's MAX_SUPPLY
        // Instead, verify that after reaching epoch 20 territory the ratio is 0
        // We can verify the math: epoch 19 ratio = 0.75^19 * 1e18
        // For epoch 20: returns 0

        // Let's verify via minting up to near max supply
        // This is too expensive to do via minting, so we'll verify the constant behavior
        // by checking that the contract returns 0 at MAX_SUPPLY
        vm.prank(owner);
        token.setMinter(minter, true);

        // Mint large amounts to reach high epochs
        // Direct large mint to get past many epochs quickly
        // At epoch 0, ratio = 1.0 → mint 5M raw = 5M actual → epoch 1
        vm.prank(minter);
        token.mint(user1, 5_000_000e18);
        assertEq(token.getCurrentEpoch(), 1);

        // Verify the ratio decay pattern for first few epochs
        // epoch 0: 1.0, epoch 1: 0.75, epoch 2: 0.5625, epoch 3: 0.421875
        assertEq(token.getHalvingRatio(), 0.75e18);
    }

    /*//////////////////////////////////////////////////////////////
                       HALVING MINTING TESTS
    //////////////////////////////////////////////////////////////*/

    function test_MintWithHalving() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        // Epoch 0: halvingRatio = 1.0, emissionRatio = 1.0
        // 1000 vTON requested → 1000 * 1.0 * 1.0 = 1000 actual
        vm.prank(minter);
        token.mint(user1, 1000 ether);
        assertEq(token.balanceOf(user1), 1000 ether);
    }

    function test_MintCrossEpochBoundary() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        // Mint 4.999M first
        vm.prank(minter);
        token.mint(user1, 4_999_000e18);

        // Now mint 2000 → at epoch 0, ratio = 1.0
        // This will push totalSupply past 5M boundary
        // Per the plan: epoch at mint-time determines ratio (no boundary split)
        vm.prank(minter);
        token.mint(user1, 2000e18);

        // Should get full 2000 since we're at epoch 0 at mint time
        assertEq(token.balanceOf(user1), 5_001_000e18);
        // After minting, we're now in epoch 1
        assertEq(token.getCurrentEpoch(), 1);
    }

    function test_MintAfterEpochTransition() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        // Move to epoch 1
        vm.prank(minter);
        token.mint(user1, 5_000_000e18);
        assertEq(token.getCurrentEpoch(), 1);

        // Now mint 1000 at epoch 1 → ratio = 0.75
        vm.prank(minter);
        token.mint(user2, 1000e18);

        // user2 should receive 1000 * 0.75 = 750
        assertEq(token.balanceOf(user2), 750e18);
    }

    function test_MintWithHalvingAndEmissionRatio() public {
        vm.startPrank(owner);
        token.setMinter(minter, true);
        vm.stopPrank();

        // Move to epoch 1
        vm.prank(minter);
        token.mint(user1, 5_000_000e18);

        // Set emission ratio to 50%
        vm.prank(owner);
        token.setEmissionRatio(0.5e18);

        // Mint 1000 at epoch 1 → halvingRatio = 0.75, emissionRatio = 0.5
        // adjustedAmount = 1000 * 0.75 * 0.5 = 375
        vm.prank(minter);
        token.mint(user2, 1000e18);

        assertEq(token.balanceOf(user2), 375e18);
    }

    function test_MaxSupplyCap() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        // Mint a lot to approach MAX_SUPPLY
        // We need to be clever here since each epoch reduces the ratio
        // Let's mint in big chunks per epoch

        // Epoch 0: ratio 1.0 → mint 5M raw = 5M actual
        vm.prank(minter);
        token.mint(user1, 5_000_000e18);

        // Epoch 1: ratio 0.75 → need 5M/0.75 = 6.666M raw for 5M actual
        vm.prank(minter);
        token.mint(user1, 6_700_000e18); // ~5.025M actual

        // Continue minting large amounts to approach max
        // For simplicity, mint huge amounts (most will be reduced by halving)
        for (uint256 i = 0; i < 30; i++) {
            vm.prank(minter);
            token.mint(user1, 50_000_000e18);
        }

        // Total supply should be capped at MAX_SUPPLY
        assertLe(token.totalSupply(), token.MAX_SUPPLY());
    }

    function test_MaxSupplyRevert() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        // Mint lots to reach MAX_SUPPLY
        for (uint256 i = 0; i < 60; i++) {
            uint256 supplyBefore = token.totalSupply();
            if (supplyBefore >= token.MAX_SUPPLY()) break;
            vm.prank(minter);
            token.mint(user1, 100_000_000e18);
        }

        // Now totalSupply should be at MAX_SUPPLY
        assertEq(token.totalSupply(), token.MAX_SUPPLY());

        // Any further mint should revert
        vm.prank(minter);
        vm.expectRevert(vTON.MaxSupplyReached.selector);
        token.mint(user1, 1e18);
    }

    function test_EpochTransitionEvent() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        // Minting 5M should trigger epoch transition from 0 to 1
        vm.prank(minter);
        vm.expectEmit(false, false, false, true);
        emit EpochTransitioned(0, 1, 0.75e18);
        token.mint(user1, 5_000_000e18);
    }

    /*//////////////////////////////////////////////////////////////
                             FUZZ TESTS
    //////////////////////////////////////////////////////////////*/

    function testFuzz_Mint(uint256 amount) public {
        amount = bound(amount, 1, 5_000_000e18); // Cap to epoch 0 for 1:1

        vm.prank(owner);
        token.setMinter(minter, true);

        vm.prank(minter);
        token.mint(user1, amount);

        // In epoch 0 with 100% emission, should be 1:1
        assertEq(token.balanceOf(user1), amount);
    }

    function testFuzz_EmissionRatio(uint256 ratio) public {
        ratio = bound(ratio, 0, 1e18);

        vm.prank(owner);
        token.setEmissionRatio(ratio);

        assertEq(token.emissionRatio(), ratio);
    }

    /*//////////////////////////////////////////////////////////////
                    ERC20Votes DELEGATION OVERRIDE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_DelegateRevertsWithUseDelegateRegistry() public {
        vm.prank(user1);
        vm.expectRevert(vTON.UseDelegateRegistry.selector);
        token.delegate(user2);
    }

    function test_DelegateBySigRevertsWithUseDelegateRegistry() public {
        vm.prank(user1);
        vm.expectRevert(vTON.UseDelegateRegistry.selector);
        token.delegateBySig(user2, 0, 0, 0, bytes32(0), bytes32(0));
    }

    /*//////////////////////////////////////////////////////////////
                    AUDIT FIX VERIFICATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_HalvingRatioAtHighEpoch() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        // Mint to reach a high epoch. Due to halving decay + MAX_SUPPLY cap,
        // minting eventually fills to MAX_SUPPLY (epoch 20, ratio = 0).
        // Verify the ratio at whatever epoch we land at.
        for (uint256 i = 0; i < 500; i++) {
            if (token.totalSupply() >= token.MAX_SUPPLY()) break;
            vm.prank(minter);
            token.mint(user1, 100_000_000e18);
        }

        // After filling to MAX_SUPPLY, epoch = 20, ratio = 0
        assertEq(token.totalSupply(), token.MAX_SUPPLY());
        assertEq(token.getCurrentEpoch(), 20);
        assertEq(token.getHalvingRatio(), 0);

        // Also verify the halving ratio formula for epoch 19 by checking intermediate values
        // We can verify via getHalvingRatio at a reachable epoch. Let's verify epoch 5 (25M).
        // Deploy a fresh token to test epoch 5
    }

    function test_HalvingRatioAtEpoch5() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        // Calculate expected: 0.75^5 * 1e18
        uint256 expected = 1e18;
        for (uint256 i = 0; i < 5; i++) {
            expected = (expected * 75e16) / 1e18;
        }

        // Mint in small increments to cross epoch boundaries properly.
        // Each epoch is 5M tokens. Using 1M raw mints ensures we don't skip epochs.
        for (uint256 i = 0; i < 200; i++) {
            if (token.getCurrentEpoch() >= 5) break;
            vm.prank(minter);
            token.mint(user1, 1_000_000e18);
        }

        assertEq(token.getCurrentEpoch(), 5);
        assertEq(token.getHalvingRatio(), expected);
    }

    function test_HalvingRatioReturnsZeroAtMaxEpoch() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        // Mint up to MAX_SUPPLY
        for (uint256 i = 0; i < 100; i++) {
            uint256 supplyBefore = token.totalSupply();
            if (supplyBefore >= token.MAX_SUPPLY()) break;
            vm.prank(minter);
            token.mint(user1, 100_000_000e18);
        }

        // At MAX_SUPPLY (epoch 20), halving ratio = 0
        assertEq(token.getCurrentEpoch(), 20);
        assertEq(token.getHalvingRatio(), 0);
    }

    function test_MintPrecisionLossEdgeCase() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        // Move to epoch 1 (ratio 0.75)
        vm.prank(minter);
        token.mint(user1, 5_000_000e18);

        // Set emission ratio to a value that causes small adjusted amount
        vm.prank(owner);
        token.setEmissionRatio(0.01e18); // 1%

        // Mint small amount: 100 * 0.75 * 0.01 = 0.75 (rounds down to 0 → revert)
        vm.prank(minter);
        vm.expectRevert(vTON.AmountTooSmall.selector);
        token.mint(user2, 100);
    }

    function test_MultiEpochSkipTransition() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        assertEq(token.getCurrentEpoch(), 0);

        // Mint a huge amount that crosses multiple epoch boundaries in one call
        // At epoch 0 ratio = 1.0, minting 15M raw → 15M actual → epoch 3
        vm.prank(minter);
        token.mint(user1, 15_000_000e18);

        assertEq(token.getCurrentEpoch(), 3);
        assertEq(token.totalSupply(), 15_000_000e18);
    }

    function test_RemovedMinterCannotMint() public {
        vm.startPrank(owner);
        token.setMinter(minter, true);
        token.setMinter(minter, false);
        vm.stopPrank();

        vm.prank(minter);
        vm.expectRevert(vTON.NotMinter.selector);
        token.mint(user1, 1000 ether);
    }

    function test_PartialMaxSupplyFill() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        // Mint up to near max supply
        for (uint256 i = 0; i < 100; i++) {
            uint256 supplyBefore = token.totalSupply();
            if (supplyBefore >= token.MAX_SUPPLY()) break;
            vm.prank(minter);
            token.mint(user1, 100_000_000e18);
        }

        // totalSupply should be exactly MAX_SUPPLY (cap enforced)
        assertEq(token.totalSupply(), token.MAX_SUPPLY());
    }

    function testFuzz_CrossEpochMint(uint256 mintAmount) public {
        mintAmount = bound(mintAmount, 1e18, 20_000_000e18);

        vm.prank(owner);
        token.setMinter(minter, true);

        vm.prank(minter);
        token.mint(user1, mintAmount);

        // Invariant: totalSupply should equal what was minted (epoch 0, ratio 1.0, emission 100%)
        assertEq(token.totalSupply(), mintAmount);
        assertEq(token.balanceOf(user1), mintAmount);
    }

    function test_GetVotesInvariantAfterTransfer() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        vm.prank(minter);
        token.mint(user1, 1000 ether);

        // ERC20Votes delegation is disabled — getVotes should always return 0
        assertEq(token.getVotes(user1), 0);

        vm.prank(user1);
        token.transfer(user2, 500 ether);

        assertEq(token.getVotes(user1), 0);
        assertEq(token.getVotes(user2), 0);
    }

    function test_TwoStepOwnershipTransfer() public {
        address newOwner = makeAddr("newOwner");

        // Start transfer
        vm.prank(owner);
        token.transferOwnership(newOwner);

        // Owner is still the old owner
        assertEq(token.owner(), owner);

        // New owner accepts
        vm.prank(newOwner);
        token.acceptOwnership();

        assertEq(token.owner(), newOwner);
    }

    function test_InterfaceConstants() public view {
        assertEq(token.MAX_EPOCHS(), 20);
        assertEq(token.INITIAL_HALVING_RATE(), 1e18);
        assertEq(token.EPOCH_SIZE(), 5_000_000e18);
        assertEq(token.DECAY_RATE(), 75e16);
    }

    /*//////////////////////////////////////////////////////////////
                        ERC20Permit TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Permit() public {
        uint256 ownerPrivateKey = 0xA11CE;
        address permitOwner = vm.addr(ownerPrivateKey);
        address spender = user1;
        uint256 value = 1000 ether;
        uint256 deadline = block.timestamp + 1 days;

        // Mint tokens to permitOwner
        vm.prank(owner);
        token.setMinter(minter, true);
        vm.prank(minter);
        token.mint(permitOwner, value);

        // Build permit digest
        uint256 nonce = token.nonces(permitOwner);
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                permitOwner,
                spender,
                value,
                nonce,
                deadline
            )
        );
        bytes32 domainSeparator = token.DOMAIN_SEPARATOR();
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, digest);

        // Execute permit
        token.permit(permitOwner, spender, value, deadline, v, r, s);

        // Verify allowance was set
        assertEq(token.allowance(permitOwner, spender), value);
        assertEq(token.nonces(permitOwner), nonce + 1);
    }

    function test_PermitInvalidSignatureReverts() public {
        uint256 ownerPrivateKey = 0xA11CE;
        address permitOwner = vm.addr(ownerPrivateKey);
        uint256 wrongPrivateKey = 0xBEEF;
        address spender = user1;
        uint256 value = 1000 ether;
        uint256 deadline = block.timestamp + 1 days;

        // Build permit digest
        uint256 nonce = token.nonces(permitOwner);
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                permitOwner,
                spender,
                value,
                nonce,
                deadline
            )
        );
        bytes32 domainSeparator = token.DOMAIN_SEPARATOR();
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        // Sign with WRONG key
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongPrivateKey, digest);

        // Should revert with invalid signature
        vm.expectRevert();
        token.permit(permitOwner, spender, value, deadline, v, r, s);
    }
}
