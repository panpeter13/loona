const userStates = require("../states/userStates");
const { cancelKeyboard } = require("../keyboards/mainKeyboard");

function registerDeleteHandlers(bot) {
  bot.hears("🗑 Удалить мои данные", (ctx) => {
    userStates[ctx.from.id] = {
      action: "confirm_delete",
    };

    return ctx.reply(
      "Это удалит профиль, циклы, отзывы, уведомления и прежнюю техническую историю.\n\nДля подтверждения напишите:\n\nУДАЛИТЬ",
      cancelKeyboard,
    );
  });
}

module.exports = registerDeleteHandlers;
