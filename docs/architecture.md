# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep the React app thin and route-driven; each view should fetch its own API payload, render the data when available, and show a loading status while pending and an accessible alert when the request fails. This preserves separation between presentation, logic, and data responsibilities and matches the contract-driven tests.
- Logic tier decision: Build a single Express service layer around Mongoose models, using consistent JSON envelopes such as `{ activities: [...] }`, `{ teams: [...] }`, `{ leaderboard: [...] }`, and `{ suggestions: [...] }`. Validation should fail with deliberate 4xx responses instead of leaking Mongo cast errors.
- Data tier decision: Treat the schemas as the source of truth for required relationships and shape. Required fields should be enforced at the model level so the API rejects bad input before it reaches the database, while the seed script remains idempotent and preserves existing data.
- Activity tracking approach: Require a valid `user` and `team` reference plus `type`, `minutes`, `points`, and `occurredAt`; compute `points` from the submitted activity and persist the related IDs as strings in the response payload to match the API contract.
- Team management approach: Require `name` and `mascot`, default `members` to an empty array, and keep `members` as Mongoose ObjectId references so team membership can be validated and displayed consistently in both the API and UI.
- Leaderboard approach: Aggregate activity points by team, sort descending by total, and assign a 1-based rank in the final response. This ensures the data contract is deterministic and user-visible.
- Workout suggestions approach: Match suggestions to a user's recent activity or fitness goal, using the email route parameter as the lookup key and returning a human-readable `reason` that ties the recommendation back to the user's activity pattern. Unknown emails should produce a 4xx response rather than an empty success payload.

## Test plan

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
  - Current failure meaning: this catches schema-level gaps before the API layer is implemented. In the current run, the model validations fail because `User`, `Team`, `Activity`, and `Workout` do not yet enforce the required fields and defaults that the contract expects.
- API command: `npm run test:api --prefix octofit-tracker/backend`
  - Current failure meaning: this confirms the Express layer is not yet rejecting invalid payloads with 4xx responses, and it exposes missing leaderboard aggregation and workout suggestion logic. The 501 responses indicate stubbed or unimplemented handlers are still returning unsupported-method behavior.
- Frontend command: `npm test --prefix octofit-tracker/frontend`
  - Current failure meaning: the React app is still rendering static placeholder content. The tests expect data fetching, loading states, empty states, and accessible alerts, which are not yet wired to the API responses.
- Backend build command: `npm run build --prefix octofit-tracker/backend`
  - Purpose: ensure the TypeScript API compiles cleanly after validation and route logic are implemented.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
  - Purpose: verify the Vite/React UI compiles with the fetch-driven route components and TypeScript definitions.

The implementation order should follow the dependency chain in the architecture: schema validation first, API contract second, then frontend rendering last.
