---
Title: Elliptic Curve Host Functions
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
 Proposal to add host functions for [Arkworks](http://arkworks.rs/) to Polkadot. We provide Elliptic curves (bls12_381, bls12_377, ed_on_bls12_381, ed_on_bls12_77, bw6_761), were we replace the compute intense operations by host function calls.

## Motivation
Usually cryptographic operations on elliptic curves are slow in WebAssembly. Replacing those operations by host functoin calls into binary code allows us to drastically improve the performace of the cryptographic tools which rely on those operations.

## Detailed Solution design
We implement host function calls into the underlying arithmetic operations on elliptic curves for `BLS12_377`, `BLS12_381`, `BW6_761`, `ED_ON_BLS12_377` and `ED_ON_BLS12_381_BANDERSNATCH` by host function calls.

We introduce new host functions calls which are grouped under `elliptic_curves` in `/primitives/io/src/lib.rs`. Those host function calls receive serialized curve points of elliptic curves, deserialize them, call into native arkworks code to perform computations. Finally they serialize the result and return them as `Vec<u8>`.

We add the following host functions:

```rust
/// Compute a multi Miller loop on bls12_381
fn bls12_381_multi_miller_loop(a: Vec<Vec<u8>>, b: Vec<Vec<u8>>) -> Result<Vec<u8>, ()> 

/// Compute a final exponentiation on bls12_381
fn bls12_381_final_exponentiation(f12: Vec<u8>) -> Result<Vec<u8>, ()> 

/// Compute a projective multiplication on G1 for bls12_381
fn bls12_381_mul_projective_g1(base: Vec<u8>, scalar: Vec<u8>) -> Result<Vec<u8>, ()> 

/// Compute a projective multiplication on G2 for bls12_381
fn bls12_381_mul_projective_g2(base: Vec<u8>, scalar: Vec<u8>) -> Result<Vec<u8>, ()>

/// Compute a msm on G1 for bls12_381
fn bls12_381_msm_g1(bases: Vec<Vec<u8>>, scalars: Vec<Vec<u8>>) -> Result<Vec<u8>, ()>

/// Compute a msm on G2 for bls12_381
fn bls12_381_msm_g2(bases: Vec<Vec<u8>>, scalars: Vec<Vec<u8>>) -> Result<Vec<u8>, ()> 

/// Compute a multi Miller loop for bls12_377
fn bls12_377_multi_miller_loop(a: Vec<Vec<u8>>, b: Vec<Vec<u8>>) -> Result<Vec<u8>, ()>

/// Compute a final exponentiation for bls12_377
fn bls12_377_final_exponentiation(f12: Vec<u8>) -> Result<Vec<u8>, ()> 

/// Compute a projective multiplication on G1 for bls12_377
fn bls12_377_mul_projective_g1(base: Vec<u8>, scalar: Vec<u8>) -> Result<Vec<u8>, ()> 

/// Compute a projective multiplication on G2 for bls12_377
fn bls12_377_mul_projective_g2(base: Vec<u8>, scalar: Vec<u8>) -> Result<Vec<u8>, ()>

/// Compute a msm on G1 for bls12_377
fn bls12_377_msm_g1(bases: Vec<Vec<u8>>, scalars: Vec<Vec<u8>>) -> Result<Vec<u8>, ()> 

/// Compute a msm on G2 for bls12_377
fn bls12_377_msm_g2(bases: Vec<Vec<u8>>, scalars: Vec<Vec<u8>>) -> Result<Vec<u8>, ()>

/// Compute a multi Miller loop on bw6_761
fn bw6_761_multi_miller_loop(a: Vec<Vec<u8>>, b: Vec<Vec<u8>>) -> Result<Vec<u8>, ()> 

/// Compute a final exponentiation on bw6_761
fn bw6_761_final_exponentiation(f12: Vec<u8>) -> Result<Vec<u8>, ()> 

/// Compute a projective multiplication on G1 for bw6_761
fn bw6_761_mul_projective_g1(base: Vec<u8>, scalar: Vec<u8>) -> Result<Vec<u8>, ()>

/// Compute a projective multiplication on G2 for bw6_761
fn bw6_761_mul_projective_g2(base: Vec<u8>, scalar: Vec<u8>) -> Result<Vec<u8>, ()>

/// Compute a msm on G1 for bw6_761
fn bw6_761_msm_g1(bases: Vec<Vec<u8>>, bigints: Vec<Vec<u8>>) -> Result<Vec<u8>, ()>

/// Compute a msm on G2 for bw6_761
fn bw6_761_msm_g2(bases: Vec<Vec<u8>>, bigints: Vec<Vec<u8>>) -> Result<Vec<u8>, ()> 

/// Compute twisted edwards projective multiplication on ed_on_bls12_381
fn ed_on_bls12_381_bandersnatch_te_mul_projective(base: Vec<u8>, scalar: Vec<u8>) -> Result<Vec<u8>, ()>

/// Compute short weierstrass projective multiplication on ed_on_bls12_381
fn ed_on_bls12_381_sw_mul_projective(base: Vec<u8>, scalar: Vec<u8>) -> Result<Vec<u8>, ()>

/// Compute twisted edwards msm on ed_on_bls12_381
fn ed_on_bls12_381_bandersnatch_te_msm(bases: Vec<Vec<u8>>, scalars: Vec<Vec<u8>>) -> Result<Vec<u8>, ()>

/// Compute short weierstrass msm on ed_on_bls12_381
fn ed_on_bls12_381_bandersnatch_sw_msm(bases: Vec<Vec<u8>>, scalars: Vec<Vec<u8>>) -> Result<Vec<u8>, ()>

/// Compute projective multiplication on ed_on_bls12_377
fn ed_on_bls12_377_mul_projective(base: Vec<u8>, scalar: Vec<u8>) -> Result<Vec<u8>, ()>

/// Compute msm on ed_on_bls12_377
fn ed_on_bls12_377_msm(bases: Vec<Vec<u8>>, scalars: Vec<Vec<u8>>) -> Result<Vec<u8>, ()>
```

While the host-functions themself are implemented under `/primitives/io/src/lib.rs`, they call into their actual implementations which can be found in the `/primitives/io/arkworks` sub-crate.

Those host functions calls are used by the [ark-substrate]() library. When using elliptic curves from ark-substrate, one passes the required host-function by depdendency injection. This allows for a clean separation of concerns and to keep the amount of code contributed to Polkadot itself as minimal as possible.

For testing purposes, we are able to re-use the extensive arkworks testing macros, those tests are performed under `/primitives/arkworks/tests` folder.

Example implementations and benchmarks for the code can be found under: https://github.com/achimcc/substrate-arkworks-examples.

### Benchmarking results
The following comparison table of benchmarking results should justify the introduction of the new host functions:

| extrinsic                               |  arkworkrs(µs)[^1]  |ark-substrate(µs)[^2]|   speedup[^3]   |  dummy(µs)[^4]  |  native(µs)[^5] |
| --------------------------------------- |  --------------- | --------------- | --------------- | --------------- | --------------- |
| groth16_verification (bls12_381)                     |    23335.84      |    3569.35      |${\color{green}\bf 6.54 \boldsymbol{\times}}$|    190.80       |      3440       | 
| bls12_381_pairing                                    |    9092.61       |    1390.80      |${\color{green}\bf 6.54 \boldsymbol{\times}}$|    24.64        |      1270       |
| bls12_381_msm_g1, 10 arguments                       |    6921.99       |    949.58       |${\color{green}\bf 7.29 \boldsymbol{\times}}$|    50.07        |      568.89     |
| bls12_381_msm_g1, 1000 arguments                     |    194969.80     |    30158.23     |${\color{green}\bf 6.46 \boldsymbol{\times}}$|    2169.47      |      10750      |
| bls12_381_msm_g2, 10 arguments                       |    21513.87      |    2870.33      |${\color{green}\bf 7.57 \boldsymbol{\times}}$|    50.06        |      1600       |
| bls12_381_msm_g2, 1000 arguments                     |    621769.22     |    100801.74    |${\color{green}\bf 7.50 \boldsymbol{\times}}$|    3640.63      |      31900      |
| bls12_381_mul_projective_g1                          |    486.34        |    75.01        |${\color{green}\bf 6.48 \boldsymbol{\times}}$|    11.94        |      45.59      |
| bls12_381_mul_affine_g1                              |    420.01        |    79.26        |${\color{green}\bf 5.30 \boldsymbol{\times}}$|    11.11        |      38.74      |
| bls12_381_mul_projective_g2                          |    1498.84       |    210.50       |${\color{green}\bf 7.12 \boldsymbol{\times}}$|    14.63        |      146.93    |
| bls12_381_mul_affine_g2                              |    1234.92       |    214.00       |${\color{green}\bf 5.77 \boldsymbol{\times}}$|    13.17        |      123.68     |
| bls12_377_pairing                                    |    8904.20       |    1449.52      |${\color{green}\bf 6.14 \boldsymbol{\times}}$|    25.88        |      1470       |
| bls12_377_msm_g1, 10 arguments                       |    6592.47       |    902.50       |${\color{green}\bf 7.30 \boldsymbol{\times}}$|    29.20        |      582.19    | 
| bls12_377_msm_g1, 1000 arguments                     |    191793.87     |    28828.95     |${\color{green}\bf 6.65 \boldsymbol{\times}}$|    1307.62      |      11000      |
| bls12_377_msm_g2, 10 arguments                       |    22509.51      |    3251.84      |${\color{green}\bf 6.92 \boldsymbol{\times}}$|    35.06        |      1860       |
| bls12_377_msm_g2, 1000 arguments                     |    632339.00     |    94521.78     |${\color{green}\bf 6.69 \boldsymbol{\times}}$|    2556.48      |      36020      |
| bls12_377_mul_projective_g1                          |    424.21        |    65.68        |${\color{green}\bf 6.46 \boldsymbol{\times}}$|    11.76        |      46.54      |
| bls12_377_mul_affine_g1                              |    363.85        |    65.68        |${\color{green}\bf 5.54 \boldsymbol{\times}}$|    10.50        |      39.81      |
| bls12_377_mul_projective_g2                          |    1339.39       |    212.20       |${\color{green}\bf 6.31 \boldsymbol{\times}}$|    14.56        |      167.91     |
| bls12_377_mul_affine_g2                              |    1122.08       |    208.74       |${\color{green}\bf 5.38 \boldsymbol{\times}}$|    13.08        |      141.49     |
| bw6_761_pairing                                      |    52065.18      |    6791.27      |${\color{green}\bf 7.67 \boldsymbol{\times}}$|    34.70        |      6780       |
| bw6_761_msm_g1, 10 arguments                         |    47050.21      |    5559.53      |${\color{green}\bf 8.46 \boldsymbol{\times}}$|    67.79        |      2760       |
| bw6_761_msm_g1, 1000 arguments                       |    1167536.06    |    143517.21    |${\color{green}\bf 8.14 \boldsymbol{\times}}$|    4630.95      |      56680      | 
| bw6_761_msm_g2, 10 arguments                         |    41055.89      |    4874.46      |${\color{green}\bf 8.42 \boldsymbol{\times}}$|    58.37        |      2960       |
| bw6_761_msm_g2, 1000 arguments                       |    1209593.25    |    143437.77    |${\color{green}\bf 8.43 \boldsymbol{\times}}$|    4345.36      |      74550      |
| bw6_761_mul_projective_g1                            |    1678.86       |    223.57       |${\color{green}\bf 7.51 \boldsymbol{\times}}$|    27.54        |      221.73     |
| bw6_761_mul_affine_g1                                |    1387.87       |    222.05       |${\color{green}\bf 6.25 \boldsymbol{\times}}$|    27.55        |      183.16     |
| bw6_761_mul_projective_g2                            |    1919.98       |    308.60       |${\color{green}\bf 6.22 \boldsymbol{\times}}$|    26.99        |      221.75     |
| bw6_761_mul_affine_g2                                |    1388.21       |    222.47       |${\color{green}\bf 6.24 \boldsymbol{\times}}$|    21.90        |      184.79     |
| ed_on_bls12_381_bandersnatch_msm_sw, 10 arguments    |    3616.81       |    557.96       |${\color{green}\bf 6.48 \boldsymbol{\times}}$|    21.43        |      457.93     |
| ed_on_bls12_381_bandersnatch_msm_sw, 1000 arguments  |    94473.54      |    16254.32     |${\color{green}\bf 5.81 \boldsymbol{\times}}$|    982.29      |      7460       |
| ed_on_bls12_381_bandersnatch_mul_projective_sw       |    235.38        |    40.70        |${\color{green}\bf 5.78 \boldsymbol{\times}}$|    9.03        |      33.12      |
| ed_on_bls12_381_bandersnatch_mul_affine_sw           |    204.04        |    41.66        |${\color{green}\bf 4.90 \boldsymbol{\times}}$|    8.78        |      29.50     |
| ed_on_bls12_381_bandersnatch_msm_te, 10 arguments    |    5427.77       |    744.74       |${\color{green}\bf 7.29 \boldsymbol{\times}}$|    24.05        |      538.16     |
| ed_on_bls12_381_bandersnatch_msm_te, 1000 arguments  |    106610.20     |    16690.71     |${\color{green}\bf 6.39 \boldsymbol{\times}}$|    1195.35      |      7460       |
| ed_on_bls12_381_bandersnatch_mul_projective_te       |    183.29        |    34.63        |${\color{green}\bf 5.29 \boldsymbol{\times}}$|    9.55        |      24.83      |  
| ed_on_bls12_381_bandersnatch_mul_affine_te           |    181.84        |    33.99        |${\color{green}\bf 5.35 \boldsymbol{\times}}$|    9.50        |      29.47      |
| ed_on_bls12_377_msm, 10 arguments                    |    5304.03       |    700.51       |${\color{green}\bf 7.57 \boldsymbol{\times}}$|    24.02        |      523.27     | 
| ed_on_bls12_377_msm, 1000 arguments                  |    105563.53     |    15757.62     |${\color{green}\bf 6.70 \boldsymbol{\times}}$|    1200.45      |      7370       |
| ed_on_bls12_377_mul_projective                       |    179.54        |    32.72        |${\color{green}\bf 5.49 \boldsymbol{\times}}$|    9.72        |      24.07      |
| ed_on_bls12_377_mul_affine                           |    177.53        |    33.24        |${\color{green}\bf 5.34 \boldsymbol{\times}}$|    9.76        |      23.90      |

[^1]: implemented in a Substrate pallet with [arkworks](https://github.com/arkworks-rs/) library by this repo: https://github.com/achimcc/substrate-arkworks-examples
[^2]: implemented in a Substrate pallet with [ark-substrate](https://github.com/paritytech/ark-substrate) library, executed through host-function call, computed by this repo: https://github.com/achimcc/substrate-arkworks-examples
[^3]: speedup by using ark-substrate and host calls, compared to native speed
[^4]: These extrinsics just receive the arguemnts, deserialize them without using them and then take a generator or zero element of the expected return group, serizlize it and return it. **Calling a host call through a extrinsic which does nothing has been benchmarked with 3.98µs**. Implementation in: https://github.com/achimcc/substrate-arkworks-examples/tree/dummy-calls
[^5]: native execution, computed by this repo: https://github.com/achimcc/native-bench-arkworks


## Security considerations
The implementations should be as secure as the arkworks library itself, since all implementations are extensively tested through the same macros from the arkworks testing macro library.

## Alternatives
- There is an ongoing effport to speed operations on elliptic curves up in native WebAssembly. See iden3's implementation of elliptic curve pairings in native WebAssembly: https://github.com/iden3/wasmcurves. However, those libraries cover implement only a subset of the required features and only for one elliptic curve so far (BLS12_381).
- Zero Knowledge proofs and RingVRF'a remain slow in Polkadot.

## Questions and open Discussions (optional)

