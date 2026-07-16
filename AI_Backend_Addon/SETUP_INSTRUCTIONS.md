# Setup Instructions for Taylor's App AI & Auth Addon

Follow these steps to integrate the AI Meter, Database, and Google Authentication into your Vercel project completely for free.

## Step 1: Set up Groq AI
1. Go to [console.groq.com](https://console.groq.com) and create a free account.
2. Navigate to "API Keys" and generate a new key.
3. Open your Vercel Dashboard for `taylor-s-app`.
4. Go to **Settings > Environment Variables**.
5. Add a new variable: 
   - **Key:** `GROQ_API_KEY`
   - **Value:** *(paste your key here)*

## Step 2: Set up Supabase & Google Auth
1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Once your database is provisioned, go to the **SQL Editor** on the left menu.
3. Open the `database/schema.sql` file from the addon folder, copy all the code, and run it in the Supabase SQL Editor. This sets up your tables securely.
4. To enable Google Auth:
   - Go to **Authentication > Providers** in Supabase.
   - Enable **Google** and follow their quick guide to get your Google Client ID and Secret (from Google Cloud Console).
5. Grab your Supabase URL and Anon Key from **Settings > API**.
6. Add them to Vercel as Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Step 3: Link It All in React
1. In your app, run `npm install @supabase/supabase-js`.
2. Open `src/pages/LoginPage.jsx` and add `<GoogleLogin onLogin={handleMockLogin} />` underneath your Sign In button!
3. Open `src/pages/Profile.jsx` and add `<FocusMeterWidget currentMode={mode} />` near the top of the profile page to show the AI scores!

## For Your Lecturers
You can proudly show your lecturers that you built a modern, serverless architecture using **Vercel Edge Functions** to interface with an LLM (Groq), combined with **Row-Level Security** in a Postgres database (Supabase) for secure Google OAuth.
