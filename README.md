# CrewLink ✈️

An offline-first chat app for flight crews, built to practise the AVIOBOOK Connect stack:
**NestJS + MongoDB + RabbitMQ** on the backend, **React Native (Expo)** on mobile.

The interesting part is not chat itself but chat that keeps working at 35,000 ft:
messages queue on the device while offline and sync reliably on reconnect.

## Repo layout

```
crewlink/
├── apps/
│   ├── api/        NestJS backend (REST + WebSocket gateway)
│   └── mobile/     Expo / React Native app (expo-router)
├── packages/
│   └── shared/     TypeScript types both apps import: the API contract
└── docker-compose.yml   MongoDB + RabbitMQ for local development
```

One repo with npm workspaces, so a change to the message contract in `packages/shared`
is type-checked against the server and the app in the same commit.

## Getting started

Requirements: Node 22+, **npm 11+** (npm 10 crashes on the workspace install; `npm i -g npm@11`), Docker, and Xcode / Android Studio or the Expo Go app.

```bash
npm install          # installs every workspace from the root
npm run infra:up     # starts MongoDB and RabbitMQ
cp apps/api/.env.example apps/api/.env

npm run api          # NestJS on http://localhost:3000
npm run mobile       # Expo dev server (in a second terminal)
```

## Roadmap

- [ ] Auth: JWT + role guards (only OCC can post urgent announcements)
- [ ] Flight channels + messages in MongoDB (Mongoose)
- [ ] Real-time: Socket.IO gateway, typing indicators, read receipts
- [ ] Offline-first mobile: local store, outgoing queue, sync on reconnect
- [ ] RabbitMQ: `message.created` events → notification worker
- [ ] Tests: unit + e2e on the API, a Maestro flow for offline → reconnect
- [ ] Docs: architecture diagram and a "decisions & trade-offs" section

## Learning log

Notes on picking up NestJS, kept as I go.
