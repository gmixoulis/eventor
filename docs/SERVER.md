# Assistant backend

The assistant backend is optional. The app works without it; the Ask chat then shows "not connected".

## What lives where

- `api/index.ts`: Vercel entry that wraps the Expo server build (`expo-server` adapter) so API routes run as a serverless function.
- `src/assistant/server/`: the server logic.
  - `handle-ask.ts`: answers attendee questions from the event's facts.
  - `handle-setup.ts`: handles the organizer "Set up your event" and idea/pitch requests.
  - `deepseek.ts`, `gemini.ts`: LLM provider clients.
  - `redis.ts`, `memory.ts`: rate limiting and counters (Redis/KV when configured, in-memory otherwise).
  - `config.ts`, `http.ts`, `types.ts`: environment parsing, HTTP helpers and shared types.
  - `*.test.ts`: unit tests (`pnpm test`).

## Endpoints

- `POST /api/ask`: question and answer for attendees. Answers are grounded on the event data.
- `POST /api/setup`: organizer setup and startup/spinoff idea suggestions.

Check the handler files for the exact request and response shapes.

## Environment variables

All values come from the environment. Nothing is hard-coded.

| Variable | Required | Purpose |
| --- | --- | --- |
| `ASSISTANT_MODEL_PROVIDER` | no | `deepseek` (default) or `gemini` |
| `DEEPSEEK_API_KEY` | if provider is deepseek | LLM key |
| `GEMINI_API_KEY` | if provider is gemini | LLM key |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | no | Redis/KV for rate limiting (`KV_REST_API_URL` and `KV_REST_API_TOKEN` also work) |
| `ASSISTANT_DAILY_CAP_USD` | no | Daily spend cap |
| `ASSISTANT_MAX_INFLIGHT` | no | Concurrent request limit |
| `ASSISTANT_IP_PER_MINUTE` | no | Requests per IP per minute |
| `ASSISTANT_MODEL_IP_PER_MINUTE` | no | Model calls per IP per minute |
| `ASSISTANT_FAKE_MODEL` | no | `1` returns fixed text for load tests; ignored in production |
| `EXPO_PUBLIC_ASSISTANT_URL` | app side | Origin of the deployed backend |

See `.env.example` for comments. An OpenAI-compatible provider can be added by following `deepseek.ts`.

## Never commit API keys

Put keys in `.env.local` (gitignored) for local work and in your host's environment variable settings for deployment. Do not paste keys into source files, docs, issues or commits. If a key leaks, rotate it.

## Run locally

```sh
cp .env.example .env.local     # add your provider key
npx expo start --web           # API routes are served by the Expo dev server
```

Set `EXPO_PUBLIC_ASSISTANT_URL` to the dev server origin if the app is on a device.

## Deploy

Vercel: build with `npx expo export --platform web`, which produces `dist/server`, then deploy so `api/index.ts` serves it. Add the environment variables in the Vercel project settings and make sure deployment protection does not block public requests to `/api/*`. Any Node host that can run the Expo server output also works.

## Connect the app

Set `EXPO_PUBLIC_ASSISTANT_URL` to the deployed origin (no trailing path). The app calls `<origin>/api/ask` and `<origin>/api/setup`. The value is inlined at build time, so restart or rebuild the app after changing it.
