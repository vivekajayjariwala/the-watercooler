# 💧 The Watercooler

Welcome to The Watercooler – a modern web application designed to help employees connect over shared interests and schedule coffee chats. This project is a complete rewrite of a 2022 hackathon project, now built with:

- **Next.js (App Router)**
- **Tailwind CSS**
- **Supabase (Auth & Database)**
- **Vercel (Deployment)**

## 🚀 Getting Started

### 1. Database Setup (Supabase)
To run this project, you will need a Supabase project.

1. Create a new project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open the `supabase/schema.sql` file in this repository.
4. Copy the entire contents of `schema.sql` and run it in the Supabase SQL Editor. This will create the necessary tables (`profiles`, `interests`, `user_interests`, `coffee_chats`), enable Row Level Security (RLS), insert default interests, and create an auth trigger.

### 2. Environment Variables
Create a `.env.local` file in the root of the project and add your Supabase keys (found in Project Settings -> API):

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Run Locally
Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Deployment (Vercel)

This project is optimized for deployment on Vercel.

1. Push your code to GitHub.
2. Go to [Vercel](https://vercel.com) and click **Add New... > Project**.
3. Import your GitHub repository.
4. In the **Environment Variables** section, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Click **Deploy**.

## 🕰️ Legacy Code

The original 2022 hackathon code is preserved in the `legacy_code` directory for nostalgia. It is completely isolated from the new Next.js application.
