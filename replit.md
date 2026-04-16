# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

Current primary app: **Hokma Mobile Chat**, redesigned as a mobile-first **HokClaw AI Agent / OpenClaw** chat interface. It supports a modern ChatGPT-style experience, light/dark theme switching, DNA-style brand mark, five specialized agent modes, selectable AI model profiles, file/image attachment handling, persistent local conversation history, copy buttons for assistant responses, and connection to the user's HokClaw server.

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

## HokClaw App Notes

- Default endpoint: `http://10.168.212.48:18800/v1/chat/completions`
- Default model: `llama-3.1-8b-instant`
- Main routes: `/` for chat and `/dashboard` for the Hok Control HUD.
- The frontend sends OpenAI-compatible chat completion requests and supports SSE streaming.
- Models are user-selectable in the UI; HokClaw/OpenClaw is expected to route model IDs server-side.
- File upload reads text/code files into prompt context, shows images as attachments, and marks zip/binary files as references until backend extraction is available.
- Conversation history persists in localStorage and the chat sends a larger recent context window to the AI.
- User preference: Portuguese (Brazil), no emojis in UI labels, modern mobile-first design.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/hokma-mobile-chat run dev` — run Hokma Mobile Chat preview

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
