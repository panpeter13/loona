const { allLabels, languageKeyboard, mainKeyboard } = require("../keyboards/mainKeyboard");
const { getOrCreateUser, updateLanguage } = require("../services/userService");

const prompts = {
  ru: "🌐 Выберите язык:",
  en: "🌐 Choose your language:",
  ko: "🌐 언어를 선택해 주세요:",
};

const saved = {
  ru: "Язык изменён на русский 🇷🇺",
  en: "Language changed to English 🇬🇧",
  ko: "한국어로 변경했어요 🇰🇷",
};

function registerLanguageHandler(bot) {
  bot.command("language", async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);
    return ctx.reply(prompts[user?.language] || prompts.ru, languageKeyboard);
  });

  bot.hears(allLabels("language"), async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);
    return ctx.reply(prompts[user?.language] || prompts.ru, languageKeyboard);
  });

  bot.action(/^set_language:(ru|en|ko)$/, async (ctx) => {
    const language = ctx.match[1];
    const user = await getOrCreateUser(ctx.from.id);
    if (!user) return ctx.answerCbQuery("Error");

    const { error } = await updateLanguage(user.id, language);
    if (error) return ctx.answerCbQuery("Error");

    await ctx.answerCbQuery(saved[language]);
    return ctx.reply(saved[language], mainKeyboard({ ...user, language }));
  });
}

module.exports = registerLanguageHandler;
