;; title: ChronoVault - Temporal NFT Vault
;; version: 1.0.0
;; summary: Time-evolving NFTs that unlock features based on Bitcoin block heights
;; description: A smart contract that manages NFTs with temporal evolution, breeding mechanics, 
;;              and trait unlocking based on Bitcoin block height progression

;; traits
(define-trait nft-trait
  (
    (get-last-token-id () (response uint uint))
    (get-token-uri (uint) (response (optional (string-ascii 256)) uint))
    (get-owner (uint) (response (optional principal) uint))
    (transfer (uint principal principal) (response bool uint))
  )
)

;; token definitions
(define-non-fungible-token chronovault-nft uint)

;; constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_OWNER_ONLY (err u100))
(define-constant ERR_NOT_TOKEN_OWNER (err u101))
(define-constant ERR_TOKEN_NOT_FOUND (err u102))
(define-constant ERR_BREEDING_NOT_READY (err u103))
(define-constant ERR_INSUFFICIENT_PAYMENT (err u104))
(define-constant ERR_INVALID_TOKEN (err u105))
(define-constant ERR_BREEDING_COOLDOWN (err u106))
(define-constant ERR_SAME_PARENT_TOKENS (err u107))

(define-constant BLOCKS_PER_EVOLUTION u10000)
(define-constant BREEDING_MATURITY_BLOCKS u100000)
(define-constant BREEDING_COOLDOWN_BLOCKS u50000)
(define-constant MINT_PRICE u1000000) ;; 1 STX in microSTX
(define-constant BREEDING_PRICE u500000) ;; 0.5 STX in microSTX

;; data vars
(define-data-var last-token-id uint u0)
(define-data-var contract-uri (string-ascii 256) "https://chronovault.app/metadata/contract")

;; data maps
(define-map token-data 
  { token-id: uint }
  { 
    creator: principal,
    birth-block: uint,
    generation: uint,
    parent-1: (optional uint),
    parent-2: (optional uint),
    evolution-level: uint,
    last-breeding-block: uint,
    base-traits: (string-ascii 1024)
  }
)

(define-map token-uris
  { token-id: uint }
  { uri: (string-ascii 256) }
)

(define-map evolution-schedules
  { token-id: uint, evolution-level: uint }
  { 
    unlock-block: uint,
    new-traits: (string-ascii 512),
    unlocked: bool
  }
)

(define-map holder-stats
  { holder: principal }
  {
    first-hold-block: uint,
    total-breeding-count: uint,
    loyalty-multiplier: uint
  }
)
