---
Title: BLS Signatures Verification for BLS12-381 curve
Number: 0
Status: Proposed
Authors:
  - Mash
Created: 2022-12-16
Category: Runtime Environment
Requires:
Replaces:
--- 

## Summary
We need BLS signature verification to be fast.

PoC: https://github.com/volcano-mash/substrate/tree/bls-signatures

## Motivation
BLS signatures are ubiquitous in the blockchain space.
They come in very handy in Polkadot, e.g. to verify signatures of the [Ethereum beacon chain](https://github.com/ethereum/consensus-specs/blob/v1.0.0/specs/phase0/beacon-chain.md#bls-signatures).

Due to the use of pairings in BLS signatures, the verification is an expensive operation. Doing it directly in the WASM runtime will incur a significant performance penalty.

As with other cryptographic primitives in Substrate, we want to offload the BLS signature verification to the host.

## Detailed Solution design
We propose using the [arkworks](https://github.com/arkworks-rs) backend to implement the BLS signature verification.
Arkworks is a collection of Rust libraries for building zkSNARKs and other cryptographic primitives.
It is already widely used across the industry, in protocols such as Aleo, Anoma, Mina or Manta.

Since there is already some effort underway to integrate arkworks into Substrate (PPP not up yet), we propose to use the same backend for BLS signature verification.

We propose to add the verification of BLS signatures for the BLS12-381 curve to primitives/core: `bls12_381_bls_sig_verify`.

Note: BLS signature is a cryptographic primitive. BLS12-381 curve (different BLS!) is an instantiation of a pairing-friendly elliptic curve.
BLS signatures are most commonly done over the BLS12-381 curve (e.g. see the ciphersuites in [IETF BLS draft](https://datatracker.ietf.org/doc/draft-irtf-cfrg-bls-signature/)), but could be done over other pairing-friendly curves as well.

## Security considerations
The currently proposed solution doesn't perform subgroup checks.
They are optional upon point deserialization. The deserialization works as follows:
1. Parse 48(resp. 96) bytes as a compressed point in G1(resp. G2), following [zcash serialization](https://docs.rs/bls12_381/latest/bls12_381/notes/serialization/index.html) format.
2. Parsing will fail if the serialized data doesn't correspond to a point on the curve (i.e. its y and x coordinates don't match the curve equation y^2 = x^3 + Ax + B).
3. (optional) Since the order of the curve BLS12-381 is not prime, not all points on the curve lie on the cryptographically secure prime-order subgroup G1(resp. G2). If the origin of the serialized data is trusted, this step can be skipped. Otherwise, the point **should** be checked to be in the subgroup G1(resp. G2) by performing a subgroup check, which is a somewhat expensive operation (~50 µs for G1, ~100 µs for G2 on an M1).

## Alternatives
One alternatice would be to use the blst library: https://github.com/supranational/blst. This would introduce an additional dependency though, while arkworks is already planned to be supported anyway. Arkworks provides more flexibility (e.g. when BLS12-377 curve needs to be supported, this would not be possible with blst which is curve-specific).

The other option would be to only expose the pairing method (as planned anyway) and leave "constructing" the verification to the runtime, which would only delegate the pairing computation to the host. This would be a bit more flexible, but is more error-prone for the user, and less efficient (e.g. (de)serialization needs to be done in the runtime, which can be slow, especially if the subgroup checks are required).

## Questions and open Discussions
- Should we include subgroup checks in the verification? As a separate method (e.g. `bls12_381_bls_sig_verify_unchecked`)? 
