const supabase = require("../database/supabase");

async function getLastCycle(userId) {
  const { data, error } = await supabase
    .from("cycles")
    .select("*")
    .eq("user_id", userId)
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data, error };
}

async function getOpenCycle(userId) {
  const { data, error } = await supabase
    .from("cycles")
    .select("*")
    .eq("user_id", userId)
    .is("period_end", null)
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data, error };
}

async function getCycleByStart(userId, date) {
  const { data, error } = await supabase
    .from("cycles")
    .select("*")
    .eq("user_id", userId)
    .eq("period_start", date)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return { data, error };
}

async function createCycle(user, date) {
  const existing = await getCycleByStart(user.id, date);
  if (existing.error) return existing;
  if (existing.data) return { data: existing.data, error: null, duplicate: true };

  const result = await supabase.from("cycles").insert({
    user_id: user.id,
    period_start: date,
    period_end: null,
    cycle_length: user.cycle_length || 28,
    period_length: user.period_length || 5,
  }).select().single();
  return { ...result, duplicate: false };
}

async function closeCycle(cycleId, date) {
  return supabase
    .from("cycles")
    .update({
      period_end: date,
    })
    .eq("id", cycleId);
}

async function deleteCycle(cycleId) {
  return supabase.from("cycles").delete().eq("id", cycleId);
}

async function reopenCycle(cycleId) {
  return supabase
    .from("cycles")
    .update({
      period_end: null,
    })
    .eq("id", cycleId);
}
async function getUserCycles(userId) {
  return await supabase
    .from("cycles")
    .select("*")
    .eq("user_id", userId)
    .order("period_start", { ascending: true });
}

module.exports = {
  getLastCycle,
  getOpenCycle,
  getCycleByStart,
  createCycle,
  closeCycle,
  deleteCycle,
  reopenCycle,
  getUserCycles,
};
