# 0. Use Markdown Architectural Decision Records

Date: 2026-01-19

## Status

Accepted

## Context

We need to record architectural decisions made on this project. We want to be able to see the history of decisions, the context in which they were made, and the consequences of those decisions.

We want to use a format that is:
*   Version controlled
*   Easy to read and write
*   Close to the code

## Decision

We will use [Architecture Decision Records](https://adr.github.io/) (ADRs) to record our architectural decisions.

We will use the format described by [Michael Nygard](http://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions).

We will store these records in the `docs/adr` directory.

The file naming convention will be `NNNN-title-of-decision.md`, where `NNNN` is a monotonic integer sequence number (padded with leading zeros), and `title-of-decision` is a short description of the decision.

## Consequences

*   We will have a record of our architectural decisions.
*   We will be able to see the history of decisions.
*   We will be able to see the context in which decisions were made.
*   New team members will be able to understand why the system is built the way it is.
*   We need to remember to write ADRs when we make decisions.
