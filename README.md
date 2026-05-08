# AI App Builder Challenge 🤖

An interactive trivia game that teaches players the full methodology of building AI-powered applications — from data collection to responsible deployment.

---

## Features

- **5 Levels** covering every stage of AI app development
- **3 Difficulties** per level (Beginner / Intermediate / Advanced)
- **75 hand-crafted questions** seeded into the database
- **Countdown timer** with circular visual indicator
- **Scoring system** with time bonus and difficulty bonus
- **3 Power-ups** per round: 50/50, Extra Time, AI Hint
- **AI Mentor Explanations** after every question
- **Performance badges**: AI Rookie → Prompt Explorer → AI App Developer → AI Architect
- **SQLite leaderboard** — save and view top scores
- **Admin dashboard** — add, edit, delete questions and manage the leaderboard
- **Fully responsive** — works on desktop, tablet, and mobile

---

## Technologies Used

| Layer    | Technology                |
|----------|---------------------------|
| Frontend | HTML5, CSS3, JavaScript   |
| Backend  | Node.js + Express         |
| Database | SQLite (via better-sqlite3) |

---

## Project Structure

```
ai-app-builder-challenge/
├── public/
│   ├── index.html      # Main game page
│   ├── style.css       # Dark tech theme styling
│   └── script.js       # Game logic
├── admin/
│   ├── admin.html      # Admin dashboard page
│   ├── admin.css       # Admin styles
│   └── admin.js        # Admin logic
├── server.js           # Express backend + API routes
├── database.db         # SQLite database (auto-created)
├── package.json
└── README.md
```

---

## How to Install

Make sure you have [Node.js](https://nodejs.org) (v16 or higher) installed.

```bash
cd ai-app-builder-challenge
npm install
```

This installs **express** and **better-sqlite3**.

> **Windows users:** `better-sqlite3` uses prebuilt binaries and should install without any extra build tools.

---

## How to Run

```bash
npm start
```

The server will start and print:

```
🚀 AI App Builder Challenge is running!
   Game:  http://localhost:3000
   Admin: http://localhost:3000/admin
```

The database is created automatically on first run and seeded with **75 questions**.

---

## How to Open the Game

Open your browser and go to:

```
http://localhost:3000
```

---

## How to Run the Tests

```bash
npm test
```

Spins up the Express app on an ephemeral port against a fresh per-process SQLite file (`.test-db-<pid>.sqlite`, gitignored) and exercises the public API surface plus the `/u/:name` profile-page route. No external services or API keys required — AI-dependent endpoints are tested via their "not configured" branches so the suite runs offline and free.

---

## How to Open the Admin Page

```
http://localhost:3000/admin
```

The admin page lets you:
- View all 75 questions
- Filter by level and difficulty
- Add new questions
- Edit existing questions
- Delete questions
- View all saved scores
- Clear the leaderboard

---

## Game Levels

| Level | Topic | Focus |
|-------|-------|-------|
| **Level 1** | AI Foundations | What is AI, ML vs deep learning, supervised/unsupervised learning |
| **Level 2** | Data Preparation | Data collection, cleaning, features, labels, imbalance |
| **Level 3** | Model Building | Training, algorithms, evaluation metrics, overfitting |
| **Level 4** | AI App Development | APIs, prompt engineering, LLMs, app architecture |
| **Level 5** | Deployment & Responsible AI | Deployment, monitoring, bias, fairness, ethics |

---

## Difficulty Settings

| Difficulty | Timer | Question Style | Bonus Points |
|------------|-------|----------------|--------------|
| Beginner | 25 seconds | Basic concept questions | None |
| Intermediate | 18 seconds | Application-based questions | +25 pts per correct answer |
| Advanced | 12 seconds | Scenario-based questions | +50 pts per correct answer |

---

## Scoring Formula

```
Score per question = 100 (base) + (remaining seconds × 5) + difficulty bonus
```

---

## Badges

| Correct Answers | Badge |
|-----------------|-------|
| 0 – 3 | 🔰 AI Rookie |
| 4 – 6 | 🔍 Prompt Explorer |
| 7 – 8 | 💻 AI App Developer |
| 9 – 10 | 🏗️ AI Architect |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/questions` | Get all questions |
| GET | `/api/questions?level=X&difficulty=Y` | Get filtered questions |
| POST | `/api/questions` | Add a new question |
| PUT | `/api/questions/:id` | Update a question |
| DELETE | `/api/questions/:id` | Delete a question |
| POST | `/api/scores` | Save a player score |
| GET | `/api/leaderboard` | Get top 5 scores |
| GET | `/api/leaderboard/all` | Get all scores (admin) |
| DELETE | `/api/leaderboard` | Clear all scores (admin) |
