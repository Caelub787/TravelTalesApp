# TravelTalesApp

An app that watches your device's GPS in real time and surfaces real, verifiable history,
culture, nature, architecture, folklore, and notable-people facts about wherever you
currently are — picked by category, always cited so you can check the source yourself.

Two content sources, switchable anytime in-app under **⚙️ Settings** — both powered by
**Groq's free tier** (no billing, no OpenAI/paid key required anywhere — Groq's free tier
is dramatically more generous than Gemini's, which is why this app uses it):

- **✨ Story Mode** — AI-written narratives that research each spot fresh (historical *and*
  modern), grounded in a combination of nearby Wikipedia articles and free, keyless
  open-web search results (not just Wikipedia).
- **📖 Wiki Facts** — browse nearby Wikipedia articles directly (always free, no rate
  limits, no key needed just to browse). Asking a question here still calls the same free
  AI to write a real conversational answer from those articles, so it needs the same free
  key as Story Mode to feel like AI search instead of a raw keyword match.

Tapping any article opens it *inside the app*, themed to match, with a "read aloud" button
and a mini AI Q&A box scoped to just that article's text — never a new tab. Wikipedia
content shown this way is attributed per its **CC BY-SA 4.0** license, with a link back to
the original page and edit history (opened in-app too).

## How it works

```
[App] --- POST /api/location-facts ---> [Node/Express server] ---> [Groq API (free tier)]
      --- POST /api/ask             --->                       --->  (Story Mode + Wiki
      --- POST /api/wiki-facts      ---> (holds the Groq key         mode synthesis +
      --- POST /api/wiki-search     --->  and Places key)             per-article Q&A +
      --- POST /api/article-content --->                       --->  per-stop trip stories)
      --- POST /api/article-ask     --->                       --->  [Wikipedia API]
      --- POST /api/places-nearby   --->                       --->  [DuckDuckGo search]
      --- GET  /api/reverse-geocode --->                       --->  [Nominatim]
                                                                       (reverse geocoding/
                                                                        address search,
                                                                        free, no key)
                                                                --->  [Google Places API]
                                                                       (nearby destinations/
                                                                        lookouts)

[App] --- Google Maps JS API (web) / react-native-maps + PROVIDER_GOOGLE (native) --->
      the map itself — talks directly to Google, not through the server
```

