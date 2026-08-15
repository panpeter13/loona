const { getOrCreateUser } = require("../services/userService");
const { getExportData } = require("../services/exportService");
const logger = require("../utils/logger");

function registerExportHandlers(bot) {
  bot.hears("📤 Экспорт данных", async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);

    if (!user) {
      return ctx.reply("Не получилось найти профиль.");
    }

    const { data, error } = await getExportData(user);

    if (error) {
      logger.error("Ошибка экспорта", error);
      return ctx.reply("Не получилось экспортировать данные.");
    }

    const json = JSON.stringify(data, null, 2);

    if (json.length > 3500) {
      return ctx.reply(
        "Данных уже много. Позже сделаем экспорт файлом JSON. Пока Telegram душит длинные сообщения, как бюрократ справку.",
      );
    }

    return ctx.reply(`Ваши данные:\n\n\`\`\`json\n${json}\n\`\`\``, {
      parse_mode: "Markdown",
    });
  });
}

module.exports = registerExportHandlers;
