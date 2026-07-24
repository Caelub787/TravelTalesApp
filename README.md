# TravelTales

A mobile app that watches your device's GPS in real time and surfaces real, verifiable
history, culture, nature, architecture, folklore, and notable-people facts about wherever
you currently are — picked by category, grounded in live web search, and always cited so
you can check the source yourself.

## How it works

```
[Expo app] --- POST /api/location-facts ---> [Node/Express server] ---> [Anthropic API]
 (GPS, UI)      { lat, lon, category }         (holds the API key)      (web search +
                                                                          structured output)
```

- **`app/`** — a React Native app (Expo + Expo Router) that tracks your live location,
  lets you pick a category, and renders the resulting stories with tappable source links.
- **`server/`** — a small Express backend that calls the Claude API with the **web search
  tool** enabled, forcing every fact returned to be grounded in an actual search result
  with a real title + URL. The Anthropic API key lives only here — it is never shipped to
  the mobile app.

**v1 scope**: live GPS + category picker + fact/story fetch with citations. No map view,
no saved history, no accounts (see the codebase's task history for what's planned next).

## Prerequisites

- Node.js 20+
- An [Anthropic API key](https://console.anthropic.com/) with access to a model that
  supports the web search tool
- [Expo Go](https://expo.dev/go) on your phone (easiest way to test), or an iOS
  simulator / Android emulator
- Your phone and computer on the same Wi-Fi network (for local dev)

## 1. Run the backend

```bash
cd server
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY=sk-ant-...
npm install
npm run dev
```

This starts the server on `http://localhost:3001` (configurable via `PORT`). Verify it's
up:

```bash
curl http://localhost:3001/health
```

## 2. Point the app at your backend

Find your computer's LAN IP address (e.g. `192.168.1.42`):

- macOS: `ipconfig getifaddr en0`
- Linux: `hostname -I`
- Windows: `ipconfig` (look for IPv4 Address)

Create `app/.env`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.42:3001
```

(`localhost` won't work from a physical phone — it has to be your computer's real LAN IP.
If you're testing purely in an iOS/Android simulator on the same machine, `localhost` does
work there.)

## 3. Run the app

```bash
cd app
npm install
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS), or press `i`/`a` to open
a simulator/emulator. Grant location permission when prompted, then tap a category.

## Notes on "verified facts"

Every fact returned by the backend is required (via prompt instructions and a forced
structured-output schema) to carry a real source title and URL found through Claude's web
search tool during that request. This significantly reduces hallucination compared to
asking a model to recall facts from memory, but it is not a formal fact-checking
pipeline — the UI shows sources specifically so you can verify anything that matters to
you. If no verifiable facts are found near a location, the app says so rather than
inventing content.

## Cost note

Each category tap triggers a live Claude API call with web search (bounded to 5 searches
per request in `server/src/services/anthropicClient.ts`). The app deliberately does not
auto-fetch on every GPS update — it only prompts you to refresh after you've moved
~400m — to keep usage predictable.
