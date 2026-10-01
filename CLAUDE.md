# CrewLink

CrewLink is an offline-first chat app for flight crews (pilots, cabin crew, operations control/OCC).
The hard problems are not chat itself but chat that keeps working with limited connectivity:
messages queue on the device while offline and sync reliably on reconnect, with real-time state
across many users.

## Stack
- Backend: NestJS 12, MongoDB (Mongoose), RabbitMQ, Socket.IO
- Mobile: React Native via Expo SDK 57 + expo-router
- Language: TypeScript everywhere
- Tests: Vitest on the API (Nest CLI default), Maestro planned for mobile flows

## Repo layout (npm workspaces monorepo)
- apps/api: NestJS backend
  - Native ES modules: relative imports need the `.js` extension (`./app.service.js`)
- apps/mobile: Expo app (still the default template)
- packages/shared: `@crewlink/shared`, types only (no build step). Import with `import type`.
  This is the single source of truth for the API contract. Change types here first, then both apps.
- docker-compose.yml: MongoDB 8 + RabbitMQ 4 (management UI at http://localhost:15672, guest/guest).
  Only infrastructure runs in Docker; the API and Metro run natively.
- apps/api/.env.example: PORT, MONGO_URI, RABBITMQ_URL, JWT_SECRET

## Commands (run from the repo root)
- npm install: requires npm 11+ (npm 10 crashes on the workspace install, an Arborist peer-dependency bug)
- npm run infra:up / infra:down: start/stop MongoDB + RabbitMQ
- npm run api: NestJS in watch mode on http://localhost:3000
- npm run mobile: Expo dev server
- npm run typecheck: type-check all workspaces
- npm test: API tests

## Domain model (packages/shared/src/index.ts)
- CrewRole: CAPTAIN | FIRST_OFFICER | PURSER | CABIN_CREW | OCC
- FlightChannel: one chat channel per flight (flightNumber, origin/destination IATA, scheduledDeparture, memberIds)
- ChatMessage:
  - clientId: UUID generated on the device, so retried sends are idempotent
  - serverSeq: assigned by the server, the source of truth for ordering (missing while queued)
  - priority: normal | urgent (urgent = OCC announcements)
- DeliveryStatus (device side): queued → sending → sent → read, or failed
- Sync protocol: on reconnect the client sends SyncRequest { channelId, afterSeq } and receives every
  message after that sequence number (SyncResponse)
- Socket events: client → message:send, channel:sync, typing:start/stop, message:read;
  server → message:ack, message:new, typing, presence

## Current state
- Scaffold done: monorepo, both apps generated, shared types, Docker Compose, README
- The API is still the Nest "Hello World" starter; nothing connects to MongoDB or RabbitMQ yet
- The mobile app shows 2 CSS-module type errors until the first `expo start` generates expo-env.d.ts

## Roadmap
1. API: MongoDB connection (@nestjs/config + MongooseModule.forRootAsync) ← NEXT
2. API: channels + messages modules (schemas, services, controllers, DTOs + ValidationPipe)
3. Auth: JWT + role guards (only OCC may post urgent messages)
4. Real-time: Socket.IO gateway, typing indicators, read receipts, presence
5. Mobile offline-first: local store (WatermelonDB or SQLite), outgoing queue, sync on reconnect,
   airplane-mode toggle for demos
6. RabbitMQ: publish `message.created` → separate notification worker
7. Tests: unit + e2e on the API, a Maestro flow for offline → reconnect
8. Docs: architecture diagram + "Decisions & trade-offs" section in the README
Stretch: Dockerfile for the API, AWS deploy, observability

## Design system (mobile)
Clean, mostly white, one strong blue.
- Colours: primary #1766E0, Blue 50 #EAF1FD, Night Ink #0F1B33 (text), Slate #5B6478 (secondary text),
  Cloud #F5F7FB (background), Line #E4E9F2 (borders)
- Status: online #1B8A5A; offline/queued bg #FFF4E5 + text #7A4B00; urgent bg #FDECEC + text #A61B1B
- Font: Plus Jakarta Sans
- Shapes: rounded cards (radius 18–24px), 44px minimum touch targets,
  boarding-pass route lines (BRU ---✈--- ZAG)
- Screens:
  - Flights home: next-duty blue card + channel list with sync status
  - Flight channel chat: offline banner, pinned urgent OCC message, queued messages with dashed outline
    + clock icon, read ticks, typing indicator
  - Flight details & crew: route card, crew list with presence dots, "N messages stored on device"

## Conventions
- Git: main = releases, develop = default/integration branch; work on branches, merge via PRs only
- Branch names: feature/…, fix/…, chore/… in kebab-case, prefixed by area (feature/api-mongodb-connection)
- Commits: Conventional Commits with optional scope: feat(api):, fix(mobile):, docs:, chore:, refactor:, test:
- PR descriptions: What / Why / Changes / How to test / Notes
- Keep PRs small and focused
- README "Learning log": add an entry when a new NestJS concept comes up
- README "Decisions & trade-offs": record architecture decisions