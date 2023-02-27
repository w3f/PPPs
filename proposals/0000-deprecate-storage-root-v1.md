---
Title: Deprecate the `ext_storage_root_version_2` and `ext_default_child_storage_root_version_2` host functions
Number: 0
Status: Proposed
Authors:
  - Pierre Krieger
Created: 2023-02-27
Category: Runtime environment
Requires:
Replaces:
--- 

## Summary
The `ext_storage_root_version_2` and `ext_default_child_storage_root_version_2` host functions have been introduced as part of the so-called "trie v1" feature. However, they don't actually bring any advantage compared to `ext_storage_root_version_1` and `ext_default_child_storage_root_version_1`, and even introduce a corner case. This RFC proposes to deprecate these functions in favor of their predecesors.

## Motivation
The so-called "trie v1" feature has been merged in Substrate at the end of 2021. It has recently been deployed on Westend, and it is intended to be deployed on Polkadot and Kusama in the near future.

In the "trie v1" feature, each node of the trie that has a storage value now also has a version number attached to it. This version number can be either 0 or 1.
The `state_version` field in the runtime specification indicates the version number to attach to the storage value whenever a write is performed.

As part of the "trie v1" feature, two new host functions have been introduced: `ext_storage_root_version_2` and `ext_default_child_storage_root_version_2`.
These two new host functions behave the same way as `ext_storage_root_version_1` and `ext_default_child_storage_root_version_1`, except that they accept an additional parameter containing the `state_version`. The value provided by the runtime must always be the same as the value of the `state_version` field of the runtime specification.

This extra parameter is problematic for two reasons:

- It is redundant with the `state_version` field found in the runtime specification. This introduces a corner case: what if the parameter provided to `ext_storage_root_version_2` or `ext_default_child_storage_root_version_2` has a different value than the field in the runtime specification? There is no clear to answer to that question, as it is clearly not something that a runtime is ever supposed to do.

- The fact that the parameter is provided to the function meant to calculate the trie root hash gives the wrong impression that the provided `state_version` applies to the entire trie. This isn't the case, as each storage value of the trie has a `state_version` attached to it depending on when it was written, and a trie can contain a mix of version 0 and version 1 items. It would have been less confusing to provide this parameter to `ext_storage_set_version_1` and `ext_default_child_storage_set_version_1`.

After discussion with some people, it seems that the introduction of these two host functions is indeed a mistake and was the result of a previous design experiment.

## Detailed Solution design
The `ext_storage_root_version_2` and `ext_default_child_storage_root_version_2` host functions should be deprecated. Runtimes are encouraged to use `ext_storage_root_version_1` and `ext_default_child_storage_root_version_1` instead.

## Security considerations
No change in the security implications.

## Alternatives
Irrelevant section.

## Questions and open Discussions (optional)
No question.

