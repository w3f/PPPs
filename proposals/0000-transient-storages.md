---
Title: transient storage host functions
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

This PPPs defines new host functions to keep trace of transient data accross a block processing.

It is derived and modified from initial writing https://github.com/paritytech/substrate/issues/12577, credits to Gavin Wood.

It exposes two new sets of host functions, blob storage an api around bytes storage (similar to rust  `Vec<u8>`), and ordered key values storage (similar to rust `BTreeMap<Vec<u8>, Vec<u8>>` storage).

Each storage structure are defined and address by a name with no limit in number except the block weight.
Each structure can be hashed or reduced to a single merkle root to possible store it on state.
Each structure can define if it should be send to client storage.

## Motivation

From https://github.com/paritytech/substrate/issues/5396: 
"Right now we abuse storage for intra-block data such as block number, parent hash and block author as well as various housekeeping information and flags like whether we set the uncles Authorship::DidSetUncles.

When initially writing, this incurs an extra trie lookup, which is slow. Instead there should be another host API, which works exactly like set_storage/get_storage but has no trie backing, so it never tries to lookup the value in the trie, nor does it write the value at the end of the block." Credits Gavin Wood.

Additionally content such as events often are used in a log based manner (append only) with possibly a larger size than usual content.

## Implementation

Transient storage act as current state storage, but without a persistent backend.

This implies that the storage must support commiting and reverting transaction with `ext_storage_commit_transaction` or `ext_storage_rollback_transaction`.
This transactional support is both at transient storage content and at transient storage definition (a delete transient storage will be restore on rollback).

Ordered map and blob are using a specific `Mode`, either `drop` or `archive` passed respectively as the byte 0 or 1.

In `drop` mode the transient data is not expected to be accessed outside the current block execution. When `archive` is define, client should provide specific persistence for this data.

In `archive` mode, a persistence is expected to be done by the client.

### Implementation of ordered map storage

