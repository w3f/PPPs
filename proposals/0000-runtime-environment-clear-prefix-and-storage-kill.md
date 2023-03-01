---
Title: More fine grained control of `clear_prefix` and `storage_kill` from the runtime
Number: 0
Status: Proposed
Authors:
  - Bastian Köcher
Created: 2023-02-27
Category: Runtime Environment
Requires:
Replaces:
---

## Summary

Give the runtime more fine grained control over the internals of `clear_prefix` and `storage_kill`. 
We are proposing to introduce `ext_storage_clear_prefix_version_3`, `ext_default_child_storage_clear_prefix_version_3` 
and `ext_default_child_storage_storage_kill_version_3`. Notable changes are the introduction of a new 
third parameter `maybe_cursor` and the change of the return value to `MultiRemovalResults`. 
The `maybe_cursor` enables a runtime developer to start removing storage items from 
a defined position. The new return value will give more details on how many items were 
removed from the state and how many from the overlay etc.

## Motivation

Currently when a runtime developer calls `clear_prefix`/`kill_storage` with the
same set of parameters in the same context it leads to the same keys being deleted.
This can be quite confusing for runtime developers who are for example calling `clear_prefix`
with some `limit` multiple times and expecting `limit * number of calls` keys to be deleted.
While the actual result is that all calls remove exactly the same keys. They also don't get
any information on how many keys got deleted in the state and how got deleted in the overlay.

Let's say you have some lazy clean up functionality that can be triggered by
sending a transaction and then reward the sender. With the current implementation of 
`clear_prefix` you are only informed about the number of elements deleted in the state
and if all elements with the given `prefix` are deleted. This means that if you
include two transactions from different senders in one block, the second sender will
be rewarded while actually not having helped to delete any keys. For sure you could 
prevent this from happening ensuring that only one transaction is included per block. 
However, it would be a much better experience if the runtime developer is able to 
control `clear_prefix` more fine grained by providing the `cursor`. This would allow
the runtime developer to include multiple of these transactions in one block, because
each of them would be able to delete unique data in the state. The new `clear_prefix` 
would also give information on the total number of deleted keys, which includes
deletions from the state and the overlay, and total number of unique deletions
in the state. It also provides the next `cursor` as return value or `None` if
all keys with the `prefix` are deleted.

## Detailed Solution design

Introduce the following new host functions:

```rust
fn ext_storage_clear_prefix_version_3(prefix: u64, maybe_limit: u32, maybe_cursor: u64) -> u64;
fn ext_default_child_storage_clear_prefix_version_3(storage_key: u64, prefix: u64, maybe_limit: u32, maybe_cursor: u64) -> u64;
fn ext_default_child_storage_storage_kill_version_4(storage_key: u64, maybe_limit: u32, maybe_cursor: u64) -> u64;
```

The following list explains the parameters and the return value of all functions above:

- `prefix` is a packed `(ptr | length)` pointing to a memory area that must
be interpreted as a list of bytes. All keys that are going to be deleted must
start with `prefix`.
- `maybe_limit` must be interpreted as `unsigned 32 bits`. This
limit is either `2^32 - 1` which corresponds to no limit at all or to some other
number which should be taken as maximum number of keys to delete.
- `maybe_cursor` is a packed `(ptr | length)` pointing to a memory
area that must be interpreted as a list of bytes. Must be used as `cursor` if
length is greater than `0`. The `cursor` will be the first key to delete.
- `storage_key` is a packed `(ptr | length)` pointing to a memory
area that must be interpreted as a list of bytes. Defines the child trie to use
and must be of non-zero length.
- Return value is a packed `(ptr | length)` pointing to a memory area
that must be interpreted as SCALE-encoded `MultiRemovalResults`.

`MultiRemovalResults` is declared in Rust as:

```rust
struct MultiRemovalResults {
  /// A continuation cursor which, if `Some` must be provided to the subsequent removal call.
  /// If `None` then all removals are complete and no further calls are needed.
  /// Must be the key in the state after the last deleted key.
  pub maybe_cursor: Option<Vec<u8>>,
  /// The number of items removed from the state.
  ///
  /// Keys that are already in the overlay do not count towards keys being removed from state. E.g. the overlay already has
  /// key `AB`, the state also has `AB` and you are deleting with `prefix` `A`. `AB` would not be counted for `state`.
  pub state: u32,
  /// The number of unique keys removed, taking into account both the state and the overlay.
  pub unique: u32,
  /// The number of processed keys from the state. Should in maximum be `limit`.
  pub loops: u32,
}
```

### Implementation of `ext_storage_clear_prefix_version_3`

Clear keys from the state and the overlay of the currently modified keys that
are starting with `prefix`.`maybe_limit` defines the maximum number of keys to
delete from the state. The keys that are deleted in the overlay aren't counted
towards `maybe_limit`. If `maybe_cursor` is of non-zero length, the
implementation needs to seek the given `cursor` and start the iteration with
`cursor` (or the first key in lexicographical order after `cursor` if not present).
Returns `MultiRemovalResults` to inform the caller about the operation.

#### Examples

Let's assume our state looks like this (only showing keys, as values are not important):

| Key |
| ------------- |
| A  |
| B  |
| C  |
| CA  |
| CB  |
| CC |
| CD |
| D |
| E |

The overlay of currently modified keys looks like this (again only keys):

| Key |
| ------------- |
| A  |
| CB  |
| CD |
| CE |
| F |

In the following we use `clear_prefix` as Rust wrapper around
`ext_storage_clear_prefix_version_3`. For simplicity we represent the
`prefix` and `maybe_cursor` as string like literal.

1. Call `clear_prefix("A", u32::max_value(), "")`:

Expected result:
`MultiRemovalResults { maybe_cursors: None, state: 0, unique: 1, loops: 1 }`

Keys deleted: `[ A ]`


2. Call `clear_prefix("C", u32::max_value(), "")`:

Expected result:
`MultiRemovalResults { maybe_cursors: None, state: 2, unique: 6, loops: 5 }`

Keys deleted: `[ C, CA, CB, CC, CD, CE ]`


3. Call `clear_prefix("C", 2, "")`:

Expected result:
`MultiRemovalResults { maybe_cursors: Some("CB"), state: 2, unique: 5, loops: 2 }`

Keys deleted: `[ C, CA, CB, CD, CE ]`


4. Call `clear_prefix("C", 2, "CB")`:

Expected result:
`MultiRemovalResults { maybe_cursors: Some("CD"), state: 1, unique: 4, loops: 2 }`

Keys deleted: `[ CB, CC, CD, CE ]`


5. Call `clear_prefix("F", u32::max_value(), "")`:

Expected result:
`MultiRemovalResults { maybe_cursors: None, state: 0, unique: 1, loops: 0 }`

Keys deleted: `[ F ]`

### Implementation of `ext_default_child_storage_clear_prefix_version_3`

Follows the exact same implementation as `ext_storage_clear_prefix_version_3`,
but does the operation on the child trie defined by `storage_key`.

### Implementation of `ext_default_child_storage_storage_kill_version_4`

Follows the exact same implementation as `ext_storage_clear_prefix_version_3`,
but does the operation on the child trie defined by `storage_key`. As purpose of
this function is to delete the entire child trie, it doesn't take any `prefix`.

## Security considerations

The runtime is seen as a trusted code blob that don't require any special security considerations.

## Alternatives

Change `clear_prefix` and `kill_storage` to take into account the deleted keys
in the overlay to skip them while iterating the `state`. This approach let's
the node guess on the assumed operation of the runtime which isn't a great approach.

