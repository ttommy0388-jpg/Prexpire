# Prexpire

*Know before it expires.*

Prexpire is a mobile app for tracking expiry dates across food, medicine, household products, skincare and pantry items. This repository holds an Expo / React Native app (also built for the web with react-native-web) with the home screen and a live expiry-date scanner. It opens straight to Home.

## What's here

- **Home screen**: an "items need attention" alert, a grid of categories, a "Coming up next" list of items expiring soon, and a floating bottom nav (Home, Lists, Scan a label, Reminders, Settings).
- **Live Scan**: opened from the scan button in the bottom nav. The camera fills the screen behind a scanning frame; the text inside the frame is read on the device or in the browser, the expiry date is found, and the user checks it, names the item, picks a category and adds it. Added items are saved on the device and appear in "Coming up next" and the category counts.

The home screen adapts to iPhone and iPad in portrait and landscape: a single column on phones, a centered column with a one-row category grid on tablets in portrait, and a two-column layout (summary and categories beside upcoming items) in landscape. Live Scan uses a bottom sheet in portrait and a side panel in landscape.

- **Items** (Lists tab): every tracked item, filtered by category and sorted as chosen in Settings.
- **Reminders**: items whose reminder is due (expired, or within the reminder timing) and the date each upcoming reminder falls on. The bell and tab badges count due reminders. Reminders are listed in the app only; nothing is sent as a notification yet.
- **Settings**: notifications (reminders on/off, timing, daily summary, browser notification permission), appearance (compact rows, animations), expiry preferences (warning period, date format, sorting, show/hide expired), default category, sample items, camera and storage information, JSON/CSV export and Clear all data. Preferences are saved with AsyncStorage (`prexpire.settings.v1`, localStorage in the browser) and apply across the app. On the web the open tab is kept in the address, e.g. `#settings`.

Category tile counts and three upcoming items are still sample data (`src/data.ts`, `src/items.tsx`); Settings can hide the sample items. Only the dark theme exists, and there is no notification delivery: the daily summary and reminder settings are saved for when it is built.

## Live Scan

**How it works.** About once a second the scanner grabs one camera frame, crops it to the area behind the frame (`src/scanner/cropMath.ts`) and reads the text. Passes never overlap. `src/scanner/ScannerCamera.*` holds the camera and OCR for each platform:

- **Web** (`ScannerCamera.web.tsx`): `getUserMedia` with the rear camera preferred, the flashlight when the browser exposes torch control (Chrome on Android; Safari on iPhone does not), and Tesseract.js reading a grayscale canvas crop in the browser. The Tesseract worker, WebAssembly core and English model are served by the app from `/ocr/` (copied by `scripts/copy-ocr-assets.js` after `npm install`), so nothing loads from a CDN and frames are never uploaded. The camera stops when the scanner closes or the tab is hidden.
- **iOS / Android** (`ScannerCamera.tsx`): `expo-camera` stills read with `expo-text-extractor` (Apple Vision on iOS, Google ML Kit on Android).

`src/scanner/dateParser.ts` (no camera or OCR code, tested on its own) then finds the expiry date:

- Labels: EXP, EXP DATE, EXPIRY, BEST BEFORE (END), BB, BBE, USE BY, BEST BY. Dates next to MFG / MFD / PACKED / PROD, LOT or BATCH are ignored; SELL BY is flagged.
- Formats: `27 OCT 2026`, `27 October 2026`, `27OCT26`, `Oct 27, 2026`, `27-10-2026`, `27/10/2026`, `10/27/2026`, `27.10.26`, `2026-10-27`, month-only `EXP 10/2027` and `EXP 10/27` (end of that month), and `EXP 20261027`. Common OCR slips inside numbers (O→0, I/L→1, S→5, B→8) are corrected. Calendar dates are validated, including leap years. `BEST BEFORE 27 OCT` without a year uses the next 27 October and asks the user to check the year.
- Day/month order: when both readings are valid (03/04/2027) the device region decides which is listed first, and the user has to pick one.
- A date only counts once two of the last three reads agree. Dates without an expiry label, several competing dates, past dates, missing years and sell-by dates need an explicit "Yes, this is the expiry date" before the item can be added.

