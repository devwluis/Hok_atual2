# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

Current primary app: **Hokma Mobile Chat**, a mobile-first preview for testing a Jarvis-style AI agent chat experience inspired by the user's Hokma.chat repository. The app can run in preview mode or connect to the user's HokClaw server, defaulting to `http://localhost:18800/v1/chat/completions` with model `llama-3.1-8b-instant`.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend preview**: React + Vite mobile web app at `artifacts/hokma-mobile-chat`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/hokma-mobile-chat run dev` — run Hokma Mobile Chat preview

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
