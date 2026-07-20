const { mainKeyboard, aboutKeyboard } = require("../keyboards/mainKeyboard");
const userStates = require("../states/userStates");
const { getOrCreateUser } = require("../services/userService");

const copy = {
  ru: {
    about: "🌙 LOONA Beta 1.4.0\n\nLOONA — независимый приватный трекер женского цикла с простым интерфейсом.\n\nСпасибо, что помогаете делать проект лучше ❤️",
    news: "📢 Новости LOONA\n\n✅ Учёт цикла\n✅ Динамический прогноз\n✅ Главный экран\n✅ Напоминания\n✅ Режим партнёра\n✅ Русский, English и 한국어\n\n🚧 Далее: статистика и календарь истории.",
    privacy: "🔒 Приватность LOONA\n\nБот хранит Telegram ID, обезличенный хэш, настройки, даты цикла и историю уведомлений. Данные используются только для функций LOONA и не продаются третьим лицам.\n\nВы можете полностью удалить данные через меню. Прогнозы приблизительные и не являются медицинской рекомендацией.",
    bug: "🐞 Опишите ошибку одним сообщением.", idea: "💡 Напишите вашу идею одним сообщением.", menu: "Главное меню",
  },
  en: {
    about: "🌙 LOONA Beta 1.4.0\n\nLOONA is an independent, privacy-focused cycle tracker with a simple interface.\n\nThank you for helping us make it better ❤️",
    news: "📢 LOONA News\n\n✅ Cycle tracking\n✅ Dynamic estimates\n✅ Dashboard\n✅ Reminders\n✅ Partner mode\n✅ Русский, English, and 한국어\n\n🚧 Next: statistics and a history calendar.",
    privacy: "🔒 LOONA Privacy\n\nThe bot stores your Telegram ID, an anonymized hash, settings, cycle dates, and notification history. Data is used only to provide LOONA and is not sold to third parties.\n\nYou can permanently delete your data from the menu. Estimates are approximate and are not medical advice.",
    bug: "🐞 Describe the problem in one message.", idea: "💡 Send your idea in one message.", menu: "Main menu",
  },
  ko: {
    about: "🌙 LOONA Beta 1.4.0\n\nLOONA는 간편하고 개인정보 보호를 중시하는 독립적인 주기 기록 봇이에요.\n\n더 좋은 서비스를 만드는 데 함께해 주셔서 감사해요 ❤️",
    news: "📢 LOONA 소식\n\n✅ 주기 기록\n✅ 맞춤 예측\n✅ 홈 화면\n✅ 알림\n✅ 파트너 모드\n✅ Русский, English, 한국어\n\n🚧 다음 기능: 통계와 기록 달력",
    privacy: "🔒 LOONA 개인정보 보호\n\nTelegram ID, 익명화된 해시, 설정, 주기 날짜와 알림 기록을 저장합니다. 데이터는 LOONA 기능에만 사용되며 제3자에게 판매되지 않습니다.\n\n메뉴에서 데이터를 완전히 삭제할 수 있습니다. 예측은 참고용이며 의료 조언이 아닙니다.",
    bug: "🐞 오류를 한 메시지로 설명해 주세요.", idea: "💡 아이디어를 한 메시지로 보내 주세요.", menu: "메인 메뉴",
  },
};

async function context(ctx) {
  const user = await getOrCreateUser(ctx.from.id);
  return { user, c: copy[user?.language] || copy.ru };
}

function registerAboutHandler(bot) {
  bot.hears("ℹ️ О LOONA", async (ctx) => { const { user, c } = await context(ctx); return ctx.reply(c.about, aboutKeyboard(user)); });
  bot.hears("📢 Новости", async (ctx) => { const { user, c } = await context(ctx); return ctx.reply(c.news, aboutKeyboard(user)); });
  bot.hears("🔒 Приватность", async (ctx) => { const { user, c } = await context(ctx); return ctx.reply(c.privacy, aboutKeyboard(user)); });
  bot.hears("🐞 Сообщить об ошибке", async (ctx) => { userStates[ctx.from.id] = { action: "feedback_bug" }; const { user, c } = await context(ctx); return ctx.reply(c.bug, aboutKeyboard(user)); });
  bot.hears("💡 Предложить идею", async (ctx) => { userStates[ctx.from.id] = { action: "feedback_idea" }; const { user, c } = await context(ctx); return ctx.reply(c.idea, aboutKeyboard(user)); });
  bot.hears("⬅️ Назад", async (ctx) => { delete userStates[ctx.from.id]; const { user, c } = await context(ctx); return ctx.reply(c.menu, mainKeyboard(user)); });
}

module.exports = registerAboutHandler;
