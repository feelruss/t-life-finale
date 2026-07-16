import { supabase } from "../components/GoogleLogin";

export async function replaceWellnessRecommendations(recommendations) {
  const rows = recommendations.map((recommendation, index) => ({
    recommendation,
    priority: index < 2 ? "High" : "Medium",
  }));

  const { error: deleteError } = await supabase
    .from("wellness_recommendations")
    .delete()
    .not("id", "is", null);

  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase
    .from("wellness_recommendations")
    .insert(rows);

  if (insertError) throw insertError;

  return rows;
}