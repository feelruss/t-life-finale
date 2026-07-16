import { supabase } from "../components/GoogleLogin";

const DEFAULT_CLUB_GRADIENT = "from-slate-600 to-slate-800";
const DEFAULT_CLUB_LOGO = "🏫";

function mapClubEvent(event) {
  return {
    id: event.id,
    title: event.title,
    date: event.event_date,
    time: event.event_time,
    place: event.location,
  };
}

function mapClub(club) {
  return {
    id: club.id,
    name: club.name,
    category: club.category,
    description: club.description || "",
    logo: club.logo || DEFAULT_CLUB_LOGO,
    bg: club.background_gradient || DEFAULT_CLUB_GRADIENT,
    members: club.member_count || 0,
    meetingDay: club.meeting_day,
    meetingTime: club.meeting_time,
    meetingLocation: club.meeting_location,
    frequency: club.meeting_frequency,
    contact: club.contact_email,
    upcomingEvents: (club.club_events || [])
      .map(mapClubEvent)
      .sort((a, b) => new Date(a.date) - new Date(b.date)),
  };
}

export async function fetchActiveClubs() {
  const { data, error } = await supabase
    .from("clubs")
    .select(`
      id,
      name,
      category,
      description,
      logo,
      background_gradient,
      meeting_day,
      meeting_time,
      meeting_location,
      meeting_frequency,
      contact_email,
      member_count,
      is_active,
      club_events (
        id,
        title,
        event_date,
        event_time,
        location
      )
    `)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapClub);
}

export async function fetchCurrentStudentClubIds() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return [];

  const { data, error } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("student_id", user.id);

  if (error) throw error;
  return (data || []).map((membership) => membership.club_id);
}

async function requireCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("Please sign in before joining a club.");
  return user;
}

export async function joinClub(clubId) {
  const user = await requireCurrentUser();
  const { error } = await supabase.from("club_members").insert({
    club_id: clubId,
    student_id: user.id,
  });

  // PostgreSQL unique violation means the student is already joined.
  if (error && error.code !== "23505") throw error;
}

export async function leaveClub(clubId) {
  const user = await requireCurrentUser();
  const { error } = await supabase
    .from("club_members")
    .delete()
    .eq("club_id", clubId)
    .eq("student_id", user.id);

  if (error) throw error;
}
