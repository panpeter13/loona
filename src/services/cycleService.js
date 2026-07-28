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

async function createCycle(user, date) {
  return supabase.from("cycles").insert({
    user_id: user.id,
    period_start: date,
    period_end: null,
    cycle_length: user.cycle_length || 28,
    period_length: user.period_length || 5,
  });
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
  createCycle,
  closeCycle,
  deleteCycle,
  reopenCycle,
  getUserCycles,
};
