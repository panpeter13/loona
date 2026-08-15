const supabase = require("../database/supabase");
const hashUserId = require("../utils/hashUser");
const { legacyHashUserId } = hashUserId;
const logger = require("../utils/logger");

async function findAndMigrateUser(identity) {
  const userHash = hashUserId(identity);
  const { data: current, error: currentError } = await supabase
    .from("users").select("*").eq("user_hash", userHash).maybeSingle();
  if (currentError) return { error: currentError };
  if (current) return { user: current, userHash };

  const legacyHash = legacyHashUserId(identity);
  const { data: legacy, error: legacyError } = await supabase
    .from("users").select("*").eq("user_hash", legacyHash).maybeSingle();
  if (legacyError || !legacy) return { error: legacyError, userHash };

  const { data: migrated, error: migrationError } = await supabase
    .from("users").update({ user_hash: userHash }).eq("id", legacy.id).select().single();
  if (migrationError) return { error: migrationError };
  return { user: migrated, userHash };
}

async function getOrCreateUser(telegramId) {
  const { user: existingUser, userHash, error: selectError } = await findAndMigrateUser(telegramId);

  if (selectError) {
    logger.error("Ошибка поиска пользователя", selectError);
    return null;
  }

  if (existingUser) {
    if (!existingUser.telegram_id) {
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          telegram_id: telegramId,
        })
        .eq("id", existingUser.id)
        .select()
        .single();

      if (updateError) {
        logger.error("Ошибка обновления telegram_id", updateError);
        return existingUser;
      }

      return updatedUser;
    }

    return existingUser;
  }

  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({
      user_hash: userHash,
      telegram_id: telegramId,
      platform: "telegram",
      language: "ru",
      cycle_length: 28,
      period_length: 5,
    })
    .select()
    .single();

  if (insertError) {
    logger.error("Ошибка создания пользователя", insertError);
    return null;
  }

  return newUser;
}

async function getOrCreateKakaoUser(kakaoUserId) {
  const identity = `kakao:${kakaoUserId}`;
  const { user: existingUser, userHash, error: selectError } = await findAndMigrateUser(identity);

  if (selectError) {
    logger.error("Ошибка поиска пользователя Kakao", selectError);
    return null;
  }

  if (existingUser) return { ...existingUser, _isNew: false };

  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({
      user_hash: userHash,
      platform: "kakao",
      language: "select",
      timezone: "Asia/Seoul",
      cycle_length: 28,
      period_length: 5,
    })
    .select()
    .single();

  if (insertError) {
    logger.error("Ошибка создания пользователя Kakao", insertError);
    return null;
  }

  return { ...newUser, _isNew: true };
}

async function updateCycleLength(userId, value) {
  return supabase
    .from("users")
    .update({ cycle_length: value })
    .eq("id", userId);
}

async function updatePeriodLength(userId, value) {
  return supabase
    .from("users")
    .update({ period_length: value })
    .eq("id", userId);
}

async function updateLanguage(userId, language) {
  return supabase.from("users").update({ language }).eq("id", userId);
}

async function recordHealthDataConsent(userId) {
  return supabase
    .from("users")
    .update({ health_data_consent_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();
}

module.exports = {
  getOrCreateUser,
  getOrCreateKakaoUser,
  updateCycleLength,
  updatePeriodLength,
  updateLanguage,
  recordHealthDataConsent,
};
