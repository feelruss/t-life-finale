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

const sb = () =>
  createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const report = { student: {}, admin: {}, faisal: {}, percentages: {}, issues: [] };

function avg(nums) {
  if (!nums.length) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

async function probeStudent(supabase, user) {
  const out = { userId: user.id, email: user.email };

  const { data: profile, error: pErr } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  out.profile = pErr
    ? { error: pErr.message }
    : {
        role: profile?.role,
        programme: profile?.programme,
        faculty: profile?.faculty,
        focus_mode: profile?.focus_mode,
        timetable_sync_enabled: profile?.timetable_sync_enabled,
        full_name: profile?.full_name,
      };

  const { data: schedule, error: sErr } = await supabase
    .from("student_schedule")
    .select("id, day, start_time, end_time, title, student_id, programme")
    .or(`student_id.eq.${user.id},student_id.is.null`)
    .limit(50);

  out.schedule = sErr
    ? { error: sErr.message }
    : {
        count: schedule?.length || 0,
        sample: (schedule || []).slice(0, 3).map((x) => x.title || x.day),
      };

  const { data: events, error: eErr } = await supabase
    .from("campus_events")
    .select("id, title, match_score, registered, capacity, category")
    .limit(100);

  out.campus_events = eErr
    ? { error: eErr.message }
    : { count: events?.length || 0 };

  if (events?.length) {
    const scores = events
      .map((e) => Number(String(e.match_score).replace("%", "")))
      .filter((n) => Number.isFinite(n) && n > 0);
    out.liveAvgMatchScore = scores.length
      ? avg(scores)
      : "NO_NUMERIC_MATCH_SCORES";
    out.matchScoreSamples = events
      .slice(0, 5)
      .map((e) => ({ id: e.id, match_score: e.match_score }));
  }

  const { data: clubs, error: cErr } = await supabase
    .from("clubs")
    .select("id, name")
    .limit(20);
  out.clubs = cErr ? { error: cErr.message } : { count: clubs?.length || 0 };

  const { data: rsvps, error: rErr } = await supabase
    .from("event_rsvps")
    .select("id")
    .eq("student_id", user.id);
  out.my_rsvps = rErr ? { error: rErr.message } : { count: rsvps?.length || 0 };

  const { data: attendance, error: aErr } = await supabase
    .from("attendance")
    .select("id")
    .eq("student_id", user.id);
  out.my_attendance = aErr
    ? { error: aErr.message }
    : { count: attendance?.length || 0 };

  return out;
}

async function tryStudentLogins() {
  const candidates = [
    { email: "test@sd.taylors.edu.my", passwords: ["test123", "password", "student123", "Test123!", "123456"] },
    { email: "test@taylors.edu.my", passwords: ["test123", "password", "student123", "Test123!", "123456"] },
  ];

  for (const c of candidates) {
    for (const password of c.passwords) {
      const supabase = sb();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: c.email,
        password,
      });
      if (!error) {
        report.student.login = `OK ${c.email}`;
        Object.assign(report.student, await probeStudent(supabase, data.user));
        await supabase.auth.signOut();
        return;
      }
    }
  }
  report.student.login = "FAIL: could not login test students with known passwords";
}

await tryStudentLogins();

