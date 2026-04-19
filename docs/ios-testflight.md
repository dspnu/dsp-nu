# iOS / TestFlight Checklist (Capacitor)

This repo ships an iPhone app by wrapping the Vite build in a Capacitor iOS shell (`ios/`).

## 1) Local Build Prereqs
- Xcode installed (latest stable).
- Apple Developer account + team selected in Xcode.

## 2) Build + Open Xcode Project
```sh
npm run cap:sync:ios
npm run ios:open
```

In Xcode:
- Select the `App` target.
- Confirm bundle id: `com.tartabinienterprises.dspnu`.
- Signing: select your Team, ensure “Automatically manage signing” is enabled.

## 3) Supabase Auth Redirects (Native)
Native OAuth uses a custom URL scheme redirect:
- `dspnu://auth/callback`

You must add this redirect URL in Supabase:
- Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

The native deep-link handler is implemented in `src/core/auth/NativeAuthBridge.tsx`.

## 4) Sign in With Apple
If you offer Google login, Apple will generally expect “Sign in with Apple” as well.

Enable it in Supabase:
- Supabase Dashboard → Authentication → Providers → Apple

The UI button is in `src/core/auth/AuthPage.tsx` and can be toggled with `org.auth.allowApple` in `src/config/org.ts`.

## 5) Push Notifications (APNs)

### iOS App Side
- Entitlements files are committed:
  - `ios/App/App/AppDebug.entitlements` (development)
  - `ios/App/App/AppRelease.entitlements` (production)
- Background mode `remote-notification` is set in `ios/App/App/Info.plist`.
- App registers for APNs and stores device tokens in Supabase via `src/lib/nativePush.ts`.

On device:
- Sign in
- Settings → Notifications → enable “Push notifications”

### Supabase Database
Migration adds a token table:
- `supabase/migrations/20260416000000_device_push_tokens.sql`

### Supabase Edge Function
Edge function that sends APNs pushes when a `public.notifications` row is inserted:
- `supabase/functions/push-webhook/index.ts`

You must set secrets/env vars for the Edge Function:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APNS_HOST` (`api.sandbox.push.apple.com` for dev, `api.push.apple.com` for prod)
- `APNS_TEAM_ID`
- `APNS_KEY_ID`
- `APNS_P8_PRIVATE_KEY` (the contents of your `.p8`, PKCS8 format)
- `APNS_BUNDLE_ID` (`com.tartabinienterprises.dspnu`)

Optional — **email** for the same `public.notifications` inserts (Resend):

- `RESEND_API_KEY` (or `RESEND_API`) — API key from [Resend](https://resend.com)
- `RESEND_FROM_EMAIL` — verified sender, e.g. `Chapter Portal <notifications@yourdomain.com>`
- `PUBLIC_APP_URL` — production app origin (no trailing slash), used to turn notification `link` paths into clickable URLs in email

### Database Webhook (Required)
Create a database webhook in Supabase for inserts to `public.notifications` that calls the Edge Function endpoint.
This is configured in the Supabase dashboard (not in code).

Recommended: only trigger on `INSERT` and include the `record` payload.

The app handles deep-link navigation from push taps via `src/components/native/NativePushBridge.tsx`.

## 6) TestFlight Upload
- Archive in Xcode (Generic iOS Device) → Distribute App → App Store Connect → Upload.
- Add internal testers in App Store Connect.

## 7) Minimum Smoke Test (Before External Beta)
- Email/password sign-in
- Google sign-in
- Apple sign-in
- Enable push → receive a notification → tap → lands on the correct screen
- QR scanner opens and can scan an event code
- Account deletion works (Settings → Delete Account)
