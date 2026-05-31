# 0001: Repository Bootstrap

Date: 2026-05-12

## Status

Accepted

## Context

Cohvera started as an empty repository. Before selecting an application stack,
the project needs a small foundation for collaboration and future pull requests.

## Decision

Add a neutral repository baseline:

- README
- editor and line-ending configuration
- generic ignore rules
- pull request template
- basic GitHub Actions hygiene workflow
- documentation folder with a first decision record

## Consequences

The repository can accept early planning and implementation pull requests while
remaining stack-agnostic. Once the first application stack is selected, CI should
be expanded with real build, lint, and test commands.
