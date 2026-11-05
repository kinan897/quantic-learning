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
│   ├── (tabs)/profile.tsx  XP, streak, weekly activity
│   └── lesson/[id].tsx     Lesson player
├── api/                    Typed API client + React Query hooks
├── store/progress.ts       XP, streaks, completed lessons (Zustand, saved on device)
├── components/
│   ├── math/               KaTeX rendering (DOM component; WebView on phones)
│   ├── lesson/             Choices, math keypad, feedback panel, completion screen
│   ├── learn/              Unit header, lesson timeline node
│   └── ui/                 Button, Text, ProgressBar, …
└── constants/theme.ts      Colours (light + dark), spacing, radii
```

## How a lesson works

1. The app loads the lesson. Questions arrive **without answers**.
2. Each answer is sent to the API, which grades it. Typed math is checked for equivalence, so
   `2(x+1)` and `2x+2` are both right.
3. A typo (e.g. `2x +`) comes back as `invalid` with a hint. It isn't counted as wrong.
4. A wrong answer shows a worked solution, and the question returns at the end of the lesson.
   The lesson finishes only after every question has been answered correctly once.
5. XP: full on the first completion, half on replays, plus 5 for a perfect first-try run.
