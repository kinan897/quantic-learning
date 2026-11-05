# Quantic Learning

Bite-sized, game-style lessons for Ontario high school and first-year university STEM courses.
Learners work through a path of short lessons, earn XP, keep streaks, and get instant,
step-by-step feedback on every answer, including typed math answers like `3x^2 - 2sin(x)`.

> Status: **Step 1 — backend foundation.** See the roadmap below.

## Architecture

```
quantic-learning/
├── backend/          Python · FastAPI · SymPy      (REST API, grading, content)
│   ├── app/
│   │   ├── content/  Course content as YAML, validated at startup
│   │   ├── grading/  Safe math-expression parser + answer checker
│   │   ├── routers/  HTTP endpoints
│   │   └── main.py   App entry point
│   └── tests/
└── mobile/           TypeScript · React Native · Expo  (iOS, Android, Web) — Step 2
```

| Layer | Tech | Why |
|---|---|---|
| Client | React Native + Expo (TypeScript) | One codebase ships to iOS, Android and the web |
| API | FastAPI (Python) | Fast, typed, auto-generated OpenAPI docs |
| Math grading | Custom parser → SymPy | Accepts equivalent answers (`2(x+1)` = `2x+2`) without `eval` |
| Content | YAML files, Pydantic-validated | Questions are version-controlled and checked in CI |
| Database | SQLite (dev) → PostgreSQL (prod) | Added in Step 3 for users and progress |
| AI tutor | Claude API | Step 5: explains *your specific* mistake |

### Design decisions

- **Answers never reach the client.** Lesson payloads omit answers, and the server grades
  every attempt. That keeps the XP and leaderboards fair.
- **No `eval` on user input.** Typed math is tokenized and parsed by a small recursive-descent
  parser that builds SymPy expressions directly. Power towers such as `9^9^9` are rejected
  before they can hang the server.
- **Equivalence by numeric sampling.** Two expressions match if they agree at several random
  points. That's fast and handles forms `simplify()` struggles with.
- **Content is code.** Every question is validated when the app starts: ids are unique,
  multiple-choice indexes are in range, and math answers parse.

## Roadmap

1. **Backend foundation** — content model, safe math grader, lesson API, first MCV4U unit ✅
2. **Mobile app** — Expo app: course path, lesson player, math keyboard, feedback screens
3. **Accounts & progress** — sign up/in, PostgreSQL, XP, streaks, lesson unlocking
4. **Full MCV4U course** — all units: derivatives, applications, vectors, lines & planes
5. **AI tutor** — "Why was I wrong?" explanations and adaptive practice (Claude API)
6. **More courses** — MHF4U, MCR3U, SCH4U, SPH4U, SBI4U, then first-year university
7. **Gamification** — leagues, achievements, daily goals, notifications
8. **Ship it** — deploy API, publish to the App Store, Google Play and the web

## Running the backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

Then open http://127.0.0.1:8000/docs for interactive API docs.

Run the tests:

```bash
pytest
```

## Content

Courses follow the Ontario Ministry of Education curriculum expectations.
All questions and explanations are original.
