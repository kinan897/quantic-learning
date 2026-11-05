# Quantic Learning — App

The student-facing app for iOS, Android and the web, built with React Native + Expo (TypeScript).

## Run it

Start the backend first (see the root README). Use `--host 0.0.0.0` so phones on your Wi-Fi can reach it:

```bash
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0
```

Then in another terminal:

```bash
cd mobile
npm install
npx expo start
```

- **Web:** press `w`, or open http://localhost:8081
- **Phone:** install **Expo Go** from the App Store / Play Store and scan the QR code.
  Your phone and computer must be on the same Wi-Fi. The app finds the backend automatically.
- **Android emulator:** press `a`

If Windows Firewall asks whether Python and Node can accept connections, allow them on
**private** networks so your phone can connect.

## Checks

```bash
npm run typecheck
npm run lint
```

## Structure

```
src/
├── app/                    Screens (Expo Router: file name = route)
│   ├── _layout.tsx         Providers (React Query, theme) + root stack
│   ├── (tabs)/index.tsx    Learn: the course path
│   ├── (tabs)/profile.tsx  Account, XP, streak, weekly activity
│   ├── auth/               Sign up / sign in
│   └── lesson/[id].tsx     Lesson player
├── api/                    Typed API client (auto token refresh) + React Query hooks
├── store/auth.ts           Session tokens (Keychain/Keystore on phones)
├── store/preferences.ts    Device preferences (active course)
├── components/
│   ├── auth/               AuthGate (creates a guest on first launch), form frame
│   ├── math/               KaTeX rendering (DOM component; WebView on phones)
│   ├── lesson/             Choices, math keypad, feedback panel, completion screen
│   ├── learn/              Unit header, lesson timeline node
│   └── ui/                 Button, Text, ProgressBar, …
└── constants/theme.ts      Colours (light + dark), spacing, radii
```

## How a lesson works

1. The app loads the lesson and starts a **session** on the server. Questions arrive
   **without answers**. Locked lessons are refused by the API.
2. Each answer is sent to the API, which grades it. Typed math is checked for equivalence, so
   `2(x+1)` and `2x+2` are both right.
3. A typo (e.g. `2x +`) comes back as `invalid` with a hint. It isn't counted as wrong.
4. A wrong answer shows a worked solution, and the question returns at the end of the lesson.
   The lesson finishes only after every question has been answered correctly once.
5. On completion the **server** works out the reward from its own record of attempts: full XP
   on the first completion, half on replays, plus 5 for a perfect first-try run.

## Accounts

The app never shows a sign-in wall. On first launch it creates a guest account, and progress
saves from lesson one. "Save your progress" on the Profile tab (or after a lesson) turns the
guest into a full account with all progress kept. Signing in on a new device loads the
account's progress from the server.
