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

### Cloudfare