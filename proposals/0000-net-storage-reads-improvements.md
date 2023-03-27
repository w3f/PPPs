---
Title: Improvements to the networking storage read requests
Number: 0
Status: Proposed
Authors:
  - Pierre Krieger
Created: 2023-02-21
Category: Networking
Requires:
Replaces:
--- 

## Summary
Improve the networking messages that query storage items from the remote, in order to reduce the bandwidth usage and number of round trips of light clients.

## Motivation
Clients on the Polkadot peer-to-peer network can be divided into two categories: full nodes and light clients. So-called full nodes are nodes that store the content of the chain locally on their disk, while light clients are nodes that don't. In order to access for example the balance of an account, a full node can do a disk read, while a light client needs to send a network message to a full node and wait for the full node to reply with the desired value. This reply is in the form of a Merkle proof, which makes it possible for the light client to verify the exactness of the value.

Unfortunately, this network protocol is suffering from some issues:

- It is not possible for the querier to check whether a key exists in the storage of the chain except by querying the value of that key. The reply will thus include the value of the key, only for that value to be discarded by the querier that isn't interested by it. This is a waste of bandwidth.
- It is not possible for the querier to know whether a value in the storage of the chain has been modified between two blocks except by querying this value for both blocks and comparing them. Only a few storage values get modified in a block, and thus most of the time the comparison will be equal. This leads to a waste of bandwidth as the values have to be transferred.
- While it is possible to ask for multiple specific storage keys at the same time, it is not possible to ask for a list of keys that start with a certain prefix. Due to the way FRAME works, storage keys are grouped by "prefix", for example all account balances start with the same prefix. It is thus a common necessity for a light client to obtain the list of all keys (and possibly their values) that start with a specific prefix. This is currently not possible except by performing multiple queries serially that "walk down" the trie.

Once Polkadot and Kusama will have transitioned to `state_version = 1`, which modifies the format of the trie entries, it will be possible to generate Merkle proofs that contain only the hashes of values in the storage. Thanks to this, it is already possible to prove the existence of a key without sending its entire value (only its hash), or to prove that a value has changed or not between two blocks (by sending just their hashes).
Thus, the only reason why aforementioned issues exist is because the existing networking messages don't give the possibility for the querier to query this. This is what this proposal aims at fixing.

## Detailed Solution design
The protobuf schema of the networking protocol can be found here: https://github.com/paritytech/substrate/blob/5b6519a7ff4a2d3cc424d78bc4830688f3b184c0/client/network/light/src/schema/light.v1.proto

The proposal is to modify this protocol in this way:

```diff
@@ -11,6 +11,7 @@ message Request {
                RemoteReadRequest remote_read_request = 2;
                RemoteReadChildRequest remote_read_child_request = 4;
                // Note: ids 3 and 5 were used in the past. It would be preferable to not re-use them.
+               RemoteReadRequestV2 remote_read_request_v2 = 6;
        }
 }
 
@@ -48,6 +49,21 @@ message RemoteReadRequest {
        repeated bytes keys = 3;
 }
 
+message RemoteReadRequestV2 {
+       required bytes block = 1;
+       optional ChildTrieInfo child_trie_info = 2;  // Read from the main trie if missing.
+       repeated Key keys = 3;
+       optional bytes onlyKeysAfter = 4;
+}
+
+message ChildTrieInfo {
+       enum ChildTrieNamespace {
+               DEFAULT = 1;
+       }
+
+       required bytes hash = 1;
+       required ChildTrieNamespace namespace = 2;
+}
+
 // Remote read response.
 message RemoteReadResponse {
        // Read proof. If missing, indicates that the remote couldn't answer, for example because
@@ -65,3 +81,8 @@ message RemoteReadChildRequest {
        // Storage keys.
        repeated bytes keys = 6;
 }
+
+message Key {
+       required bytes key = 1;
+       optional bool skipValue = 2; // Defaults to `false` if missing
+       optional bool includeDescendants = 3; // Defaults to `false` if missing
+}
```

Note that the field names aren't very important as they are not sent over the wire. They can be changed at any time without any consequence. I would invite people to not discuss these field names as they are implementation details.

