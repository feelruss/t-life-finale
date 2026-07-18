// src/services/studentActivityService.js
import { supabase } from "../libs/supabase";

export async function createStudentActivity({
  studentId,
  type,
  title,
  detail = null,
  entityType = null,
  entityId = null,
  metadata = {},
}) {
  if (!studentId) {
    throw new Error("Student ID is required.");
  }

  if (!type) {
    throw new Error("Activity type is required.");
  }

  if (!title) {
    throw new Error("Activity title is required.");
  }

  const { data, error } = await supabase
    .from("student_activity_logs")
    .insert({
      student_id: studentId,
      activity_type: type,
      title,
      detail,
      entity_type: entityType,
      entity_id:
        entityId !== null && entityId !== undefined
          ? String(entityId)
          : null,
      metadata: metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error(
      "Unable to create student activity:",
      error,
    );

    throw error;
  }

  return {
    id: data.id,
    studentId: data.student_id,
    type: data.activity_type,
    title: data.title,
    detail: data.detail,
    entityType: data.entity_type,
    entityId: data.entity_id,
    metadata: data.metadata || {},
    timestamp: data.created_at,
  };
}

export async function fetchStudentActivity(
  studentId,
  limit = 5,
) {
  if (!studentId) {
    return [];
  }

  const safeLimit = Math.max(1, Number(limit) || 5);

  const { data, error } = await supabase
    .from("student_activity_logs")
    .select(`
      id,
      student_id,
      activity_type,
      title,
      detail,
      entity_type,
      entity_id,
      metadata,
      created_at
    `)
    .eq("student_id", studentId)
    .order("created_at", {
      ascending: false,
    })
    .limit(safeLimit);

  if (error) {
    console.error(
      "Unable to load student activity:",
      error,
    );

    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    studentId: row.student_id,
    type: row.activity_type,
    title: row.title,
    detail: row.detail,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata || {},
    timestamp: row.created_at,
  }));
}