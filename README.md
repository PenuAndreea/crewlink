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

- [x] MongoDB connection with validated config and a `/health` endpoint
- [ ] Auth: JWT + role guards (only OCC can post urgent announcements)
- [ ] Flight channels + messages in MongoDB (Mongoose)
- [ ] Real-time: Socket.IO gateway, typing indicators, read receipts
- [ ] Offline-first mobile: local store, outgoing queue, sync on reconnect
- [ ] RabbitMQ: `message.created` events → notification worker
- [ ] Tests: unit + e2e on the API, a Maestro flow for offline → reconnect
- [ ] Docs: architecture diagram and a "decisions & trade-offs" section

## Decisions & trade-offs

### Configuration is validated at startup
`ConfigModule.forRoot({ validate })` checks the environment once, before anything connects.
A missing or malformed `MONGO_URI` stops the API with a readable error instead of failing on the
first query. Validation is a small hand-written function for now; `class-validator` comes in with
the DTOs, and the env schema can switch to it then if it grows.

### `forRootAsync` for the MongoDB connection
The connection string comes from `ConfigService`, which only exists once `ConfigModule` has loaded,
so the Mongoose options are built in a factory that Nest calls after `ConfigService` is ready.
Hard-coding `process.env.MONGO_URI` in `forRoot()` would work, but it skips validation and makes tests
harder to override.

### `/health` reports the database connection
`GET /health` returns 200 only when Mongoose is connected, and 503 otherwise. That's what a load balancer
or uptime check needs, and it gives the e2e test a real round trip to MongoDB. `@nestjs/terminus` is the
fuller option, worth adding once there are more dependencies to check (RabbitMQ).

### Flight numbers are normalised on write
The API stores flight numbers without spaces and in uppercase (`SN2903`); the app adds the space for display.
Without that, `"SN 2903"` and `"sn2903"` would be two different values and slip past the unique index on
`{ flightNumber, scheduledDeparture }`. Normalising in one place (a Mongoose setter) is simpler than asking
every client to send the same spelling.

### The channels service is tested against a real MongoDB
`ChannelsService` is a thin layer over MongoDB, and its important behaviour (unique index, matching inside an
array, sorting) happens in the database. A mocked model would only test the mock, so the e2e test runs against a
separate `crewlink-test` database that it drops afterwards. The cost: `npm run test:e2e` needs `npm run infra:up`.

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

### 2. Connecting to MongoDB: dynamic modules and async config

`ConfigModule` and `MongooseModule` aren't imported as plain classes but through static methods:

```ts
imports: [
  ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
  MongooseModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService<Env, true>) => ({ uri: config.get('MONGO_URI', { infer: true }) }),
  }),
]
```

- **Dynamic module**: `forRoot()` returns a module configured with your options at import time. Angular has
  the same pattern: `RouterModule.forRoot(routes)` vs `RouterModule.forChild(routes)`.
- **`forRootAsync` + `useFactory` + `inject`**: when the options depend on another provider, Nest calls the
  factory and injects `ConfigService` into it. It's like an Angular `useFactory` provider with `deps: [...]`.
- **`isGlobal: true`**: `ConfigService` becomes injectable in every module without importing `ConfigModule`.
  It's the closest thing to Angular's `providedIn: 'root'`, and in Nest you opt into it per module.
- **`ConfigService<Env, true>`** + `{ infer: true }`: `config.get('PORT')` is typed as `number`, not `any`.
  The `true` tells TypeScript that validation already guaranteed the values exist.
- **Injection tokens**: `@InjectConnection()` injects the Mongoose connection under a string token rather than
  by class type, like Angular's `@Inject(SOME_TOKEN)`. In a test I swap it with
  `{ provide: getConnectionToken(), useValue: stub }`.
- **`app.enableShutdownHooks()`**: Nest only listens for SIGTERM/SIGINT once you call this; then lifecycle
  hooks run and Mongoose closes its connection. Angular has no equivalent, because a browser tab doesn't get
  drained by Kubernetes.

