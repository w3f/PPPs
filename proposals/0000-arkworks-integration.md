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
 Proposal to add host functions for [Arkworks](http://arkworks.rs/) to Polkadot. We provide Elliptic curves (bls12_381, bls12_377, ed_on_bls12_381, ed_on_bls12_77, bw6_761), were we replace the compute intense operations by host function calls. We add those host function calls to `sp_io::elliptic_curves` and refer to the `arkworks` crate. 
The curves live in https://github.com/paritytech/ark-substrate and call into the host functions. To avoid point preparation of the elliptic curves in the runtime, we also partially fork the models `bls12` and `bw6` in [ark-substrate](https://github.com/paritytech/ark-substrate).

## Motivation
Usually cryptographic operations on elliptic curves are slow in WebAssembly. Replacing those operations by host functoin calls into binary code allows us to drastically improve the performace of the cryptographic tools which rely on those operations.

## Detailed Solution design
We implement host function calls into the underlying arithmetic operations on elliptic curves for `BLS12_377`, `BLS12_381`, `BW6_761`, `ED_ON_BLS12_377` and `ED_ON_BLS12_381` by host function calls.

We introduce new host functions calls which are grouped under `elliptic_curves` in `/primitives/io/src/lib.rs`. Those host function calls receive serialized curve points of elliptic curves, deserialize them, call into native arkworks code to perform computations. Finally they serialize the result and return them as `Vec<u8>`.

While the host-functions themself are implemented under `/primitives/io/src/lib.rs`, they call into their actual implementations which can be found in the `/primitives/io/arkworks` sub-crate.

Those host functions calls are used by the [ark-substrate]() library. When using elliptic curves from ark-substrate, one passes the required host-function by depdendency injection. This allows for a clean separation of concerns and to keep the amount of code contributed to Polkadot itself as minimal as possible.

For testing purposes, we are able to re-use the extensive arkworks testing macros, those tests are performed under `/primitives/arkworks/tests` folder.

Example implementations and benchmarks for the code can be found under: https://github.com/achimcc/substrate-arkworks-examples.

### Benchmarking results
The following comparison table of benchmarking results should justify the introduction of the new host functions:


| bls12_377_mul_projective_g1[^*]         |    511.28        |    100.63       |${\color{green}\bf 5.08 \boldsymbol{\times}}$|    11.42        |     19.38       |      0.44       |
| bls12_377_mul_affine_g1                 |    459.98        |    89.74        |${\color{green}\bf 5.13 \boldsymbol{\times}}$|    11.11        |     24.49       |      0.45       |
| bls12_377_mul_projective_g2             |    1625.11       |    290.28       |${\color{green}\bf 5.60 \boldsymbol{\times}}$|    16.64        |     28.26       |      1.42       |
| bls12_377_mul_affine_g2                 |    1346.71       |    243.37       |${\color{green}\bf 5.53 \boldsymbol{\times}}$|    17.18        |     38.94       |      1.46       |
| bw6_761_pairing                         |    52427.45      |    6999.06      |${\color{green}\bf 7.49 \boldsymbol{\times}}$|    844.10       |     55440       |      6940       |
| bw6_761_msm_g1, 10 arguments            |    155393.79     |    53231.17     |${\color{green}\bf 2.92 \boldsymbol{\times}}$|    161.28       |     206610      |      3490       |
| bw6_761_msm_g1, 1000 arguments          |    13384952.55   |    5070669.53   |${\color{green}\bf 2.64 \boldsymbol{\times}}$|    13526.84     |     18010000    |      75270      | 
| bw6_761_msm_g2, 10 arguments            |    141484.94     |    39324.56     |${\color{green}\bf 3.60 \boldsymbol{\times}}$|    161.92       |     212280      |      3430       |
| bw6_761_msm_g2, 1000 arguments          |    12528071.10   |    4732393.47   |${\color{green}\bf 2.65 \boldsymbol{\times}}$|    13633.30     |     18020000    |      75330      |
| bw6_761_mul_projective_g1               |    1972.01       |    315.07       |${\color{green}\bf 6.26 \boldsymbol{\times}}$|    21.99        |     34.82       |      1.79       |
| bw6_761_mul_affine_g1                   |    1641.31       |    272.15       |${\color{green}\bf 6.03 \boldsymbol{\times}}$|    21.35        |     35.64       |      1.77       |
| bw6_761_mul_projective_g2               |    1969.34       |    314.97       |${\color{green}\bf 6.25 \boldsymbol{\times}}$|    21.64        |     35.42       |      1.78       |
| bw6_761_mul_affine_g2                   |    1641.21       |    273.36       |${\color{green}\bf 6.00 \boldsymbol{\times}}$|    21.57        |     34.68       |      1.78       |
| ed_on_bls12_381_msm_sw, 10 arguments    |    6663.28       |    3686.07      |${\color{green}\bf 1.81 \boldsymbol{\times}}$|    36.30        |     8610        |      376.61     |
| ed_on_bls12_381_msm_sw, 1000 arguments  |    296140.25     |    215932.66    |${\color{green}\bf 1.37 \boldsymbol{\times}}$|    2465.60      |     430700      |      6010       |
| ed_on_bls12_381_mul_projective_sw       |    229.24        |    228.69       |${\color{green}\bf 1.00 \boldsymbol{\times}}$|    6.69         |     24.89       |      0.36       |
| ed_on_bls12_381_mul_affine_sw           |    256.73        |    245.59       |${\color{green}\bf 1.05 \boldsymbol{\times}}$|    6.17         |     36.63       |      0.36       |
| ed_on_bls12_381_msm_te, 10 arguments    |    7813.27       |    3207.47      |${\color{green}\bf 2.44 \boldsymbol{\times}}$|    35.21        |     12470       |      560.82     |
| ed_on_bls12_381_msm_te, 1000 arguments  |    334199.35     |    242277.02    |${\color{green}\bf 1.38 \boldsymbol{\times}}$|    2391.21      |     533490      |      7890       |
| ed_on_bls12_381_mul_projective_te       |    246.05        |    219.86       |${\color{green}\bf 1.12 \boldsymbol{\times}}$|    7.69         |     22.37       |      0.83       |  
| ed_on_bls12_381_mul_affine_te           |    207.72        |    205.39       |${\color{green}\bf 1.01 \boldsymbol{\times}}$|    7.61         |     17.25       |      0.37       |
| ed_on_bls12_377_msm, 10 arguments       |    7768.41       |    3192.99      |${\color{green}\bf 2.43 \boldsymbol{\times}}$|    43.24        |     10060       |      553.69     | 
| ed_on_bls12_377_msm, 1000 arguments     |    357890.37     |    267844.08    |${\color{green}\bf 1.34 \boldsymbol{\times}}$|    2465.60      |     537810      |      7680       |
| ed_on_bls12_377_mul_projective          |    204.00        |    209.85       |${\color{red}\bf 1.03 \boldsymbol{\times}}$|    7.00         |     22.48       |      0.89       |
| ed_on_bls12_377_mul_affine              |    208.77        |    210.99       |${\color{red}\bf 1.01 \boldsymbol{\times}}$|    8.47         |     22.34       |      0.86       |

[^1]: implemented in a Substrate pallet with [arkworks](https://github.com/arkworks-rs/) library by this repo: https://github.com/achimcc/substrate-arkworks-examples
[^2]: implemented in a Substrate pallet with [ark-substrate](https://github.com/paritytech/ark-substrate) library, executed through host-function call, computed by this repo: https://github.com/achimcc/substrate-arkworks-examples
[^3]: speedup by using ark-substrate and host calls, compared to native speed
[^4]: These extrinsics just receive the arguemnts, deserialize them without using them and then take a generator or zero element of the expected return group, serizlize it and return it. **Calling a host call through a extrinsic which does nothing has been benchmarked with 3.98µs**. Implementation in: https://github.com/achimcc/substrate-arkworks-examples/tree/dummy-calls
[^5]: executed through wasmtime by this repo: [https://github.com/achimcc/native-bench-arkworks](https://github.com/achimcc/wasm-bench-arkworks)
[^6]: native execution, computed by this repo: https://github.com/achimcc/native-bench-arkworks
[^*]: we removed these host calls in the final ark-substrate implementation, since they didn't yield a performance improvement. Implementations can be found in the branches: https://github.com/paritytech/ark-substrate/tree/arkworks-host-function-mul and https://github.com/paritytech/substrate/tree/arkworks-host-function-mul


## Security considerations
The implementations should be as secure as the arkworks library itself, since all implementations are extensively tested through the same macros from the arkworks testing macro library.

## Alternatives
- There is an ongoing effport to speed operations on elliptic curves up in native WebAssembly. See iden3's implementation of elliptic curve pairings in native WebAssembly: https://github.com/iden3/wasmcurves. However, those libraries cover implement only a subset of the required features and only for one elliptic curve so far (BLS12_381).
- Zero Knowledge proofs and RingVRF'a remain slow in Polkadot.

## Questions and open Discussions (optional)

