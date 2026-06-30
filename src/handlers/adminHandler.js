const {
  getLatestFeedback,
  updateFeedbackStatus,
} = require("../services/feedbackService");

function isAdmin(ctx) {
  return String(ctx.from.id) === String(process.env.ADMIN_ID);
}

function registerAdminHandler(bot) {
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
