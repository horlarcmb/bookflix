# BookFlix AI Operating System: Implementation Milestones

**Location**: `/ai-system/docs/implementation-milestones.md`  
**Classification**: Implementation Specs / Developer Blueprint  
**Version**: 1.0.0  

---

## Milestone 1: Production Database Migration (MongoDB Enforce)
* **Objective**: Eliminate blocking flat-file JSON write operations in `/server_data/` and enforce MongoDB persistence across all operations.

### Files to Create / Modify
* Modify [server.cjs](file:///c:/Users/Optimus01/Downloads/bookflix/server.cjs): Refactor all `db` object functions (`getUsers`, `saveBook`, `updateBook`, `deleteBook`, `logTelemetry`) to throw exceptions if MongoDB is disconnected, removing JSON fallbacks in production mode.
* Create `/ai-system/scripts/migrate_db.js`: Script to read existing `users.json`, `books.json`, and `book_contents.json` and bulk write them into MongoDB on startup.

### Backend Changes
* Set up database connection validation middleware.
* Enforce transactions for progress updates (`/api/auth/progress`) to avoid concurrent save collisions.

### Frontend Changes
* None (the database layer changes are transparent to API callers).

### APIs Needed
* None (behavior of existing `/api/books`, `/api/auth/progress` endpoints remains identical but executes under MongoDB).

### Database Changes
* Seed collections: `users`, `books`, `bookcontents`, `telemetry`, `transactions`, `systemsettings`.
* Create compound indexes in MongoDB:
  * `User`: `{ email: 1 }`
  * `BookContent`: `{ bookId: 1 }`
  * `Telemetry`: `{ eventType: 1, timestamp: -1 }`

### Testing Strategy
1. **Migration Test**: Run the migration script locally and check collection counts:
   ```bash
   node ai-system/scripts/migrate_db.js
   ```
2. **Concurrency Test**: Trigger 50 parallel bookmarks API calls using Apache Bench to verify database locking:
   ```bash
   ab -n 50 -c 10 -H "Authorization: Bearer <TOKEN>" -T "application/json" -p post_data.json http://localhost:5000/api/auth/toggle-save
   ```

---

## Milestone 2: Background Task Worker Setup (Non-Blocking Ingest & NLP)
* **Objective**: Decouple CPU-intensive EPUB zip extraction and NLP tokenization from the main Node.js event loop.

### Files to Create / Modify
* Create `/ai-system/workflows/tasks_worker.py`: Background worker that runs a queue, parses EPUB packages, generates chapter summaries, and uploads results to MongoDB.
* Modify [server.cjs](file:///c:/Users/Optimus01/Downloads/bookflix/server.cjs): Modify `/api/admin/parse-epub` and `/api/nlp/summarize` to return a `taskId` instead of executing processing synchronously.

### Backend Changes
* Integrate Redis client in Node.js to push task parameters into a Redis queue.
* Implement status polling route `/api/tasks/status/:id`.

### Frontend Changes
* Modify [AdminDashboard.jsx](file:///c:/Users/Optimus01/Downloads/bookflix/src/pages/AdminDashboard.jsx): Update EPUB upload action to poll task progress with a progress bar indicator.
* Modify [TextReader.jsx](file:///c:/Users/Optimus01/Downloads/bookflix/src/components/TextReader.jsx): Update AI Chapter Insights to execute asynchronously and show an active loading state.

### APIs Needed
* `POST /api/tasks/enqueue`: Pushes text payload to Redis.
* `GET /api/tasks/status/:id`: Returns status `Pending | Processing | Completed | Failed` along with result data.

### Database Changes
* Create `tasks` collection:
  ```json
  {
    "_id": "task_id_string",
    "status": "Completed",
    "result": { "summary": "...", "keyPoints": [] },
    "error": null,
    "createdAt": "timestamp"
  }
  ```

### Testing Strategy
1. **Thread Block Test**: Run a loop uploading large EPUBs. Perform a GET `/api/books` request simultaneously and verify the API responds within < 10ms.
2. **Worker Recovery Test**: Kill the Python worker process during an active parse, restart it, and verify the task state transitions to `Failed` or restarts automatically.

---

## Milestone 3: Asset Cloud Storage Migration (No More Base64)
* **Objective**: Move large Base64 manga frames and book cover strings out of MongoDB and into secure Cloud Storage (AWS S3 / Google Cloud Storage).

### Files to Create / Modify
* Create `/ai-system/scripts/migrate_assets.js`: Script to search MongoDB, locate Base64 image tags, convert them into binary buffers, upload them to S3, and update DB strings to S3 URLs.
* Modify [server.cjs](file:///c:/Users/Optimus01/Downloads/bookflix/server.cjs): Update the EPUB parser endpoint to stream image uploads directly to S3.

### Backend Changes
* Install `@aws-sdk/client-s3`. Initialize S3 credentials.

### Frontend Changes
* Modify [PanelReader.jsx](file:///c:/Users/Optimus01/Downloads/bookflix/src/components/PanelReader.jsx): Read frame image URL directly from `page.imageUrl` instead of parsing `page.imageBase64`.

### APIs Needed
* `POST /api/admin/upload-image`: Direct single-asset upload endpoint for custom book covers.

### Database Changes
* Update schemas in `Book` and `BookContent`:
  * Rename `cover` from string (Base64) to string (URL).
  * Update `BookContent.pages` array to replace `imageBase64` with `imageUrl`.

### Testing Strategy
1. **Db Bloat Check**: Query database document sizes before and after asset migration:
   ```javascript
   // Run in Mongo Shell
   db.bookcontents.stats().avgObjSize
   ```
   Verify that average object size drops from 15MB+ to < 10KB.
2. **Render Verification**: Load the `PanelReader` in browser devtools and check Network tab to verify manga images download directly from S3 bucket URLs instead of API payloads.

---

## Milestone 4: Production Payment Integration (Stripe Checkout)
* **Objective**: Replace the wallet/withdrawer simulator with a production Stripe Checkout integration.

### Files to Create / Modify
* Modify [server.cjs](file:///c:/Users/Optimus01/Downloads/bookflix/server.cjs): Add payment creation routing and webhooks handler.
* Modify [ProfilePage.jsx](file:///c:/Users/Optimus01/Downloads/bookflix/src/pages/ProfilePage.jsx): Integrate redirects to Stripe checkout.

### Backend Changes
* Integrate `stripe` SDK node package.
* Implement Stripe webhook verification using signature headers (`stripe-signature`).

### Frontend Changes
* Replaces the fake modal with an active redirect using Stripe checkout sessions.

### APIs Needed
* `POST /api/payments/create-session`: Instantiates a checkout session.
* `POST /api/payments/webhook`: Listens to Stripe callback payment updates.

### Database Changes
* Update `User` schema: Add fields `stripeCustomerId` and `subscriptionId`.
* Update `Transaction` schema to log verified payment intents.

### Testing Strategy
1. **Webhook Test**: Trigger mock webhook events locally using the Stripe CLI:
   ```bash
   stripe trigger checkout.session.completed
   ```
2. **Premium Validation**: Verify that the corresponding user account has `premium: true` and `planId: "premium"` applied immediately after Stripe webhook triggers.
