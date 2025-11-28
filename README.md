# High-Scale Voting System Architecture

## Overview

Design for a global voting platform serving **300M users** with **250K requests/second**, ensuring **zero vote loss** even under poor network conditions.

---

## Frontend Responsibilities

- Provide an **accessible and simple** voting interface that works seamlessly offline or on slow networks.
- **Persist every vote locally** until confirmed by the backend.
- Ensure **no duplication** of votes through unique identifiers.
- Display **clear state feedback** to the user (`Queued`, `Transmitting`, `Confirmed`).
- **Protect voter privacy** using cryptographic techniques and signatures.

---

## Architecture Overview

- **Service Worker / Persistent Queue (IndexedDB):** Queue votes locally until successfully delivered.
- **CDN Integration:** Serve frontend globally from the edge for sub-second load times.
- **Edge Functions:** Handle authentication, validation, and anti-bot checks close to users.

---

## Core Frontend Patterns

- The **Service Worker** manages background synchronization and queue processing.
- Votes are stored in **IndexedDB** with retry logic to ensure delivery.
- Each queued vote contains:
  - `id` — Local unique identifier
  - `idempotencyKey` — Prevents duplicate processing
  - `status` — `queued`, `sending`, `confirmed`, `failed`
  - `retries` — Retry count for tracking attempts
  - `signature` (signed with ephemeral key or server-issued token)

---

## Vote Lifecycle

1. **User casts a vote**
   - The frontend generates a `voteId`, cryptographic `signature` and `idempotencyKey`.
   - The vote is stored in IndexedDB with status `queued`.

2. **Network transmission**
   - The Service Worker attempts to send votes in the background.
   - If offline, votes remain in the queue.

3. **Confirmation**
   - On success, the backend confirms with a signed response.
   - The vote is marked as `confirmed` and removed from the queue.

4. **Retry strategy**
   - Exponential backoff for retries.
   - Votes are retried automatically when the user is back online.

---

## Offline & Reliability Strategy

- **IndexedDB** ensures persistence even after browser restarts.
- **Service Worker** guarantees background sync when connectivity returns.
- **Idempotent endpoints** ensure a vote is never counted twice.
- **Visual feedback** keeps users informed without waiting for network confirmation.

---

## Global Scale & Delivery

- **Static Assets:**
  - Hosted and cached globally using a CDN or edge platform (e.g., Cloudflare Pages).
  - All UI assets are versioned and served from the nearest location.

- **Edge Functions:**
  - Authenticate users and sign requests close to their region.
  - Verify request integrity (signature, timestamp, token).

- **Smart Retry & Throttling:**
  - Prevent reconnection storms during outages.
  - Client-side rate limiting and retry queuing logic.

---

## Real-Time Updates

- **Technology Options:**
  - Cloudflare Channels / WebSockets / SSE for real-time vote counting.
  - Fallback to polling on poor connections.

- **Strategy:**
  - Broadcast live results efficiently using pub/sub.
  - Only maintain active WebSocket connections for live sessions.

---

## Recommended Frontend Stack (Vue.js Version)

| Component           | Technology                       | Purpose                                               |
| ------------------- | -------------------------------- | ----------------------------------------------------- |
| Framework           | Vue 3 + Vite                     | Lightweight, fast, ideal for POCs and low-end devices |
| State / Local Queue | IndexedDB (Dexie.js)             | Persistent offline vote queue                         |
| Sync Engine         | Service Worker + Background Sync | Reliable delivery and retry logic                     |
| Cryptography        | Web Crypto API                   | Digital signatures for vote integrity                 |
| Offline Logic       | Service Worker + Vue composables | Network awareness and auto-retries                    |
| Hosting             | Cloudflare Pages or Vercel Edge  | Global CDN delivery                                   |
| Real-Time Updates   | WebSockets / SSE                 | Live vote count updates                               |
| Build Output        | Static assets                    | Easily deployable to any CDN                          |

---

## Security & Privacy Considerations

- All votes are signed with a **client-side cryptographic key** before transmission.
- The server verifies the signature before counting the vote.
- No personal identifying data is sent with the vote payload.
- HTTPS and HSTS enforced for all communication.

---


## CDN Cloudflare vs AWS Cloudfront - TRADEOFFS

