// src/database/dbService.js
const supabase = require("./supabase");
const hashUserId = require("../../hashUser");

async function getOrCreateUser(telegramId) {
  const userHash = hashUserId(telegramId);
  const { data: existingUser, error: selectError } = await supabase
    .from("users")
    .select("*")
    .eq("user_hash", userHash)
    .maybeSingle();

  if (selectError) {
    console.error("Ошибка поиска пользователя:", selectError);
    return null;
  }
  if (existingUser) return existingUser;

  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({ user_hash: userHash })
    .select()
    .single();

  if (insertError) {
    console.error("Ошибка создания пользователя:", insertError);
    return null;
  }
  return newUser;
}

async function getLastCycle(userId) {
  return await supabase
    .from("cycles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

async function getOpenCycle(userId) {
  return await supabase
    .from("cycles")
    .select("*")
    .eq("user_id", userId)
    .is("period_end", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

async function createCycle(userId, date, defaultCycle = 28, defaultPeriod = 5) {
  return await supabase.from("cycles").insert({
    user_id: userId,
    period_start: date,
    period_end: null,
    cycle_length: defaultCycle,
    period_length: defaultPeriod,
  });
}

async function closeCycle(cycleId, date) {
  return await supabase
    .from("cycles")
    .update({ period_end: date })
    .eq("id", cycleId);
}

async function deleteCycle(cycleId) {
  return await supabase.from("cycles").delete().eq("id", cycleId);
}

async function updateCycleEnd(cycleId, date) {
  return await supabase
    .from("cycles")
    .update({ period_end: date })
    .eq("id", cycleId);
}

async function getUserDataExport(userId) {
  const cycles = await supabase
    .from("cycles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const symptoms = await supabase
    .from("symptoms")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  return {
    cycles: cycles.data || [],
    symptoms: symptoms.data || [],
    error: cycles.error || symptoms.error,
  };
}

module.exports = {
  getOrCreateUser,
  getLastCycle,
  getOpenCycle,
  createCycle,
  closeCycle,
  deleteCycle,
  updateCycleEnd,
  getUserDataExport,
};