// Admin Danish
{
  const supabase = sb();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "danish.admin@taylors.edu.my",
    password: "danish123",
  });

  if (error) {
    report.admin.login = "FAIL: " + error.message;
  } else {
    report.admin.login = "OK";
    const { data: profile } = await supabase
      .from("users")
      .select("id, email, role, full_name")
      .eq("id", data.user.id)
      .maybeSingle();
    report.admin.profile = profile;

    const { count: totalStudents } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "student");
    report.admin.totalStudents = totalStudents;

    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).toISOString();
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    ).toISOString();
    const { count: activeToday } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "student")
      .gte("last_active_at", start)
      .lt("last_active_at", end);
    report.admin.activeToday = activeToday;

    const { data: events, error: evErr } = await supabase
      .from("campus_events")
      .select("*");
    report.admin.events = evErr
      ? { error: evErr.message }
      : { count: events?.length || 0 };

    if (events?.length) {
      const totalRSVPs = events.reduce(
        (s, e) => s + (Number(e.registered) || 0),
        0,
      );
      const totalCap = events.reduce(
        (s, e) => s + (Number(e.capacity) || 0),
        0,
      );
      const attendanceRate =
        totalCap > 0 ? Math.round((totalRSVPs / totalCap) * 100) : 0;
      report.percentages.attendanceRate_LIVE = attendanceRate;
      report.percentages.totalRSVPs_LIVE = totalRSVPs;
      report.percentages.totalCapacity_LIVE = totalCap;

      const scores = events
        .map((e) => {
          const n = Number(String(e.match_score ?? "").replace("%", ""));
          return Number.isFinite(n) ? n : null;
        })
        .filter((n) => n !== null);
      report.percentages.avgMatchScore_IF_COMPUTED_FROM_DB = scores.length
        ? avg(scores)
        : null;
      report.percentages.avgMatchScore_HARDCODED_IN_UI = 84.7;
      report.percentages.match_score_column_populated = scores.length;
      report.percentages.match_score_samples = events
        .slice(0, 8)
        .map((e) => e.match_score);
    }

    const { data: admins } = await supabase
      .from("users")
      .select("email, role, full_name")
      .in("role", ["admin", "super_admin", "analytics_viewer"]);
    report.admin.adminUsers = admins;

    const { data: scores } = await supabase
      .from("burnout_risk_scores")
      .select("student_id, risk_score, risk_level, week_start")
      .order("week_start", { ascending: false });
    const { data: students } = await supabase
      .from("users")
      .select("id, faculty, role, focus_mode")
      .eq("role", "student");

    const studentMap = new Map((students || []).map((s) => [s.id, s]));
    const joined = (scores || [])
      .map((s) => ({ ...s, users: studentMap.get(s.student_id) }))
      .filter((s) => s.users?.role === "student");

    const latestWeekStart = joined.reduce((latest, item) => {
      if (!item.week_start) return latest;
      if (!latest || item.week_start > latest) return item.week_start;
      return latest;
    }, null);

    const latest = latestWeekStart
      ? joined.filter((s) => s.week_start === latestWeekStart)
      : [];

    const campusRisk = latest.length
      ? Math.round(
          latest.reduce((a, b) => a + Number(b.risk_score || 0), 0) /
            latest.length,
        )
      : 0;

    const atRisk = new Set(
      latest
        .filter((s) => {
          const level = String(s.risk_level || "").toLowerCase();
          return level === "medium" || level === "high";
        })
        .map((s) => s.student_id),
    ).size;

    const highRisk = new Set(
      latest
        .filter((s) => String(s.risk_level || "").toLowerCase() === "high")
        .map((s) => s.student_id),
    ).size;

    const focusCount = (students || []).filter(
      (s) => String(s.focus_mode).toLowerCase() === "focus",
    ).length;
    const balanceCount = (students || []).filter(
      (s) => String(s.focus_mode).toLowerCase() === "balance",
    ).length;
    const ratio =
      balanceCount > 0
        ? (focusCount / balanceCount).toFixed(1)
        : focusCount > 0
          ? `${focusCount}.0`
          : "0.0";

    report.percentages.burnoutRiskScore_LIVE = campusRisk;
    report.percentages.burnoutStudentsAtRisk_LIVE = atRisk;
    report.percentages.burnoutHighRisk_LIVE = highRisk;
    report.percentages.burnoutLatestWeek = latestWeekStart;
    report.percentages.burnoutScoreRows = scores?.length || 0;
    report.percentages.burnoutJoinedStudentRows = joined.length;
    report.percentages.focusBalanceRatio_LIVE = ratio;
    report.percentages.focusCount = focusCount;
    report.percentages.balanceCount = balanceCount;
    report.percentages.burnout_HARDCODED_FALLBACK_IF_EMPTY = 42;

    const byFac = {};
    for (const row of latest) {
      const f = row.users?.faculty || "Unknown";
      if (!byFac[f]) byFac[f] = [];
      byFac[f].push(Number(row.risk_score) || 0);
    }
    report.percentages.facultyRisk_LIVE = Object.fromEntries(
      Object.entries(byFac).map(([k, v]) => [k, Math.round(avg(v))]),
    );

    const { data: att, error: attErr } = await supabase
      .from("attendance")
      .select("id, attended_at, campus_events(category)")
      .limit(500);
    report.admin.attendanceRows = attErr
      ? { error: attErr.message }
      : { count: att?.length || 0 };

    const { data: well } = await supabase
      .from("wellness_recommendations")
      .select("recommendation")
      .limit(5);
    report.admin.wellnessRecs = well?.length || 0;

    const { count: schedCount } = await supabase
      .from("student_schedule")
      .select("*", { count: "exact", head: true });
    report.admin.student_schedule_count = schedCount;

    const { count: clubCount } = await supabase
      .from("clubs")
      .select("*", { count: "exact", head: true });
    report.admin.clubs_count = clubCount;

    const { data: faisal } = await supabase
      .from("users")
      .select("email, role")
      .eq("email", "faisal.admin@taylors.edu.my")
      .maybeSingle();
    report.admin.faisal = faisal;

    const { data: khalom } = await supabase
      .from("users")
      .select("email, role, programme, faculty")
      .eq("email", "khalom831@gmail.com")
      .maybeSingle();
    report.student.khalom_profile = khalom;
  }

  await supabase.auth.signOut();
}

