# Backend contract — handoff specification

This folder is the handoff package for the team building the real backend for
Revived Smiles.

## How the front end talks to a backend

The front end talks to exactly one thing: the `ApiClient` interface declared in
[`src/lib/api/contract.ts`](../../src/lib/api/contract.ts). Nothing under
`src/app/**` imports a database client, calls `fetch` against a data endpoint,
or knows what stores the data.

To connect a real backend:

1. Write a new implementation of `ApiClient` — for example
   `src/lib/api/http/` — using `contract.ts` as the specification.
2. Change one line in [`src/lib/api/index.ts`](../../src/lib/api/index.ts):

   ```ts
   export const api: ApiClient = mockApi;   // swap `mockApi` for your client
   ```

3. Delete `src/lib/api/mock/`.

No screen changes in any of those steps.

## What is authoritative, and what is here

`src/lib/api/contract.ts` is the authoritative method-by-method specification.
Every method carries a doc comment describing what a real implementation must
do, including rules the prototype enforced only in the browser and therefore did
not really enforce at all. Read it first.

`src/lib/api/types.ts` is the authoritative domain model — the exact shapes that
cross the boundary, in camelCase.

This folder supplements those two files with the content and history that could
not live in a TypeScript file: tuned model prompts, the prototype's SQL schema,
and the list of security defects the prototype shipped with. Where this folder
and `contract.ts` disagree about a signature, `contract.ts` wins.

## Index

| Document | What it covers |
| --- | --- |
| [`photo-analysis.md`](./photo-analysis.md) | The tuned photo-grading prompt, verbatim, plus the four-pose spec catalogue, the model settings, the required JSON response shape, a units migration note for `teethCenter`, and a known gap that must not be reproduced. |
| [`prompt-advisor.md`](./prompt-advisor.md) | The admin prompt-advisor agent: system prompt verbatim, all four tool definitions, the `:::` fenced-block protocol that the admin UI renderer depends on, model settings, and the write-path authorisation requirement. |
| [`data-model.md`](./data-model.md) | The prototype's PostgreSQL/Supabase schema — four tables, one storage bucket, one trigger — presented as a starting point, plus the snake_case → camelCase mapping the adapter must perform. |
| [`security-requirements.md`](./security-requirements.md) | Nine defects the prototype shipped with, each restated as a requirement the new backend must meet. |

## Source references

- Contract: `src/lib/api/contract.ts`
- Domain model: `src/lib/api/types.ts`
- Backend selection point: `src/lib/api/index.ts`
- Reference implementation (to be deleted): `src/lib/api/mock/`
- The routes this folder documents, which are being deleted: `src/app/api/**`
- Prototype schema, at the repository root: `supabase-schema*.sql`
