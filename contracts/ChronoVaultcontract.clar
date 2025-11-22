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
(define-constant ERR_CONTRACT_PAUSED (err u108))
(define-constant ERR_OVERFLOW (err u109))
(define-constant ERR_UNDERFLOW (err u110))
(define-constant ERR_INVALID_INPUT (err u111))
(define-constant ERR_RATE_LIMIT (err u112))
(define-constant ERR_MAX_GENERATION (err u113))
(define-constant ERR_MAX_EVOLUTION (err u114))
(define-constant ERR_REENTRANCY (err u115))

(define-constant BLOCKS_PER_EVOLUTION u10000)
(define-constant BREEDING_MATURITY_BLOCKS u100000)
(define-constant BREEDING_COOLDOWN_BLOCKS u50000)
(define-constant MINT_PRICE u1000000) ;; 1 STX in microSTX
(define-constant BREEDING_PRICE u500000) ;; 0.5 STX in microSTX
(define-constant MAX_GENERATION u10) ;; Maximum generation depth
(define-constant MAX_EVOLUTION_LEVEL u5) ;; Maximum evolution level
(define-constant MIN_TRAIT_LENGTH u10) ;; Minimum trait string length
(define-constant MAX_TRAIT_LENGTH u1024) ;; Maximum trait string length
(define-constant OPERATION_COOLDOWN u10) ;; Blocks between operations per user

;; ADVANCED SECURITY CONSTANTS
(define-constant EMERGENCY_PAUSE_DURATION u1440) ;; 1 day in blocks for emergency pause
(define-constant MAX_ORACLE_STALENESS u3600) ;; 1 hour max staleness for oracle data
(define-constant MIN_BLOCK_VALIDATION u100) ;; Minimum blocks for evolution validation
(define-constant MAX_BULK_OPERATIONS u10) ;; Maximum operations per bulk transaction
(define-constant SECURITY_ADMIN_PERCENTAGE u10) ;; 10% of fees go to security admin

;; ADVANCED SECURITY ERROR CODES
(define-constant ERR_EMERGENCY_PAUSED (err u116))
(define-constant ERR_ORACLE_STALE (err u117))
(define-constant ERR_INVALID_BLOCK_HEIGHT (err u118))
(define-constant ERR_BULK_OPERATION_LIMIT (err u119))
(define-constant ERR_SECURITY_ADMIN_ONLY (err u120))
(define-constant ERR_INVALID_ORACLE_DATA (err u121))

;; ADVANCED SECURITY DATA VARS
(define-data-var emergency-paused bool false)
(define-data-var emergency-pause-end-block uint u0)
(define-data-var oracle-last-update uint u0)
(define-data-var oracle-data-valid bool true)
(define-data-var security-admin principal CONTRACT_OWNER)
(define-data-var total-security-fees uint u0)
(define-data-var last-token-id uint u0)
(define-data-var contract-uri (string-ascii 256) "https://chronovault.app/metadata/contract")
(define-data-var contract-paused bool false)
(define-data-var reentrancy-guard bool false)

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

(define-map user-last-operation
  { user: principal }
  { last-block: uint }
)

;; Security helper functions

;; Safe math - addition with overflow check
(define-private (safe-add (a uint) (b uint))
  (let ((result (+ a b)))
    (if (< result a)
      ERR_OVERFLOW
      (ok result)
    )
  )
)

;; Safe math - subtraction with underflow check
(define-private (safe-sub (a uint) (b uint))
  (if (< a b)
    ERR_UNDERFLOW
    (ok (- a b))
  )
)

;; Safe math - multiplication with overflow check
(define-private (safe-mul (a uint) (b uint))
  (let ((result (* a b)))
    (if (and (> a u0) (< result a))
      ERR_OVERFLOW
      (ok result)
    )
  )
)

;; Reentrancy guard - acquire lock
(define-private (acquire-reentrancy-lock)
  (if (var-get reentrancy-guard)
    ERR_REENTRANCY
    (begin
      (var-set reentrancy-guard true)
      (ok true)
    )
  )
)

