# AGENTS.md

Guide for AI agents and contributors.

## Project

Eventor is an Expo / React Native app in TypeScript, using Expo Router. It also runs on web. An optional assistant backend lives in `api/` and `src/assistant/server/`.

## Commands

```sh
pnpm install
npx expo start        # or ./run.sh
pnpm test             # or npx jest
npx expo lint
```

## Conventions

- Event data lives in `src/data`. It is dummy data set in New York City.
- Keep ids stable. Other data and saved state reference them.
- Keep changes small and match surrounding style.
- Run lint and tests before finishing.

## Secrets

Never commit secrets. Keys go in `.env.local` (gitignored) or host environment variables. Do not put keys in source, docs or logs.

## Assistant backend

Optional. The app must keep working when `EXPO_PUBLIC_ASSISTANT_URL` is unset. See `docs/SERVER.md`.
