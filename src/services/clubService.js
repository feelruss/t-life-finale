import { supabase } from "../libs/supabase";
import { createStudentActivity } from "./studentActivityService";

const DEFAULT_CLUB_GRADIENT = "from-slate-600 to-slate-800";
const DEFAULT_CLUB_LOGO = "🏫";

async function requireCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error("Please sign in before changing club membership.");
  return user;
}

async function getClubName(clubId) {
  const { data } = await supabase.from("clubs").select("name").eq("id", clubId).maybeSingle();
  return data?.name || "Club";
}

function mapClub(club) {
  return {
    id: club.id,
    name: club.name,
    category: club.category,
    description: club.description || "",
    logo: club.logo || DEFAULT_CLUB_LOGO,
    bg: club.background_gradient || DEFAULT_CLUB_GRADIENT,
    members: Array.isArray(club.club_members) ? club.club_members.length : 0,
    meetingDay: club.meeting_day,
    meetingTime: club.meeting_time,
    meetingLocation: club.meeting_location,
    frequency: club.meeting_frequency,
    contact: club.contact_email,
    upcomingEvents: (club.campus_events || []).map((event) => ({
      id: event.id,
      title: event.title,
      date: event.event_date,
      time: event.event_time,
      place: event.location,
    })).sort((a, b) => new Date(a.date) - new Date(b.date)),
  };
}

export async function fetchActiveClubs() {
  const { data, error } = await supabase
    .from("clubs")
    .select(`
      id, name, category, description, logo, background_gradient,
      meeting_day, meeting_time, meeting_location, meeting_frequency,
      contact_email, is_active,
      club_members(id),
      campus_events(id, title, event_date, event_time, location)
    `)
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapClub);
}

export async function fetchCurrentStudentClubIds() {
  const user = await requireCurrentUser().catch(() => null);
  if (!user) return [];
  const { data, error } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("student_id", user.id);
  if (error) throw error;
  return (data || []).map((row) => row.club_id);
}

export async function joinClub(clubId) {
  const user = await requireCurrentUser();
  const numericClubId = Number(clubId);
  const clubName = await getClubName(numericClubId);
  const { error } = await supabase
    .from("club_members")
    .upsert({ club_id: numericClubId, student_id: user.id }, { onConflict: "club_id,student_id" });
  if (error) throw error;
  const { count } = await supabase
    .from("club_members")
    .select("*", { count: "exact", head: true })
    .eq("club_id", numericClubId);
  await createStudentActivity({
    studentId: user.id,
    type: "club-join",
    title: `Joined club: ${clubName}`,
    detail: "You joined this club and can now receive its member updates.",
    entityType: "club",
    entityId: numericClubId,
    metadata: { clubName, membershipStatus: "joined" },
  });
  return { studentId: user.id, clubId: numericClubId, clubName, joined: true, memberCount: count || 0 };
}

export async function leaveClub(clubId) {
  const user = await requireCurrentUser();
  const numericClubId = Number(clubId);
  const clubName = await getClubName(numericClubId);
  const { error } = await supabase
    .from("club_members")
    .delete()
    .eq("club_id", numericClubId)
    .eq("student_id", user.id);
  if (error) throw error;
  const { count } = await supabase
    .from("club_members")
    .select("*", { count: "exact", head: true })
    .eq("club_id", numericClubId);
  await createStudentActivity({
    studentId: user.id,
    type: "club-leave",
    title: `Left club: ${clubName}`,
    detail: "You left this club and will no longer receive its member updates.",
    entityType: "club",
    entityId: numericClubId,
    metadata: { clubName, membershipStatus: "left" },
  });
  return { studentId: user.id, clubId: numericClubId, clubName, joined: false, memberCount: count || 0 };
}
