# Gym Log 🏋️

Full-stack workout tracker for serious lifters. Built with Next.js (App Router), PostgreSQL and Drizzle ORM.

## Features

- 🔐 Authentication (register / login with cookie sessions)
- 📊 Dashboard with live stats
- 🏋️ Workout logging with per-set **reps, weight and RIR** (reps in reserve)
- 📋 Training **programs** (reusable templates you can apply to a workout)
- 🏆 116-exercise library + your own custom exercises
- 📈 Previous-session values auto-filled (progressive overload)
- 📱 Responsive, mobile-friendly UI

## Demo account

- Email: `rat@gym.com`
- Password: `gymrat99`

## Run locally

```bash
npm install
npm run dev
```

## Deploy to Vercel (free)

1. Push this code to a GitHub repository.
2. Go to <https://vercel.com> → **Sign up with GitHub** → **Add New → Project** and import the repo.
3. Create a PostgreSQL database (Vercel **Storage** → **Postgres**, or <https://neon.tech>).
4. Copy the connection string and add it as an environment variable named `DATABASE_URL`.
5. Deploy. The app **creates its tables and seeds demo data automatically** on first request.

The database schema is created automatically on first launch (see `src/lib/init.ts`), so no manual migrations are required.
