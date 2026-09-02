# Subtaro

<p align="center">
  <img src="./frontend/public/favicon.svg" alt="Subtaro favicon" width="72" height="72">
</p>

<p align="center">
  <strong>AI-powered subtitle generation, editing, and video rendering</strong><br>
  A full-stack personal project built with React, Node.js/Express, MongoDB, Cloudinary, Socket.IO, BullMQ, Redis, and FFmpeg.
</p>

<p align="center">
  <img src="./frontend/public/og-image.png" alt="Subtaro application preview" width="1100">
</p>

> **Repository deep dive:** This README is intentionally much more detailed than a typical project README. It documents the architecture, runtime flows, configuration, APIs, data model, security boundaries, asynchronous processing pipeline, deployment behavior, and a file-by-file reference for the repository.

> **Analysis scope:** Every repository file was inspected **except `backend/public/**`**, which was explicitly excluded. The `frontend/public/**` assets are included in the documentation and are referenced above for the GitHub presentation image, favicon, and demo videos.

## Demo

The repository includes a small before/after demo used by the public landing page. The same files are linked here so visitors can inspect the product result without running the application first.

### Before

<video src="./frontend/public/demo/before.mp4" controls muted playsinline width="100%"></video>

[Open the before demo video](./frontend/public/demo/before.mp4)

### After

<video src="./frontend/public/demo/after.mp4" controls muted playsinline width="100%"></video>

[Open the after demo video](./frontend/public/demo/after.mp4)

> **GitHub rendering note:** GitHub's renderer can vary in how it handles repository-hosted HTML5 video. The direct links above are the reliable fallback when inline playback is not rendered.

---

## Table of contents

