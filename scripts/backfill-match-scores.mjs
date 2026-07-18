import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const TAG_INTEREST_BASE = {
  Technology: 86,
  Career: 84,
  Wellness: 88,
  Social: 82,
  Creative: 83,
  Academic: 85,
};

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
}

function buildBaseline(event = {}) {
  const tag = String(event.tag || "Technology");
  const category = String(event.category || "focus").toLowerCase();
  const hasZone = Boolean(String(event.zone || "").trim());
  const hasLocation = Boolean(String(event.location || "").trim());
  const capacity = Number(event.capacity) || 0;

  const interest = TAG_INTEREST_BASE[tag] ?? 80;
  const schedule = category === "balance" ? 88 : 84;
  const proximity = hasZone || hasLocation ? 82 : 68;
  const social =
    capacity >= 80 ? 90 : capacity >= 40 ? 78 : capacity > 0 ? 70 : 74;
  const overall = clamp(
    interest * 0.4 + schedule * 0.3 + proximity * 0.2 + social * 0.1,
  );

  return {
    match_score: `${overall}%`,
    match_breakdown: {
      interest: clamp(interest),
      schedule: clamp(schedule),
      proximity: clamp(proximity),
      social: clamp(social),
    },
  };
}

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const login = await supabase.auth.signInWithPassword({
  email: "danish.admin@taylors.edu.my",
  password: "danish123",
});
if (login.error) {
  console.error("LOGIN_FAIL", login.error.message);
  process.exit(1);
}

const { data: rows, error } = await supabase
  .from("campus_events")
  .select("id,title,tag,category,zone,location,capacity,match_score,match_breakdown");

if (error) {
  console.error("LOAD_FAIL", error.message);
  process.exit(1);
}

let updated = 0;
for (const row of rows || []) {
  const scoreNum = Number(String(row.match_score || "").replace("%", ""));
  const needs =
    row.match_score == null ||
    row.match_score === "" ||
    row.match_score === "—" ||
    row.match_score === "0%" ||
    !Number.isFinite(scoreNum) ||
    scoreNum <= 0 ||
    !row.match_breakdown ||
    Object.keys(row.match_breakdown || {}).length === 0;

  if (!needs) continue;

  const baseline = buildBaseline(row);
  const { error: upErr } = await supabase
    .from("campus_events")
    .update(baseline)
    .eq("id", row.id);

  if (upErr) {
    console.error("UPDATE_FAIL", row.id, upErr.message);
  } else {
    updated += 1;
    console.log("UPDATED", row.id, row.title, baseline.match_score);
  }
}

console.log("BACKFILL_DONE", { total: (rows || []).length, updated });
await supabase.auth.signOut();
