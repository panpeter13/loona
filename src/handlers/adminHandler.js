const {
  getLatestFeedback,
  updateFeedbackStatus,
} = require("../services/feedbackService");
const { getDatabaseHealth } = require("../services/healthService");
const packageInfo = require("../../package.json");
const { getGrowthSummary } = require("../services/analyticsService");

function isAdmin(ctx) {
  const adminId = process.env.ADMIN_TELEGRAM_ID || process.env.ADMIN_ID;
  return String(ctx.from.id) === String(adminId);
}

function registerAdminHandler(bot) {
  bot.command("status", async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply("Команда недоступна.");
    }

    const database = await getDatabaseHealth();
    let telegramOk = false;

    try {
      telegramOk = Boolean(await bot.telegram.getMe());
    } catch {
      telegramOk = false;
    }

    const uptimeSeconds = Math.floor(process.uptime());
    const uptimeHours = Math.floor(uptimeSeconds / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

    return ctx.reply(
      `LOONA ${packageInfo.version}\n` +
        `Окружение: ${process.env.APP_ENV || "production"}\n` +
        `Telegram: ${telegramOk ? "✅" : "❌"}\n` +
        `Supabase: ${database.ok ? "✅" : "❌"} (${database.latencyMs} ms)\n` +
        `Процесс: ${uptimeHours} ч ${uptimeMinutes} мин`,
    );
  });

  bot.command("admin_feedback", async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply("Команда недоступна.");
    }

    const { data: feedbackList, error } = await getLatestFeedback(10);

    if (error) {
      console.log("Ошибка получения отзывов:", error);
      return ctx.reply("Не получилось загрузить отзывы.");
    }

    if (!feedbackList || feedbackList.length === 0) {
      return ctx.reply("Пока отзывов нет.");
    }

    for (const item of feedbackList) {
      const icon = item.type === "bug" ? "🐞" : "💡";

      await ctx.reply(
        `${icon} #${item.id} ${item.type}\n\n` +
          `${item.message}\n\n` +
          `Статус: ${item.status || "new"}`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Закрыть",
                  callback_data: `feedback_done:${item.id}`,
                },
              ],
            ],
          },
        },
      );
    }
  });

  bot.command("analytics", async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply("Команда недоступна.");
    try {
      const s = await getGrowthSummary();
      const activation = s.kakaoOwners ? Math.round((s.activated / s.kakaoOwners) * 100) : 0;
      return ctx.reply(
        `📊 LOONA — воронка Kakao\n\n` +
        `Основные пользователи: ${s.kakaoOwners}\n` +
        `Записали первый цикл: ${s.activated} (${activation}%)\n` +
        `Активны за 7 дней: ${s.active7d}\n` +
        `Партнёры: ${s.kakaoPartners}\n` +
        `Plus: ${s.paid}\n\n` +
        `Telegram (основные): ${s.telegramOwners}`,
      );
    } catch (error) {
      console.log("Ошибка аналитики:", error);
      return ctx.reply("Не получилось загрузить аналитику.");
    }
  });

  bot.action(/^feedback_done:(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.answerCbQuery("Недоступно");
    }

    const feedbackId = Number(ctx.match[1]);

    const { error } = await updateFeedbackStatus(feedbackId, "done");

    if (error) {
      console.log("Ошибка обновления статуса:", error);
      return ctx.answerCbQuery("Ошибка");
    }

    await ctx.answerCbQuery("Готово");
    return ctx.editMessageText(`✅ Отзыв #${feedbackId} закрыт.`);
  });
}

module.exports = registerAdminHandler;