**Gotcha: green tests, crashing app.** With `emitDecoratorMetadata`, TypeScript keeps a constructor
parameter's type as a runtime import so Nest can read it. `import { Connection } from 'mongoose'` then fails
under native ESM (mongoose is CommonJS, so Node can't see its named exports), but Vitest passed because Vite
handles that interop. Fix: `import mongoose, { type Connection } from 'mongoose'`. Lesson: run the built app
(`nest build && node dist/main.js`) before trusting a green test run.

### 3. Mongoose schemas: one class, two kinds of types

In Nest a schema is a class with decorators, and `SchemaFactory.createForClass(Channel)` turns it into a
Mongoose schema. The class also gives me the TypeScript type for free, so the shape is described only once.

```ts
@Prop({ required: true, type: [String] })
memberIds: string[];
```

- **Runtime type vs compile-time type**: `type: [String]` tells *Mongoose* what to store (capital `String`, the
  JavaScript constructor). `string[]` tells *TypeScript* what my code sees. For arrays Nest needs both: decorator
  metadata only says "Array", not what's inside, so without `type` Mongoose stores an array of anything.
- **`String` vs `string`, `[String]` vs `string[]`**: in a TypeScript type position, `String` is the wrapper object
  (never use it) and `[String]` is a tuple of exactly one element.
- **Setters run before validators**: `set` normalises the value on write (`" sn 2903"` → `SN2903`), then `match`
  validates the cleaned value. So the regex never has to deal with spaces or lowercase.
- **Indexes are objects of field → direction**: `{ flightNumber: 1, scheduledDeparture: 1 }`. With `{ unique: true }`
  the *pair* must be unique: SN2903 may fly every day, but only once per departure. A unique index is not a
  validator: only MongoDB enforces it, on write.
- **Multikey index**: indexing an array field (`memberIds`) indexes every element, so "channels containing this
  member" is a fast lookup.
- **Storage type ≠ wire type**: `scheduledDeparture` is a `Date` in MongoDB (so it sorts and compares as a real
  moment) but an ISO string in the JSON contract in `@crewlink/shared`.
- **`Channel.name`** is not a schema field: every JavaScript class has a static `name` property, here `'Channel'`.
  It's used as the model's injection token.

**Testing a schema without a database**: `mongoose.model('Channel', ChannelSchema)` plus
`await new Model({...}).validate()` runs setters and validators in memory. (`validateSync()` is deprecated in
Mongoose 9.)

### 4. Feature modules: `forFeature`, `@InjectModel` and HTTP exceptions

```ts
@Module({
  imports: [MongooseModule.forFeature([{ name: Channel.name, schema: ChannelSchema }])],
  providers: [ChannelsService],
})
export class ChannelsModule {}
```

| | Angular router | NestJS + Mongoose |
|---|---|---|
| Once, in the root module | `RouterModule.forRoot(routes)` | `MongooseModule.forRootAsync(...)` opens the connection |
| In each feature module | `RouterModule.forChild(routes)` | `MongooseModule.forFeature([...])` registers models on it |

- **`@InjectModel(Channel.name)`** gets the model registered by `forFeature`, by token, like `@InjectConnection()`.
  The model is private to `ChannelsModule` unless I export it.
- **`import { type Model } from 'mongoose'`**: type-only, because the token comes from `@InjectModel`, not from the
  constructor type (the native-ESM rule from entry 2).
- **HTTP exceptions from a service**: throwing `ConflictException` anywhere becomes a **409** response, with no
  try/catch in the controller. The service translates MongoDB's duplicate-key error (code `11000`) into it, so
  callers never see database error codes.
- **Testing with a real database**: `Test.createTestingModule({ imports: [MongooseModule.forRoot(testUri), ChannelsModule] })`
  builds only what the test needs, like `TestBed.configureTestingModule` in Angular. `getModelToken(Channel.name)`
  fetches the model for setup and cleanup.

**Gotcha: index builds are asynchronous.** Mongoose creates indexes in the background when the model is created,
so a duplicate-key test can pass or fail depending on timing. `await channelModel.init()` waits until the
indexes exist.

**Gotcha: methods inside the constructor.** `constructor(...) { create() {} }` is a syntax error: the methods
belong in the class body, after the constructor's closing `}`. The constructor body stays empty `{}`, because
`private readonly` already stores the injected model on `this`.
