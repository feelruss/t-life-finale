import { supabase } from "../libs/supabase";

export async function createStudentActivity({
  studentId,
  type = "general",
  title,
  detail = "",
  entityType = null,
  entityId = null,
  metadata = {},
}) {
  if (!studentId || studentId === "guest" || !title) return null;

  const { data, error } = await supabase
    .from("student_activity_logs")
    .insert({
      student_id: studentId,
      activity_type: type,
      title,
      detail,
      entity_type: entityType,
      entity_id: entityId == null ? null : String(entityId),
      metadata,
    })
    .select("id, student_id, activity_type, title, detail, entity_type, entity_id, metadata, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function fetchStudentActivity(studentId, limit = 5) {
  if (!studentId || studentId === "guest") return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 50);

  const { data, error } = await supabase
    .from("student_activity_logs")
    .select("id, student_id, activity_type, title, detail, entity_type, entity_id, metadata, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    type: row.activity_type,
    title: row.title,
    detail: row.detail || "",
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata || {},
    timestamp: row.created_at,
  }));
}
