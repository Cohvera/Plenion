# 0003: Quotation Request App

Date: 2026-05-12

## Status

Accepted

## Context

Cohvera needs an internal quotation request workflow for Warco, Tomme, and
Q-Home. Requesters must upload customer documents, choose techniques, generate
some sections from templates, and route other sections to technical quotation
makers.

## Decision

Build the first version as a Next.js application:

- Next.js App Router and TypeScript
- Prisma with PostgreSQL
- Tailwind CSS UI
- local authentication placeholder based on `DEMO_USER_EMAIL`
- local file upload storage under `UPLOAD_DIR`
- task workflow for technical quotation makers
- template-generated quotation sections

## Consequences

The app now has a real request workflow and relational data model. Authentication
is only a placeholder, file storage is local, and PDF quotation output remains a
later milestone.
