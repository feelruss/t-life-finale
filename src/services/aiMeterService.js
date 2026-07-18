import { supabase } from "../libs/supabase";
import { buildRecommendationFromScores } from "../data/db";

/**
 * ai_meter_history stores each Focus/Wellness snapshot + AI advice per user.
 * Columns (from schema): user_id, mode, focus_score, balance_score, ai_recommendation, created_at
 */
export async function saveAIMeterHistory({
  userId,
  mode = "focus",
  focusScore = 50,
  balanceScore = 50,
  recommendation = "",
}) {
  if (!userId || userId === "guest") {
    return { saved: false, reason: "guest" };
  }

  const { data, error } = await supabase
    .from("ai_meter_history")
    .insert({
      user_id: userId,
      mode: String(mode || "focus").toLowerCase(),
      focus_score: Math.round(Number(focusScore) || 0),
      balance_score: Math.round(Number(balanceScore) || 0),
      ai_recommendation: recommendation || null,
    })
    .select("id, created_at")
    .maybeSingle();

  if (error) {
    console.error("Failed to save ai_meter_history:", error.message);
    return { saved: false, reason: error.message };
  }

  return { saved: true, row: data };
}

export async function fetchLatestAIMeterHistory(userId) {
  if (!userId || userId === "guest") return null;

  const { data, error } = await supabase
    .from("ai_meter_history")
    .select("mode, focus_score, balance_score, ai_recommendation, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load ai_meter_history:", error.message);
    return null;
  }

  return data;
}

/**
 * Full AI recommendation via Groq. Falls back to local rule engine if key/API fails.
 */
export async function generateAIRecommendation({
  mode = "focus",
  focusScore = 50,
  balanceScore = 50,
  displayName = "Student",
  recentActivities = [],
}) {
  const fallback = buildRecommendationFromScores({
    focusScore,
    balanceScore,
    mode,
  });

  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    return { recommendation: fallback, source: "rules" };
  }

  const activitiesList = Array.isArray(recentActivities)
    ? recentActivities.filter(Boolean).slice(0, 5).join("; ")
    : "None";

  const prompt = `You are Taylor's Nexus AI wellness coach for university students.
Student: ${displayName}
Current mode: ${mode === "balance" ? "Balance (wellness)" : "Focus (academic)"}
Focus score: ${focusScore}/100
Wellness score: ${balanceScore}/100
Recent activity: ${activitiesList || "None"}

Write ONE personalized recommendation (2 short sentences max).
Be practical and encouraging. Mention whether they should lean Focus or Balance next.
Vary the wording so it feels freshly generated, not a template.
Do not use markdown or bullet points.`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.75,
        max_tokens: 140,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || "Groq recommendation failed");
    }

    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty recommendation");

    return { recommendation: content, source: "groq" };
  } catch (error) {
    console.warn("AI recommendation fallback to rules:", error);
    return { recommendation: fallback, source: "rules" };
  }
}
