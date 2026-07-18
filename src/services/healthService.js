const supabase = require("../database/supabase");
const logger = require("../utils/logger");

let databaseWasHealthy = true;

async function notifyAdmin(bot, message) {
  const adminId = process.env.ADMIN_TELEGRAM_ID || process.env.ADMIN_ID;
  if (!adminId) return;

  try {
    await bot.telegram.sendMessage(adminId, message);
  } catch (error) {
    logger.error("Не удалось отправить системное уведомление", error);
  }
}

async function getDatabaseHealth() {
  const startedAt = Date.now();
  const { error } = await supabase
    .from("users")
    .select("id", { head: true })
    .limit(1);

  return {
    ok: !error,
    latencyMs: Date.now() - startedAt,
    error: error || null,
  };
}

async function runHealthCheck(bot) {
  const health = await getDatabaseHealth();
  const { error } = health;

  if (error) {
    logger.error("Supabase health check failed", error);

    if (databaseWasHealthy) {
      databaseWasHealthy = false;
      await notifyAdmin(bot, `🚨 LOONA: Supabase недоступен\n${error.message}`);
    }

    return false;
  }

  if (!databaseWasHealthy) {
    databaseWasHealthy = true;
    await notifyAdmin(bot, "✅ LOONA: соединение с Supabase восстановлено");
  }

  return true;
}

module.exports = { runHealthCheck, getDatabaseHealth };
