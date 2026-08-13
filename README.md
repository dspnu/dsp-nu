# ChapterOS — React + Supabase Chapter Management Template

If you’re looking for a solid starting point you can brand and sell, this project is built for that.

ChapterOS is a production-style chapter operations app with authentication, role-based access, event/attendance workflows, professional development tracking, elections, dues, alumni tools, notifications, and admin dashboards — all wired up with React + Supabase.

The goal of this README is to help your buyers get from **clone → configured → running** without confusion.

---

## What this template already includes

- **Authentication** (email/password + Google OAuth flow)
- **Role-aware UI** (member, officer, admin, developer role paths)
- **Core chapter modules**
  - People directory + member profiles
  - Events + RSVP + attendance
  - Elections and EOP workflows
  - PDP assignments/resources/coffee chats
  - Dues tracking
  - Job board, alumni, notifications
- **Polished frontend stack**
  - Vite + React + TypeScript
  - Tailwind + shadcn/ui + Radix
  - React Query for data fetching/cache
- **Backend and schema management**
  - Supabase client integration
  - SQL migrations included in `supabase/migrations`

---

## Tech stack

- React 18 + TypeScript
- Vite 5
- Tailwind CSS + shadcn/ui
- Supabase (Auth, Postgres, RLS)
- TanStack React Query

---

## 1) Prerequisites

Before setup, make sure you have:

- **Node.js 18+** (Node 20 LTS recommended)
- **npm** (ships with Node)
- **Supabase account** (for project + DB)
- **(Optional) Supabase CLI** for running migrations locally

---

## 2) Clone and install

```bash
git clone <your-repo-url>
cd dsp-nu
npm install
```

Run the app:

```bash
npm run dev
```

Vite is configured for port **8080**, so local dev should open at:

- `http://localhost:8080`

---

## 3) Environment variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_ANON_KEY
```

Where to get these:

- Supabase Dashboard → **Project Settings** → **API**

> This app expects those exact variable names. If they’re missing, the Supabase client won’t initialize correctly.

---

## 4) Database setup (important for template buyers)

This template ships with SQL migrations under `supabase/migrations`.

### Option A (recommended for devs): Supabase CLI

1. Link or initialize your Supabase project.
2. Apply migrations in order (or use a standard `db push` flow).

Typical workflow:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

### Option B: SQL Editor in dashboard

If your buyer doesn’t use CLI, they can run the migration SQL files in Supabase SQL Editor in timestamp order.

---

## 5) Auth setup (email + Google)

### Email/password

Enable Email provider in Supabase Auth settings.

### Google OAuth

To make Google login work:

1. Enable Google provider in Supabase Auth.
2. Add OAuth credentials in Google Cloud Console.
3. Add redirect URL(s) in Supabase and Google console.

For local dev, callback route is:

- `http://localhost:8080/auth/callback`

For production, this code uses the domain set in `src/config/org.ts` and routes users to:

- `https://<your-domain>/auth/callback`

So when you white-label this template for sale, make sure buyers update `org.domain` before launch.

---

## 6) Brand customization for resale

Most first-pass white-label edits live in:

- `src/config/org.ts`

That file controls:

- Organization/chapter names
- Greek letters / tagline
- Domain
- Member terminology (e.g., “Brother”, “PNM”)
- Feature toggles (EOP, dues, job board, alumni, etc.)
- Standing rules and category labels

If you’re selling this template, this is the fastest place to expose “client-specific settings” without editing app logic.

---

## 7) Build and deploy

Create production build:

```bash
npm run build
```

Preview production build locally:

```bash
npm run preview
```

This repo includes a `vercel.json`, so Vercel deployment is straightforward.

---

## 8) iOS native app (Capacitor)

The web app ships as a Capacitor 8 iOS shell under `ios/`.

### Prerequisites

- macOS with **Xcode 16+**
- Apple Developer account (signing + App Store Connect)
- CocoaPods not required (SPM via CapApp-SPM)

### Build / open

```bash
npm install
npm run cap:sync:ios   # vite build + npx cap sync ios
npm run ios:open       # opens Xcode
```

In Xcode: select your Team, set a unique Marketing Version / Build, then Run on a device or Archive for TestFlight.

### Auth deep links (required)

Add this redirect URL in **Supabase → Authentication → URL Configuration → Redirect URLs**:

- `dspnu://auth/callback`

That scheme is registered in `ios/App/App/Info.plist` and used for Google OAuth, Sign in with Apple, and password-reset emails when running inside the native app.

### Sign in with Apple (App Store Guideline 4.8)

Because Google OAuth is offered, Apple Sign In must also be available:

1. Enable the **Apple** provider in Supabase Auth.
2. Configure the Apple Services ID / key per [Supabase Apple docs](https://supabase.com/docs/guides/auth/social-login/auth-apple).
3. In Apple Developer, enable **Sign In with Apple** on App ID `com.jacobtartabini.dspapp`.

### Push notifications (APNs)

Edge function `supabase/functions/push-webhook` sends via APNs. Set secrets:

- `APNS_TEAM_ID`
- `APNS_KEY_ID`
- `APNS_P8_PRIVATE_KEY`
- `APNS_BUNDLE_ID=com.jacobtartabini.dspapp`

Members enable push from **Settings** in the native app (`device_push_tokens` table).

### Store listing checklist

- [ ] Privacy Policy / Terms / EULA URLs live ([`src/config/legal.ts`](src/config/legal.ts))
- [ ] App Privacy questionnaire matches `PrivacyInfo.xcprivacy`
- [ ] Screenshots for 6.7" and 6.1" iPhones
- [ ] Age rating / content rights
- [ ] Account deletion path works (Settings → Delete Account)
- [ ] Export compliance: `ITSAppUsesNonExemptEncryption` is `false` (HTTPS only)
- [ ] Camera / Photos / Notifications permission strings accurate in Info.plist

### Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run cap:sync:ios` | Production web build + sync into `ios/` |
| `npm run ios:open` | Open the Xcode workspace/project |

---

## 9) Suggested “buyer handoff” checklist

If you monetize this template, include this in your product docs:

- [ ] Add `.env` with Supabase URL + anon key
- [ ] Run DB migrations
- [ ] Configure auth providers (Email / Google / Apple)
- [ ] Add `dspnu://auth/callback` to Supabase redirect URLs (for iOS)
- [ ] Update `src/config/org.ts` branding + domain
- [ ] Create initial admin account / role records
- [ ] Verify key flows: sign-in, onboarding, events, attendance, dashboards
- [ ] Deploy and confirm OAuth callback URLs match production domain
- [ ] (iOS) `npm run cap:sync:ios`, signing, APNs secrets, TestFlight smoke test

---

## Project structure (quick map)

- `src/pages/*` — route-level pages
- `src/components/*` — UI + domain components
- `src/hooks/*` — data hooks by feature area
- `src/contexts/AuthContext.tsx` — auth/session/profile/role state
- `src/integrations/supabase/*` — typed client + generated DB types
- `src/config/org.ts` — organization settings + feature toggles
- `supabase/migrations/*` — SQL schema + policy evolution

---

## Notes for commercial use

- This template is intentionally structured to be **white-label friendly**.
- Keep your “client configurable” settings centralized (like `org.ts`) so each sale is a quick setup instead of a code rewrite.
- If you offer premium support, sell an optional “done-for-you setup” add-on (auth, DB migrations, deploy, and branding) — that’s often higher margin than the template itself.

---

If you want, I can also draft a **customer-facing setup guide** (shorter, less technical) plus a **seller ops checklist** you can include as part of your paid template package.
