const supabase = require("../database/supabase");
const hashUserId = require("../utils/hashUser");

async function getOrCreateUser(telegramId) {
  const userHash = hashUserId(telegramId);

  const { data: existingUser, error: selectError } = await supabase
    .from("users")
    .select("*")
    .eq("user_hash", userHash)
    .maybeSingle();

  if (selectError) {
    console.log("Ошибка поиска пользователя:", selectError);
    return null;
  }

  if (existingUser) {
    return existingUser;
  }

  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({
      user_hash: userHash,
      language: "ru",
      cycle_length: 28,
      period_length: 5,
    })
    .select()
    .single();

  if (insertError) {
    console.log("Ошибка создания пользователя:", insertError);
    return null;
  }

  return newUser;
}

async function updateCycleLength(userId, value) {
  return supabase
    .from("users")
    .update({
      cycle_length: value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

async function updatePeriodLength(userId, value) {
  return supabase
    .from("users")
    .update({
      period_length: value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

module.exports = {
  getOrCreateUser,
  updateCycleLength,
  updatePeriodLength,
};