### Amazon Cloudfront
- *Extensive Network of PoPs:* Present in different regions, more than 410 PoPs (Points of Presence) in 48 countries.
- *Security:* Can combine with AWS Web Shield, AWS APplication Firewall and AWS S3 Route to prevent attacks.
- *Availability:* Can enable Origin Shield to reduce the server load and also can have redundancy on backend architecture.
- *Cloudfront Edge:* It offers programmable functions and solutions for managing traffic at edge locations.
- *Intuitive Panel:* Developer friendly, complete API and SDKs of AWS with devops tools, to configure workloads or propagate changes fast.

### Cloudflare
- *Integrated cache:* Personalized cache module to control pages to be cached.
- *DNS:* Free service that translate names in to IP address when access in being done with 4,5ms.
- *Security:* Has firewall for web applications, is available in paid plans and have criptography SSL/TLS

*Conclusion:* Cloudflare is best for simple, low-cost, easy-to-deploy caching and security across any cloud, while CloudFront is the better choice for deep AWS integration, advanced edge features, and high-performance control.

---

## Retry Strategy

The frontend uses built-in browser features to guarantee that every vote is eventually delivered.

### Components Used
- **Service Worker** → runs the sync logic
- **Background Sync API** → automatic retry when online
- **IndexedDB** → stores votes until confirmed
- **Online/Offline events** → trigger immediate retries
- **Exponential Backoff** → avoid flooding the server
- **Idempotency Keys** → prevent duplicate votes

### Sync Flow
1. User votes → save vote in `IndexedDB`.
2. Service Worker tries to send it immediately.
3. If offline:
   - Service Worker registers a background sync task (`sync-votes`).
4. When the network returns:
   - Browser fires the `"sync"` event
   - Service Worker sends all queued votes.
5. If the API returns 5xx/timeouts:
   - Retry with exponential backoff + jitter.
6. When a vote succeeds:
   - Mark as `confirmed` and remove from the queue.
7. Votes stay in IndexedDB **until confirmed**, so none are lost.

### Summary
- Background Sync = the watcher
- Service Worker = the retry engine
- IndexedDB = the persistent queue
- Backoff + idempotency = safe retries

---

## Frontend Performance (Vite + Vue) Compression

To support a global voting system, the frontend must load fast and remain lightweight. With **Vite**, we ensure optimized builds and fast delivery.

### Bundling
- Vite uses **ESBuild** (dev) and **Rollup** (prod).
- Automatic **tree-shaking** to remove unused code and **code-splitting** reduce final bundle size.
- Dynamic imports load only what the user needs.

### Compression
Serve pre-compressed static assets for maximum performance:
- **Brotli (.br)** – best compression ratio.
- **Gzip (.gz)** – fallback for older browsers.

Recommended plugin: `vite-plugin-compression`

### Caching Strategy
- Static assets: Cache-Control: max-age=31536000, immutable
- HTML: no-cache (always fetch latest version)
- Vite automatically adds hashed filenames for long-term caching.

### Runtime Optimizations
- Use HTTP/2 or HTTP/3 for parallel and faster asset delivery.
- Lazy-load heavy components:

```
const VoteChart = defineAsyncComponent(() => import('./VoteChart.vue'))
```

### Vite automatically injects:
- `<link rel="modulepreload">`
- Optimized asset preloading.

## Mobile Native App - Security

### 1. Code Protection
- Enable obfuscation (Android R8/ProGuard, iOS symbol stripping).
- Remove debug symbols and disable debug builds.

### 2. Secure Storage
- Never store secrets in plain text.
- Use OS secure storage:
  - Android: Keystore + EncryptedSharedPreferences
  - iOS: Keychain

### 3. API Security
- Enforce HTTPS only.
- Use SSL Certificate Pinning.
- Avoid embedding API keys inside the app.
- Use backend-issued tokens (OAuth / PKCE / JWT).

### 4. Runtime Protection
- Detect jailbreak/root.
- Detect hooking/debugging tools.
- Block execution on compromised environments (optional).

### 5. Integrity & Anti-Tampering
- Validate app signature on backend.
- Use Play Integrity API / DeviceCheck.
- Detect repackaging or code injection.

### Minimal Setup
- HTTPS + certificate pinning
- Secure storage via Keychain/Keystore
- Token-based auth (no hardcoded secrets)
- Obfuscation enabled
- Basic root/jailbreak detection
- Backend checks app signature + token freshness