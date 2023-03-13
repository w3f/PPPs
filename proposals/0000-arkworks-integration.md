---
Title: Arkworks Integration
Number: 0
Status: Proposed
Authors:
  - Achim Schneider<achim@parity.io>
Created: 2023-13-03
Category: Runtime Environment
Requires:
Replaces:
--- 

## Summary
 Proposal to merge https://github.com/paritytech/substrate/pull/13031 into Substrate. [Arkworks](http://arkworks.rs/) integration into Substrate. We provide Elliptic curves (bls12_381, bls12_377, ed_on_bls12_381, ed_on_bls12_77, bw6_761), were we replace the compute intense operations by host function calls in Substrate. We add those host function calls to `sp_io::elliptic_curves` and refer to the `arkworks` crate. 
The curves live in https://github.com/paritytech/ark-substrate and call into the host functions. To avoid point preparation of the elliptic curves in the runtime, we also partially fork the models `bls12` and `bw6` in [ark-substrate](https://github.com/paritytech/ark-substrate).

## Motivation
Usually cryptographic operations on elliptic curves are slow in WebAssembly. Replacing those operations by host functoin calls into binary code allows us to drastically improve the performace of the cryptographic tools which rely on those operations.

## Detailed Solution design
We implement host function calls into the underlying arithmetic operations on elliptic curves for `BLS12_377`, `BLS12_381`, `BW6_761`, `ED_ON_BLS12_377` and `ED_ON_BLS12_381` by host function calls in Substrate.

We introduce new host functions calls to Substrate which are grouped under `elliptic_curves` in `/primitives/io/src/lib.rs`. Those host function calls receive serialized curve points of elliptic curves, deserialize them, call into native arkworks code to perform computations. Finally they serialize the result and return them as `Vec<u8>`.

While the host-functions themself are implemented under `/primitives/io/src/lib.rs`, they call into their actual implementations which can be found in the `/primitives/io/arkworks` sub-crate.

Those host functions calls are used by the [ark-substrate]() library. When using elliptic curves from ark-substrate, one passes the required host-function by depdendency injection. This allows for a clean separation of concerns and to keep the amount of code contributed to the Substrate core repo as minimal as possible.

For testing purposes, we are able to re-use the extensive arkworks testing macros, those tests are performed under `/primitives/arkworks/tests` folder.

Example implementations and benchmarks for the code can be found under: https://github.com/achimcc/substrate-arkworks-examples.

### Benchmarking results
The following comparison table of benchmarking results should justify the introduction of the new host functions to Substrate:

 ed_on_bls12_381_msm_te, 10 arguments        |    7813.27       |    3207.47      |    35.21        |     12470       |      560.82     |
| ed_on_bls12_381_msm_te, 1000 arguments      |    334199.35     |    242277.02    |    2391.21      |     533490      |      7890       |
| ed_on_bls12_381_mul_projective_te[^*]       |    9.13          |    10.60        |    7.69         |     22.37       |      0.83       |  
| ed_on_bls12_381_mul_affine_te[^*]           |    5.59          |    10.07        |    7.61         |     17.25       |      0.37       |
| ed_on_bls12_377_msm, 10 arguments           |    7768.41       |    3192.99      |    43.24        |     10060       |      553.69     | 
| ed_on_bls12_377_msm, 1000 arguments         |    357890.37     |    267844.08    |    2465.60      |     537810      |      7680       |
| ed_on_bls12_377_mul_projective[^*]          |    9.41          |    10.32        |    7.00         |     22.48       |      0.89       |
| ed_on_bls12_377_mul_affine[^*]              |    8.84          |    442.80       |    8.47         |     22.34       |      0.86       |

[^1]: implemented in a Substrate pallet with [arkworks](https://github.com/arkworks-rs/) library by this repo: https://github.com/achimcc/substrate-arkworks-examples
[^2]: implemented in a Substrate pallet with [ark-substrate](https://github.com/paritytech/ark-substrate) library, executed through host-function call, computed by this repo: https://github.com/achimcc/substrate-arkworks-examples
[^3]: These extrinsics just receive the arguemnts, deserialize them without using them and then take a generator or zero element of the expected return group, serizlize it and return it. **Calling a host call through a extrinsic which does nothing has been benchmarked with 3.98µs**. Implementation in: https://github.com/achimcc/substrate-arkworks-examples/tree/dummy-calls
[^4]: executed through wasmtime by this repo: [https://github.com/achimcc/native-bench-arkworks](https://github.com/achimcc/wasm-bench-arkworks)
[^5]: native execution, computed by this repo: https://github.com/achimcc/native-bench-arkworks
[^*]: we removed these host calls in the final ark-substrate implementation, since they didn't yield a performance improvement. Implementations can be found in the branches: https://github.com/paritytech/ark-substrate/tree/arkworks-host-function-mul and https://github.com/paritytech/substrate/tree/arkworks-host-function-mul

## Security considerations
The implementations should be as secure as the arkworks library itself, since all implementations are extensively tested through the same macros from the arkworks testing macro library.

## Alternatives
- There is an ongoing effport to speed operations on elliptic curves up in native WebAssembly. See iden3's implementation of elliptic curve pairings in native WebAssembly: https://github.com/iden3/wasmcurves. However, those libraries cover implement only a subset of the required features and only for one elliptic curve so far (BLS12_381).
- Zero Knowledge proofs and RingVRF'a remain slow in Substrate.

## Questions and open Discussions (optional)

