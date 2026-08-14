# App Store screenshots (offline demo mode)

This build uses **static demo data** — no login, no Supabase, no network. Capacitor/iOS shell works normally so you can preview in Xcode and capture frames.

## Build & open in Xcode

```bash
npm run cap:sync:ios:demo
npm run ios:open
```

Select an iPhone simulator (6.7" and 6.1" for App Store sizes), run the app, and capture screenshots.

## What you get

- Signed in as **Alex Morgan** (President) with a fully populated chapter
- Home dashboard: alerts, exec tasks, events, standing, dues, tickets
- People directory with 15 members + alumni tab
- Events calendar with upcoming chapter activities
- Chapter standing tab with family leaderboard
- EOP, Career Hub, Tickets, PDP (via VP NME role), Notifications

## Local web preview (optional)

```bash
npm run dev:demo
```

Open the URL Vite prints — same static data, useful for quick iteration before syncing to iOS.

## Production builds

Do **not** ship demo mode to the App Store. Use your normal `.env` and `npm run cap:sync:ios` for TestFlight/production builds.
