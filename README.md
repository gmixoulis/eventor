# Eventor

Eventor is an open-source mobile event companion app template built with Expo, React Native and TypeScript. It gives attendees a schedule, a venue map, an attendee directory with interest matching and 1:1 meetings, QR check-in, and an optional AI assistant that answers questions from the event's own facts. It ships with dummy data set in New York City, so you can run it today and replace the data with your own event.

## Features

- Event home with "happening now / up next" and a countdown
- Multi-day schedule with filters, a personal agenda and live session status
- Venue map (MapLibre) with place sheets, walking routes and QR checkpoints
- Attendee networking: directory, interest matching, 1:1 meetings, chat
- QR check-in, a collectible event passport and a leaderboard
- Side events, tickets, speaker profiles and short reels
- Optional AI assistant grounded only on the event's facts
- Light and dark themes, offline demo mode, accessibility support

The full list is in [docs/FEATURES.md](docs/FEATURES.md). Why it matters for networking: [docs/IMPACT.md](docs/IMPACT.md).

## Quick start

```sh
pnpm install
./run.sh            # or: npx expo start
```

`run.sh` installs dependencies if needed and starts Expo. Options:

```sh
./run.sh --tunnel   # reach the dev server from a phone on another network
./run.sh --web      # open the web build
```

## Run on your phone

1. Start the dev server (`./run.sh`).
2. Install Expo Go on your phone and scan the QR code shown in the terminal.
3. Some features use native modules (the map and the camera/QR scanner). Expo Go may not include everything, so for the full app build a development build:

```sh
npx expo run:ios      # or: npx expo run:android
```

Use `./run.sh --tunnel` if your phone and computer are not on the same network.

## Configuration

```sh
cp .env.example .env.local
```

Everything is optional. To enable the AI assistant, set the URL of your assistant backend:

```sh
EXPO_PUBLIC_ASSISTANT_URL=https://your-assistant-host.example.com
```

If it is unset, the app works normally and the chat shows "not connected". Never commit `.env.local` or any API key. See [docs/SERVER.md](docs/SERVER.md) for the backend.

## Documentation

- [docs/FEATURES.md](docs/FEATURES.md)
- [docs/IMPACT.md](docs/IMPACT.md)
- [docs/SERVER.md](docs/SERVER.md)
- [docs/BUILD-AND-TOKENS.md](docs/BUILD-AND-TOKENS.md)
- [AGENTS.md](AGENTS.md) for AI agents and contributors

## License: MIT

See [LICENSE](LICENSE).

## Keywords

event app, conference app, event management, attendee networking, event networking app, React Native, Expo, Expo Router, TypeScript, MapLibre, QR check-in, event schedule, event agenda, venue map, AI event assistant, attendee matching, mobile app template, open source
