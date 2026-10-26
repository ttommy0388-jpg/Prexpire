# Prexpire

*Know before it expires.*

Prexpire is a mobile app for tracking expiry dates across food, medicine, household products, skincare and pantry items. This repository holds the first prototype: an Expo / React Native app with a launch screen and the home screen.

## What's here

- **Launch screen**: the Prexpire mark, wordmark and tagline, which fade into the home screen.
- **Home screen**: an "items need attention" alert, a grid of categories, a "Coming up next" list of items expiring soon, and a floating bottom nav (Home, Lists, Scan a label, Reminders, Settings).

The home screen adapts to iPhone and iPad in portrait and landscape: a single column on phones, a centered column with a one-row category grid on tablets in portrait, and a two-column layout (summary and categories beside upcoming items) in landscape.

All data is sample data in `src/data.ts`, and taps do not navigate anywhere yet.

## Project layout

```
App.tsx                         root: home screen with the launch overlay
src/theme.ts                    colors, category tints, radii, spacing, type scale
src/layout.ts                   responsive layout modes (phone, tablet, split landscape) and grid sizing
src/data.ts                     sample categories and upcoming items
src/components/Art.tsx          SVG illustrations and the Prexpire mark
src/components/HomeComponents.tsx  header, alert card, tiles, rows, bottom nav
src/screens/HomeScreen.tsx
src/screens/LaunchScreen.tsx
assets/wordmark.png
prototype/index.html            the original single-file web build of the prototype
```

## Running it

```bash
npm install
npx expo install --fix   # align package versions with your Expo SDK
npm run web              # or: npm run ios / npm run android
```

`prototype/index.html` is the compiled web build the source was recovered from. Open it in a browser to see the prototype without installing anything.
