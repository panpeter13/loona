const supabase = require("../database/supabase");

let databaseWasHealthy = true;

async function notifyAdmin(bot, message) {
  const adminId = process.env.ADMIN_TELEGRAM_ID || process.env.ADMIN_ID;
  if (!adminId) return;

  try {
    await bot.telegram.sendMessage(adminId, message);
  } catch (error) {
    console.error("Не удалось отправить системное уведомление:", error);
  }
}

async function runHealthCheck(bot) {
  const { error } = await supabase
    .from("users")
    .select("id", { head: true })
    .limit(1);

  if (error) {
    console.error("Supabase health check failed:", error);

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

module.exports = { runHealthCheck };
