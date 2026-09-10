# iOS App Store listing checklist

Use this when preparing TestFlight / App Store Connect for **DSP Nu** (`com.jacobtartabini.dspapp`).

## OTA (Capgo) vs App Store

**Use OTA** for JS/CSS/HTML-only fixes (UI tweaks, logic bugs, copy). Bump `package.json` `version` (e.g. `1.0.1`), then:

```bash
npm run ota:upload
```

Devices on the `production` channel download in the background and apply on the next launch.

**Use App Store / TestFlight** when you change native plugins, permissions, entitlements, Capgo itself, or other Xcode/native config. Also required once to ship the first binary that includes Capgo.

### Capgo cloud setup (one-time)

1. Create an account at [capgo.app](https://capgo.app) and an API key (keep it out of git).
2. `npx @capgo/cli@latest login <API_KEY>`
3. `npx @capgo/cli@latest app add` (uses `com.jacobtartabini.dspapp` from Capacitor config)
4. `npx @capgo/cli@latest channel set production -s default`
5. `npm run ota:upload` for the baseline bundle
6. Archive → TestFlight with Capgo in the binary, then verify a tiny OTA lands after kill/reopen

## Build

- [ ] `npm run cap:sync:ios`
- [ ] Open Xcode (`npm run ios:open`), select Team, bump Marketing Version + Build
- [ ] Archive → Upload to App Store Connect

## Privacy & compliance

- [ ] Privacy Policy URL matches `src/config/legal.ts`
- [ ] App Privacy answers align with `ios/App/App/PrivacyInfo.xcprivacy`
- [ ] Export compliance: HTTPS only (`ITSAppUsesNonExemptEncryption` = NO)
- [ ] Permission strings: Camera, Photo Library, Notifications

## Auth

- [ ] Supabase redirect allowlist includes `dspnu://auth/callback`
- [ ] Google OAuth works via system browser
- [ ] Sign in with Apple: native iOS flow captures name/email; onboarding does not re-ask (Guideline 4)
- [ ] Sign in with Apple entitlement enabled on App ID + in Xcode/signing
- [ ] Password reset email opens the app and lands on reset screen

## Features smoke test (device)

- [ ] Cold start + splash
- [ ] Push permission + tap notification deep link
- [ ] QR / ticket check-in camera
- [ ] Service-hour photo capture
- [ ] Clover checkout opens in Browser and balance refreshes after close
- [ ] Apple Wallet pass share sheet
- [ ] Legal links open externally
- [ ] Account export + delete

## Listing assets

- [ ] 6.7" screenshots
- [ ] 6.1" screenshots
- [ ] App description + keywords
- [ ] Support URL
- [ ] Age rating questionnaire
