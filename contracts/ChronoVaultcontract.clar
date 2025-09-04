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


;; public functions

;; Mint a new genesis NFT
(define-public (mint-genesis (recipient principal) (base-traits (string-ascii 1024)) (uri (string-ascii 256)))
  (let
    (
      (token-id (+ (var-get last-token-id) u1))
      (current-block burn-block-height)
    )
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (try! (nft-mint? chronovault-nft token-id recipient))
    (map-set token-data 
      { token-id: token-id }
      {
        creator: tx-sender,
        birth-block: current-block,
        generation: u0,
        parent-1: none,
        parent-2: none,
        evolution-level: u0,
        last-breeding-block: u0,
        base-traits: base-traits
      }
    )
    (map-set token-uris { token-id: token-id } { uri: uri })
    (setup-evolution-schedule token-id current-block)
    (update-holder-stats recipient current-block)
    (var-set last-token-id token-id)
    (ok token-id)
  )
)

;; Public mint function with payment
(define-public (mint-paid (base-traits (string-ascii 1024)) (uri (string-ascii 256)))
  (let
    (
      (token-id (+ (var-get last-token-id) u1))
      (current-block burn-block-height)
    )
    (try! (stx-transfer? MINT_PRICE tx-sender CONTRACT_OWNER))
    (try! (nft-mint? chronovault-nft token-id tx-sender))
    (map-set token-data 
      { token-id: token-id }
      {
        creator: tx-sender,
        birth-block: current-block,
        generation: u0,
        parent-1: none,
        parent-2: none,
        evolution-level: u0,
        last-breeding-block: u0,
        base-traits: base-traits
      }
    )
    (map-set token-uris { token-id: token-id } { uri: uri })
    (setup-evolution-schedule token-id current-block)
    (update-holder-stats tx-sender current-block)
    (var-set last-token-id token-id)
    (ok token-id)
  )
)

;; Breed two NFTs to create offspring
(define-public (breed (parent-1-id uint) (parent-2-id uint) (offspring-traits (string-ascii 1024)) (uri (string-ascii 256)))
  (let
    (
      (parent-1-data (unwrap! (map-get? token-data { token-id: parent-1-id }) ERR_TOKEN_NOT_FOUND))
      (parent-2-data (unwrap! (map-get? token-data { token-id: parent-2-id }) ERR_TOKEN_NOT_FOUND))
      (parent-1-owner (unwrap! (nft-get-owner? chronovault-nft parent-1-id) ERR_TOKEN_NOT_FOUND))
      (parent-2-owner (unwrap! (nft-get-owner? chronovault-nft parent-2-id) ERR_TOKEN_NOT_FOUND))
      (current-block burn-block-height)
      (new-token-id (+ (var-get last-token-id) u1))
      (new-generation (+ (max (get generation parent-1-data) (get generation parent-2-data)) u1))
    )
    (asserts! (not (is-eq parent-1-id parent-2-id)) ERR_SAME_PARENT_TOKENS)
    (asserts! (or (is-eq tx-sender parent-1-owner) (is-eq tx-sender parent-2-owner)) ERR_NOT_TOKEN_OWNER)
    (asserts! (>= current-block (+ (get birth-block parent-1-data) BREEDING_MATURITY_BLOCKS)) ERR_BREEDING_NOT_READY)
    (asserts! (>= current-block (+ (get birth-block parent-2-data) BREEDING_MATURITY_BLOCKS)) ERR_BREEDING_NOT_READY)
    (asserts! (>= current-block (+ (get last-breeding-block parent-1-data) BREEDING_COOLDOWN_BLOCKS)) ERR_BREEDING_COOLDOWN)
    (asserts! (>= current-block (+ (get last-breeding-block parent-2-data) BREEDING_COOLDOWN_BLOCKS)) ERR_BREEDING_COOLDOWN)
    
    (try! (stx-transfer? BREEDING_PRICE tx-sender CONTRACT_OWNER))
    (try! (nft-mint? chronovault-nft new-token-id tx-sender))
    
    ;; Update parent breeding blocks
    (map-set token-data 
      { token-id: parent-1-id }
      (merge parent-1-data { last-breeding-block: current-block })
    )
    (map-set token-data 
      { token-id: parent-2-id }
      (merge parent-2-data { last-breeding-block: current-block })
    )
    
    ;; Create offspring
    (map-set token-data 
      { token-id: new-token-id }
      {
        creator: tx-sender,
        birth-block: current-block,
        generation: new-generation,
        parent-1: (some parent-1-id),
        parent-2: (some parent-2-id),
        evolution-level: u0,
        last-breeding-block: u0,
        base-traits: offspring-traits
      }
    )
    (map-set token-uris { token-id: new-token-id } { uri: uri })
    (setup-evolution-schedule new-token-id current-block)
    (update-holder-stats tx-sender current-block)
    (var-set last-token-id new-token-id)
    (ok new-token-id)
  )
)

