---
Title: Polkadot Protocol Proposal
Number: 1
Status: Enacted
Authors:
  - Joyce Siqueira
  - Florian Franzen
Created: 2022-12-05
Updated: 2022-12-13
Category: Process
---

## Summary
Polkadot Protocol Proposal (abbreviated PPP) is the first attempt to implement a RFC (“request for comments”) process for substantial changes on the Polkadot protocol and its host implementations.

## Motivation
After launching Polkadot and having a steadily growing community, we believe the time has come to introduce a state-of-the-art process for substantial changes to the protocol that the community is contributing to. We believe that with PPPs the community of polkadot can benefit from its transparency and detailed documentation of the proposed changes.

## Detailed Solution design

### What is a PPP?
The “PPP” is a process intended to provide a consistent and controlled path for improvements and changes to the framework. 
Many changes, including bug fixes and documentation improvements can be implemented and reviewed via the normal GitHub pull request workflow.
“Substantial” changes should be put through a design process and the PPP author is responsible for building consensus within the community.
Substantial changes are for example changes to the wasm environment that alters what is required to successfully execute a valid block or changes to the host that would lead to a hard fork or changes to the runtime environment that make future runtimes incompatible with current requirements. For details, please refer to the PPP categories.

### PPP Process

In short, to get a major change added to the protocol, one must first get the RFC merged into the RFC repo as a markdown file. Work on your proposal in a Markdown file based on the template (0000-template.md) found in this repo.

Put care into the details: PPPs that do not present convincing motivation, demonstrate understanding of the impact of the design, or are disingenuous about the drawbacks or alternatives tend to be poorly-received.

Build consensus and integrate feedback in the discussion thread. PPPs that have broad support are much more likely to make progress than those that don't receive any comments.
If the proposal receives non-trivial interest from community members and generally positive feedback, you can prepare a Pull Request:
1. Fork this repo.
1. Create your proposal as proposed-ppp/0000-my-feature.md (where "my-feature" is descriptive. Don't assign a PPP number yet).
3. Make sure to get the discussion going on and your PPP enters the review phase.
1. A PPP can be modified based upon feedback from the maintainers and community. Significant modifications may trigger a new final comment period, which is 4 weeks.
1. Once your PPP is accepted  the relevant section in the specification and any protocol implementations should be updated.
1. After acceptance you can submit a pull request with the codebase of the proposed PPP. The implementation will again go through a review and adoption process.
1. Once all major implementations integrated the proposed change into their codebase and the code was merged, the PPP should be updated to its final state, enacted.

A PPP may be rejected after public discussion has settled and comments have been made summarising the rationale for rejection. A member of the maintainers will then close the PPP.

A PPP may be postponed if either the time of implementation is not right or the community and maintainers can’t agree. The postpone period is then mentioned in a comment from the maintainers.

### PPP Status

| Status        | Description                                                                                                                                                                                                                                                   |
|:------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Proposed**  | The PPP was submitted and is waiting for the maintainers to start the review phase.                                                                                                                                                                           |
| **On review** | The PPP is being reviewed by the maintainers. The community, the maintainers and the author(s) are engaged in a discussion about the PPP. The PPP document can be edited until consensus is found.                                                            |
| **Declined**  | The PPP was declined. No further changes can be made to the document. The PPP has reached his final state, there are no further discussions to this PPP.                                                                                                      |
| **Postponed** | The decision to accept/decline the PPP was postponed. The PPP is either waiting for another implementation to happen or a certain time of period in order to continue the discussions around it again. Either way, the maintainers will inform the author(s). |
| **Accepted**  | The PPP was accepted, no further changes to the document can be made. The proposed idea can be implemented and a related PR to the PPP can be opened.                                                                                                         |
| **Enacted**   | The implementation of the PPP was accepted and merged. This is the PPP’s final state.                                                                                                                                                                         |


### PPP Categories
When opening a PPP and filling out the template you have to determine which category the PPP falls under. Below you can find the so far defined categories. We will continously extend the categories to meet the PPP's needs.

**Runtime Environment**
* Changes to Host API, Runtime API or other properties of the WASM environment

**Consensus Algorithms**
* Changes to block production or finality algorithms

**Networking**
* Changes to the networking protocols


## Alternatives
So far, major changes were not entirely discussed or thought thoroughly. With this PPP we believe that the community and maintainers would benefit from the level of detail of the PPP and the perspectives everyone involved can give. It would help the network and its ecosystem to grow and meet its needs.
Furthermore, once the PPP is accepted, this process is supposed to be used to coordinate between Polkadot Host implementers on the implementation and deployment of the protocol change. This also requires that the proposed change was added to the official protocol spec before it can go live.

## Questions and open Discussions
Does this PPP strike a favourable balance between formality and agility?
Is the template good enough to stimulate deeper thinking but still flexible enough to let the ideas flow? 
