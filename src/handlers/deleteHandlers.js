const userStates = require("../states/userStates");
const { cancelKeyboard } = require("../keyboards/mainKeyboard");
const { getOrCreateUser } = require("../services/userService");

function registerDeleteHandlers(bot) {
  bot.hears("🗑 Удалить мои данные", async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);
    const content = {
      ru: { word: "УДАЛИТЬ", text: "Это удалит профиль, циклы, отзывы, уведомления и прежнюю техническую историю.\n\nДля подтверждения напишите:\n\nУДАЛИТЬ" },
      en: { word: "DELETE", text: "This will permanently delete your profile, cycles, feedback, notifications, and previous technical history.\n\nTo confirm, type:\n\nDELETE" },
      ko: { word: "삭제", text: "프로필, 주기, 피드백, 알림 및 이전 기술 기록이 완전히 삭제됩니다.\n\n확인하려면 다음을 입력해 주세요:\n\n삭제" },
    }[user?.language] || { word: "УДАЛИТЬ", text: "Это удалит все данные.\n\nДля подтверждения напишите:\n\nУДАЛИТЬ" };
    userStates[ctx.from.id] = {
      action: "confirm_delete",
      confirmWord: content.word,
    };

    return ctx.reply(
      content.text,
      cancelKeyboard(user),
    );
  });
}

module.exports = registerDeleteHandlers;
