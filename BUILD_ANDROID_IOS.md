# Build Android & iOS — Setup Checklist

## Already Done ✅
- [x] `app.json` with package `com.t1dsaathi.app`
- [x] `eas.json` with preview + production profiles
- [x] `.easignore` to exclude dev files from build
- [x] Camera + photo library permissions in app.json
- [x] expo-notifications plugin configured
- [x] `supabase_schema.sql` deployed to `jwslcxgnwlsqbrtmmqvf`
- [x] Supabase anon key + Firebase config in `.env`

## You Run In Terminal ($)

### 1. Login to Expo
```bash
cd /Users/prakashthapa/Downloads/Heal-diabetes/T1D-Saathi
npx expo login
```

### 2. Init EAS (creates project on Expo servers)
```bash
eas init
```
Choose account: `thisispratha`

### 3. Firebase Console — Add Mobile Apps

**Android:**
1. Go to https://console.firebase.google.com/project/t1d-heal/settings/general
2. Click "Add app" → Android
3. Package name: `com.t1dsaathi.app`
4. SHA-1: `9B:E7:82:D9:46:7B:93:FD:78:0F:5B:CA:AE:2F:BF:39:B3:E6:11:3F`
5. Download `google-services.json`

**iOS:**
1. Click "Add app" → iOS
2. Bundle ID: `com.t1dsaathi.app`
3. Download `GoogleService-Info.plist`

Place both files in the project root (`T1D-Saathi/`)

### 4. Google Cloud Console — OAuth Redirect

1. Go to https://console.cloud.google.com/apis/credentials → project `t1d-heal`
2. Edit the OAuth 2.0 Client ID for web
3. Add Authorized redirect URI:
   ```
   https://jwslcxgnwlsqbrtmmqvf.supabase.co/auth/v1/callback
   ```
   AND:
   ```
   com.t1dsaathi.app://auth/callback
   ```

### 5. Supabase Dashboard — Auth URL Config

1. Go to https://supabase.com/dashboard/project/jwslcxgnwlsqbrtmmqvf/auth/url-configuration
2. Site URL: `https://t1d-saathi.app` (or placeholder)
3. Redirect URLs (one per line):
   ```
   com.t1dsaathi.app://auth/callback
   https://jwslcxgnwlsqbrtmmqvf.supabase.co/auth/v1/callback
   ```

## Build Commands

```bash
# Test APK (sends download link)
eas build --platform android --profile preview

# Production AAB (for Play Store)
eas build --platform android --profile production

# iOS IPA (for App Store)
eas build --platform ios --profile production

# Both at once
eas build --platform all --profile production
```

## Store Submission Quick Ref

### Play Store (Android)
1. https://play.google.com/console → Create app
2. Package: `com.t1dsaathi.app`
3. Upload AAB from EAS dashboard
4. Privacy policy URL, content rating
5. Submit

### App Store (iOS)
1. https://developer.apple.com → Certificates → create Distribution cert
2. https://appstoreconnect.apple.com → New App → `com.t1dsaathi.app`
3. Upload IPA via Transporter
4. Privacy labels, screenshots
5. Submit for review