This diff adds a new type of request (`RemoteReadRequestV2`).

The new `child_trie_info` field in the request makes it possible to specify which trie is concerned by the request. The current networking protocol uses two different structs (`RemoteReadRequest` and `RemoteReadChildRequest`) for main trie and child trie queries, while this new request would make it possible to query either. This change doesn't fix any of the issues mentioned in the previous section, but is a side change that has been done for simplicity.
An alternative could have been to specify the `child_trie_info` for each individual `Key`. However this would make it necessary to send the child trie hash many times over the network, which leads to a waste of bandwidth, and in my opinion make things more complicated for no actual gain. If a querier would like to access more than one trie at the same time, it is always possible to send in parallel one query per trie.

If `skipValue` is `true` for a `Key`, then the value associated with this key isn't important to the querier, and the replier is encouraged to replace the value with its hash provided that the storage item has a `state_version` equal to 1. If the storage value has a `state_version` equal to 0, then the optimization isn't possible and the replier should behave as if `skipValue` was `false`.

If `includeDescendants` is `true` for a `Key`, then the replier must also include in the proof all keys that are descendant of the given key (in other words, its children, children of children, children of children of children, etc.). It must do so even if `key` itself doesn't have any storage value associated to it. The values of all of these descendants are replaced with their hashes if `skipValue` is `true`, similarly to `key` itself.

The optional `onlyKeysAfter` field can provide a lower bound for the keys contained in the proof. The responder must not include in its proof any node whose key is inferior or equal to the value in `onlyKeysAfter`. If no `onlyKeysAfter` is provided, the response must start with the root node of the trie.
In order for the logic of the `onlyKeysAfter` field to work properly, the proof generation must be deterministic. In other words, the response to a specific request (specifically the proof contained in the response) should always be the same no matter which peer is queried. In order for this to be the case, the response must always contain the keys and nodes in lexicographical order. No ordering was enforced before this proposal. After this proposal, a proof is invalid if it doesn't respect the order.

For the purpose of this networking protocol, it should be considered as if the main trie contained an entry for each default child trie whose key is `concat(":child_storage:default:", child_trie_hash)` and whose value is equal to the trie root hash of that default child trie. This behavior is consistent with what the host functions observe when querying the storage. This behavior is present in the existing networking protocol, in other words this proposal doesn't change anything to the situation, but it is worth mentioning.

## Security considerations
The main security consideration concerns the size of replies and the resources necessary to generate them. It is for example easily possible to ask for all keys and values of the chain, which would take a very long time to generate. Since responses to this networking protocol have a maximum size, the replier should discard queries that would lead to a too large reply unless that reply only contains only a single entry. Note that it is already possible to send a query that would lead to a very large reply with the existing network protocol. The only thing that this proposal changes is that it would make it less complicated to perform such an attack.

Implementers of the replier side should be careful to detect early on when a reply would exceed the maximum reply size, rather than inconditionally generate a reply, as this could take a very large amount of CPU, disk I/O, and memory. Existing implementations might currently be accidentally protected from such an attack thanks to the fact that requests have a maximum size, and thus that the list of keys in the query was bounded. After this proposal, this accidental protection would no longer exist.

It is not possible for the querier to know in advance whether its query will lead to a reply that exceeds the maximum size. If the reply is too large, the replier should send back a truncated proof. The querier should then send the same request, but with a value of `onlyKeysAfter` equal to the last key of the previous response. Because the proof generation is deterministic, additional requests can be sent either to the same peer or to a different one.

## Alternatives
I don't really see any alternative way of solving the issues exposed.

Not doing this change leads to the current situation, where light clients download more data than necessary and preform more networking round trips than necessary.

This is particularly problematic in three situations:

- When querying large number of keys, such as the list of validators. The query requires around 5 to 6 round trips where the multiple replies overlap a lot, and the replies include the values only for them to be immediately discarded.
- When checking whether storage values have changed between two blocks. There is no way to "watch" a value, except download it at every block.
- At initialization, the light client always needs to download the runtime code, which takes a long time, while after this change it will be possible to cache the runtime code on disk and check whether it has changed since then.