Camera frames never leave the device; native stills are deleted right after they are read.

**Web: camera needs https.** Browsers only open the camera on `https://` sites or `localhost`. The claude.ai preview link does not allow camera access, so live scanning on the web needs the app hosted on its own https site. Manual date entry works everywhere.

**Phones: a development build is required.** Native text recognition is not in Expo Go. In Expo Go the scanner shows the camera, says that reading dates needs the development build, and offers manual date entry. To run the native scanner:

```bash
npm install
npx expo run:ios --device       # or: npx expo run:android --device
# or build in the cloud with EAS: eas build --profile development --platform ios
```

`expo run:*` generates the native `ios/` and `android/` projects with the camera and OCR modules. A physical device is needed to scan real labels (simulators have no camera). iOS builds need Xcode; Android builds need the Android SDK. The bundle identifier and Android package are `com.ttommy0388.prexpire`. On Android the ML Kit text model comes from Google Play services, and `plugins/withMlKitOcrModel.js` asks Play to download it at install time.

**Installing on an iPhone without a Mac (EAS Build).** Expo builds the app in the cloud and gives you a link to install it. It needs a free Expo account and a paid Apple Developer Program membership ($99/year), because Apple only lets apps outside the App Store onto iPhones that are registered to a developer account. From any computer with Node.js:

```bash
npm install -g eas-cli
eas login                                   # Expo account
eas device:create                           # open the link on the iPhone to register it
eas build --profile preview --platform ios  # sign in with the Apple ID when asked
```

When the build finishes, open its link on the iPhone and tap Install. On iOS 16 and later, turn on Settings → Privacy & Security → Developer Mode the first time. The `preview` profile is a standalone app; the `development` profile is a dev client that loads code from `npx expo start`.

**Tests.** `npm test` runs the date parser, crop and preferences tests with Node's built-in test runner. `npm run typecheck` runs TypeScript.

## Project layout

```
App.tsx                         root: tabs (Home, Items, Reminders, Settings), bottom nav, scanner
src/theme.ts                    colors, category tints, radii, spacing, type scale
src/layout.ts                   responsive layout modes (phone, tablet, split landscape) and grid sizing
src/data.ts                     sample categories
src/items.tsx                   item model, on-device storage (AsyncStorage), sample items
src/settings.tsx                preferences provider (AsyncStorage), reduced-motion handling
src/preferences.ts              preference values, date formatting, sorting, reminders, export (+ tests)
src/platform/                   browser notification permission and file export, per platform
src/scanner/                    date parser, crop math, camera + OCR per platform, scan loop (+ tests)
scripts/copy-ocr-assets.js      copies the browser OCR files into public/ocr
src/components/Art.tsx          SVG illustrations and the Prexpire mark
src/components/HomeComponents.tsx  header, alert card, tiles, rows, bottom nav
src/components/ScanFrame.tsx    scanning frame with corner brackets
src/components/ResultSheet.tsx  detected-date sheet: name, category, date check/edit, Add item
src/screens/HomeScreen.tsx
src/screens/ItemsScreen.tsx
src/screens/RemindersScreen.tsx
src/screens/SettingsScreen.tsx
src/components/Page.tsx         header + title + scroll frame shared by the tabs
src/components/SettingsRows.tsx settings sections, rows, toggles, option chips
src/components/ItemRow.tsx      item row styled by the preferences
src/screens/ScannerScreen.tsx   Live Scan
plugins/withMlKitOcrModel.js    Android: preload the ML Kit text model
assets/wordmark.png
prototype/index.html            the original single-file web build of the prototype
```

## Running it

```bash
npm install
npx expo install --fix   # align package versions with your Expo SDK
npm run web              # http://localhost:8081, the camera works on localhost
npm run export:web       # static site in dist/, host it on any https server
```

`prototype/index.html` is the compiled web build the source was recovered from. Open it in a browser to see the prototype without installing anything.
