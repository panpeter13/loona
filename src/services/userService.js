const supabase = require("../database/supabase");
const hashUserId = require("../utils/hashUser");
const { legacyHashUserId } = hashUserId;
const logger = require("../utils/logger");

const HEALTH_CONSENT_NOTIFICATION = "health_data_consent";

async function attachHealthDataConsent(user) {
  if (!user || user.health_data_consent_at !== undefined) return user;

  const { data, error } = await supabase
    .from("notifications")
    .select("created_at")
    .eq("user_id", user.id)
    .eq("type", HEALTH_CONSENT_NOTIFICATION)
    .maybeSingle();

  if (error) {
    logger.error("Ошибка проверки согласия", error);
    return { ...user, health_data_consent_at: null };
  }

  return { ...user, health_data_consent_at: data?.created_at || null };
}

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
        return attachHealthDataConsent(existingUser);
      }

      return attachHealthDataConsent(updatedUser);
    }

    return attachHealthDataConsent(existingUser);
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

  return attachHealthDataConsent(newUser);
}

async function getOrCreateKakaoUser(kakaoUserId) {
  const identity = `kakao:${kakaoUserId}`;
  const { user: existingUser, userHash, error: selectError } = await findAndMigrateUser(identity);

  if (selectError) {
    logger.error("Ошибка поиска пользователя Kakao", selectError);
    return null;
  }

  if (existingUser) {
    const user = await attachHealthDataConsent(existingUser);
    return { ...user, _isNew: false };
  }

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

  const user = await attachHealthDataConsent(newUser);
  return { ...user, _isNew: true };
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
  const result = await supabase
    .from("users")
    .update({ health_data_consent_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  const missingConsentColumn =
    result.error?.code === "42703" ||
    (result.error?.code === "PGRST204" &&
      result.error.message?.includes("health_data_consent_at"));

  if (!result.error || !missingConsentColumn) return result;

  // Compatibility fallback for deployments where the consent migration has
  // not been applied yet. The existing unique (user_id, type) constraint makes
  // this durable and idempotent.
  return supabase
    .from("notifications")
    .upsert(
      { user_id: userId, type: HEALTH_CONSENT_NOTIFICATION },
      { onConflict: "user_id,type", ignoreDuplicates: true },
    )
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
