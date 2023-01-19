---
Title: Proposal Template
Number: 0
Status: Proposed
Authors:
  - Achim Schneider<achim@parity.io>
Created: YYYY-MM-DD
Category: Template
Requires:
Replaces:
--- 

## Summary
 [Arkworks](http://arkworks.rs/) integration into Substrate. We provide Elliptic curves (bls12_381, bls12_377, ed_on_bls12_381, ed_on_bls12_77, bw6_761), were we replace the compute intense operations by host function calls in Substrate. We add those host function calls to `sp_io::elliptic_curves` and refer to the `arkworks` crate. 
The curves live in https://github.com/paritytech/ark-substrate) and call into the host functions. To avoid point preparation of the elliptic curves in the runtime, we also partially fork the models `bls12` and `bw6` in [ark-substrate](https://github.com/paritytech/ark-substrate).

## Motivation
Usually cryptographic operations on elliptic curves are slow in WebAssembly. Replacing those operations by host functoin calls into binary code allows us to drastically improve the performace of the cryptographic tools which rely on those operations.

## Detailed Solution design
Explain the change or feature as you would to another builder in the ecosystem. 

Describe the syntax and semantics of any new feature. Any new terminology or new named concepts should be defined in this section. 

Explain the design in sufficient detail for somebody familiar with substrate and polkadot to understand and implement. Consider:

* Its interaction with other features is clear.
* It is reasonably clear how the feature would be implemented.
* Corner cases are dissected by example.

Provide some examples of how it will be used and the impacts/dependencies on other parts of the framework environment.

We implement host function calls into the underlying arithmetic operations on elliptic curves for `BLS12_377`, `BLS12_381`, `BW6_761`, `ED_ON_BLS12_377` and `ED_ON_BLS12_381` by host function calls in Substrate. The host function calls are implemented in `sp-io` under the trait `EllipticCurves`. They call into the concrete implementations which live in the `arkworks` crate under `/primitives/arkworks`.

We can use the [arkworks-rs/algebra] test templates to instruct the tests on those elliptic curves after inatializing them with the `sp-io` host functions under `/primititves/arkworks/test`. 

To implement the elliptic curves in Substrate you need to pass the host function calls from the Substrate [sp-io](https://github.com/paritytech/substrate) crate to the instantiated elliptic curves.

See the [groth16 example](https://github.com/achimcc/substrate-groth16) for further implementation details and an example on how to verify a [groth16](https://eprint.iacr.org/2016/260.pdf) proof in a Substrate pallet. 

The README file of the [ark-substrate](https://github.com/paritytech/ark-substrate) repo contains detailed instructions on the instantiation of the different arkworks elliptic curves with the `sp-io` host functions.

## Security considerations
All PPPs are required to have a security considerations section. The purpose of this is both to encourage authors to consider security in their designs and to inform the reader of relevant security issues. 

Discuss here security implications/considerations relevant to the proposed change. Go through detected threats and risks and how they affected security-relevant design decisions. Add any kind of security concerns that are worth discussing during the process of this PPP. 

## Alternatives
- There is an ongoing effport to speed operations on elliptic curves up in native WebAssembly. See iden3's implementation of elliptic curve pairings in native WebAssembly: https://github.com/iden3/wasmcurves. However, those libraries cover implement only a subset of the required features and only for one elliptic curve so far (BLS12_381).
- Zero Knowledge proofs and RingVRF'a remain slow in Substrate.

## Questions and open Discussions (optional)
Drop here the questions you require feedback from on this process. Also consider open questions that can’t be answered/resolved with the implementation of this PPP.

