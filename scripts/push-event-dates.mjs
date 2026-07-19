/**
 * Move past campus_events (and club_events) into the near future
 * so Home + Schedule stay aligned for demos.
 */
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

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(iso, days) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const today = todayISO();
let updated = 0;

async function shiftTable(table) {
  const { data, error } = await supabase
    .from(table)
    .select("id,title,event_date");
  if (error) {
    console.error(`LOAD_FAIL ${table}`, error.message);
    return;
  }

  let i = 0;
  for (const row of data || []) {
    const date = String(row.event_date || "").slice(0, 10);
    if (!date || date >= today) continue;
    // Spread across the next ~4 weeks so Schedule weeks stay populated
    const next = addDays(today, 1 + (i % 28));
    i += 1;
    const { error: upErr } = await supabase
      .from(table)
      .update({ event_date: next })
      .eq("id", row.id);
    if (upErr) {
      console.error("UPDATE_FAIL", table, row.id, upErr.message);
    } else {
      updated += 1;
      console.log("UPDATED", table, row.title || row.id, date, "→", next);
    }
  }
}

await shiftTable("campus_events");
await shiftTable("club_events");

console.log("DATE_PUSH_DONE", { today, updated });
await supabase.auth.signOut();
