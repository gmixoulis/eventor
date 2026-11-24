# Features

All data shipped with Eventor is dummy data set in New York City. Replace it with your own event in `src/data`.

## Schedule

- Multi-day agenda with day tabs
- Filters by stage, track and tag
- Personal agenda ("my agenda"): save sessions and see only those
- Live session status: Live, Open seats, Filling, Ended
- Event home with a "happening now / up next" view
- Event countdown before doors open
- Session detail pages with speakers, location and description

## Map and wayfinding

- Venue map rendered with MapLibre
- Place sheets with details for each venue or room
- Directions and walking routes between venues
- Crowd levels per place
- QR checkpoint codes that let attendees mark where they are

## Networking and matching

- People directory with search
- Profile matching using on-device embeddings (no profile data leaves the phone for matching)
- Suggested people based on shared interests
- 1:1 meeting scheduling with pending and accepted states
- In-app chat between attendees

## QR check-in and passport

- Scan QR codes to check in
- Gamified event passport that collects stamps
- Leaderboard

## Assistant

- "Ask" chat answering where and when questions, grounded only on the event's facts
- Organizer "Set up your event" chat that suggests event setups and startup or spinoff ideas
- Optional HTTP backend; without it the chat shows "not connected" and the rest of the app is unaffected
- See [SERVER.md](SERVER.md)

## Tickets and side events

- Tickets screen
- Side events listed alongside the main program
- Speaker profiles
- Short reels

## Platform and UX

- iOS, Android and web via Expo
- Light and dark themes
- Offline demo mode with bundled dummy data
- Accessibility support (labels, contrast, scalable text)
- TypeScript throughout, Expo Router file-based navigation
