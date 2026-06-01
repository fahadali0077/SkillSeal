# SkillSeal 

A LinkedIn-style platform with an AI-powered skill verification engine. Candidates take proctored, adaptive assessments to earn cryptographically verified skill badges that recruiters can trust.

## Features

- **Social Network** — Profiles, connections, activity feed, messaging, company pages
- **Skill Verifier** — Adaptive MCQ/Scenario/Micro-theory assessments with anti-cheat
- **AI Question Generation** — GPT-4o generates unique questions every session
- **Recruiter Dashboard** — Full audit trails, behavior integrity scores, pipeline management  
- **Job Board** — Verified-skill filtering, Easy Apply, match scoring
- **Monetization** — Stripe-powered Pro and Recruiter subscription tiers

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js/Vite + React 18, TypeScript, Tailwind CSS, Zustand, TanStack Query, Framer Motion |
| Backend | Node.js 20, Express 4, TypeScript, Mongoose 8, Socket.io 4 |
| Database | MongoDB Atlas + Redis (Upstash) |
| AI | OpenAI GPT-4o (question generation + micro-theory grading) |
| Payments | Stripe Subscriptions |
| Media | Cloudinary |
| Email | SendGrid |

## Monorepo Structure

```
SkillSeal-project/
├── shared/          # Shared TypeScript types (@SkillSeal/shared)
├── server/          # Express API + Socket.io + Assessment Engine
├── client/          # Vite + React frontend
├── DEPLOYMENT.md    # Step-by-step deployment guide
└── package.json     # npm workspaces root
```

## Quick Start

```bash
npm install
cp server/.env.example server/.env   # fill in your values
npm run dev                           # starts client + server
```

See **DEPLOYMENT.md** for full production deployment instructions.

## Test Results

- Server: **146 tests passing** (auth, scoring, certificates, assessment logic, connections, jobs, recruiter)
- Client: **28 tests passing** (IsolationMode anti-cheat, TimerBar, MicroTheory, SessionComplete)