- **`app/`** — an Expo (React Native + Expo Router) app. Runs as a native Android/iOS app
  *or* as a regular website (`react-native-web`) — same codebase, same features, minus
  background tracking on web (browsers don't allow that, see below).
- **`server/`** — a small Express backend. The Groq and Google Places keys live only here
  and never ship to the client. The Google Maps *rendering* key is different: like any map
  SDK, it has to ship inside the client app/bundle to draw the map at all — restrict it in
  Google Cloud Console (by Android package + SHA-1, iOS bundle ID, and HTTP referrer for
  the web key) rather than treating it as a secret.

**Also included**: an interactive Google Maps screen (native *and* web — see below) for
tapping anywhere to get stories about that spot instead of just your current location, a
free-form "ask anything" search box with voice input that can auto-submit and read its
answer back out loud (a talk-and-listen loop, not just transcription), a Settings toggle
for whether answers/articles read aloud automatically or wait for a tap, an on-device
history of articles you've opened, the ability to save/favorite stories and answers for
later (**🔖 Saved**), nearby destinations/lookouts/attractions discovery via Google Places
(see below), and offline trip planning (**🧭 Trips** — see below) for downloading stories,
points of interest, and a unique AI-written narrative for every stop along an entire route
ahead of time. No accounts.

## Prerequisites

- Node.js 20+
- A free [Groq API key](https://console.groq.com/keys) (no credit card) — powers Story
  Mode, Wiki mode's AI search/Q&A, per-article Q&A, and each trip stop's AI-written story.
  Without it, Wiki mode's nearby-articles browsing still works, just without the AI layer
  on top.
- A [Google Cloud API key](https://console.cloud.google.com/google/maps-apis/credentials)
  with **Maps SDK for Android**, **Maps SDK for iOS**, **Maps JavaScript API**, and
  **Places API (New)** enabled — powers the map itself (all platforms) and nearby
  destinations/lookouts discovery. Billable beyond a generous free monthly quota; without
  it, the map won't render and POI discovery returns nothing, but everything else still
  works.
- [Expo Go](https://expo.dev/go) on your phone for native testing, or just a browser for
  the web build
- Your phone and computer on the same Wi-Fi network (for local native dev only)

## 1. Run the backend

```bash
cd server
cp .env.example .env
# edit .env and set GROQ_API_KEY=... and GOOGLE_PLACES_API_KEY=...
npm install
npm run dev
```

Starts on `http://localhost:3001` (configurable via `PORT`). Verify it's up:

```bash
curl http://localhost:3001/health
```

## 2. Run the app

Copy `app/.env.example` to `app/.env` and fill in `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (web
map only — see [Map screen](#map-screen-native--web) below for the native keys).

**As a website** (works on any device with a browser, including iPhone — no Apple
Developer account needed, but only while the tab is open/foreground):

```bash
cd app
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
  `railway up` from inside `server/`, with `GROQ_API_KEY` set as an environment variable
  there.
- **Frontend web build**: export a static build (`npx expo export -p web` from `app/`,
  after setting `EXPO_PUBLIC_API_URL` to your deployed backend's URL — this is baked in at
  build time) and deploy the resulting `app/dist` folder to any static host, e.g.
  [Vercel](https://vercel.com) via `vercel --prod` run from inside `app/dist`.
- **Native app**: see the EAS sections below.

## Map screen (native + web)

The map (`app/src/components/google-map-view.tsx` for native, `.web.tsx` for web) is
built on **Google Maps** — [react-native-maps](https://github.com/react-native-maps/react-native-maps)
with the Google provider on Android/iOS, the Google Maps JavaScript API on web. Both share
the same interface (markers, polylines, tap-to-pick) and the same screen code
(`app/src/app/(tabs)/map.tsx`, `(tabs)/trip.tsx`), so it's genuinely one map experience
across every platform, not a web-only feature with a native placeholder. Tap anywhere to
drop a pin and get facts/stories or ask questions about that spot, same as before.

Native builds need the Android/iOS API keys set directly in `app.json`
(`android.config.googleMaps.apiKey`, `ios.config.googleMapsApiKey`) — replace the
`REPLACE_WITH_YOUR_GOOGLE_MAPS_*_API_KEY` placeholders there. **A native module was added
(react-native-maps), so you need a fresh native build after setting these** (`eas build`,
not just `eas update` — see the EAS section below). The web build reads its key from
`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in `app/.env` instead, baked in at export/build time.

## Nearby destinations, lookouts, and points of interest

Alongside Wikipedia articles, the Explore screen and every trip stop also surface **nearby
destinations, lookouts, parks, museums, and scenic viewpoints** via the Google Places API —
places that are fun or interesting to visit but might not have their own Wikipedia
article. This needs `GOOGLE_PLACES_API_KEY` set on the server; without it, this section is
simply empty and everything else keeps working.

## Offline trip planning (🧭 Trips)

Plan a route Google-Maps style: type your starting address, destination, and any stops
along the way (address autocomplete via [Nominatim](https://nominatim.org)'s free,
keyless search), tap the 🎯 button next to the start or end field to use your current GPS
position instead of typing it, or tap points on the map if you'd rather drop pins. Either
way, the app fetches the actual road-following path between them (via
[OSRM](https://project-osrm.org)'s free public routing API, not straight lines), so
"everything in between" the pins is covered, not just the pins themselves. Tap **Download
for offline** and the app samples the whole route roughly every 3 miles and, for each
sampled stop, downloads:

- **Nearby Wikipedia articles** (as before)
- **Nearby destinations/lookouts** via Google Places (new — see above)
- **A unique, AI-written story** for that specific spot (new — the same Story Mode writer
  used elsewhere in the app, so every stop gets its own custom narrative, not just a list
  of raw facts) — grounded in that stop's own Wikipedia + open-web excerpts, so it stays
  as fact-checkable as the rest of the app, not free-invented

all stored on-device. The Places lookup and AI story are best-effort per stop — if the
Places key isn't configured, or the AI hits a rate limit, that stop still saves fine with
just its articles, exactly like before this feature existed.

Downloading paces itself between stops (and slows down further, automatically, if it hits
Wikipedia's rate limit) specifically so a long route with dozens of stops finishes with
every stop's data intact rather than skipping the ones that got rate-limited — a single
stop only comes back empty after several retries at a deliberately slower pace, not on the
first blip. This means a long trip's download can take a few minutes, now often longer
given the added AI story per stop; that's expected.

Once saved, tap **Follow this trip** and the app watches your GPS position — which works
with zero network/cell signal, unlike everything else in this app — and surfaces each
stop's downloaded articles, points of interest, and AI story automatically as you pass
within ~400m of it, with read-aloud available. Route planning *and* following both work
fully offline-download-then-online-plan on every platform now — native and web alike.

Note on "offline": this pre-fetches content while you still have signal, then serves it
from local storage as you travel — it does not generate new content with zero connectivity
(that would need a full on-device language model, a much bigger undertaking). Practically,
this gets you the same result on the road: the story is already there the moment you pass
by, nothing needs to load in that moment.

### Downloading an area (not just a route)

On the Explore screen, in Wiki Facts mode, **Download this area for offline** caches
nearby articles for your current position and search radius. From then on, browsing and
asking questions within that radius keeps working with no connection at all: a live
request is always tried first (freshest data), and if it fails, the app transparently
falls back to whatever's downloaded — for browsing, and for "ask a question" (matched
locally by keyword against the downloaded articles' text, since AI synthesis also needs a
connection). Downloaded areas and trip stops both count as coverage for this fallback.
Manage or delete downloaded areas under **🔖 Saved → Offline areas**.

### Deleting downloads without losing your history

Downloaded trips and offline areas are just a local content cache — delete a trip
(**🧭 Trips → Delete**) or an offline area (**🔖 Saved → Offline areas → 🗑**) any time to
free up device storage. This never touches your **🔖 Saved** favorites or your **History**
tab of articles you've opened — those are stored completely separately, specifically so
you can always find what interested you later (by title, in History) and re-fetch it live
next time you have signal, even after clearing out the offline copy.

### The website itself booting with no signal

Everything above assumes the site has already loaded — a plain static website still needs
*some* connection to download its own HTML/JS the very first time. `public/sw.js` is a
service worker that fixes that: after one successful visit, it caches the app's own shell
(that build's HTML/JS/CSS, discovered dynamically since Expo renames them per build), so
reopening the site later — even in a brand new tab, even navigating straight to a
sub-page like `/trip` — works with zero network at all. It never touches API calls (those
are a different origin and already handled by the fallback above); it only caches the
app's own code so the tab can boot in the first place.

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
(this repo's initial setup already needs one, for `react-native-maps` and the Maps API
keys in `app.json`) — everything else after that (new categories, UI tweaks, prompt
changes) can ship via `eas update` in seconds.

**First build note**: since this is a fresh copy of the original TravelTales app, its
`app.json` no longer has an `extra.eas.projectId` or `updates.url` (those pointed at the
original app's EAS project). Run `npx eas-cli@latest init` from `app/` once to link this
copy to your own new EAS project before the first `eas build`.

## Why the web build can't track/speak in the background

iOS (and browsers generally) block background GPS tracking and background audio for web
content — this is a deliberate platform restriction, not something fixable in this
codebase. The web build works great in the foreground (open, actively using it) but goes
quiet the moment the tab is backgrounded or the phone locks. Only a genuine native app with
explicit background-mode permissions can do that, which requires proper app-store-style
distribution (TestFlight for iOS, in particular).

## Notes on "verified facts"

**Story Mode**: the backend first fetches real grounding text — nearby Wikipedia article
extracts plus free, keyless open-web search results for the location and topic — then
gives the AI *only* that text and requires (via prompt instructions and response
validation) that every fact carry a source title/URL copied directly from it, never
invented. This significantly reduces hallucination compared to letting the model answer
from its own memory, but it's not a formal fact-checking pipeline — the UI shows sources
so you can verify anything that matters to you.

**Wiki Facts mode**: the nearby-articles list is pulled directly from live Wikipedia
article text, not AI-generated at all — the "hallucination" risk here is whatever's
already in the relevant Wikipedia articles, same as reading Wikipedia directly. Asking a
question, or asking about a specific article, hands that same Wikipedia text to the AI and
asks it to answer *using only that text* — so it's synthesized, but still grounded in real
excerpts rather than the model's own memory. If the AI call fails or isn't configured, Wiki
mode's search falls back to the raw excerpts rather than breaking.

If no verifiable facts are found near a location in either mode, the app says so rather
than inventing content.

## Cost note

Story Mode, Wiki mode's search/Q&A, per-article Q&A, and each trip stop's AI story all use
Groq's free tier, which is generous but still rate-limited — for personal use this should
essentially never be an issue. If you do hit a limit, the app shows that clearly (rather
than a raw error) and suggests switching to Wiki Facts mode's plain browsing, which has no
meaningful usage limit and needs no key at all; a trip stop that hits the limit just saves
without its AI story, keeping its articles. The app deliberately does not auto-fetch on
every GPS update in either mode — it only refreshes after you've moved ~400m — to keep
usage low regardless.

Google Maps and Places, by contrast, **are** billable beyond their free monthly quota —
for personal/light use this typically stays within the free tier, but keep an eye on your
Google Cloud billing if you download very large trips often (each stop makes one Places
call) or share the app with many people.
