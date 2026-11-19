# EnglishYaari Booking API

A REST API for creating teacher sessions, booking them, and retrieving user history. Built with Node.js, TypeScript, Express, MongoDB, and Mongoose.

## Setup

Requires Node.js 22 or newer, npm, and a reachable MongoDB instance. From the repository root:

```sh
npm ci
cp .env.example .env
npm run seed:teacher
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env` in place of the copy command. Set `MONGODB_URI` in `.env` to your MongoDB connection string. `PORT` defaults to `3000`. The seed command prints a demo teacher ID to use when creating sessions.

To run the compiled server, use `npm run build` followed by `npm start`.

## Endpoints

| Method and path | Input | Success response |
| --- | --- | --- |
| `POST /users` | JSON with `fullName`, `email`, and `phone` (strings) | 201, created user |
| `POST /sessions` | JSON with `teacherId`, `startTime`, and `endTime` | 201, available session |
| `GET /sessions/available?dateTimestamp=...` | Unix timestamp in milliseconds, e.g. `1893499200000` | 200, array of available sessions |
| `POST /sessions/:id/book` | JSON with `userId` | 200, booked session |
| `PATCH /sessions/:id/complete` | Session ID in URL | 200, completed session with `completedAt` |
| `GET /users/:id/sessions` | User ID in URL | 200, object with `upcomingSessions` and `completedSessions` arrays |

User emails are trimmed and stored in lowercase. Session times use ISO 8601 date-times with an explicit timezone, such as `2030-01-01T10:00:00Z`. Availability uses the session's start time and the supplied timestamp's UTC calendar day. Upcoming history includes all `BOOKED` sessions still awaiting completion, including past bookings. Both list endpoints use MongoDB aggregation pipelines.

The session lifecycle is `AVAILABLE → BOOKED → COMPLETED`. Booking and completion use conditional atomic updates so concurrent requests cannot repeat a state transition. Errors use a JSON object such as `{"error":"User not found"}`. Invalid input returns 400, missing resources return 404, and duplicate emails or invalid state transitions return 409.

## Test the API

Import [the Postman collection](postman/EnglishYaari.postman_collection.json), set its `teacherId` variable to the ID printed by the seed command, and run the collection in order. It creates a fresh user and session and checks availability, booking, repeat-booking rejection, and history before and after completion.

Run `npm test` with MongoDB running locally, or set `MONGODB_TEST_URI` to a MongoDB server where the test can create and drop a temporary database. The test uses a randomly named database.
