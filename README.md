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

### 1. NestJS through Angular eyes

The first file I opened, `app.module.ts`, looked very familiar:

```ts
@Module({
  imports: [],                    // other modules whose exported providers I need
  controllers: [AppController],   // classes that receive HTTP requests
  providers: [AppService],        // classes Nest creates and injects for me
})
export class AppModule {}
```

That's no coincidence: NestJS was modelled on Angular. So I already knew most of the
patterns, and learning Nest is mainly about the differences.

**Same idea, different side of the wire**

| Angular | NestJS | What it does |
|---|---|---|
| `@NgModule` | `@Module` | Groups related code into a feature |
| Component | Controller (`@Controller`) | Handles input: UI events in Angular, HTTP requests in Nest |
| `@Injectable` service | `@Injectable` provider | Business logic, injected through the constructor |
| Route guard (`CanActivate`) | Guard (`CanActivate`) | Decides whether a request may go through, e.g. auth or roles |
| Pipe (`\| date`) | Pipe (`ValidationPipe`) | Transforms data; in Nest mostly validating and converting request input |
| `HttpInterceptor` | Interceptor (`NestInterceptor`) | Wraps a request/response: logging, mapping, caching |
| Constructor injection | Constructor injection | Identical: `constructor(private readonly service: AppService) {}` |

**Where they differ**

| Topic | Angular | NestJS |
|---|---|---|
| Sharing a service | `providedIn: 'root'` makes it available app-wide | **Providers are private to their module by default.** The module must list them in `exports`, and the consumer must add that module to `imports` |
| What a module declares | `declarations` for components, directives and pipes | No `declarations`; `controllers` and `providers` instead |
| Guards and pipes apply to | Routes and templates | Controllers, single route handlers, or the whole app (`app.useGlobalPipes()`) |
| Interceptors handle | Outgoing requests from the browser | Incoming requests to the server, and its responses |
| Imports in this repo | Bundler resolves `./app.service` | Native ES modules: imports need the compiled extension, `./app.service.js` |

**The one to remember:** a provider is invisible outside its module until it's exported.
If `ChannelsModule` needs `MessagesService`, then:

```ts
// messages.module.ts
@Module({ providers: [MessagesService], exports: [MessagesService] })
export class MessagesModule {}

// channels.module.ts
@Module({ imports: [MessagesModule], providers: [ChannelsService] })
export class ChannelsModule {}
```

Forget either half and Nest fails at startup with *"Nest can't resolve dependencies of ChannelsService"*.
Annoying the first time, but it keeps the boundaries between features explicit.