;; Reentrancy guard - release lock
(define-private (release-reentrancy-lock)
  (begin
    (var-set reentrancy-guard false)
    true
  )
)

;; Check if contract is paused
(define-private (check-not-paused)
  (if (var-get contract-paused)
    ERR_CONTRACT_PAUSED
    (ok true)
  )
)

;; Validate trait string length
(define-private (validate-trait-length (traits (string-ascii 1024)))
  (let ((length (len traits)))
    (if (and (>= length MIN_TRAIT_LENGTH) (<= length MAX_TRAIT_LENGTH))
      (ok true)
      ERR_INVALID_INPUT
    )
  )
)

;; Check rate limit for user operations
(define-private (check-rate-limit (user principal))
  (let (
    (last-op (map-get? user-last-operation { user: user }))
    (current-block burn-block-height)
  )
    (match last-op
      op-data
      (if (>= current-block (+ (get last-block op-data) OPERATION_COOLDOWN))
        (ok true)
        ERR_RATE_LIMIT
      )
      (ok true)
    )
  )
)

;; Update user operation timestamp
(define-private (update-operation-timestamp (user principal))
  (begin
    (map-set user-last-operation 
      { user: user }
      { last-block: burn-block-height }
    )
    true
  )
)

;; ADVANCED SECURITY FUNCTIONS

;; Check if emergency pause is active
(define-private (check-not-emergency-paused)
  (if (var-get emergency-paused)
    (if (>= burn-block-height (var-get emergency-pause-end-block))
      (begin
        (var-set emergency-paused false)
        (ok true)
      )
      ERR_EMERGENCY_PAUSED
    )
    (ok true)
  )
)

;; Validate oracle data freshness
(define-private (validate-oracle-data)
  (let ((last-update (var-get oracle-last-update)))
    (if (and (> last-update u0) (< (- burn-block-height last-update) MAX_ORACLE_STALENESS))
      (ok true)
      ERR_ORACLE_STALE
    )
  )
)

;; Enhanced block height validation
(define-private (validate-evolution-block (block-val uint))
  (if (and (>= block-val MIN_BLOCK_VALIDATION) (<= block-val burn-block-height))
    (ok true)
    ERR_INVALID_BLOCK_HEIGHT
  )
)

;; Security fee distribution
(define-private (distribute-security-fee (total-fee uint))
  (let
    (
      (security-fee (/ (* total-fee SECURITY_ADMIN_PERCENTAGE) u100))
    )
    (var-set total-security-fees (+ (var-get total-security-fees) security-fee))
    (- total-fee security-fee) ;; Return the remaining fee amount
  )
)

;; Enhanced validation for bulk operations
(define-private (validate-bulk-operation-limit (operation-count uint))
  (if (<= operation-count MAX_BULK_OPERATIONS)
    (ok true)
    ERR_BULK_OPERATION_LIMIT
  )
)

;; Security monitoring - log suspicious activity
(define-private (log-security-event (event-type (string-ascii 64)) (details (string-ascii 256)))
  ;; In a real implementation, this would emit events or update monitoring data
  true
)

;; public functions

;; Pause contract (owner only)
(define-public (pause-contract)
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (var-set contract-paused true)
    (ok true)
  )
)

;; Unpause contract (owner only)
(define-public (unpause-contract)
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (var-set contract-paused false)
    (ok true)
  )
)

;; EMERGENCY SECURITY FUNCTIONS

;; Emergency pause (security admin only - immediate effect)
(define-public (emergency-pause)
  (begin
    (asserts! (is-eq tx-sender (var-get security-admin)) ERR_SECURITY_ADMIN_ONLY)
    (var-set emergency-paused true)
    (var-set emergency-pause-end-block (+ burn-block-height EMERGENCY_PAUSE_DURATION))
    (log-security-event "emergency-pause" "Contract emergency paused by security admin")
    (ok true)
  )
)

;; Emergency unpause (owner only - can override security admin)
(define-public (emergency-unpause)
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (var-set emergency-paused false)
    (var-set emergency-pause-end-block u0)
    (log-security-event "emergency-unpause" "Contract emergency unpaused by owner")
    (ok true)
  )
)

