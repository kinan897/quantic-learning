<p align="center">
  <img src="mobile/assets/images/logo.png" width="96" alt="Quantic Learning logo" />
</p>

# Quantic Learning

Bite-sized, game-style lessons for Ontario high school and first-year university STEM courses.
Learners work through a path of short lessons, earn XP, keep streaks, and get instant,
step-by-step feedback on every answer, including typed math answers like `3x^2 - 2sin(x)`.

> Status: **Step 3: accounts and server-side progress.** See the roadmap below.

## Architecture

```
quantic-learning/
├── backend/            Python · FastAPI · SQLAlchemy · SymPy
│   ├── app/
│   │   ├── content/    Course content as YAML, validated at startup
│   │   ├── grading/    Safe math-expression parser + answer checker
│   │   ├── services/   Auth tokens, XP, streaks, lesson unlocking
│   │   ├── routers/    HTTP endpoints (auth, me, courses, lessons)
│   │   ├── models.py   Database tables
│   │   └── main.py     App entry point
│   ├── migrations/     Alembic database migrations
│   └── tests/
└── mobile/             TypeScript · React Native · Expo  (iOS, Android, Web)
    └── src/
        ├── app/        Screens: course path, lesson player, profile, sign up/in
        ├── api/        Typed API client (auto token refresh) + React Query hooks
        └── store/      Session (secure storage) and preferences
```

| Layer | Tech | Why |
|---|---|---|
| Client | React Native + Expo (TypeScript) | One codebase ships to iOS, Android and the web |
| Client state | TanStack Query + Zustand | Server data cached and retried; session kept in secure storage |
| Math display | KaTeX via Expo DOM components | Real LaTeX on every platform |
| API | FastAPI (Python) | Fast, typed, auto-generated OpenAPI docs |
| Math grading | Custom parser → SymPy | Accepts equivalent answers (`2(x+1)` = `2x+2`) without `eval` |
| Content | YAML files, Pydantic-validated | Questions are version-controlled and checked in CI |
| Database | SQLAlchemy 2 + Alembic; SQLite (dev) → PostgreSQL (prod) | Same code on both; switch with one setting |
| Auth | Argon2id passwords, JWT access tokens, rotating refresh tokens | Industry-standard, no third-party lock-in |
| AI tutor | Claude API | Step 5: explains *your specific* mistake |

### How a topic is taught

Every topic is three lessons, and each one unlocks the next:

| Lesson | What it is |
|---|---|
| **Learn** | One idea per card, with graphs, diagrams and key-idea boxes, and a quick check question after each idea |
| **Practice** | Easy questions that build the foundation, many read straight off a graph. No pen and paper needed |
| **Destroyer** | The hard, multi-step problems, worth 3× the XP. Required before the next topic opens |

Graphs are written in the course files as formulas (`x^2 - 4x + 5`, plus points, labels and
dashed lines). The server samples them into points, splitting curves at gaps and asymptotes,
and the app draws them with SVG. They look identical on iOS, Android and the web, and they
work as question figures or as answer choices ("which graph could be f′(x)?").

### Design decisions

- **Answers never reach the client.** Lesson payloads omit answers, and the server grades
  every attempt. That keeps the XP and leaderboards fair.
- **The server decides the score.** Each play-through is a *lesson session*. Every graded
  attempt is recorded, and on completion the server checks that each question was eventually
  answered correctly. It then works out first-try accuracy, XP and streak itself. The app
  never sends a score, so it can't fake one.
- **Locked lessons are enforced by the API**, not just hidden in the UI.
- **Guest first.** On first launch the app quietly creates a guest account, so progress is
  saved from lesson one. Signing up *upgrades* that same account, so nothing is lost.
- **Secure sessions.** Passwords are hashed with Argon2id. Access tokens last 15 minutes.
  Refresh tokens are stored only as hashes and rotate on every use. If an already-used refresh
  token appears again (a sign of theft), every device in that login chain is signed out.
  Sign-in and sign-up are rate-limited, and a failed login takes the same time whether or not
  the email exists.
- **Streaks follow the student's day.** Each account stores an IANA timezone, so a lesson at
  11:30 pm in Toronto counts for that day.
- **No `eval` on user input.** Typed math is tokenized and parsed by a small recursive-descent
  parser that builds SymPy expressions directly. Power towers such as `9^9^9` are rejected
  before they can hang the server.
- **Equivalence by numeric sampling.** Two expressions match if they agree at several random
  points. That's fast and handles forms `simplify()` struggles with.
- **Content is code.** Every lesson is validated when the app starts: ids are unique,
  multiple-choice indexes are in range, math answers and graph formulas parse, and diagram
  files exist. Tests also check that every topic runs Learn → Practice → Destroyer, every
  graph has something to draw, and correct answers don't always sit in the same position.

### API overview

| Method | Path | |
|---|---|---|
| `POST` | `/api/v1/auth/guest` | Start as a guest |
| `POST` | `/api/v1/auth/register` | Create an account (upgrades the calling guest) |
| `POST` | `/api/v1/auth/login` · `/refresh` · `/logout` | Sessions |
| `GET` | `/api/v1/me` · `/me/progress` | Profile, XP, streak, weekly activity |
| `GET` | `/api/v1/courses` · `/courses/{id}` | Course catalog (public) |
| `GET` | `/api/v1/lessons/{id}` | Lesson questions, without answers (403 if locked) |
| `POST` | `/api/v1/lessons/{id}/sessions` | Start a play-through |
| `POST` | `/api/v1/lessons/{id}/questions/{qid}/check` | Grade an answer |
| `POST` | `/api/v1/lessons/{id}/sessions/{sid}/complete` | Finish and receive XP |

Full interactive docs: http://127.0.0.1:8000/docs

## Roadmap

1. **Backend foundation** — content model, safe math grader, lesson API, first MCV4U unit ✅
2. **Mobile app** — Expo app: course path, lesson player, math keypad, feedback screens ✅
3. **Accounts & progress** — guest-first accounts, sign up/in, server-side XP, streaks, unlocking ✅
4. **Full MCV4U course** — Learn / Practice / Destroyer format with graphs ✅ (Unit 1);
   next: derivatives, applications, vectors, lines & planes
5. **AI tutor** — "Why was I wrong?" explanations and adaptive practice (Claude API)
6. **More courses** — MHF4U, MCR3U, SCH4U, SPH4U, SBI4U, then first-year university
7. **Gamification** — leagues, achievements, daily goals, notifications
8. **Ship it** — PostgreSQL, deploy API, publish to the App Store, Google Play and the web

## Running the backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --host 0.0.0.0
```

In development the database (`backend/quantic.db`) is created and migrated automatically on
startup. `--host 0.0.0.0` lets phones on your Wi-Fi reach the API. Settings are listed in
[backend/.env.example](backend/.env.example).

Run the tests and checks:

```bash
pytest
ruff check .
```

After changing `app/models.py`, create a migration with
`alembic revision --autogenerate -m "describe the change"`. A test fails if you forget.

## Running the app

See [mobile/README.md](mobile/README.md). In short: `cd mobile && npm install && npx expo start`.

## Content

Courses follow the Ontario Ministry of Education curriculum expectations.
All questions and explanations are original.
