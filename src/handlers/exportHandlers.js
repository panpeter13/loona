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
    const captions = {
      ru: "Ваш экспорт данных LOONA готов.",
      en: "Your LOONA data export is ready.",
      ko: "LOONA 데이터 내보내기가 준비됐어요.",
    };

    return ctx.replyWithDocument(
      { source: Buffer.from(json, "utf8"), filename: "loona-data.json" },
      { caption: captions[user.language] || captions.ru },
    );
  });
}

module.exports = registerExportHandlers;