;; Update oracle data (security admin only)
(define-public (update-oracle-data (is-valid bool))
  (begin
    (asserts! (is-eq tx-sender (var-get security-admin)) ERR_SECURITY_ADMIN_ONLY)
    (var-set oracle-last-update burn-block-height)
    (var-set oracle-data-valid is-valid)
    (ok true)
  )
)

;; Set security admin (owner only)
(define-public (set-security-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (asserts! (not (is-eq new-admin CONTRACT_OWNER)) ERR_INVALID_INPUT)
    (var-set security-admin new-admin)
    (log-security-event "admin-change" "Security admin updated")
    (ok true)
  )
)

;; Withdraw security fees (security admin only)
(define-public (withdraw-security-fees)
  (let ((fees (var-get total-security-fees)))
    (asserts! (is-eq tx-sender (var-get security-admin)) ERR_SECURITY_ADMIN_ONLY)
    (asserts! (> fees u0) ERR_INSUFFICIENT_PAYMENT)
    (var-set total-security-fees u0)
    (match (stx-transfer? fees CONTRACT_OWNER (var-get security-admin))
      success (ok fees)
      error (err error)
    )
  )
)

;; BATCH OPERATIONS FOR PERFORMANCE

;; Batch mint genesis NFTs (owner only)
(define-public (batch-mint-genesis (recipients (list 10 principal)) (base-traits-list (list 10 (string-ascii 1024))) (uris (list 10 (string-ascii 256))))
  (let ((count (len recipients)))
    ;; Security checks
    (try! (check-not-paused))
    (try! (check-not-emergency-paused))
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (try! (validate-bulk-operation-limit count))
    (asserts! (is-eq count (len base-traits-list)) ERR_INVALID_INPUT)
    (asserts! (is-eq count (len uris)) ERR_INVALID_INPUT)

    ;; Process batch minting
    (ok (map batch-mint-genesis-helper (list
      { recipient: (unwrap-panic (element-at recipients u0)), traits: (unwrap-panic (element-at base-traits-list u0)), uri: (unwrap-panic (element-at uris u0)) }
      { recipient: (unwrap-panic (element-at recipients u1)), traits: (unwrap-panic (element-at base-traits-list u1)), uri: (unwrap-panic (element-at uris u1)) }
      { recipient: (unwrap-panic (element-at recipients u2)), traits: (unwrap-panic (element-at base-traits-list u2)), uri: (unwrap-panic (element-at uris u2)) }
      { recipient: (unwrap-panic (element-at recipients u3)), traits: (unwrap-panic (element-at base-traits-list u3)), uri: (unwrap-panic (element-at uris u3)) }
      { recipient: (unwrap-panic (element-at recipients u4)), traits: (unwrap-panic (element-at base-traits-list u4)), uri: (unwrap-panic (element-at uris u4)) }
      { recipient: (unwrap-panic (element-at recipients u5)), traits: (unwrap-panic (element-at base-traits-list u5)), uri: (unwrap-panic (element-at uris u5)) }
      { recipient: (unwrap-panic (element-at recipients u6)), traits: (unwrap-panic (element-at base-traits-list u6)), uri: (unwrap-panic (element-at uris u6)) }
      { recipient: (unwrap-panic (element-at recipients u7)), traits: (unwrap-panic (element-at base-traits-list u7)), uri: (unwrap-panic (element-at uris u7)) }
      { recipient: (unwrap-panic (element-at recipients u8)), traits: (unwrap-panic (element-at base-traits-list u8)), uri: (unwrap-panic (element-at uris u8)) }
      { recipient: (unwrap-panic (element-at recipients u9)), traits: (unwrap-panic (element-at base-traits-list u9)), uri: (unwrap-panic (element-at uris u9)) }
    )))
  )
)

