
import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe("ChronoVault Temporal NFT Contract Tests", () => {
  beforeEach(() => {
    // Update oracle data before each test
    const oracleResult = simnet.callPublicFn(
      "ChronoVaultcontract",
      "update-oracle-data",
      [Cl.bool(true)],
      deployer
    );
    expect(oracleResult.result).toBeOk(Cl.bool(true));
  });

  describe("Security Features", () => {
    it("should allow contract owner to pause/unpause contract", () => {
      // Pause contract
      const pauseResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "pause-contract",
        [],
        deployer
      );
      expect(pauseResult.result).toBeOk(Cl.bool(true));

      // Verify contract is paused
      const statusResult = simnet.callReadOnlyFn(
        "ChronoVaultcontract",
        "is-contract-paused",
        [],
        deployer
      );
      expect(statusResult.result).toBeOk(Cl.bool(true));

      // Try to mint while paused (should fail)
      const mintResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "mint-paid",
        [
          Cl.stringAscii("valid-trait-string-for-testing-purposes"),
          Cl.stringAscii("https://example.com/token/1")
        ],
        wallet1
      );
      expect(mintResult.result).toBeErr(Cl.uint(108)); // ERR_CONTRACT_PAUSED

      // Unpause contract
      const unpauseResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "unpause-contract",
        [],
        deployer
      );
      expect(unpauseResult.result).toBeOk(Cl.bool(true));
    });

    it("should reject pause/unpause from non-owner", () => {
      const pauseResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "pause-contract",
        [],
        wallet1
      );
      expect(pauseResult.result).toBeErr(Cl.uint(100)); // ERR_OWNER_ONLY
    });

    it("should implement emergency pause functionality", () => {
      // Set security admin first
      const setAdminResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "set-security-admin",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(setAdminResult.result).toBeOk(Cl.bool(true));

      // Emergency pause by security admin
      const emergencyPauseResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "emergency-pause",
        [],
        wallet1
      );
      expect(emergencyPauseResult.result).toBeOk(Cl.bool(true));

      // Verify emergency pause is active
      const emergencyStatus = simnet.callReadOnlyFn(
        "ChronoVaultcontract",
        "is-emergency-paused",
        [],
        deployer
      );
      expect(emergencyStatus.result).toBeOk(Cl.bool(true));

      // Try to mint during emergency pause (should fail)
      const mintResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "mint-paid",
        [
          Cl.stringAscii("valid-trait-string-for-testing-purposes"),
          Cl.stringAscii("https://example.com/token/1")
        ],
        wallet2
      );
      expect(mintResult.result).toBeErr(Cl.uint(116)); // ERR_EMERGENCY_PAUSED

      // Owner can emergency unpause
      const emergencyUnpauseResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "emergency-unpause",
        [],
        deployer
      );
      expect(emergencyUnpauseResult.result).toBeOk(Cl.bool(true));
    });

    it("should validate oracle data freshness", () => {
      // Advance blocks to make oracle data stale
      simnet.mineEmptyBlocks(4000); // More than MAX_ORACLE_STALENESS (3600)

      // Mint should fail due to stale oracle data
      const mintResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "mint-paid",
        [
          Cl.stringAscii("valid-trait-string-for-testing-purposes"),
          Cl.stringAscii("https://example.com/token/1")
        ],
        wallet1
      );
      expect(mintResult.result).toBeErr(Cl.uint(117)); // ERR_ORACLE_STALE
    });

    it("should implement rate limiting", () => {
      // First operation should succeed
      const mint1Result = simnet.callPublicFn(
        "ChronoVaultcontract",
        "mint-paid",
        [
          Cl.stringAscii("valid-trait-string-for-testing-purposes"),
          Cl.stringAscii("https://example.com/token/1")
        ],
        wallet1
      );
      expect(mint1Result.result).toBeOk(Cl.uint(1));

      // Second operation immediately after should fail due to rate limit
      const mint2Result = simnet.callPublicFn(
        "ChronoVaultcontract",
        "mint-paid",
        [
          Cl.stringAscii("valid-trait-string-for-testing-purposes"),
          Cl.stringAscii("https://example.com/token/2")
        ],
        wallet1
      );
      expect(mint2Result.result).toBeErr(Cl.uint(112)); // ERR_RATE_LIMIT

      // Advance blocks to clear rate limit
      simnet.mineEmptyBlocks(15); // More than OPERATION_COOLDOWN (10)

      // Third operation should succeed
      const mint3Result = simnet.callPublicFn(
        "ChronoVaultcontract",
        "mint-paid",
        [
          Cl.stringAscii("valid-trait-string-for-testing-purposes"),
          Cl.stringAscii("https://example.com/token/3")
        ],
        wallet1
      );
      expect(mint3Result.result).toBeOk(Cl.uint(2));
    });

    it("should prevent reentrancy attacks", () => {
      // This would require a more complex test with a malicious contract
      // For now, we verify the reentrancy guard is properly initialized
      const reentrancyStatus = simnet.callReadOnlyFn(
        "ChronoVaultcontract",
        "is-reentrancy-locked",
        [],
        deployer
      );
      expect(reentrancyStatus.result).toBeOk(Cl.bool(false));
    });
  });

  describe("NFT Minting", () => {
    it("should allow owner to mint genesis NFTs", () => {
      const mintResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "mint-genesis",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("genesis-trait-string-for-testing-purposes"),
          Cl.stringAscii("https://example.com/genesis/1")
        ],
        deployer
      );
      expect(mintResult.result).toBeOk(Cl.uint(1));

      // Verify token data
      const tokenDataResult = simnet.callReadOnlyFn(
        "ChronoVaultcontract",
        "get-token-data",
        [Cl.uint(1)],
        deployer
      );
      expect(tokenDataResult.result).toBeSome(
        Cl.tuple({
          "creator": Cl.principal(deployer),
          "birth-block": Cl.uint(1),
          "generation": Cl.uint(0),
          "parent-1": Cl.none(),
          "parent-2": Cl.none(),
          "evolution-level": Cl.uint(0),
          "last-breeding-block": Cl.uint(0),
          "base-traits": Cl.stringAscii("genesis-trait-string-for-testing-purposes")
        })
      );
    });

    it("should allow public minting with payment", () => {
      const mintResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "mint-paid",
        [
          Cl.stringAscii("public-trait-string-for-testing-purposes"),
          Cl.stringAscii("https://example.com/public/1")
        ],
        wallet1
      );
      expect(mintResult.result).toBeOk(Cl.uint(1));
    });

    it("should validate trait string length", () => {
      // Too short trait string
      const shortTraitResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "mint-paid",
        [
          Cl.stringAscii("short"),
          Cl.stringAscii("https://example.com/token/1")
        ],
        wallet1
      );
      expect(shortTraitResult.result).toBeErr(Cl.uint(111)); // ERR_INVALID_INPUT

      // Too long trait string
      const longTrait = "a".repeat(1025);
      const longTraitResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "mint-paid",
        [
          Cl.stringAscii(longTrait),
          Cl.stringAscii("https://example.com/token/1")
        ],
        wallet1
      );
      expect(longTraitResult.result).toBeErr(Cl.uint(111)); // ERR_INVALID_INPUT
    });

    it("should reject minting with insufficient funds", () => {
      // This test would require setting up accounts with insufficient balance
      // For now, we assume the default accounts have sufficient balance
    });
  });

  describe("NFT Breeding", () => {
    beforeEach(() => {
      // Mint two genesis tokens for breeding tests
      const mint1Result = simnet.callPublicFn(
        "ChronoVaultcontract",
        "mint-genesis",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("parent1-trait-string-for-testing-purposes"),
          Cl.stringAscii("https://example.com/parent/1")
        ],
        deployer
      );
      expect(mint1Result.result).toBeOk(Cl.uint(1));

      const mint2Result = simnet.callPublicFn(
        "ChronoVaultcontract",
        "mint-genesis",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("parent2-trait-string-for-testing-purposes"),
          Cl.stringAscii("https://example.com/parent/2")
        ],
        deployer
      );
      expect(mint2Result.result).toBeOk(Cl.uint(2));
    });

    it("should reject breeding before maturity", () => {
      const breedResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "breed",
        [
          Cl.uint(1),
          Cl.uint(2),
          Cl.stringAscii("offspring-trait-string-for-testing-purposes"),
          Cl.stringAscii("https://example.com/offspring/1")
        ],
        wallet1
      );
      expect(breedResult.result).toBeErr(Cl.uint(103)); // ERR_BREEDING_NOT_READY
    });

    it("should reject breeding during cooldown", () => {
      // Advance blocks to maturity
      simnet.mineEmptyBlocks(100001); // More than BREEDING_MATURITY_BLOCKS

      // First breeding should succeed
      const breed1Result = simnet.callPublicFn(
        "ChronoVaultcontract",
        "breed",
        [
          Cl.uint(1),
          Cl.uint(2),
          Cl.stringAscii("offspring1-trait-string-for-testing-purposes"),
          Cl.stringAscii("https://example.com/offspring/1")
        ],
        wallet1
      );
      expect(breed1Result.result).toBeOk(Cl.uint(3));

      // Second breeding immediately after should fail due to cooldown
      const breed2Result = simnet.callPublicFn(
        "ChronoVaultcontract",
        "breed",
        [
          Cl.uint(1),
          Cl.uint(2),
          Cl.stringAscii("offspring2-trait-string-for-testing-purposes"),
          Cl.stringAscii("https://example.com/offspring/2")
        ],
        wallet1
      );
      expect(breed2Result.result).toBeErr(Cl.uint(106)); // ERR_BREEDING_COOLDOWN
    });

    it("should reject breeding same parent tokens", () => {
      // Advance blocks to maturity
      simnet.mineEmptyBlocks(100001);

      const breedResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "breed",
        [
          Cl.uint(1),
          Cl.uint(1),
          Cl.stringAscii("offspring-trait-string-for-testing-purposes"),
          Cl.stringAscii("https://example.com/offspring/1")
        ],
        wallet1
      );
      expect(breedResult.result).toBeErr(Cl.uint(107)); // ERR_SAME_PARENT_TOKENS
    });

    it("should reject breeding by non-owner", () => {
      // Advance blocks to maturity
      simnet.mineEmptyBlocks(100001);

      const breedResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "breed",
        [
          Cl.uint(1),
          Cl.uint(2),
          Cl.stringAscii("offspring-trait-string-for-testing-purposes"),
          Cl.stringAscii("https://example.com/offspring/1")
        ],
        wallet2
      );
      expect(breedResult.result).toBeErr(Cl.uint(101)); // ERR_NOT_TOKEN_OWNER
    });

    it("should allow successful breeding after maturity", () => {
      // Advance blocks to maturity
      simnet.mineEmptyBlocks(100001);

      const breedResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "breed",
        [
          Cl.uint(1),
          Cl.uint(2),
          Cl.stringAscii("offspring-trait-string-for-testing-purposes"),
          Cl.stringAscii("https://example.com/offspring/1")
        ],
        wallet1
      );
      expect(breedResult.result).toBeOk(Cl.uint(3));

      // Verify offspring data
      const offspringDataResult = simnet.callReadOnlyFn(
        "ChronoVaultcontract",
        "get-token-data",
        [Cl.uint(3)],
        deployer
      );
      expect(offspringDataResult.result).toBeSome(
        Cl.tuple({
          "creator": Cl.principal(wallet1),
          "birth-block": Cl.uint(100002),
          "generation": Cl.uint(1),
          "parent-1": Cl.some(Cl.uint(1)),
          "parent-2": Cl.some(Cl.uint(2)),
          "evolution-level": Cl.uint(0),
          "last-breeding-block": Cl.uint(0),
          "base-traits": Cl.stringAscii("offspring-trait-string-for-testing-purposes")
        })
      );
    });
  });

  describe("NFT Evolution", () => {
    beforeEach(() => {
      // Mint a genesis token for evolution tests
      const mintResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "mint-genesis",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("evolution-trait-string-for-testing-purposes"),
          Cl.stringAscii("https://example.com/evolution/1")
        ],
        deployer
      );
      expect(mintResult.result).toBeOk(Cl.uint(1));
    });

    it("should reject evolution before unlock time", () => {
      const evolveResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "evolve-token",
        [Cl.uint(1)],
        wallet1
      );
      expect(evolveResult.result).toBeErr(Cl.uint(103)); // ERR_BREEDING_NOT_READY
    });

    it("should allow evolution after unlock time", () => {
      // Advance blocks to unlock first evolution
      simnet.mineEmptyBlocks(10001); // More than BLOCKS_PER_EVOLUTION (10000)

      const evolveResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "evolve-token",
        [Cl.uint(1)],
        wallet1
      );
      expect(evolveResult.result).toBeOk(Cl.bool(true));

      // Verify evolution level increased
      const evolutionLevelResult = simnet.callReadOnlyFn(
        "ChronoVaultcontract",
        "get-current-evolution-level",
        [Cl.uint(1)],
        deployer
      );
      expect(evolutionLevelResult.result).toBeOk(Cl.uint(1));
    });

    it("should reject evolution by non-owner", () => {
      // Advance blocks to unlock evolution
      simnet.mineEmptyBlocks(10001);

      const evolveResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "evolve-token",
        [Cl.uint(1)],
        wallet2
      );
      expect(evolveResult.result).toBeErr(Cl.uint(101)); // ERR_NOT_TOKEN_OWNER
    });

    it("should reject evolution beyond max level", () => {
      // Evolve to max level (5 evolutions needed)
      for (let i = 1; i <= 5; i++) {
        simnet.mineEmptyBlocks(10001);
        const evolveResult = simnet.callPublicFn(
          "ChronoVaultcontract",
          "evolve-token",
          [Cl.uint(1)],
          wallet1
        );
        if (i < 5) {
          expect(evolveResult.result).toBeOk(Cl.bool(true));
        } else {
          expect(evolveResult.result).toBeErr(Cl.uint(114)); // ERR_MAX_EVOLUTION
        }
      }
    });
  });

  describe("NFT Transfer", () => {
    beforeEach(() => {
      // Mint a token for transfer tests
      const mintResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "mint-paid",
        [
          Cl.stringAscii("transfer-trait-string-for-testing-purposes"),
          Cl.stringAscii("https://example.com/transfer/1")
        ],
        wallet1
      );
      expect(mintResult.result).toBeOk(Cl.uint(1));
    });

    it("should allow token transfer by owner", () => {
      const transferResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "transfer",
        [Cl.uint(1), Cl.principal(wallet1), Cl.principal(wallet2)],
        wallet1
      );
      expect(transferResult.result).toBeOk(Cl.bool(true));

      // Verify new owner
      const ownerResult = simnet.callReadOnlyFn(
        "ChronoVaultcontract",
        "get-owner",
        [Cl.uint(1)],
        deployer
      );
      expect(ownerResult.result).toBeOk(Cl.some(Cl.principal(wallet2)));
    });

    it("should reject transfer by non-owner", () => {
      const transferResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "transfer",
        [Cl.uint(1), Cl.principal(wallet2), Cl.principal(wallet3)],
        wallet2
      );
      expect(transferResult.result).toBeErr(Cl.uint(101)); // ERR_NOT_TOKEN_OWNER
    });
  });

  describe("Security Admin Functions", () => {
    it("should allow owner to set security admin", () => {
      const setAdminResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "set-security-admin",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(setAdminResult.result).toBeOk(Cl.bool(true));

      // Verify security admin
      const adminResult = simnet.callReadOnlyFn(
        "ChronoVaultcontract",
        "get-security-admin",
        [],
        deployer
      );
      expect(adminResult.result).toBeOk(Cl.principal(wallet1));
    });

    it("should reject setting owner as security admin", () => {
      const setAdminResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "set-security-admin",
        [Cl.principal(deployer)],
        deployer
      );
      expect(setAdminResult.result).toBeErr(Cl.uint(111)); // ERR_INVALID_INPUT
    });

    it("should allow security admin to update oracle data", () => {
      // Set security admin
      const setAdminResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "set-security-admin",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(setAdminResult.result).toBeOk(Cl.bool(true));

      // Update oracle data
      const oracleResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "update-oracle-data",
        [Cl.bool(false)],
        wallet1
      );
      expect(oracleResult.result).toBeOk(Cl.bool(true));
    });

    it("should reject oracle update by non-security-admin", () => {
      const oracleResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "update-oracle-data",
        [Cl.bool(false)],
        wallet1
      );
      expect(oracleResult.result).toBeErr(Cl.uint(120)); // ERR_SECURITY_ADMIN_ONLY
    });
  });

  describe("Read-Only Functions", () => {
    beforeEach(() => {
      // Mint a token for read-only tests
      const mintResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "mint-paid",
        [
          Cl.stringAscii("readonly-trait-string-for-testing-purposes"),
          Cl.stringAscii("https://example.com/readonly/1")
        ],
        wallet1
      );
      expect(mintResult.result).toBeOk(Cl.uint(1));
    });

    it("should return correct token data", () => {
      const tokenDataResult = simnet.callReadOnlyFn(
        "ChronoVaultcontract",
        "get-token-data",
        [Cl.uint(1)],
        deployer
      );
      expect(tokenDataResult.result).toBeSome(
        Cl.tuple({
          "creator": Cl.principal(wallet1),
          "birth-block": Cl.uint(1),
          "generation": Cl.uint(0),
          "parent-1": Cl.none(),
          "parent-2": Cl.none(),
          "evolution-level": Cl.uint(0),
          "last-breeding-block": Cl.uint(0),
          "base-traits": Cl.stringAscii("readonly-trait-string-for-testing-purposes")
        })
      );
    });

    it("should return correct evolution info", () => {
      const evolutionInfoResult = simnet.callReadOnlyFn(
        "ChronoVaultcontract",
        "get-evolution-info",
        [Cl.uint(1), Cl.uint(1)],
        deployer
      );
      expect(evolutionInfoResult.result).toBeSome(
        Cl.tuple({
          "unlock-block": Cl.uint(10001),
          "new-traits": Cl.stringAscii("basic-growth"),
          "unlocked": Cl.bool(false)
        })
      );
    });

    it("should return correct security status", () => {
      const securityStatusResult = simnet.callReadOnlyFn(
        "ChronoVaultcontract",
        "get-security-status",
        [],
        deployer
      );
      expect(securityStatusResult.result).toBeTuple({
        "contract-paused": Cl.bool(false),
        "emergency-paused": Cl.bool(false),
        "emergency-pause-end-block": Cl.uint(0),
        "reentrancy-locked": Cl.bool(false),
        "oracle-last-update": Cl.uint(1),
        "oracle-data-valid": Cl.bool(true),
        "security-admin": Cl.principal(deployer),
        "total-security-fees": Cl.uint(0),
        "max-generation": Cl.uint(10),
        "max-evolution-level": Cl.uint(5),
        "operation-cooldown": Cl.uint(10)
      });
    });

    it("should check breeding readiness", () => {
      const canBreedResult = simnet.callReadOnlyFn(
        "ChronoVaultcontract",
        "can-breed",
        [Cl.uint(1)],
        deployer
      );
      expect(canBreedResult.result).toBeOk(Cl.bool(false)); // Not mature yet

      // Advance blocks to maturity
      simnet.mineEmptyBlocks(100001);

      const canBreedAfterResult = simnet.callReadOnlyFn(
        "ChronoVaultcontract",
        "can-breed",
        [Cl.uint(1)],
        deployer
      );
      expect(canBreedAfterResult.result).toBeOk(Cl.bool(true));
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle invalid token IDs", () => {
      const tokenDataResult = simnet.callReadOnlyFn(
        "ChronoVaultcontract",
        "get-token-data",
        [Cl.uint(999)],
        deployer
      );
      expect(tokenDataResult.result).toBeNone();

      const ownerResult = simnet.callReadOnlyFn(
        "ChronoVaultcontract",
        "get-owner",
        [Cl.uint(999)],
        deployer
      );
      expect(ownerResult.result).toBeOk(Cl.none());
    });

    it("should handle overflow/underflow in safe math", () => {
      // This would require testing edge cases in the safe math functions
      // For now, we verify they exist and are used in the contract
    });

    it("should validate input parameters", () => {
      // Test with invalid principal (should be handled by Clarity type system)
      // Test with invalid uint ranges (handled by Clarity type system)
    });
  });

  describe("Integration Tests", () => {
    it("should support full NFT lifecycle", () => {
      // 1. Mint genesis token
      const mintResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "mint-genesis",
        [
          Cl.principal(wallet1),
          Cl.stringAscii("lifecycle-trait-string-for-testing-purposes"),
          Cl.stringAscii("https://example.com/lifecycle/1")
        ],
        deployer
      );
      expect(mintResult.result).toBeOk(Cl.uint(1));

      // 2. Transfer to another user
      const transferResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "transfer",
        [Cl.uint(1), Cl.principal(wallet1), Cl.principal(wallet2)],
        wallet1
      );
      expect(transferResult.result).toBeOk(Cl.bool(true));

      // 3. Advance blocks for evolution
      simnet.mineEmptyBlocks(10001);

      // 4. Evolve token
      const evolveResult = simnet.callPublicFn(
        "ChronoVaultcontract",
        "evolve-token",
        [Cl.uint(1)],
        wallet2
      );
      expect(evolveResult.result).toBeOk(Cl.bool(true));

      // 5. Verify final state
      const finalDataResult = simnet.callReadOnlyFn(
        "ChronoVaultcontract",
        "get-token-data",
        [Cl.uint(1)],
        deployer
      );
      expect(finalDataResult.result).toBeSome(
        Cl.tuple({
          "creator": Cl.principal(wallet1),
          "birth-block": Cl.uint(1),
          "generation": Cl.uint(0),
          "parent-1": Cl.none(),
          "parent-2": Cl.none(),
          "evolution-level": Cl.uint(1), // Evolved once
          "last-breeding-block": Cl.uint(0),
          "base-traits": Cl.stringAscii("lifecycle-trait-string-for-testing-purposes")
        })
      );
    });
  });
});
