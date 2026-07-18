import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const s = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const login = await s.auth.signInWithPassword({
  email: "danish.admin@taylors.edu.my",
  password: "danish123",
});
if (login.error) {
  console.log("LOGIN_FAIL", login.error.message);
  process.exit(1);
}
console.log("LOGIN_OK");

const e = await s.from("campus_events").select("id,category,match_score").limit(5);
console.log(
  "EVENTS",
  e.error?.message || `${e.data?.length} rows cats=${[...new Set(e.data.map((x) => x.category))]}`,
);

const ins = await s
  .from("ai_meter_history")
  .insert({
    user_id: login.data.user.id,
    mode: "focus",
    focus_score: 62,
    balance_score: 48,
    ai_recommendation: "wiring test",
  })
  .select("id")
  .maybeSingle();

if (ins.error) {
  console.log("HIST_FAIL", ins.error.message, ins.error.code, ins.error.details, ins.error.hint);
} else {
  console.log("HIST_OK", ins.data?.id);
  await s.from("ai_meter_history").delete().eq("id", ins.data.id);
  console.log("HIST_CLEANED");
}

// Groq
const groq = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${env.VITE_GROQ_API_KEY}`,
  },
  body: JSON.stringify({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: "Say ok" }],
    max_tokens: 5,
  }),
});
console.log("GROQ", groq.ok ? "OK" : "FAIL " + groq.status);