;; Trigger evolution for a token
(define-public (evolve-token (token-id uint))
  (let
    (
      (token-owner (unwrap! (nft-get-owner? chronovault-nft token-id) ERR_TOKEN_NOT_FOUND))
      (token-info (unwrap! (map-get? token-data { token-id: token-id }) ERR_TOKEN_NOT_FOUND))
      (current-level (get evolution-level token-info))
      (next-level (+ current-level u1))
      (evolution-info (map-get? evolution-schedules { token-id: token-id, evolution-level: next-level }))
    )
    (asserts! (is-eq tx-sender token-owner) ERR_NOT_TOKEN_OWNER)
    (match evolution-info
      evolution-data
      (begin
        (asserts! (>= burn-block-height (get unlock-block evolution-data)) ERR_BREEDING_NOT_READY)
        (asserts! (not (get unlocked evolution-data)) ERR_INVALID_TOKEN)
        (map-set evolution-schedules 
          { token-id: token-id, evolution-level: next-level }
          (merge evolution-data { unlocked: true })
        )
        (map-set token-data 
          { token-id: token-id }
          (merge token-info { evolution-level: next-level })
        )
        (ok true)
      )
      ERR_TOKEN_NOT_FOUND
    )
  )
)

;; Transfer function
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender sender) ERR_NOT_TOKEN_OWNER)
    (update-holder-stats recipient burn-block-height)
    (nft-transfer? chronovault-nft token-id sender recipient)
  )
)

;; Set token URI (owner only)
(define-public (set-token-uri (token-id uint) (uri (string-ascii 256)))
  (let
    (
      (token-owner (unwrap! (nft-get-owner? chronovault-nft token-id) ERR_TOKEN_NOT_FOUND))
    )
    (asserts! (is-eq tx-sender token-owner) ERR_NOT_TOKEN_OWNER)
    (map-set token-uris { token-id: token-id } { uri: uri })
    (ok true)
  )
)


;; read only functions

;; Get last token ID
(define-read-only (get-last-token-id)
  (ok (var-get last-token-id))
)

;; Get token URI
(define-read-only (get-token-uri (token-id uint))
  (ok (get uri (map-get? token-uris { token-id: token-id })))
)

;; Get token owner
(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? chronovault-nft token-id))
)

;; Get token data
(define-read-only (get-token-data (token-id uint))
  (map-get? token-data { token-id: token-id })
)

;; Get evolution info
(define-read-only (get-evolution-info (token-id uint) (evolution-level uint))
  (map-get? evolution-schedules { token-id: token-id, evolution-level: evolution-level })
)

;; Get current evolution level
(define-read-only (get-current-evolution-level (token-id uint))
  (match (map-get? token-data { token-id: token-id })
    token-info (ok (get evolution-level token-info))
    ERR_TOKEN_NOT_FOUND
  )
)

;; Check if token can breed
(define-read-only (can-breed (token-id uint))
  (match (map-get? token-data { token-id: token-id })
    token-info
    (let
      (
        (current-block burn-block-height)
        (maturity-block (+ (get birth-block token-info) BREEDING_MATURITY_BLOCKS))
        (cooldown-block (+ (get last-breeding-block token-info) BREEDING_COOLDOWN_BLOCKS))
      )
      (ok (and (>= current-block maturity-block) (>= current-block cooldown-block)))
    )
    ERR_TOKEN_NOT_FOUND
  )
)

;; Get holder stats
(define-read-only (get-holder-stats (holder principal))
  (map-get? holder-stats { holder: holder })
)

;; Get contract URI
(define-read-only (get-contract-uri)
  (ok (some (var-get contract-uri)))
)