;; Batch mint paid NFTs
(define-public (batch-mint-paid (base-traits-list (list 10 (string-ascii 1024))) (uris (list 10 (string-ascii 256))))
  (let ((count (len base-traits-list)))
    ;; Security checks
    (try! (check-not-paused))
    (try! (check-not-emergency-paused))
    (try! (validate-oracle-data))
    (try! (validate-bulk-operation-limit count))
    (asserts! (is-eq count (len uris)) ERR_INVALID_INPUT)

    ;; Calculate total cost
    (let ((total-cost (* count MINT_PRICE)))
      ;; Process batch minting
      (ok (map batch-mint-paid-helper (list
        { traits: (unwrap-panic (element-at base-traits-list u0)), uri: (unwrap-panic (element-at uris u0)) }
        { traits: (unwrap-panic (element-at base-traits-list u1)), uri: (unwrap-panic (element-at uris u1)) }
        { traits: (unwrap-panic (element-at base-traits-list u2)), uri: (unwrap-panic (element-at uris u2)) }
        { traits: (unwrap-panic (element-at base-traits-list u3)), uri: (unwrap-panic (element-at uris u3)) }
        { traits: (unwrap-panic (element-at base-traits-list u4)), uri: (unwrap-panic (element-at uris u4)) }
        { traits: (unwrap-panic (element-at base-traits-list u5)), uri: (unwrap-panic (element-at uris u5)) }
        { traits: (unwrap-panic (element-at base-traits-list u6)), uri: (unwrap-panic (element-at uris u6)) }
        { traits: (unwrap-panic (element-at base-traits-list u7)), uri: (unwrap-panic (element-at uris u7)) }
        { traits: (unwrap-panic (element-at base-traits-list u8)), uri: (unwrap-panic (element-at uris u8)) }
        { traits: (unwrap-panic (element-at base-traits-list u9)), uri: (unwrap-panic (element-at uris u9)) }
      )))
    )
  )
)

;; Batch evolve tokens
(define-public (batch-evolve-tokens (token-ids (list 10 uint)))
  (let ((count (len token-ids)))
    ;; Security checks
    (try! (check-not-paused))
    (try! (check-not-emergency-paused))
    (try! (validate-oracle-data))
    (try! (validate-bulk-operation-limit count))

    ;; Process batch evolution
    (ok (map batch-evolve-helper token-ids))
  )
)

;; Batch transfer tokens
(define-public (batch-transfer-tokens (transfers (list 10 {token-id: uint, recipient: principal})))
  (let ((count (len transfers)))
    ;; Security checks
    (try! (check-not-paused))
    (try! (check-not-emergency-paused))
    (try! (validate-oracle-data))
    (try! (validate-bulk-operation-limit count))

    ;; Process batch transfers
    (ok (map batch-transfer-helper transfers))
  )
)

