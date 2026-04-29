# AI Challenge — Platform Concept & Developer Guide

## What Is This?

AI Challenge is a **daily AI learning platform** — part quiz game, part news digest, part tutoring app. The goal is simple: help anyone (from curious beginners to working developers) understand artificial intelligence through short, engaging daily habits.

**Three things happen every day on this platform:**
1. You play a timed quiz on a real AI topic
2. You read the latest AI news curated from the web
3. You can ask Alex (the AI tutor) anything you don't understand

---

## Core Philosophy

> **"Learn by doing, understand by playing, stay sharp by coming back daily."**

Most AI education is either too academic (dense papers) or too shallow (Twitter threads). AI Challenge sits in the sweet spot: structured enough to build real knowledge, casual enough to do in 5 minutes a day.

The platform is designed for **daily return**. Every piece — streaks, leaderboards, daily challenges, fresh news — is optimised to make you want to come back tomorrow.

---

## Pages & Features

### 🏠 Home (`/`)
- **Play a Game** — Start a timed quiz on any AI topic + difficulty
- **Learn AI** — Browse structured micro-lessons by level
- **Latest AI News** — Daily AI news feed from the web
- Onboarding tour for first-time visitors
- PWA install prompt

### 🎮 Quiz Game (on home screen)
- 10 questions per round, timed (25 / 18 / 12 seconds per difficulty)
- 5 levels: AI Foundations → Data Preparation → Model Building → AI App Development → Deployment & Ethics
- 3 difficulties: Beginner / Intermediate / Advanced + Practice mode
- Power-ups: 50/50, +5s extra time, AI hint (pre-answer)
- **Wrong-answer explainer**: after every wrong answer, Alex streams a personalised 1–2 sentence explanation powered by Claude
- Score saving to global leaderboard
- Score sharing (native share, X/Twitter, LinkedIn, copy)
- Answer review with explanation after each round

### 🎓 Lessons (`/lessons.html`)
- Structured micro-lessons grouped by level
- Mark lessons as complete (stored in localStorage)

### 📰 News (`/news.html`)
- Live AI news fetched from the web using the Learn endpoint
- Categorised by topic
- Read status tracked

### 👤 Profile (`/profile.html`)
- Personal stats: games played, accuracy, best streak
- Achievement badges
- Level progress across all 5 topics
- Daily Learning Hub shortcut

### 🤖 Alex Chat (`/chat.html`)
- Streaming AI tutor powered by Claude (claude-haiku-4-5)
- Beginner-friendly explanations with real-world analogies
- Available from every page via the floating chat FAB

### 🏆 Leaderboard (`/leaderboard.html`)
- Global all-time leaderboard
- Weekly leaderboard (resets Monday)
- Filterable by level and difficulty

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS (no framework) |
| Backend | Node.js + Express |
| AI | Anthropic Claude API (`claude-haiku-4-5`) |
| Database | Turso (libSQL / SQLite edge) |
| Hosting | Vercel (static + serverless via Express adapter) |
| PWA | Service Worker + Web App Manifest |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/questions` | Fetch quiz questions (filter by level/difficulty) |
| POST | `/api/scores` | Save a player score |
| GET | `/api/leaderboard` | Top 10 all-time scores |
| GET | `/api/leaderboard/weekly` | Top 10 scores this week |
| GET | `/api/leaderboard/rank?score=N` | Player rank for a given score |
| POST | `/api/ai-hint` | Get a pre-answer hint (no spoilers) |
| POST | `/api/explain` | Get a post-wrong-answer explanation (streaming SSE) |
| POST | `/api/chat` | Streaming chat with Alex (SSE) |
| GET | `/api/daily-challenge` | Same 10 questions for everyone today |
| POST | `/api/questions/generate` | Admin: AI-generate new questions |
| POST | `/api/analytics/event` | Track a user interaction event |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `TURSO_URL` | Yes | Turso database URL |
| `TURSO_AUTH_TOKEN` | Yes | Turso auth token |
| `ADMIN_KEY` | No | Secret for admin-only endpoints |

---

## Key Design Decisions

### Why no framework?
Keeping the frontend in vanilla JS means zero build step, instant deploys, and no dependency rot. The app is small enough that a framework would add complexity without value.

### Why Claude Haiku?
Haiku gives near-instant responses (< 1s) at low cost. The wrong-answer explainer and AI hint both need to feel snappy — Haiku is the right model for that. Alex's chat could use Sonnet for richer answers if budget allows.

### Why Turso?
SQLite at the edge. Zero cold starts, cheap, and the data model is simple (questions + scores). No ORM needed.

### Why streaming for explanations?
Perceived latency matters enormously in a quiz game. Streaming via SSE means the user sees the first word of Alex's explanation within ~300ms, even if the full response takes 2 seconds. This makes the AI feel alive rather than a loading spinner.

---

## Content Structure

### Quiz Levels
1. **AI Foundations** — What is AI, ML vs DL, neural networks, key terminology
2. **Data Preparation** — Data cleaning, feature engineering, train/test splits, bias
3. **Model Building** — Training, overfitting, evaluation metrics, hyperparameters
4. **AI App Development** — APIs, prompts, tokens, latency, streaming, JSON mode
5. **Deployment & Responsible AI** — Hosting, monitoring, ethics, fairness, safety

### Difficulty Scaling
- **Beginner** — 25 seconds, conceptual recall questions
- **Intermediate** — 18 seconds, application and comparison questions
- **Advanced** — 12 seconds, nuanced trade-offs and edge cases
- **Practice** — No timer, no score, just learning

---

## Folder Structure

```
ai-app-builder-challenge/
├── public/
│   ├── index.html          # Home + quiz game
│   ├── lessons.html        # Micro-lessons
│   ├── news.html           # AI news feed
│   ├── profile.html        # Personal stats
│   ├── chat.html           # Alex AI tutor
│   ├── leaderboard.html    # Global rankings
│   ├── script.js           # Quiz game logic
│   ├── lessons.js          # Lessons page
│   ├── news.js             # News page
│   ├── profile.js          # Profile page
│   ├── learn.js            # Daily hub logic
│   ├── chat.js             # Alex chat logic (inline in chat.html)
│   ├── tour.js             # Onboarding tour
│   ├── style.css           # Global styles
│   ├── tour.css            # Tour overlay styles
│   ├── service-worker.js   # PWA offline support
│   └── manifest.json       # PWA manifest
├── server.js               # Express server + all API routes
├── CLAUDE.md               # This file
└── package.json
```

---

## Running Locally

```bash
npm install
ANTHROPIC_API_KEY=your_key TURSO_URL=your_url TURSO_AUTH_TOKEN=your_token node server.js
```

The server starts on port 3000. Visit `http://localhost:3000`.

---

## What Makes a Great Daily AI Platform

The features that drive daily return and real learning:

1. **Fresh content** — new quiz questions, live news, daily challenge reset
2. **Short sessions** — 5 minutes is enough for a full round
3. **Immediate feedback** — Alex explains every wrong answer instantly
4. **Progress visibility** — badges, streaks, leaderboard rank
5. **Personalisation** — difficulty ramps, spaced repetition of missed questions
6. **Community** — shared leaderboard, shareable score cards
7. **Always accessible** — PWA for offline/home screen use