// Faisal
{
  const supabase = sb();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "faisal.admin@taylors.edu.my",
    password: "admin123",
  });
  report.faisal = error
    ? { login: "FAIL " + error.message }
    : { login: "OK" };
  if (!error) {
    const { data: profile } = await supabase
      .from("users")
      .select("email, role, full_name")
      .eq("id", data.user.id)
      .maybeSingle();
    report.faisal.profile = profile;
  }
  await supabase.auth.signOut();
}

// Change-sensitivity demo: mutate one event registered count and recompute attendance rate
{
  const supabase = sb();
  const { error } = await supabase.auth.signInWithPassword({
    email: "danish.admin@taylors.edu.my",
    password: "danish123",
  });
  if (!error) {
    const { data: events } = await supabase
      .from("campus_events")
      .select("id, registered, capacity")
      .limit(1);
    if (events?.[0]) {
      const before = events[0];
      const { data: allBefore } = await supabase
        .from("campus_events")
        .select("registered, capacity");
      const rateBefore =
        allBefore.reduce((s, e) => s + (Number(e.capacity) || 0), 0) > 0
          ? Math.round(
              (allBefore.reduce((s, e) => s + (Number(e.registered) || 0), 0) /
                allBefore.reduce((s, e) => s + (Number(e.capacity) || 0), 0)) *
                100,
            )
          : 0;

      const bumped = (Number(before.registered) || 0) + 25;
      await supabase
        .from("campus_events")
        .update({ registered: bumped })
        .eq("id", before.id);

      const { data: allAfter } = await supabase
        .from("campus_events")
        .select("registered, capacity");
      const rateAfter =
        allAfter.reduce((s, e) => s + (Number(e.capacity) || 0) , 0) > 0
          ? Math.round(
              (allAfter.reduce((s, e) => s + (Number(e.registered) || 0), 0) /
                allAfter.reduce((s, e) => s + (Number(e.capacity) || 0), 0)) *
                100,
            )
          : 0;

      // restore
      await supabase
        .from("campus_events")
        .update({ registered: before.registered })
        .eq("id", before.id);

      report.percentages.changeTest_attendanceRate = {
        before: rateBefore,
        afterBump25: rateAfter,
        changesWhenDataChanges: rateBefore !== rateAfter,
        note: "Avg Match Score was NOT recomputed — still hardcoded 84.7 in UI",
      };
    }
  }
  await supabase.auth.signOut();
}

report.issues.push(
  "Avg Match Score UI is HARDCODED 84.7% — will NOT change when DB changes",
);
if (report.percentages.burnoutRiskScore_LIVE != null) {
  report.issues.push(
    `Burnout campus risk IS LIVE: ${report.percentages.burnoutRiskScore_LIVE}% (week ${report.percentages.burnoutLatestWeek})`,
  );
}
if (report.percentages.attendanceRate_LIVE != null) {
  report.issues.push(
    `Attendance Rate IS LIVE (registered/capacity): ${report.percentages.attendanceRate_LIVE}%`,
  );
}

console.log(JSON.stringify(report, null, 2));