- `ext_ordered_map_storage_new` with parameters:
  - name : a pointer size to the name of the new transient storage.
  - mode : `Mode` as an u8 (either 0 `drop` or 1 `archive).
No result.
Allows using a transient storage for a given `name` and `mode`.
If a transient storage already exists with the same `name`, it is overwritten.

- `ext_ordered_map_storage_exists` with parameters:
  - name : a pointer size to the name of a transient storage.
Result is a boolean indicating if transient storage was instantiated.

- `ext_ordered_map_storage_delete` with parameters:
  - name : a pointer size to the name of a transient storage.
Result true if a transient storage did exist and was removed, and false if no
transient storage did exist.


- `ext_ordered_map_storage_clone` with parameters:
  - name : a pointer size to the name of a transient storage to clone.
  - target_name : a pointer size to the new transient storage to use.
Result is a true if operation succeed and false if there was no storage at `name`.
Clone keep same `Mode`. Clone copy all content from a storage to another storage.
If a transient storage is present at `target_name` it is overwritten.

This operation cost is high, the implementation do not try to avoid copy.

- `ext_ordered_map_storage_rename` with parameters:
  - name : a pointer size to the name of a transient storage to rename.
  - target_name : the new name to use.
Result is a true if operation succeed and false if there was no storage at `name`.

Renaming iternally rename the storage. As `name` is the main way to address a storage,
it is very likelly to be implemented as a move in an indexing structure.
As all this need to be transactional and revertable.

If a transient storage is present at `target_name` it is overwritten.

This operation cost is small, there should be no copy of storage content.


- `ext_ordered_map_storage_insert_item` with parameters:
  - name : a pointer size to the name of a transient storage to rename.
  - key : a pointer size to the key of the content to insert.
  - value : a pointer size to the value of the content to insert.
Returns false if there is no ordered_map storage defined for this `name`, true otherwhise (success).

This insert a new key value content. 
If an item already exists for the `key` it is overwritten.
Does nothing if the ordered_map storage of this `name` doesn't exist.


- `ext_ordered_map_storage_remove_item` with parameters:
  - name : a pointer size to the name of a transient storage to rename.
  - key : a pointer size to the key of the content to insert.
Returns true when a key and content where removed, false otherwhise.

This attempts to remove a content at a given key.

- `ext_ordered_map_storage_contains_item` with parameters:
  - name : a pointer size to the name of a transient storage to rename.
  - key : a pointer size to the key of the content to insert.
Returns true when a key and content exists, false otherwhise.

- `ext_ordered_map_storage_get_item` with parameters:
  - name : a pointer size to the name of a transient storage to rename.
  - key : a pointer size to the key of the content to insert.
Returns an optional bytes content containing the value associated with the given key.

- `ext_ordered_map_storage_read_item` with parameters:
  - name : a pointer size to the name of a transient storage to rename.
  - key : a pointer size to the key of the content to insert.
  - `value_out` :  a pointer-size containing the buffer to which the value will be written to.
  - `value_offset` : a u32 offset on the value.
Returns an optional size of content written in the buffer (None if the content associated with key is not found).
The size written can only differ from the buffer size if there is not enough content to read.

- `ext_ordered_map_storage_len_item` with parameters:
  - name : a pointer size to the name of a transient storage to rename.
  - key : a pointer size to the key of the content to insert.
Returns an optional size of value content when the key exists.


- `ext_ordered_map_storage_count` with parameters:
  - name : a pointer size to the name of a transient storage to rename.
Returns an optional u32 number of element currently in the ordered map.
This should be a small cost operation (implementation needs to maintain a count of content).


- `ext_ordered_map_storage_hash32_item` with parameters:
  - name : a pointer size to the name of a transient storage to rename.
  - key : a pointer size to the key of the content to insert.
  - algorithm: `Hash32Algorithm` passed as a byte, 0 for Blake2b256.
Returns an optional 32 bytes buffer containing the hash of the value when the content exists.

This can be a costy on big value, but then it would be the blob usecase, therefore no caching of result is expecting from implementation.

- `ext_ordered_map_storage_next_keys` with parameters:
  - name : a pointer size to the name of a transient storage to rename.
  - key: a pointer size to the previously accessed key.
  - count: a u32 indicating the maximum number of key to return.
Returns a scale encoded optional sized array of keys (rust `Option<Vec<Vec<u8>>>`).
Returns a SCALE-encoded `None` if there is no transient storage.
Returns a SCALE-encoded `Some(vec![])` if the `key` is the last key or after the last key of that transient storage.

- `ext_ordered_map_storage_root32` with parameters:
  - name : a pointer size to the name of a transient storage to rename.
  - structure: `Root32Structure` passed as a byte, 0 for `SubstrateDefault` which is the same merkle trie implementation as the substrate trie.
Returns an optional 32 bytes buffer containing the root hash for the current state or nothing if there is no transient storage for the given name.

This call is very costy. Implementation shall at least cache hash result when state did not change.

- `ext_ordered_map_storage_dump` with parameters:
  - name : a pointer size to the name of a transient storage to rename.
Returns an scale encoded optional vector of key value with all the key value content from the transient ordered map (in rust `Option<Vec<(Vec<u8>, Vec<u8>)>>`).

- `ext_ordered_map_storage_dump_hashed` with parameters:
  - name : a pointer size to the name of a transient storage to rename.
  - algorithm: `Hash32Algorithm` passed as a byte, 0 for Blake2b256.
Returns an scale encoded optional vector of key value with hash of key and hash of value from the transient ordered map (in rust `Option<Vec<([u8; 32], [u8; 32])>>`).

### Implementation of Blob storage

If it sounds easy to store a blob of byte as a single entry of an ordered map storage, a different api is defined to focus on managing larger bytes array efficiently.

Internally blob storage is acting as an array of bytes chunk. This sets the granularity for transactional support. The chunk size is 256 bytes.

Most of the api is working the same way as for the ordered map storage, please notice that `name` are isolated from ordered map `name`: a ordered map and
a blob can use the same name without conflicts.

- `ext_blob_storage_new`, same as `ext_ordered_map_storage_new` for a blob.

- `ext_blob_storage_exists`, same as `ext_ordered_map_storage_exists` for a blob.

- `ext_blob_storage_delete`, same as `ext_ordered_map_storage_delete` for a blob.

- `ext_blob_storage_clone`, same as `ext_ordered_map_storage_clone` for a blob.

- `ext_blob_storage_rename`, same as `ext_ordered_map_storage_rename` for a blob.

- `ext_blob_storage_set` with parameters:
  - name : a pointer size to the name of a transient storage to rename.
  - value : a pointer size to a buffer of bytes to write.
  - offset : the position where the value shall be written
Returns true if written, false otherwhise.

Reason for returning false can be either no instantiated blob for `name` or an offset bigger than the current length of the blob.

When value is written on existing blob content, it overwrites it. If value is too big to be written in the blog, the blog size will increase.

If final blob size is bigger than u32::max, the calls is a noops and return false.

Does nothing and return false if the blob storage of this `name` doesn't exist.

- `ext_blob_storage_truncate` with parameters:
  - name : a pointer size to the name of a transient storage to rename.
  - at : the new size for the blob storage as u32.
Truncate the blob to a new size. Return true if content was truncated, false otherwhise.

- `ext_blob_storage_read` with parameters:
  - name : a pointer size to the name of a transient storage to rename.
  - `value_out` :  a pointer-size containing the buffer to which the value will be written to.
  - `offset` : a u32 offset in the blog.

Returns an optional size of content written in the buffer (None if the blob is not found).
The size written can only differ from the buffer size if there is not enough content to read.
0 is also return for size if `offset` is bigger than the blob size.

- `ext_blob_storage_get` with parameters:
  - name : a pointer size to the name of a transient storage to rename.

Returns an optional full blob value.

- `ext_blob_storage_len` with parameters:
  - name : a pointer size to the name of a transient storage to rename.

Returns an optional byte size of the current blob.

- `ext_blob_storage_hash32` with parameters:
  - name : a pointer size to the name of a transient storage to rename.
  - algorithm: `Hash32Algorithm` passed as a byte, 0 for Blake2b256.
Returns an optional 32 byte hash of the current blob.

The hash shall be cached between two call with no blob content changes.


## Security considerations

- blob access can grow in memory

## Alternatives

## Questions and open Discussions

- `new` behavior on existing content is discutable, could just return `false` and noops if a transient storage already exists. I would actually quiet like this change.
Similarilly the overwriting of the destination on clone or move is discutable.

- `exists` (not in original issue) seems needed, but maybe a few changes would remove this need.
An alternative would also be to return Option<`Mode`> so you can see the current mode from an extrinsic.

- `rename` is not the most trivial when it comes to transactional implementation (but there is certainly way to have simplier implementation).

- `clone` we could have a smarter implementation where we Ref count content and clone only on write.

- ext_ordered_map_storage_root32_dump and ext_ordered_map_storage_root32_dump_hashed: I am really not sure if those should be exposed (looks more like debugging calls that should not be part of any production runtime).

- ext_ordered_map_storage_next_keys: Would be a good idea to pass the previous key as Option<&[u8]> so we can include the very first value. Currently value &[] need to be queried manually if it can be defined. I am not sure it is needed (and not sure if Option<&[u8]> passing efficiently is easy).

- ext_ordered_map_storage_next_keys: Maybe result should be a Vec<u8> and a Vec<u32> to avoid scale encoding (all keys in same buff and an array of key offset).

- ext_ordered_map_storage_remove_item or ext_ordered_map_storage_contains_item or ext_ordered_map_storage_get_item, the result do not allow to distinguish between a non instantiated transient storage and a key not present in the storage.

- ext_ordered_map_storage_hash32_item: in its current form (no caching), it does not provide much over just accessing content and then calling the host hash function. At this point, I would suggest removing it.

- ext_ordered_map_storage_root32_item: the caching is rudimentary. A plain trie structure could be kept in memory for minimal work between two calls. Currently I only did cache the hash if the ordered_map do not change.

- Hash32Algorithm currently is only blake2b 256, probably need other variant to make sense, I would suggest blake3 (even if the current api is not handling its internal tree structure).

- ext_blob_storage_set: the limit size at u32max is way too much as we probably don't allow that much wasm memory, should define another one.

- ext_blob_truncate: maybe return true if the truncate size is the same as the current size.

- ext_blob_storage_get: involve concatenating all blob chunks, maybe a chunk based api could be better.

- read operation: maybe return false when offset is bigger than value size (instead of 0 length written).

- Transient items are explicitely instantiated and access to undefined transient structure do not create them (even if access is appending byte or inserting key value).
This is not how for instant current child trie works (undefined is always just an empty structure).
This force instantiating specifically. I think it is a good direction since the implicitely instantiation and removal of child trie was often criticized.

- In current implementation transient items are managed as child state (see branch for design in primitive/storage/src/lib.rs).

- The size of the blob chunk (and also the need for a blob chunk management) can probably be change. The current need I see is that it would be alignable with 64 bytes word and with the blake3 block size (64k).

256 byte might be way to small, probably could be pushed to 1024.

- The api allow accessing more than a blob chunk at a time, the current implementation then instantiate and concat chunk, maybe being more restrictive (single chunk access) would make the impact more evident.
For instance accessing a full blob means concatenating all chunks each time, my opinion is that if we shall not try to cache such access (for this use case ordered map entry can be use).

- Instead of chunking we could store variable length diff in the transaction layer, at first glance it looks a bit less efficient to me considering access. But we could favor size and change this to works with incremental variable length diffs.

- Archive storage: the default implementation for substrate is just storing and applying pruning as standard storage (same pruning range as state).
Key for blob are `b"TransientBlobsItem" ++ block_hash ++ blob_name`.
Key for ordered map items are `b"TransientOrterdedMapItem" ++ block_hash ++ ordered_map_name ++ ordered_map_item_key`.
Data is put in `AUX` column.
Trait `TransientStorageHook` to allows extending or replacing this behavior (for instance to index specific items).
This trait is usable through library dynamic linking.
Here a big question is this library linking as it is always awkward to support (please refer to implementation in `client/db/src/transient_storage.rs`).