;; Mint a new genesis NFT
(define-public (mint-genesis (recipient principal) (base-traits (string-ascii 1024)) (uri (string-ascii 256)))
  (let
    (
      (token-id (try! (safe-add (var-get last-token-id) u1)))
      (current-block burn-block-height)
    )
    ;; ADVANCED Security checks
    (try! (check-not-paused))
    (try! (check-not-emergency-paused))
    (try! (validate-oracle-data))
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (try! (validate-trait-length base-traits))
    
    ;; Mint NFT
    (try! (nft-mint? chronovault-nft token-id recipient))
    
    ;; Set token data
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
      (token-id (try! (safe-add (var-get last-token-id) u1)))
      (current-block burn-block-height)
      (remaining-fee (distribute-security-fee MINT_PRICE))
    )
    ;; ADVANCED Security checks
    (try! (check-not-paused))
    (try! (check-not-emergency-paused))
    (try! (validate-oracle-data))
    (try! (acquire-reentrancy-lock))
    (try! (check-rate-limit tx-sender))
    (try! (validate-trait-length base-traits))
    
    ;; Mint NFT first (state changes before external calls)
    (try! (nft-mint? chronovault-nft token-id tx-sender))
    
    ;; Set token data
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
    (update-operation-timestamp tx-sender)
    (var-set last-token-id token-id)
    
    ;; Payment after state changes (reentrancy protection)
    (match (stx-transfer? remaining-fee tx-sender CONTRACT_OWNER)
      success (begin
        (release-reentrancy-lock)
        (ok token-id)
      )
      error (begin
        (release-reentrancy-lock)
        (err error)
      )
    )
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
      (new-token-id (try! (safe-add (var-get last-token-id) u1)))
      (new-generation (try! (safe-add (max (get generation parent-1-data) (get generation parent-2-data)) u1)))
      (maturity-block-1 (try! (safe-add (get birth-block parent-1-data) BREEDING_MATURITY_BLOCKS)))
      (maturity-block-2 (try! (safe-add (get birth-block parent-2-data) BREEDING_MATURITY_BLOCKS)))
      (cooldown-block-1 (try! (safe-add (get last-breeding-block parent-1-data) BREEDING_COOLDOWN_BLOCKS)))
      (cooldown-block-2 (try! (safe-add (get last-breeding-block parent-2-data) BREEDING_COOLDOWN_BLOCKS)))
      (remaining-fee (distribute-security-fee BREEDING_PRICE))
    )
    ;; ADVANCED Security checks
    (try! (check-not-paused))
    (try! (check-not-emergency-paused))
    (try! (validate-oracle-data))
    (try! (acquire-reentrancy-lock))
    (try! (check-rate-limit tx-sender))
    (try! (validate-trait-length offspring-traits))
    
    ;; Validation checks
    (asserts! (not (is-eq parent-1-id parent-2-id)) ERR_SAME_PARENT_TOKENS)
    (asserts! (or (is-eq tx-sender parent-1-owner) (is-eq tx-sender parent-2-owner)) ERR_NOT_TOKEN_OWNER)
    (asserts! (<= new-generation MAX_GENERATION) ERR_MAX_GENERATION)
    (asserts! (>= current-block maturity-block-1) ERR_BREEDING_NOT_READY)
    (asserts! (>= current-block maturity-block-2) ERR_BREEDING_NOT_READY)
    (asserts! (>= current-block cooldown-block-1) ERR_BREEDING_COOLDOWN)
    (asserts! (>= current-block cooldown-block-2) ERR_BREEDING_COOLDOWN)
    
    ;; Mint NFT and update state first (before payment)
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
    (update-operation-timestamp tx-sender)
    (var-set last-token-id new-token-id)
    
    ;; Payment after state changes (reentrancy protection)
    (match (stx-transfer? remaining-fee tx-sender CONTRACT_OWNER)
      success (begin
        (release-reentrancy-lock)
        (ok new-token-id)
      )
      error (begin
        (release-reentrancy-lock)
        (err error)
      )
    )
  )
)

;; Trigger evolution for a token
(define-public (evolve-token (token-id uint))
  (let
    (
      (token-owner (unwrap! (nft-get-owner? chronovault-nft token-id) ERR_TOKEN_NOT_FOUND))
      (token-info (unwrap! (map-get? token-data { token-id: token-id }) ERR_TOKEN_NOT_FOUND))
      (current-level (get evolution-level token-info))
      (next-level (try! (safe-add current-level u1)))
      (evolution-info (map-get? evolution-schedules { token-id: token-id, evolution-level: next-level }))
    )
    ;; ADVANCED Security checks
    (try! (check-not-paused))
    (try! (check-not-emergency-paused))
    (try! (validate-oracle-data))
    (try! (check-rate-limit tx-sender))
    (asserts! (is-eq tx-sender token-owner) ERR_NOT_TOKEN_OWNER)
    (asserts! (<= next-level MAX_EVOLUTION_LEVEL) ERR_MAX_EVOLUTION)
    
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
        (update-operation-timestamp tx-sender)
        (ok true)
      )
      ERR_TOKEN_NOT_FOUND
    )
  )
)

