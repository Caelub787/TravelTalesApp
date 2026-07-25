# TravelTales

An app that watches your device's GPS in real time and surfaces real, verifiable history,
culture, nature, architecture, folklore, and notable-people facts about wherever you
currently are — picked by category, always cited so you can check the source yourself.

Two content sources, switchable anytime in-app under **⚙️ Settings**:

- **✨ Story Mode** — AI-written narratives and free-form question answering, grounded in
  live Google Search results, powered by the **free tier of Google's Gemini API**.
- **📖 Wiki Facts** — real facts pulled directly from nearby Wikipedia articles. No AI, no
  API key, no rate limits, always free.

## How it works

```
[App] --- POST /api/location-facts ---> [Node/Express server] ---> [Gemini API (free tier)]
      --- POST /api/ask             --->                       --->  (Story Mode: search +
      --- POST /api/wiki-facts      ---> (holds the Gemini key)      structured output)
      --- POST /api/wiki-search     --->                       --->  [Wikipedia API]
                                                                       (Wiki Facts: free,
                                                                        no key needed)
```

- **`app/`** — an Expo (React Native + Expo Router) app. Runs as a native Android/iOS app
  *or* as a regular website (`react-native-web`) — same codebase, same features, minus
  background tracking on web (browsers don't allow that, see below).
- **`server/`** — a small Express backend. Nothing sensitive ever ships to the client: the
  Gemini key lives only here.

**Also included**: an interactive map (web only — see below) for clicking anywhere to get
stories about that spot instead of just your current location, a free-form "ask a
question" box with voice input, a "read aloud" button on every response, and the ability
to save/favorite stories and answers for later (on-device, under 🔖 Saved). No accounts.

## Prerequisites

- Node.js 20+
- A free [Gemini API key](https://aistudio.google.com/apikey) (only needed for Story Mode
  — Wiki Facts mode works with no key at all)
- [Expo Go](https://expo.dev/go) on your phone for native testing, or just a browser for
  the web build
- Your phone and computer on the same Wi-Fi network (for local native dev only)

## 1. Run the backend

```bash
cd server
cp .env.example .env
# edit .env and set GEMINI_API_KEY=... (skip this if you'll only use Wiki Facts mode)
npm install
npm run dev
```

Starts on `http://localhost:3001` (configurable via `PORT`). Verify it's up:

```bash
curl http://localhost:3001/health
```

## 2. Run the app

**As a website** (works on any device with a browser, including iPhone — no Apple
Developer account needed, but only while the tab is open/foreground):

```bash
cd app
echo "EXPO_PUBLIC_API_URL=http://localhost:3001" > .env
npm install
npx expo start --web
```

**As a native app** on your own phone via Expo Go — same steps but without `--web`, and
`EXPO_PUBLIC_API_URL` needs your computer's LAN IP instead of `localhost` (find it with
`ipconfig getifaddr en0` on macOS, `hostname -I` on Linux, or `ipconfig` on Windows —
`localhost` only works from a simulator on the same machine, not a physical phone):

```bash
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS). Grant location permission
when prompted, then tap a category.

## Deploying for real use (not just local dev)

Local dev only works while your computer is running the server and both devices are on
the same network. To actually use this day-to-day (e.g. sharing with a friend), both
pieces need to be deployed somewhere with a public URL:

- **Backend** (`server/`): any Node host works — e.g. [Railway](https://railway.app) via
  `railway up` from inside `server/`, with `GEMINI_API_KEY` set as an environment variable
  there.
- **Frontend web build**: export a static build (`npx expo export -p web` from `app/`,
  after setting `EXPO_PUBLIC_API_URL` to your deployed backend's URL — this is baked in at
  build time) and deploy the resulting `app/dist` folder to any static host, e.g.
  [Vercel](https://vercel.com) via `vercel --prod` run from inside `app/dist`.
- **Native app**: see the EAS sections below.

## Map screen (web only)

The map (`app/src/app/map.web.tsx`) is built with [Leaflet](https://leafletjs.com) —
free, open-source, no API key required, using OpenStreetMap tiles. Click anywhere to drop
a pin and get facts/stories or ask questions about that spot.

It's web-only: Leaflet needs a browser DOM, which native apps don't have. On native
builds, `app/src/app/map.tsx` shows a simple message pointing to the website instead —
everything else (categories, questions, voice, read aloud, saved items) works the same on
both.

## Voice input and text-to-speech

- **Ask a question** (text or 🎤 voice) on the home screen or after picking a location on
  the map. In Story Mode, answers are grounded in live search with cited sources; in Wiki
  Facts mode, this returns matching Wikipedia article snippets instead of a written answer.
- Every response has a **🔊 Read aloud** button using on-device text-to-speech
  (`expo-speech`) — free, no extra API calls, works in both modes.
- Voice input uses `expo-speech-recognition` (native) or the browser's built-in Web Speech
  API (web) — needs microphone permission, prompted the first time you tap 🎤.

## Building/updating the native app (EAS)

```bash
cd app
npx eas-cli@latest build -p android --profile preview   # first build, or after adding a
                                                          # new native dependency/config
npx eas-cli@latest update --branch preview --message "describe the change"   # everything
                                                                                # else, instant
```

A full rebuild is only needed when adding a new native module or changing native config
(like the Maps API key above) — everything else (new categories, UI tweaks, prompt
changes) can ship via `eas update` in seconds.

## Why the web build can't track/speak in the background

iOS (and browsers generally) block background GPS tracking and background audio for web
content — this is a deliberate platform restriction, not something fixable in this
codebase. The web build works great in the foreground (open, actively using it) but goes
quiet the moment the tab is backgrounded or the phone locks. Only a genuine native app with
explicit background-mode permissions can do that, which requires proper app-store-style
distribution (TestFlight for iOS, in particular).

## Notes on "verified facts"

**Story Mode**: every fact is required (via prompt instructions and forced structured
output) to carry a real source title and URL found through Gemini's Google Search
grounding during that request. This significantly reduces hallucination compared to
recalling facts from memory, but it's not a formal fact-checking pipeline — the UI shows
sources so you can verify anything that matters to you.

**Wiki Facts mode**: facts are pulled directly from live Wikipedia article text, not
AI-generated at all — the "hallucination" risk here is whatever's already in the relevant
Wikipedia articles, same as reading Wikipedia directly.

If no verifiable facts are found near a location in either mode, the app says so rather
than inventing content.

## Cost note

Story Mode uses Gemini's free tier, which has rate limits — for two personal users this
should never be an issue, but very heavy use could hit them. Wiki Facts mode has no
meaningful usage limit for personal use. The app deliberately does not auto-fetch on every
GPS update in either mode — it only prompts you to refresh after you've moved ~400m — to
keep usage low regardless.
