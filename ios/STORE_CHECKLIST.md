# iOS App Store listing checklist

Use this when preparing TestFlight / App Store Connect for **DSP Nu** (`com.tartabinienterprises.dspnu`).

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
- [ ] Sign in with Apple enabled (Guideline 4.8) and tested
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