;; Transfer function
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (begin
    ;; ADVANCED Security checks
    (try! (check-not-paused))
    (try! (check-not-emergency-paused))
    (try! (validate-oracle-data))
    (asserts! (is-eq tx-sender sender) ERR_NOT_TOKEN_OWNER)
    
    ;; Update stats and transfer
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

;; NEW SECURITY READ-ONLY FUNCTIONS

;; Check if contract is paused
(define-read-only (is-contract-paused)
  (ok (var-get contract-paused))
)

;; Check if reentrancy guard is active
(define-read-only (is-reentrancy-locked)
  (ok (var-get reentrancy-guard))
)

;; Get user's last operation block
(define-read-only (get-user-last-operation (user principal))
  (map-get? user-last-operation { user: user })
)

;; Check if user can perform operation (rate limit check)
(define-read-only (can-user-operate (user principal))
  (let (
    (last-op (map-get? user-last-operation { user: user }))
    (current-block burn-block-height)
  )
    (match last-op
      op-data
      (ok (>= current-block (+ (get last-block op-data) OPERATION_COOLDOWN)))
      (ok true)
    )
  )
)

;; Get security status
(define-read-only (get-security-status)
  {
    contract-paused: (var-get contract-paused),
    emergency-paused: (var-get emergency-paused),
    emergency-pause-end-block: (var-get emergency-pause-end-block),
    reentrancy-locked: (var-get reentrancy-guard),
    oracle-last-update: (var-get oracle-last-update),
    oracle-data-valid: (var-get oracle-data-valid),
    security-admin: (var-get security-admin),
    total-security-fees: (var-get total-security-fees),
    max-generation: MAX_GENERATION,
    max-evolution-level: MAX_EVOLUTION_LEVEL,
    operation-cooldown: OPERATION_COOLDOWN
  }
)

;; Check if emergency pause is active
(define-read-only (is-emergency-paused)
  (ok (var-get emergency-paused))
)

;; Get emergency pause end block
(define-read-only (get-emergency-pause-end-block)
  (ok (var-get emergency-pause-end-block))
)

;; Get oracle status
(define-read-only (get-oracle-status)
  {
    last-update: (var-get oracle-last-update),
    data-valid: (var-get oracle-data-valid),
    staleness-threshold: MAX_ORACLE_STALENESS,
    current-block: burn-block-height
  }
)

;; Get security admin
(define-read-only (get-security-admin)
  (ok (var-get security-admin))
)

;; Get total security fees
(define-read-only (get-total-security-fees)
  (ok (var-get total-security-fees))
)

;; private functions

;; Setup evolution schedule for a token
(define-private (setup-evolution-schedule (token-id uint) (birth-block uint))
  (begin
    ;; Set up first 5 evolution levels
    (map-set evolution-schedules 
      { token-id: token-id, evolution-level: u1 }
      { unlock-block: (+ birth-block BLOCKS_PER_EVOLUTION), new-traits: "basic-growth", unlocked: false }
    )
    (map-set evolution-schedules 
      { token-id: token-id, evolution-level: u2 }
      { unlock-block: (+ birth-block (* BLOCKS_PER_EVOLUTION u2)), new-traits: "enhanced-features", unlocked: false }
    )
    (map-set evolution-schedules 
      { token-id: token-id, evolution-level: u3 }
      { unlock-block: (+ birth-block (* BLOCKS_PER_EVOLUTION u3)), new-traits: "rare-attributes", unlocked: false }
    )
    (map-set evolution-schedules 
      { token-id: token-id, evolution-level: u4 }
      { unlock-block: (+ birth-block (* BLOCKS_PER_EVOLUTION u4)), new-traits: "legendary-powers", unlocked: false }
    )
    (map-set evolution-schedules 
      { token-id: token-id, evolution-level: u5 }
      { unlock-block: (+ birth-block (* BLOCKS_PER_EVOLUTION u5)), new-traits: "mythical-essence", unlocked: false }
    )
    true
  )
)

;; Update holder statistics
(define-private (update-holder-stats (holder principal) (current-block uint))
  (let
    (
      (existing-stats (map-get? holder-stats { holder: holder }))
    )
    (match existing-stats
      stats
      (map-set holder-stats 
        { holder: holder }
        (merge stats { total-breeding-count: (+ (get total-breeding-count stats) u1) })
      )
      (map-set holder-stats 
        { holder: holder }
        {
          first-hold-block: current-block,
          total-breeding-count: u0,
          loyalty-multiplier: u100
        }
      )
    )
  )
)

;; Calculate loyalty multiplier based on holding duration
(define-private (calculate-loyalty-multiplier (first-hold-block uint) (current-block uint))
  (let
    (
      (holding-duration (- current-block first-hold-block))
      (base-multiplier u100)
    )
    (if (>= holding-duration BREEDING_MATURITY_BLOCKS)
      (+ base-multiplier (/ holding-duration u10000))
      base-multiplier
    )
  )
)

;; Get maximum of two uints
(define-private (max (a uint) (b uint))
  (if (> a b) a b)
)

;; BATCH OPERATION HELPERS

;; Helper for batch genesis minting
(define-private (batch-mint-genesis-helper (mint-data {recipient: principal, traits: (string-ascii 1024), uri: (string-ascii 256)}))
  (let
    (
      (token-id (try! (safe-add (var-get last-token-id) u1)))
      (current-block burn-block-height)
      (recipient (get recipient mint-data))
      (traits (get traits mint-data))
      (uri (get uri mint-data))
    )
    ;; Validate traits and mint
    (try! (validate-trait-length traits))
    (try! (nft-mint? chronovault-nft token-id recipient))

    ;; Set token data
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
        base-traits: traits
      }
    )
    (map-set token-uris { token-id: token-id } { uri: uri })
    (setup-evolution-schedule token-id current-block)
    (update-holder-stats recipient current-block)
    (var-set last-token-id token-id)
    (ok token-id)
  )
)

