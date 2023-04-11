---
Title: hashing with state host functions
Number: 0
Status: Proposed
Authors:
  - cheme
Created: 2023-04-xx
Category: Runtime Environment
Requires:
Replaces:
--- 


Current Implementation: https://github.com/cheme/substrate/tree/transient


## Summary

This PPPs defines new host functions to allow hashing data from a runtime in multiple steps. 

## Motivation

Hashing through host function involves passing all data at once, and is not memory efficient.
This could become an issue with data that is not specifically stored but generated from code, for instance log data.
Transient blob storage PPP would make this especially useful.

## Implementation

To avoid passing big chunk of bytes to the hasher new host functions allows incremental hashing from the runtime.

- `ext_hashing_get_hasher` with parameters:
	- algorithm: `Hash32Algorithm` passed as a byte, 0 for Blake2b256.
Returns an optional `HasherHandle`.
Handle is a u32 identifier.
Handle is obtain by incrementing a global handle counter and is always the highest used handle.
Counter only decrement for the latest handles.
Only u32 max value handle are obtainable, return none if past this limit.

- `ext_hashing_drop_hasher` with parameters:
	- hasher: an optional hasher handle (rust `Option<u32>`).
If hasher handler is passed, remove the hasher from the host for this handle.
If hasher handle is `None`, drop all instantiated hasher from the host.
When an handle is removed, its handle could only be used again after it was in last position.
For instance if handles 0 to 6 are instantiated and we drop handle 5, next call to `ext_hashing_get_hasher` will return 7.
It is only if handler 7 and 6 are dropped or finalized that handle 5 will be finalize in turn and could be return again
by `ext_hashing_get_hasher`.

- `ext_hashing_hasher_update` with parameters:
	- hasher: u32 hasher handle to use.
	- data: a pointer-size containing a buffer of byte content to send in the hasher.
Return false if there is no instantiated hasher for his handle.
Return true otherwhise.

- `ext_hashing_hasher_finaliez` with parameters:
	- hasher: u32 hasher handle to use.
Return an optional u32 byte array containing the final hash of all content send to the
hasher with update.
The hasher is dropped afterward (another call to hasher_update will return false).

## Security considerations

- hasher opaque handle value can be used from an extrinsic and lead to non determinism (when processing a block the inner value are deterministic but not runing things at a transaction level, but it this is also true for any transient storage).

## Alternatives

## Questions and open Discussions

- For transient blob storage usecase, these hashing host functions are only really usefull when using cumulus (otherwhise the data is already in the host memory) to avoid passing large array to the host.
Alternative could be to store in the host from cumulus, but does not sounds good (very impactful in term of memory).
Second alternative would be to pass the hasher internal state instead of an opaque pointer, so on the host side we don't have to keep state of all open hashers.
Third alternative is just to pass the memory at once and use old host function.

- `HasherHandle` are reclaimed when free and on terminal position, but they could just be never reclaimed.