1. [What Subtaro is](#what-subtaro-is)
2. [Repository scope](#repository-scope)
3. [Architecture](#architecture)
4. [End-to-end workflows](#end-to-end-workflows)
5. [Authentication and security](#authentication-and-security)
6. [Data model](#data-model)
7. [REST API](#rest-api)
8. [Socket.IO](#socketio)
9. [Frontend architecture](#frontend-architecture)
10. [Media and subtitle pipeline](#media-and-subtitle-pipeline)
11. [Configuration](#configuration)
12. [Local development](#local-development)
13. [Deployment](#deployment)
14. [Observability, limits, and failures](#observability-limits-and-failures)
15. [File-by-file reference](#file-by-file-reference)
16. [Operational runbook](#operational-runbook)
17. [Verification performed](#verification-performed)
18. [Production-readiness findings](#production-readiness-findings)
19. [Testing strategy](#testing-strategy)
20. [Architecture assessment](#architecture-assessment)
21. [Recommended target architecture](#recommended-target-architecture)
22. [Maintainer guide](#maintainer-guide)
23. [Final assessment](#final-assessment)

---

## What Subtaro is

Subtaro is a full-stack application for turning uploaded videos into subtitled videos. The user-facing product combines authentication, project management, remote subtitle processing, subtitle editing, live progress updates, and final video rendering.

At a high level, the system works like this:

```text
Browser
  │
  ├── REST API ───────────────┐
  │                           ▼
  └── Socket.IO          Express backend
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
          MongoDB          Cloudinary     Subtitle service
             │                                   │
             │                              signed webhook
             │                                   │
             └───────────────┬───────────────────┘
                             ▼
                       Project state
                             │
                       BullMQ + Redis
                             │
                             ▼
                       FFmpeg worker
                             │
                             ▼
                         Cloudinary
```

The key architectural idea is that **AI subtitle processing and final media rendering are separate stages**. The external subtitle service handles the expensive/AI-oriented processing steps; Subtaro persists the resulting subtitle state and can then render the final media locally using FFmpeg.

---

## Repository scope

The supplied repository contained **148 files**, all of which were inspected for this deep dive, with one deliberate exclusion:

- **Excluded:** `backend/public/**`
- **Included:** `backend/` source/config/routes/services/models/workers and `frontend/` source plus `frontend/public/**`
- **GitHub presentation assets:**
  - `frontend/public/og-image.png` — repository/social preview artwork, also shown at the top of this README
  - `frontend/public/favicon.svg` — project favicon/logo, also shown beside the project title
  - `frontend/public/demo/before.mp4` and `frontend/public/demo/after.mp4` — demo media
  - `frontend/public/demo/README.md` — demo asset notes

The exclusion of `backend/public/**` means this README intentionally does **not** describe generated/static files that may be copied there during frontend deployment.

---

## 3. Architecture

```text
                         ┌───────────────────────────┐
                         │        React / Vite        │
                         │  Pages + Query + Context  │
                         └─────────────┬─────────────┘
                                       │ REST + Socket.IO
                                       ▼
                         ┌───────────────────────────┐
                         │       Express server       │
                         │ auth / users / projects    │
                         │ uploads / plans / webhook │
                         └──────┬───────┬───────┬────┘
                                │       │       │
                         MongoDB│   Cloudinary  │ external HTTP
                                │       │       ▼
                                │       │  Subtitle service
                                │       │       │
                                │       │    webhook
                                │       │       ▼
                                │       │  finalize project
                                │       │       │
                                │       └───────┤
                                ▼               │
                         ┌────────────┐        │
                         │   Project  │◄───────┘
                         │   record   │
                         └─────┬──────┘
                               │
                      BullMQ / Redis
                               │
                               ▼
                      ┌────────────────┐
                      │ Render worker  │
                      │ FFmpeg/ffprobe │
                      └───────┬────────┘
                              │
                         upload output
                              ▼
                         Cloudinary
```

### 3.1 Responsibility matrix

| Concern | Primary implementation | Source of truth |
|---|---|---|
| Authentication | `auth.controller.js`, `auth.middleware.js` | User + signed JWTs/cookie |
| User profile | `user.controller.js` + `User.js` | MongoDB |
| Project lifecycle | `project.controller.js`, `project.service.js` + `Project.js` | MongoDB Project |
| AI subtitle processing | external subtitle service + `subtitle.service.js` | Remote service while running; MongoDB compact state |
| Webhook authenticity | `webhook.controller.js` | HMAC derived from master secret + projectId |
| Media assets | `cloudinary.service.js` | Cloudinary URLs/public IDs persisted in MongoDB |
| Final video generation | `render.worker.js` + `media.service.js` | BullMQ job + Project.output |
| Live progress | `socket.service.js`, Socket.IO server | Ephemeral socket connection |
| Search | `Project.subtitle.searchText` | MongoDB, hidden from normal projections |
| Subscription catalog | `plan.service.js` + `Plan.js` | Seed catalog → MongoDB |
| Subscription enforcement | **Not fully implemented** | Route auth only; no plan gate |

## 4. Core end-to-end flows

### 4.1 Registration/login/session bootstrap

1. Browser validates form fields and calls `auth.api.js`.
2. Backend creates/loads the User record and uses bcrypt for password verification/hashing.
3. Backend returns a short-lived access JWT and sets a refresh JWT in an `httpOnly` cookie.
4. Frontend stores only the access token in `tokenStore.js` (memory).
5. On full reload, `AuthContext` calls refresh silently; Axios also has a 401 refresh path for expired access tokens.
6. `AuthContext` then loads `/auth/me` and the protected dashboard becomes available.

### 4.2 Upload → project creation

1. `NewProject.jsx` sends a local video/audio file to `/api/uploads`.
2. Multer writes it to temp disk; upload controller classifies it and uploads it to a user-scoped Cloudinary folder.
3. Backend returns a Cloudinary URL/publicId plus media metadata.
4. The browser sends those values to `/api/projects` with project name, `inputType`, and subtitle mode/style.
5. `project.controller.js` creates a MongoDB Project with a server-generated stable `projectId`.
6. `project.service.js` submits the project to the external subtitle service and records the remote project ID/status.

**Security implication:** the API currently trusts the uploaded Cloudinary URL/publicId supplied during project creation. The upload route is user-scoped, but the create route does not prove that the submitted asset was created by this authenticated user. This should be changed to a server-issued upload reference or a strict Cloudinary-folder/public-ID validation step.

### 4.3 Subtitle processing + webhook

The remote processing pipeline is represented locally as five ordered steps:

| Step | Name | Intent |
|---:|---|---|
| 1 | `audio_separation` | prepare audio used by downstream processing |
| 2 | `speaker_diarization` | identify speaker boundaries/identity |
| 3 | `speaker_segment_preparation` | prepare speaker-aware segments |
| 4 | `speaker_aware_transcription` | generate transcript with speaker context |
| 5 | `original_subtitle_generation` | turn transcript into timestamped original-language subtitles |

The remote service posts back to `/api/webhooks/subtitle/:projectId?token=...`. The token is an HMAC-SHA256 of the project ID using `WEBHOOK_MASTER_SECRET`. The webhook handler parses defensively, caps log growth, validates dates/numbers/status values, downloads/validates SRT output when finalizing, and persists only compact application state rather than remote filesystem paths or raw service result blobs.

### 4.4 Video finalization

For video projects, once subtitle generation is complete, the backend performs one of two rendering operations:

- **Embedded:** downloads source media + SRT, invokes FFmpeg `subtitles=` with a configured style preset, and re-encodes the video.
- **Selectable:** downloads source media + SRT, probes codec compatibility, and either stream-copies or transcodes the streams before muxing SRT as `mov_text`.

The final file is uploaded to Cloudinary and persisted under `Project.output.file`. Rendering jobs are stored in BullMQ/Redis so the job can retry after worker/API restarts.

### 4.5 Subtitle editing

`PATCH /api/projects/:projectId/subtitle` accepts replacement SRT content (capped at 2 MiB) plus optional mode/style changes. The server uploads the new subtitle to a fixed Cloudinary public ID, updates subtitle statistics/search text, and—when necessary—marks the video output as `processing` and enqueues `regenerate-output`. This avoids blocking the HTTP request on FFmpeg.

### 4.6 Duplicate/delete

Duplicate creates a fresh Project with a new stable project ID while reusing the existing source asset metadata rather than forcing a second source upload. Delete blocks active pipeline states, removes referenced Cloudinary assets when not shared, then deletes the MongoDB Project. Account deletion is different: it deletes database records but currently leaves Cloudinary files behind, which is a retention/cleanup gap.

### 4.7 Live status + notifications

The server uses a per-user room (`user:<id>`) and per-project room (`project:<projectId>`). Authenticated sockets join the user room automatically; the project detail page explicitly joins its project room after ownership is verified. Controllers/services emit normalized `project:event` payloads. Notification email is conditional: when the user is considered online by Socket.IO, email is suppressed and the project state remains the primary notification channel.

## 5. Authentication and security model

### 5.1 Token model

| Token | Lifetime/source | Storage | Purpose |
|---|---|---|---|
| Access JWT | `JWT_EXPIRES_IN`, source fallback 15m | Browser memory | REST and Socket.IO auth |
| Refresh JWT | `JWT_REFRESH_EXPIRES_IN`, controller fallback 30d | httpOnly cookie | New access/refresh credentials |

The refresh cookie is scoped to `/api/auth`, uses `secure` in production, and uses `SameSite=None` in production / `lax` locally. A `tokenVersion` on the User record provides a coarse revocation mechanism.

### 5.2 Important auth semantics to understand

- Register and login both establish a session immediately; email verification is not required for API access.
- `logout` increments `tokenVersion`, so it invalidates **all refresh tokens for the account**, not only one browser session.
- Refresh “rotation” issues a new refresh token but does not change `tokenVersion`, so the previously issued refresh token can remain usable until expiry. There is no reuse-detection/token-family model.
- `protect` checks JWT validity and `isActive`; it does **not** enforce an active subscription, role-based access, or email verification.

### 5.3 Upload/media trust boundary

The browser can upload video/audio/image files. Project creation should be treated as a security boundary because the browser subsequently supplies a URL to the project/subtitle pipeline. The strongest design would persist a server-generated upload record/reference containing `{userId, publicId, url, resourceType, createdAt}` and require project creation to consume that server-issued reference. That prevents cross-user asset substitution and reduces the risk of the backend/subtitle worker being used to fetch arbitrary URLs.

## 6. Data model deep dive

### 6.1 User

`User.js` contains identity, authentication and account lifecycle fields. Passwords are excluded from ordinary selection; email is normalized/lowercased and indexed uniquely. Email verification stores a hashed random token and expiry rather than the raw token. Subscription state is nested, with six plan-key values (`free_trial`, `monthly`, `quarterly`, `half_yearly`, `yearly`, `lifetime`) and status values (`trialing`, `active`, `expired`, `cancelled`). `hasActiveAccess()` supports lifetime, legacy and expiry calculations. Analytics counters are maintained as user-level aggregates but the dashboard also computes project analytics directly, so these counters should be considered operational/summary data rather than the only statistical source.

### 6.2 Project

Project is the dominant aggregate. It deliberately stores compact state rather than raw remote-service output. The step schema is fixed to 1–5 and each step has status/timestamps/duration/error. The input file schema contains Cloudinary delivery data plus original filename/size/MIME/dimensions/duration. Subtitle state stores the generated SRT file and counts; `searchText` is `select:false` so normal API responses do not include full plain text. Output state stores the final MP4 delivery metadata and the actual rendering mode used for that file.

### 6.3 Project state machines

```text
Project.status
created → queued → processing → completed
                   │             │
                   └────────────→ failed

Subtitle.status
pending → processing → completed
                    └──────────→ failed

Video output.status
pending → processing → completed
                  └────────────→ failed

Audio output.status = not_required
```

The model also tracks notification outcome (`pending`, `sent`, `failed`, `not_required`) and processing metrics (`startedAt`, `completedAt`, `durationSeconds`, retry count). This makes the Project document both a user-facing resource and a lightweight event/state ledger.

## 7. REST API inventory

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create account/session |
| POST | `/api/auth/login` | Public | Authenticate/session |
| POST | `/api/auth/refresh` | Refresh cookie | Renew tokens |
| GET | `/api/auth/verify-email/:token` | Public | Verify email |
| GET | `/api/auth/me` | Access JWT | Current user |
| POST | `/api/auth/logout` | Access JWT | Revoke refresh-token version |
| POST | `/api/auth/logout-all` | Access JWT | Revoke refresh-token version |
| POST | `/api/auth/resend-verification` | Access JWT + rate limit | Send a new verification token |
| POST | `/api/contact` | Optional | Store support/contact message |
| GET | `/api/plans` | Public | Active pricing catalog |
| POST | `/api/projects` | Access JWT | Create/submit subtitle project |
| GET | `/api/projects/:projectId` | Access JWT | Fetch project |
| GET | `/api/projects/:projectId/refresh` | Access JWT | Force remote status refresh |
| GET | `/api/projects/:projectId/logs` | Access JWT | Fetch project logs |
| POST | `/api/projects/:projectId/resume` | Access JWT | Resume failed remote processing |
| PATCH | `/api/projects/:projectId/subtitle` | Access JWT | Edit SRT / mode / style |
| PATCH | `/api/projects/:projectId` | Access JWT | Rename project |
| POST | `/api/projects/:projectId/duplicate` | Access JWT | Clone project |
| DELETE | `/api/projects/:projectId` | Access JWT | Remove project/assets |
| POST | `/api/uploads` | Access JWT | Upload source/avatar asset |
| GET | `/api/users/me` | Access JWT | Profile |
| PATCH | `/api/users/me` | Access JWT | Name/avatar update |
| PATCH | `/api/users/me/password` | Access JWT | Password change |
| GET | `/api/users/me/projects` | Access JWT | Search/paginate projects |
| GET | `/api/users/me/projects/:projectId` | Access JWT | User-scoped project detail |
| GET | `/api/users/me/stats` | Access JWT | Analytics |
| GET | `/api/users/me/storage` | Access JWT | Storage usage |
| GET | `/api/users/me/subscription` | Access JWT | Subscription state |
| POST | `/api/users/me/subscription/activate` | Access JWT | **Placeholder manual activation** |
| PATCH | `/api/users/me/deactivate` | Access JWT | Soft deactivate |
| DELETE | `/api/users/me` | Access JWT | Delete account + DB data |
| POST | `/api/webhooks/subtitle/:projectId` | HMAC token | External subtitle callback |

### 7.1 Two project identifier styles

There are two legitimate identifiers in the API, which can look inconsistent at first glance:

- `Project._id` is the MongoDB document identifier used by the main project controller route set.
- `Project.projectId` is a stable app-level identifier used for external subtitle-service correlation, webhook URLs, socket rooms and the user-scoped project route.

This is an intentional separation, but the frontend/backend contract would be easier to maintain if route naming made the distinction explicit (e.g. `/api/projects/:mongoId` vs `/api/projects/by-project-id/:projectId`) or if all endpoints standardized on the stable projectId.

## 8. Socket.IO protocol

### Authentication

The browser connects with `{ auth: { token } }`. The server verifies the access JWT, loads the User, checks `isActive`, and then joins `user:<userId>`.

### Client operations

- `project:join` with a `projectId` → server verifies ownership and joins `project:<projectId>`.
- `project:leave` → leaves the project room.

### Server events

The main event is `project:event`, carrying a normalized payload with at least the project ID, event type/status/step/message and optional data. User-level and project-level rooms are both used.

**Observed consequence:** because an authenticated browser can belong to both its user room and the currently viewed project room, an event emitted to both rooms can be received twice by that browser. The project-detail hook filters by project ID, but the global notification layer does not perform event de-duplication.

## 9. Frontend state/data architecture

The frontend is organized around a clean separation of responsibilities:

- **TanStack Query** owns server-state fetching/caching/invalidation.
- **AuthContext** owns session bootstrap and current-user auth methods.
- **SocketContext** owns the authenticated Socket.IO connection.
- **NotificationsContext** translates socket events into global UI notifications/sounds.
- **ThemeContext/SidebarContext** own small UI state.
- `tokenStore` holds only the current access JWT in memory.

The Axios client is the key transport seam. It attaches the current access token, detects 401s, runs a single refresh request, queues concurrent failed requests, then retries them with the new token. This is a good pattern for avoiding a refresh stampede.

One lifecycle caveat follows from the current design: the Socket.IO instance is created with the access token that existed when the connection/effect was established. If Axios refreshes the token silently later, the already-connected socket is not automatically reconfigured. A later disconnect/reconnect may therefore retry with the stale token. A production-hardening step would explicitly synchronize socket auth on token refresh or disconnect/reconnect the socket when the access token changes.

## 10. Media pipeline deep dive

### 10.1 Download safety

`media.service.js` uses streaming HTTP download with a timeout and maximum byte cap. It checks `Content-Length` early when present, writes to a temporary file, and rejects oversized downloads. This is important because the source URL is remote and the backend/worker must not blindly consume unbounded data.

### 10.2 Codec policy

Stream-copy is considered safe for MP4 when the video codec is H.264 and the audio codec is AAC or MP3. Otherwise the selectable-subtitle flow falls back to FFmpeg video/audio transcoding before adding the `mov_text` subtitle track.

### 10.3 Embedded subtitle rendering

The embedded path invokes FFmpeg with the `subtitles=` filter and an optional `force_style` preset from `subtitleStyle.presets.js`. It uses configurable CRF/preset values. This path necessarily re-encodes the video because subtitle pixels become part of the video frames.

### 10.4 Selectable subtitles

The selectable path keeps subtitles toggleable by muxing SRT into MP4 as `mov_text`, with language/title/default-track metadata. When the original codecs are compatible, stream-copy makes this operation much faster than burn-in.

**Potential compatibility issue:** the embedded render path copies source audio (`-c:a copy`) while always re-encoding video. If an input video carries an audio codec that is not MP4-compatible, finalization can fail. The selectable path explicitly handles audio codec compatibility better. Consider normalizing unsupported audio to AAC in the embedded path too.

## 11. Configuration and environment contract

### Backend

| Variable group | Used by | Notes |
|---|---|---|
| `NODE_ENV`, `HOST`, `PORT`, `PUBLIC_API_URL`, `FRONTEND_URL`, `CLIENT_URLS` | server | HTTP/CORS/runtime identity |
| `MONGODB_URI` | db config/server | Required persistence |
| `JWT_SECRET`, `JWT_REFRESH_SECRET`, expiry vars | auth | Separate access/refresh signing keys |
| `SMTP_*`, email verification expiry | mail/auth | Optional integration; verification/project email behavior depends on enablement |
| `CLOUDINARY_*` | upload/project/media | Core asset store |
| `FFMPEG_BIN`, `FFPROBE_BIN`, `FFMPEG_CRF`, `FFMPEG_PRESET` | media | Docker supplies ffmpeg/ffprobe |
| `MAX_UPLOAD_SIZE_BYTES` | Multer | Example = 10 MiB |
| `MAX_SOURCE_DOWNLOAD_BYTES` | media/project | Example = 10 MiB; controller-level fallback is larger, so explicit env configuration matters |
| `MAX_SUBTITLE_DOWNLOAD_BYTES` | webhook/subtitle | Remote SRT size cap |
| `TEMP_UPLOAD_DIR` | upload/runtime | Temp disk path |
| `SUBTITLE_SERVICE_URL`, timeout | subtitle service | External AI pipeline endpoint |
| `WEBHOOK_MASTER_SECRET` | project/webhook | Critical shared secret for callback signing |
| `PROJECT_ID_PREFIX` | project | Stable app-level project ID naming |
| `REDIS_URL`, `RENDER_CONCURRENCY`, attempts/backoff, `ENABLE_RENDER_WORKER` | queue/worker | Async render processing |
| `SENTRY_*` | Sentry | Optional observability |

### Frontend

`VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_APP_NAME`, `VITE_APP_TAGLINE`, `VITE_MAX_UPLOAD_SIZE_MB`, and `VITE_PORTFOLIO_URL` drive browser configuration. The client-side upload limit is deliberately kept in sync with the backend upload limit, but the backend remains authoritative.

### Configuration inconsistencies to resolve

1. The example environment advertises a **7-day refresh expiry**, while `auth.controller.js` falls back to **30 days** and the cookie `maxAge` is hard-coded to **30 days**. Choose one source of truth.
2. `.env.example` shows `MAX_SOURCE_DOWNLOAD_BYTES=10 MB`, while some controller constants fall back to a much larger default when the environment variable is absent. Make the actual safety limit explicit and centralized.
3. The frontend `dist` script writes into `backend/public/dist`, but that directory is outside the requested analysis scope and should remain a generated artifact, not hand-edited source.

## 12. Local development

### Prerequisites

The application expects a Node.js development environment and external infrastructure for MongoDB, Redis, Cloudinary, and the subtitle-processing integration. The backend also requires FFmpeg/ffprobe for local media rendering.

### Typical setup

```bash
# clone the repository
git clone <your-repository-url>
cd subtaro-main

# backend
cd backend
npm install
cp .env.example .env

# frontend (new terminal)
cd ../frontend
npm install
cp .env.example .env
```

Then populate the environment variables described later in this README and start MongoDB/Redis using your preferred local services or the supplied Compose configuration.

### Development processes

```bash
# frontend
cd frontend
npm run dev

# backend
cd backend
npm start
```

The exact scripts exposed by `package.json` should be treated as the canonical command surface; do not assume that an old deployment artifact or supervisor configuration represents the current development entrypoint.

### Development checklist

Before debugging application behavior, verify:

1. MongoDB connectivity.
2. Redis connectivity when rendering or queue-backed work is used.
3. Cloudinary credentials and upload permissions.
4. Subtitle service URL and master secret.
5. FFmpeg/ffprobe availability.
6. Frontend API origin and Socket.IO origin settings.
7. Cookie/HTTPS behavior for the chosen local environment.

## 13. Deployment

### Default

`backend/Dockerfile` builds a single Node container with FFmpeg. `server.js` starts the API and, unless disabled, starts the BullMQ render worker in the same process. Redis is expected to be a separate service. `docker-compose.yml` models exactly this: `app` + `redis`.

### Scaled profile

Compose also defines a `worker` service under the `scaled` profile, but its command is `node worker.js`. There is no `backend/worker.js` in this repository; the actual worker implementation is `backend/workers/render.worker.js`. Therefore the scaled worker definition cannot work as written without adding/fixing a worker entrypoint.

### Alternate legacy path

`supervisord.conf` includes Redis and the Node app in one container. That is not the path implemented by the current Dockerfile, which does not install Supervisor or Redis. Standardize on one deployment model and remove/relocate the unused configuration to avoid operator confusion.

## 14. Observability, limits, and failures

The backend uses per-controller try/catch blocks heavily, logs errors to stderr, and optionally reports to Sentry. This gives user-friendly HTTP responses but means the central Express/Sentry error handler does not necessarily see every exception because many controllers terminate the error themselves.

The project log design is intentionally compact and bounded. Logs capture normalized application events and step metadata rather than copying raw remote service logs/results. This is a good privacy/storage decision, but it means operational debugging still depends on external service logs and server logs when a failure is not expressible in the compact Project log.

The `/health` endpoint currently checks MongoDB connection readiness. It is useful for container health, but it is not a full dependency health check: Redis, Cloudinary, FFmpeg and the external subtitle service are not all validated on every health call. For a richer operational probe, expose separate readiness/dependency checks.

## 14. Rate limiting and abuse controls

Configured policies include roughly: login 10 requests/15 minutes keyed by IP+email, registration 8/hour by IP, verification resend 10/hour by IP, contact 5/hour, and uploads 30/hour keyed by user/IP. There are no comparable dedicated limiters on refresh, webhooks or all project mutation endpoints. Those can become useful high-volume targets, especially because refresh and webhook endpoints are involved in asynchronous processing.

## 15. File-by-file reference

### Root and global repository files

#### `.gitignore` — 37 lines
Repository-level ignore rules. Keeps generated/build/dependency/local-environment artifacts out of version control; review it alongside the frontend dist workflow because the frontend can build into backend/public/dist.

#### `README.md` — GitHub project documentation

This file is the primary public-facing repository documentation. It combines the project overview, architecture explanation, local-development/deployment instructions, security and operational notes, and the complete deep-dive reference for the inspected source tree. The repository-relative assets `frontend/public/og-image.png` and `frontend/public/favicon.svg` are intentionally used near the top of the file so the README presents the project visually on GitHub.
Original repository README. It is intentionally minimal (project title/tagline plus a placeholder “add”), so this deep-dive README is the authoritative architectural documentation produced from the code inspection.

#### `frontend/src/index.css` — 87 lines
Global Tailwind v4 stylesheet. Defines fonts, brand/accent theme tokens, class-based dark mode, animations, scrollbar treatment, grid background and gradient helpers.


The following inventory covers **every inspected file**. `backend/public/**` is intentionally absent. Line counts are approximate repository snapshot counts and are included to help future maintainers locate the largest risk/complexity hotspots.

### Backend configuration & infrastructure

#### `backend/.dockerignore` — 14 lines
Docker build context exclusions for backend. Its purpose is to keep unnecessary local/development files out of the image and reduce build context size.

#### `backend/.env.example` — 209 lines
Backend configuration contract. Defines runtime identity, MongoDB, JWT access/refresh settings, SMTP, Cloudinary, FFmpeg/ffprobe, upload/download limits, subtitle-service URL, Redis/BullMQ, webhook signing, project-ID prefix, and optional Sentry.

#### `backend/Dockerfile` — 120 lines
Production-oriented Node 22 image. Installs FFmpeg, libass/fontconfig, Noto fonts and CA certs; verifies ffmpeg subtitle support/ffprobe; installs production dependencies; exposes port 5000; provides a /health Docker HEALTHCHECK; starts server.js, which by default also starts the in-process BullMQ render worker.

#### `backend/config/cloudinary.js` — 22 lines
Initializes Cloudinary configuration from CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET and exposes the configured client. Missing Cloudinary configuration is treated as a startup-time error by the consuming modules, so Cloudinary is effectively a core backend dependency.

#### `backend/config/db.js` — 34 lines
MongoDB/Mongoose connection bootstrap. Owns connection setup/error logging and clean disconnect behavior used by the server lifecycle.

#### `backend/config/mail.js` — 92 lines
Central mail configuration. Reads SMTP settings, constructs the Nodemailer transport when mail is enabled/configured, and supports graceful operation when email is deliberately disabled.

#### `backend/config/redis.js` — 37 lines
Creates the Redis/ioredis connection used by BullMQ. The Redis connection is queue infrastructure, not a general-purpose application cache.

#### `backend/config/sentry.js` — 44 lines
Optional Sentry initialization and error instrumentation. It is intentionally environment-gated; the rest of the app can run without Sentry, and controller-level try/catch usage means Express-level Sentry coverage is not the complete error stream.

#### `backend/docker-compose.yml` — 87 lines
Local/operational Compose topology for API + Redis with an optional scaled worker profile. By default the API container runs the render worker in-process. The `scaled` profile expects a dedicated worker service and requires ENABLE_RENDER_WORKER=false in the API container.

#### `backend/package-lock.json` — 2903 lines
Exact backend dependency lockfile. Treat as generated package-manager state; update together with package.json and verify the lockfile in CI.

#### `backend/package.json` — 39 lines
Backend dependency manifest and operational scripts. `start`/`dev` target server.js; the `worker` scripts target a separate worker.js that is not present in this repository, creating a concrete maintenance/deployment inconsistency.

#### `backend/supervisord.conf` — 118 lines
Legacy/alternative container startup definition that embeds Redis + Node under Supervisor. The active Dockerfile does not use it, and Compose runs Redis as its own service, so this file should be treated as historical or an alternate deployment artifact until deliberately standardized.

#### `backend/temp.email.service.txt` — 2299 lines
Scratch/reference text containing an older email-service implementation. It is not part of the runtime dependency graph; retaining executable-looking legacy code in `.txt` can confuse maintainers and should be moved to historical docs or removed once no longer needed.

### Backend application code

#### `backend/controllers/auth.controller.js` — 765 lines
Authentication lifecycle controller: register, login, access/refresh JWT issuance, refresh cookie management, email verification/resend, current-user response, logout and logout-all. Access tokens are short-lived JWTs; refresh tokens are httpOnly cookies signed with a separate secret. Important semantics are documented in the security section below.

#### `backend/controllers/contact.controller.js` — 90 lines
Public contact-form persistence. Validates/sanitizes the contact submission and stores it in MongoDB with request IP metadata; there is no actual outbound email notification in this controller.

#### `backend/controllers/plan.controller.js` — 32 lines
Public plan-catalog controller. Returns active plans from the database after boot-time catalog seeding.

#### `backend/controllers/project.controller.js` — 1968 lines
Largest application controller. Owns create/read/refresh/logs/resume/rename/duplicate/delete flows, manual subtitle editing, and asynchronous final-video regeneration. It is the main orchestration layer between authenticated users, MongoDB Project documents, Cloudinary assets, the external subtitle service, the render queue, and Socket.IO notifications.

#### `backend/controllers/upload.controller.js` — 244 lines
Authenticated multipart upload endpoint. Stores the incoming file temporarily with Multer, detects its media class, uploads it to Cloudinary in a user-scoped folder, returns upload metadata to the caller, and removes the local temp file. It is a staging API rather than a persistent Upload model.

#### `backend/controllers/user.controller.js` — 1536 lines
Current-user and account domain controller: profile, avatar, password, project listing/detail, statistics, storage, subscription state, subscription activation placeholder, soft deactivation and hard deletion. Project analytics are computed from the Project collection rather than maintained solely from cached counters.

#### `backend/controllers/webhook.controller.js` — 2108 lines
Critical integration/finalization controller for subtitle-service callbacks. Verifies HMAC project tokens, normalizes remote statuses and steps, validates/loads SRT output, finalizes the Project document, optionally renders/muxes the final video, uploads output to Cloudinary, emits Socket.IO events, and enqueues durable BullMQ finalization work. Includes idempotency/claim logic to reduce duplicate webhook finalization races.

#### `backend/routes/auth.routes.js` — 98 lines
Maps public/protected authentication endpoints to auth.controller.js, including register/login/refresh, verification, me, logout and logout-all.

#### `backend/routes/contact.routes.js` — 12 lines
Mounts POST /api/contact with rate limiting and optional authentication, enabling both anonymous and signed-in contact submissions.

#### `backend/routes/plan.routes.js` — 10 lines
Mounts the public GET /api/plans route.

#### `backend/routes/project.routes.js` — 123 lines
Protected project REST router. Routes create/get/refresh/logs/resume/subtitle edit/rename/duplicate/delete operations. Note that these routes use MongoDB document `_id` in the controller, while the user-scoped project route exposes the human-readable projectId.

#### `backend/routes/upload.routes.js` — 98 lines
Protected upload route with per-user rate limiting and multipart `file` handling.

#### `backend/routes/user.routes.js` — 131 lines
Protected current-user router for profile, password, project history/detail, analytics, storage, subscription, deactivation and deletion.

#### `backend/routes/webhook.routes.js` — 23 lines
Public callback route for the external subtitle service. Authentication is not session/JWT-based; the controller authenticates callbacks with an HMAC token derived from the project ID.

### Backend middleware & models

#### `backend/middleware/auth.middleware.js` — 139 lines
JWT access-token authentication middleware plus optional-auth support. Protects authenticated routes, loads the active User document, and exposes req.user. It does not itself enforce subscription or email-verification status.

#### `backend/middleware/rateLimit.middleware.js` — 106 lines
Named express-rate-limit policies for login, registration, verification-resend, contact, and uploads. Limits are keyed by IP or user identity depending on the operation.

#### `backend/middleware/upload.middleware.js` — 148 lines
Multer disk-storage policy and MIME/size allowlist for uploads. Supports video/audio plus images (images are needed for profile avatars). The middleware validates browser-reported MIME types; it does not perform magic-byte/content-type verification.

#### `backend/models/Contact.js` — 66 lines
MongoDB schema for inbound contact submissions. Stores sender identity/message metadata and request IP information for support workflows.

#### `backend/models/Plan.js` — 106 lines
MongoDB schema for subscription plans seeded from the static catalog in plan.service.js. Holds key, display information, price, duration and feature metadata.

#### `backend/models/Project.js` — 1014 lines
Central domain schema. Models ownership, stable projectId, status, media input, subtitle mode/style, external subtitle-service state, five pipeline steps, generated subtitle metadata/file, final output video metadata/file, notifications, processing metrics, logs, failure details and source metadata. Several helper methods and validators protect step integrity and make status checks explicit.

#### `backend/models/User.js` — 218 lines
User/account schema with unique normalized email, bcrypt password hash, email-verification state, activation flag, refresh-token versioning, subscription state, and analytics counters. Includes hasActiveAccess() to compute legacy/lifetime/active access semantics, but route protection does not currently call it for subscription gating.

### Backend services & workers

#### `backend/queues/render.queue.js` — 64 lines
Defines the BullMQ render queue, queue naming/options, retry/backoff configuration and the queue connection used by final-video rendering jobs.

#### `backend/server.js` — 853 lines
Process entrypoint and HTTP boundary. Loads env/config, initializes Express/Helmet/CORS/cookies, request IDs and logging, exposes health/root endpoints, mounts API routers, serves the built SPA from backend/public/dist, configures Socket.IO, connects MongoDB, seeds plans, optionally starts the render worker, and handles graceful shutdown and fatal process events.

#### `backend/services/cloudinary.service.js` — 127 lines
Application-level Cloudinary helpers for uploading/deleting media and raw files. Encapsulates Cloudinary public-ID/resource-type choices and normalizes upload metadata returned to controllers.

#### `backend/services/email.service.js` — 220 lines
Transactional email service for verification and project-outcome messages. Uses the configured mail transport when enabled and otherwise behaves as a soft-disabled integration instead of making email a hard startup dependency.

#### `backend/services/media.service.js` — 490 lines
Media-processing core. Downloads remote media with bounded size/timeouts, probes codecs with ffprobe, decides when MP4 stream-copy is safe, invokes FFmpeg for burned-in subtitles, and muxes selectable `mov_text` subtitles into MP4 when possible. It is used by the worker/finalization paths rather than by the browser.

#### `backend/services/notification.service.js` — 95 lines
Project outcome notification policy. Tracks the notification state, suppresses email when the user is currently connected via Socket.IO, otherwise sends completion/failure email and records sent/failed/not_required state.

#### `backend/services/plan.service.js` — 173 lines
Subscription catalog/service layer. Seeds six plan variants at startup, exposes active plans, resolves plans by key, and calculates subscription windows including lifetime plans.

#### `backend/services/project.service.js` — 1191 lines
Application integration/orchestration for the external subtitle service. Defines the five processing stages, generates signed webhook URLs, submits projects, syncs remote status/logs back into MongoDB, resumes failed jobs, and emits project events on meaningful state changes.

#### `backend/services/socket.service.js` — 120 lines
Socket.IO abstraction used by controllers/services to emit project/user events without coupling every call site to the low-level Socket.IO instance. Supports user-room and project-room delivery.

#### `backend/services/srt.service.js` — 40 lines
SRT parsing/normalization helpers used to extract plain text and subtitle metadata while keeping timestamps/indexing intact for user editing and search.

#### `backend/services/subtitle.service.js` — 262 lines
HTTP client for the external subtitle-processing service. Wraps POST project submission, status polling, logs, resume and subtitle download with timeout/error normalization.

#### `backend/services/subtitleStyle.presets.js` — 68 lines
Canonical subtitle rendering presets. Keeps the user-facing style names and FFmpeg `force_style` values in one backend source of truth.

#### `backend/workers/render.worker.js` — 117 lines
BullMQ render worker implementation. Claims finalization/regeneration jobs, performs the media/subtitle pipeline, updates MongoDB output state, uploads files, emits events and invokes notification logic. It is the durable asynchronous processing boundary for work that should survive API restarts.

### Frontend configuration & app shell

#### `frontend/.env.example` — 13 lines
Frontend environment contract: app name/tagline, API base URL, Socket.IO URL, public portfolio URL and maximum upload size in MB.

#### `frontend/.gitignore` — 24 lines
Frontend-specific ignore rules for Vite build/development artifacts and local environment files.

#### `frontend/.oxlintrc.json` — 8 lines
Oxlint configuration controlling static-analysis rules for the React/Vite codebase.

#### `frontend/index.html` — 85 lines
Vite HTML shell. Provides the root mount element, document metadata and the initial browser page that loads the React application.

#### `frontend/jsconfig.json` — 7 lines
JavaScript project/editor configuration. Supports the `@/*` source alias and developer tooling around the Vite React app.

#### `frontend/package-lock.json` — 2913 lines
Exact frontend dependency lockfile. Keeps React/Vite/Tailwind/React Query/Socket.IO/Recharts package resolution reproducible.

#### `frontend/package.json` — 36 lines
Frontend dependency manifest. Includes Vite, React 19, React Router, TanStack Query, Axios, Socket.IO client, Tailwind 4, Framer Motion, Recharts and UI helpers. `dist` is notable: it deletes/rebuilds frontend output and moves it to the backend public directory used by Express.

#### `frontend/src/App.jsx` — 82 lines
Top-level React router composition. Route-level dynamic imports create code-split chunks for public/auth/dashboard pages, while layouts and guards provide shared navigation/auth behavior.

#### `frontend/src/main.jsx` — 23 lines
React bootstrap. Installs StrictMode, TanStack Query, ThemeProvider and AuthProvider, sets the initial document title, then mounts App.

#### `frontend/vite.config.js` — 17 lines
Vite configuration. Enables React, Tailwind, and source alias behavior required by the app and its deployment/build flow.

### Frontend APIs/lib/context/hooks/layouts

#### `frontend/src/api/auth.api.js` — 12 lines
Thin Axios API wrapper for register/login/refresh/me/logout/logout-all/email verification/resend operations.

#### `frontend/src/api/contact.api.js` — 5 lines
Thin API client for the public contact-form POST.

#### `frontend/src/api/plan.api.js` — 11 lines
API client for public plan catalog and authenticated subscription information/activation.

#### `frontend/src/api/project.api.js` — 34 lines
Project API client for create/get/refresh/logs/resume/subtitle update/rename/duplicate/delete. Uses the MongoDB-oriented project controller endpoints.

#### `frontend/src/api/upload.api.js` — 19 lines
Multipart upload client. Sends the selected file to the protected upload endpoint and returns Cloudinary metadata needed for subsequent project creation or avatar update.

#### `frontend/src/api/user.api.js` — 19 lines
Authenticated user API client for profile, password, projects, stats, storage, subscription and account lifecycle calls.

#### `frontend/src/context/AuthContext.jsx` — 124 lines
Global auth state. Bootstraps the session by silently refreshing the httpOnly refresh cookie and fetching `/auth/me`; stores the short-lived access token only in memory and exposes login/register/logout helpers.

#### `frontend/src/context/NotificationsContext.jsx` — 50 lines
Global socket-driven notification state with a bounded in-memory history, unread tracking and sound preferences. It intentionally avoids durable notification storage on the frontend.

#### `frontend/src/context/SidebarContext.jsx` — 39 lines
Shared responsive sidebar open/collapse state for the dashboard shell.

#### `frontend/src/context/SocketContext.jsx` — 66 lines
Creates and manages the Socket.IO client connection for authenticated users, passing the current access token as socket auth.

#### `frontend/src/context/ThemeContext.jsx` — 34 lines
Persists/controls the UI theme and applies the `dark` class used by Tailwind v4 custom dark mode.

#### `frontend/src/hooks/useDebouncedValue.js` — 12 lines
Small utility hook for delayed values, primarily used to debounce list-search/filter input.

#### `frontend/src/hooks/useMediaTime.js` — 53 lines
Media element timing hook. Tracks currentTime/duration and provides state to synchronized caption rendering.

#### `frontend/src/hooks/usePageTitle.js` — 21 lines
Per-page document-title helper used to keep browser tab titles aligned with the active screen.

#### `frontend/src/hooks/useProjectSocket.js` — 32 lines
Project-detail socket hook that joins a project room and exposes live project events to the page.

#### `frontend/src/layouts/AuthLayout.jsx` — 64 lines
Shared centered layout for login/register screens.

#### `frontend/src/layouts/DashboardLayout.jsx` — 44 lines
Private dashboard shell combining header/sidebar/content outlet plus user/session navigation behavior.

#### `frontend/src/layouts/PublicLayout.jsx` — 15 lines
Public marketing shell combining public header/footer around routed content.

#### `frontend/src/lib/axios.js` — 79 lines
Central Axios instance with credentials, Authorization header injection, and a guarded 401-refresh queue that retries concurrent requests after refreshing the access token.

#### `frontend/src/lib/config.js` — 15 lines
Frontend runtime configuration constants with safe local-development defaults and a client-side upload-size guard that is intended to match backend MAX_UPLOAD_SIZE_BYTES.

#### `frontend/src/lib/download.js` — 48 lines
Browser download/open helper for generated media/subtitles. It fetches the remote URL to a Blob for same-page download behavior, which means large downloads consume browser memory.

#### `frontend/src/lib/format.js` — 66 lines
Display-formatting helpers for bytes, dates, durations/timecodes and human-readable UI text.

#### `frontend/src/lib/queryClient.js` — 14 lines
TanStack Query client configuration. Centralizes defaults for dashboard data fetching/caching/invalidation behavior.

#### `frontend/src/lib/sound.js` — 81 lines
Small browser-audio helpers used by NotificationsContext/SoundToggle to play UI notification cues.

#### `frontend/src/lib/srt.js` — 76 lines
Forgiving browser-side SRT parser and SRT→VTT conversion helpers. Converts timestamp commas to WebVTT periods and exposes active-cue lookup for synchronized captions.

#### `frontend/src/lib/tokenStore.js` — 11 lines
In-memory access-token store. Deliberately avoids localStorage persistence, reducing long-term token exposure at the expense of requiring a silent refresh after full page reload.

### Frontend reusable components

#### `frontend/public/demo/README.md` — 9 lines
Documentation note for the demo media assets shipped with the marketing landing page.

#### `frontend/public/demo/after.mp4` — 30239 lines
Marketing/demo output video displayed by the public landing page. It is intentionally static frontend content, not a user-project asset.

#### `frontend/public/demo/before.mp4` — 33995 lines
Marketing/demo input video displayed by the public landing page.

#### `frontend/public/favicon.svg` — 23 lines
Browser/site favicon SVG.

#### `frontend/public/og-image.png` — 48695 lines
Social/Open Graph preview image used for link sharing and page metadata.

#### `frontend/src/assets/waveform.lottie.json` — 510 lines
Lottie animation asset used in the marketing UI/waveform visual treatment.

#### `frontend/src/components/common/Avatar.jsx` — 34 lines
Reusable avatar renderer for image/initial fallback states across the dashboard/header UI.

#### `frontend/src/components/common/EmptyState.jsx` — 27 lines
Reusable empty/no-results presentation used by project lists and similar screens.

#### `frontend/src/components/common/FileDropzone.jsx` — 122 lines
Drag-and-drop/file-picker surface for new project input. Handles file selection, client-side size/type feedback and exposes the chosen file to NewProject.

#### `frontend/src/components/common/FullScreenLoader.jsx` — 24 lines
Application-level loading screen used around lazy routes and initial auth/bootstrap transitions.

#### `frontend/src/components/common/LegalPage.jsx` — 20 lines
Shared static layout for legal documents such as privacy/terms, preventing duplicated typography/navigation code.

#### `frontend/src/components/common/Logo.jsx` — 19 lines
Brand mark/text presentation shared by public and authenticated navigation.

#### `frontend/src/components/common/NotificationBell.jsx` — 63 lines
Global notification UI backed by NotificationsContext. Opening the notification menu marks notifications read as a batch, which is convenient but not a per-item read model.

#### `frontend/src/components/common/Pagination.jsx` — 53 lines
Reusable paginated list navigation component for project history/search results.

#### `frontend/src/components/common/SoundToggle.jsx` — 25 lines
User preference control for notification sound effects; the state is held client-side through the notification context/sound helpers.

#### `frontend/src/components/common/ThemeToggle.jsx` — 22 lines
Switches between the application light/dark theme via ThemeContext.

#### `frontend/src/components/dashboard/EmailVerificationBanner.jsx` — 42 lines
Dashboard banner shown when the account email is not verified; uses the auth resend flow to help the user finish verification.

#### `frontend/src/components/dashboard/LogsPanel.jsx` — 56 lines
Project log viewer. Presents normalized project logs from the API and supports readable level/timestamp/status presentation without exposing the Python service’s internal filesystem representation.

#### `frontend/src/components/dashboard/PipelineSteps.jsx` — 64 lines
Visualizes the five backend processing steps and their current statuses/durations for project progress tracking.

#### `frontend/src/components/dashboard/ProjectCard.jsx` — 177 lines
Compact project summary card for lists/dashboard. Surfaces title, project state, metadata and navigation actions.

#### `frontend/src/components/dashboard/StatCard.jsx` — 30 lines
Reusable metric tile used by dashboard/analytics views.

#### `frontend/src/components/dashboard/SubtitleModeSelector.jsx` — 67 lines
Video subtitle-delivery selector for embedded (burned-in) versus selectable soft-track output. It communicates the meaningful rendering trade-off to users.

#### `frontend/src/components/dashboard/SubtitlePanel.jsx` — 224 lines
Main subtitle inspection/editing surface. Loads SRT text, shows an in-app preview, allows direct editing, and exposes subtitle mode/style changes; saving posts the edited SRT back to the backend and may trigger output regeneration.

#### `frontend/src/components/dashboard/SubtitleStyleSelector.jsx` — 78 lines
Video subtitle-style preset selector, limited to the embedded rendering mode.

#### `frontend/src/components/dashboard/SyncedCaptions.jsx` — 91 lines
Live caption overlay/timeline for the project media player. Uses parsed SRT cues and current playback time to animate the currently active cue.

#### `frontend/src/components/landing/CTA.jsx` — 30 lines
Marketing conversion section that drives users from product explanation toward signup/dashboard actions.

#### `frontend/src/components/landing/DemoReel.jsx` — 172 lines
Public demo player/comparison section using bundled before/after media to communicate subtitle results without a live backend call.

#### `frontend/src/components/landing/Faq.jsx` — 69 lines
Public FAQ accordion answering common product/use questions.

#### `frontend/src/components/landing/Features.jsx` — 108 lines
Marketing feature grid describing subtitle generation and workflow capabilities.

#### `frontend/src/components/landing/Hero.jsx` — 163 lines
Primary landing-page hero/positioning section with product promise and main call-to-action.

#### `frontend/src/components/landing/HowItWorks.jsx` — 57 lines
Three-step public explanation of upload → live processing → review/edit/export.

#### `frontend/src/components/landing/StatsStrip.jsx` — 30 lines
Marketing statistic strip used to add proof/scale cues on the landing page.

#### `frontend/src/components/landing/SubtitleModesShowcase.jsx` — 131 lines
Public explanation of embedded versus selectable subtitles and why users might choose either.

#### `frontend/src/components/landing/WaveformLottie.jsx` — 16 lines
Small wrapper around the Lottie waveform asset, keeping animation configuration out of the main landing page components.

#### `frontend/src/components/layout/Header.jsx` — 81 lines
Authenticated dashboard header. Combines brand/nav utility elements, notification access, profile/account actions and responsive layout concerns.

#### `frontend/src/components/layout/PublicFooter.jsx` — 93 lines
Marketing/legal footer with navigation and external portfolio link.

#### `frontend/src/components/layout/PublicHeader.jsx` — 102 lines
Public-site header with marketing navigation and auth CTAs.

#### `frontend/src/components/layout/Sidebar.jsx` — 151 lines
Dashboard navigation sidebar. Controls active route presentation and responsive/collapsed behavior, using SidebarContext where needed.

#### `frontend/src/components/ui/Button.jsx` — 60 lines
Base button primitive with size/variant/loading/disabled states used throughout the app.

#### `frontend/src/components/ui/Card.jsx` — 15 lines
Base surface/container primitive for consistent dashboard/public card styling.

#### `frontend/src/components/ui/Dropdown.jsx` — 109 lines
Reusable dropdown/menu primitive for account actions, filters and contextual menus.

#### `frontend/src/components/ui/Feedback.jsx` — 22 lines
Reusable feedback/status presentation for success, warning, error and informational messages.

#### `frontend/src/components/ui/Input.jsx` — 71 lines
Shared labeled input/textarea/form-control wrapper with validation/error presentation.

#### `frontend/src/components/ui/Modal.jsx` — 59 lines
Reusable modal/dialog shell used for confirmations and destructive/account actions.

#### `frontend/src/components/ui/StatusBadge.jsx` — 29 lines
Normalized status-label visual for project/subscription state values.

### Frontend routed pages

#### `frontend/src/pages/auth/Login.jsx` — 92 lines
Login screen. Performs client-side validation, delegates authentication to AuthContext and navigates into the dashboard on success.

#### `frontend/src/pages/auth/Register.jsx` — 120 lines
Registration screen with client-side field validation and account-creation flow; the backend immediately issues access/refresh credentials while email verification remains a separate lifecycle.

#### `frontend/src/pages/auth/VerifyEmail.jsx` — 92 lines
Email-verification result screen. Calls the tokenized backend verification endpoint and renders success/error guidance.

#### `frontend/src/pages/dashboard/Analytics.jsx` — 176 lines
Authenticated analytics page. Fetches project statistics/storage data and visualizes trends/metrics with Recharts.

#### `frontend/src/pages/dashboard/NewProject.jsx` — 154 lines
New-project workflow: choose video/audio, upload to `/api/uploads`, then submit returned Cloudinary metadata plus subtitle mode/style to `/api/projects` and navigate to the project detail page.

#### `frontend/src/pages/dashboard/Overview.jsx` — 117 lines
Dashboard home. Fetches current-user stats/storage/recent projects and composes summary widgets, recent work and navigation.

#### `frontend/src/pages/dashboard/Profile.jsx` — 317 lines
Profile/account settings. Edits name/avatar, changes password, displays subscription information, and exposes deactivate/delete flows. Avatar upload reuses the general upload API.

#### `frontend/src/pages/dashboard/ProjectDetail.jsx` — 503 lines
Most complex dashboard page. Loads a project, joins its live Socket.IO room, plays media, parses/downstreams SRT captions for synchronized UI, displays pipeline/log state, and provides rename/refresh/resume/subtitle-edit/duplicate/delete actions.

#### `frontend/src/pages/dashboard/ProjectsList.jsx` — 107 lines
Searchable/paginated project history. Uses debounced search, status filters and TanStack Query to load the authenticated user’s project list.

#### `frontend/src/pages/public/Contact.jsx` — 94 lines
Public contact form page with client-side validation and submission feedback.

#### `frontend/src/pages/public/Landing.jsx` — 23 lines
Composes the full marketing home page from the landing components; no authenticated project API is required for the core demo experience.

#### `frontend/src/pages/public/NotFound.jsx` — 37 lines
Fallback 404 page for unknown client-side routes.

#### `frontend/src/pages/public/Pricing.jsx` — 131 lines
Public pricing page. Loads plans from the backend and, when authenticated, can invoke the current placeholder subscription activation flow.

#### `frontend/src/pages/public/Privacy.jsx` — 42 lines
Static privacy-policy page rendered through LegalPage.

#### `frontend/src/pages/public/Terms.jsx` — 41 lines
Static terms page rendered through LegalPage.

### Frontend routing/assets

#### `frontend/src/routes/ProtectedRoute.jsx` — 16 lines
Route guard that requires AuthContext authentication before rendering dashboard routes; otherwise redirects to login.

#### `frontend/src/routes/PublicOnlyRoute.jsx` — 14 lines
Route guard for auth screens. Redirects already-authenticated users away from login/register toward the private app.

## 16. Operational runbook

### Local backend

```bash
cd backend
npm ci
cp .env.example .env
# fill MongoDB, Cloudinary, JWT, Redis and subtitle-service settings
npm run dev
```

### Local frontend

```bash
cd frontend
npm ci
cp .env.example .env
npm run dev
```

### Build the integrated web app

```bash
cd frontend
npm run dist
```

This generates Vite output and moves it into `backend/public/dist` for Express static serving. Because that destination is generated/static output, it should not be treated as the source-of-truth frontend code.

### Docker Compose

```bash
cd backend
docker compose up --build
```

For the current codebase, keep `ENABLE_RENDER_WORKER=true` unless the worker entrypoint is standardized. The intended scaled design needs a dedicated worker entrypoint (currently missing as `worker.js`).

## 17. Verification performed

- JavaScript syntax checking across the inspected `.js` files passed with **0 syntax failures**.

- The repository inventory excludes `backend/public/**` exactly as requested.

- Static inspection identified a concrete missing-file reference: `backend/package.json` and `backend/docker-compose.yml` expect `worker.js`, but the repository contains `workers/render.worker.js` instead.

- The root README is not a substantive technical guide; this document therefore intentionally becomes the practical architecture reference.

## 18. Production-readiness findings

### P0/P1 — fix before relying on this in a multi-tenant production environment

**1. Bind project input assets to the authenticated user.**
The project-create API accepts a client-supplied Cloudinary URL/publicId pair. Do not trust that tuple by itself. Persist a server-issued upload token/reference and validate ownership/resource type before starting the remote subtitle pipeline.

**2. Fix the scaled-worker entrypoint.**
Either add a tiny `worker.js` bootstrap that imports/starts `workers/render.worker.js`, or change Compose/package scripts to invoke the real file. This is operationally critical.

**3. Replace placeholder subscription activation with a real payment verification path.**
The current endpoint can immediately mark a user paid with a manually recorded payment object. In production this is not an entitlement control. Introduce a payment-provider webhook/signature verification flow and make activation idempotent.

**4. Add actual subscription gating.**
`protect` checks only token validity and `isActive`. If plan limits/entitlements are part of the product, enforce them in project creation, storage, processing duration, or another explicit policy layer.

### P1/P2 — security/reliability hardening

**5. Fix refresh-token session semantics.**
Choose either true rotation with token-family/reuse detection or simpler non-rotating refresh tokens. Also separate “logout this device” from “logout all devices”; the current global version increment makes them equivalent.

**6. Prevent output-regeneration/delete races.**
A subtitle edit can set `output.status=processing` while the Project itself remains `completed`. The delete controller primarily guards Project status, so a queued regeneration job can race with asset deletion. Add an explicit output-job state/lock check and/or cancel/claim semantics.

**7. Make Socket.IO token refresh explicit.**
Re-bind socket auth when Axios refreshes the access token or recreate the connection on token change.

**8. Deduplicate project socket notifications.**
When the same socket belongs to both the user and project rooms, one project event may arrive twice. Add an event ID and de-duplication in NotificationsContext or emit distinct event channels.

**9. Improve health/readiness coverage.**
Expose dependency readiness for MongoDB/Redis/Cloudinary/subtitle-service/FFmpeg so orchestration distinguishes “HTTP server is up” from “processing stack is healthy.”

### P2 — maintainability/consistency

**10. Centralize environment validation.**
Create a startup validation module that resolves defaults once and logs the effective configuration class (without secrets). This eliminates the 7-day vs 30-day refresh discrepancy and the source-download default mismatch.

**11. Standardize project IDs in the public contract.**
Pick `_id` or the stable `projectId` for external API consumers, or name endpoints to make the distinction obvious.

**12. Remove or quarantine dead deployment/email artifacts.**
`supervisord.conf`, `temp.email.service.txt`, and any obsolete worker entrypoint references should either become documented alternatives or be removed.

**13. Add automated tests.**
The backend `test` script is a placeholder and there are no visible unit/integration tests in the inspected tree. High-value coverage includes auth/session rotation, ownership checks, signed webhook replay/idempotency, project state transitions, subtitle validation, render retry semantics, delete/regenerate races and Cloudinary cleanup.

## 19. Testing strategy

| Area | Minimum regression cases |
|---|---|
| Auth | register/login/refresh/logout/logout-all; expired access; invalid refresh; inactive user |
| Ownership | user A cannot read/rename/duplicate/delete user B project; cannot use user B upload metadata |
| Upload | MIME mismatch; oversized file; temp cleanup; Cloudinary failure |
| Webhook | invalid HMAC; replay; malformed step; duplicate completion; SRT too large/invalid |
| Render | H.264/AAC stream-copy; unsupported codec fallback; FFmpeg failure; cleanup; retry |
| Subtitle edit | valid/invalid SRT; 2 MiB boundary; mode/style changes; concurrent edits; regeneration failure |
| Delete | completed project cleanup; shared publicId; delete while output regeneration is queued/processing |
| UI session | access expiry with multiple simultaneous requests; socket reconnect after token refresh |
| Plans | activation cannot grant paid access without provider proof; expired/lifetime calculations |

## 20. Architecture assessment

### Strong design choices

- Clear separation between controller, service, model, route and queue layers.
- User ownership is repeatedly included in project MongoDB queries rather than trusting project IDs alone.
- Webhook tokens are HMAC-derived, and the database deliberately avoids storing raw webhook secrets/URLs.
- Project logs and pipeline state are normalized and compact rather than persisting huge raw external-service responses.
- BullMQ makes long FFmpeg work durable and retryable.
- FFmpeg/ffprobe are explicitly verified in the Docker image.
- Access tokens remain in memory on the browser, while refresh credentials use an httpOnly cookie.
- Route-level React lazy loading keeps large dashboard-only dependencies out of the public landing-page bundle.

### Structural weaknesses

- The backend currently contains too much orchestration logic in a few very large controllers (`project.controller.js`, `webhook.controller.js`, `user.controller.js`).
- Subscription state exists but is not a complete entitlement system.
- External asset references are trusted too broadly at project creation.
- Session invalidation semantics are coarse.
- Some operational contracts are inconsistent (worker entrypoint, refresh expiry, source-download defaults).
- There is little automated verification visible in the repository.

## 21. Recommended target architecture

A strong next-stage refactor would keep the existing mental model but tighten boundaries:

```text
HTTP / Socket / Webhook
        │
        ▼
Route handlers (thin)
        │
        ▼
Application services
  ├─ AuthService
  ├─ ProjectService
  ├─ SubscriptionService
  ├─ AssetService
  ├─ RenderService
  └─ NotificationService
        │
        ├────────── MongoDB repositories
        ├────────── Cloudinary adapter
        ├────────── Subtitle-service adapter
        └────────── Queue adapter
                         │
                         ▼
                 Dedicated render worker
```

The current code already contains most of these responsibilities; the main improvement would be **making the boundaries explicit**, adding a server-issued asset reference, and moving state-transition logic out of giant controllers into testable services.

## 22. Maintainer guide

When changing the project pipeline, update these pieces together: `Project.js` state/fields → project/webhook service/controller transitions → render queue/worker semantics → Socket.IO event contract → frontend project detail and query invalidation → delete/cleanup rules. A change in any one layer can silently break the lifecycle because the system is intentionally asynchronous.

When changing authentication, update `auth.controller.js`, `auth.middleware.js`, `tokenStore.js`, `axios.js`, `AuthContext.jsx`, and `SocketContext.jsx` as one unit. The browser has two authentication consumers—REST and Socket.IO—and they currently recover from access-token expiry differently.

When changing subtitle rendering, test both `embedded` and `selectable` paths with multiple audio/video codecs. The two modes intentionally have different performance and compatibility behavior, so a fix that is correct for one path may be wrong for the other.

## 23. Final assessment

Subtaro has a solid product skeleton and a surprisingly complete asynchronous workflow for a small full-stack repository: account lifecycle, user-scoped projects, remote AI processing, signed callbacks, persisted state, durable rendering, live UI updates and manual subtitle editing are all present. The biggest gap is not missing UI functionality; it is **hardening the trust, entitlement, worker/deployment and concurrency contracts** that become critical once multiple users and sustained production workloads are involved.

For future contributors, the highest-value reading order is: `backend/models/Project.js` → `backend/controllers/project.controller.js` → `backend/controllers/webhook.controller.js` → `backend/services/project.service.js` → `backend/workers/render.worker.js` → `backend/services/media.service.js` → `frontend/src/pages/dashboard/ProjectDetail.jsx` → `frontend/src/lib/axios.js`/`AuthContext.jsx`/`SocketContext.jsx`. Those files explain the majority of the real runtime behavior.


---

## README asset references

The images used by this README are repository-relative, so they work directly on GitHub when the README is kept at the repository root:

- `./frontend/public/og-image.png`
- `./frontend/public/favicon.svg`

The favicon is rendered here as a small project mark for GitHub. GitHub does not use a README to set the browser-tab favicon; the actual application favicon remains `frontend/public/favicon.svg`.