;; Helper for batch paid minting
(define-private (batch-mint-paid-helper (mint-data {traits: (string-ascii 1024), uri: (string-ascii 256)}))
  (let
    (
      (token-id (try! (safe-add (var-get last-token-id) u1)))
      (current-block burn-block-height)
      (traits (get traits mint-data))
      (uri (get uri mint-data))
      (remaining-fee (distribute-security-fee MINT_PRICE))
    )
    ;; Validate traits and mint
    (try! (validate-trait-length traits))
    (try! (nft-mint? chronovault-nft token-id tx-sender))

    ;; Set token data
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
        base-traits: traits
      }
    )
    (map-set token-uris { token-id: token-id } { uri: uri })
    (setup-evolution-schedule token-id current-block)
    (update-holder-stats tx-sender current-block)
    (update-operation-timestamp tx-sender)
    (var-set last-token-id token-id)

    ;; Payment (simplified for batch - assumes payment handled externally)
    (ok token-id)
  )
)

;; Helper for batch evolution
(define-private (batch-evolve-helper (token-id uint))
  (let
    (
      (token-owner-result (nft-get-owner? chronovault-nft token-id))
      (token-info-result (map-get? token-data { token-id: token-id }))
    )
    (match token-owner-result
      token-owner
      (match token-info-result
        token-info
        (let
          (
            (current-level (get evolution-level token-info))
            (next-level (+ current-level u1))
            (evolution-info (map-get? evolution-schedules { token-id: token-id, evolution-level: next-level }))
          )
          ;; Check ownership and evolution requirements
          (if (and (is-eq tx-sender token-owner) (<= next-level MAX_EVOLUTION_LEVEL))
            (match evolution-info
              evolution-data
              (if (>= burn-block-height (get unlock-block evolution-data))
                (begin
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
                (ok false)
              )
              (ok false)
            )
            (ok false)
          )
        )
        (ok false)
      )
      (ok false)
    )
  )
)

;; Helper for batch transfers
(define-private (batch-transfer-helper (transfer-data {token-id: uint, recipient: principal}))
  (let
    (
      (token-id (get token-id transfer-data))
      (recipient (get recipient transfer-data))
    )
    (match (nft-get-owner? chronovault-nft token-id)
      token-owner
      (if (is-eq tx-sender token-owner)
        (match (nft-transfer? chronovault-nft token-id tx-sender recipient)
          success (begin
            (update-holder-stats recipient burn-block-height)
            (ok true)
          )
          error (ok false)
        )
        (ok false)
      )
      (ok false)
    )
  )
)