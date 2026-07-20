const { mainKeyboard, languageKeyboard } = require("../keyboards/mainKeyboard");
const { getOrCreateUser } = require("../services/userService");

const copy = {
  ru: {
    start: "Привет. Я LOONA 🌙\n\nЯ помогу бережно и приватно отслеживать цикл.\n\nВажно: прогнозы примерные и не являются медицинской рекомендацией.",
    help: "LOONA умеет:\n\n🌙 Начался цикл — записать начало сегодня\n✅ Завершился — записать окончание сегодня\n✍️ Указать дату — выбрать дату в календаре\n✨ Главный экран — текущий статус\n📅 Мой цикл — прогноз периода и овуляции\n💕 Цикл партнёрши — просмотр прогноза партнёрши\n👤 Режим — свой цикл или режим партнёра\n⚙️ Настройки — длина цикла и периода\n🌐 Язык — русский, английский или корейский\n↩️ Отменить запись — исправить ошибку\n🗑 Удалить данные — полное удаление\n\n🔒 Данные не передаются третьим лицам.",
  },
  en: {
    start: "Hi, I'm LOONA 🌙\n\nI help you track your cycle gently and privately.\n\nPlease note: predictions are estimates and are not medical advice.",
    help: "LOONA can help you with:\n\n🌙 Cycle started — save today's start date\n✅ Period ended — save today's end date\n✍️ Enter a date — choose it in the calendar\n✨ Dashboard — view your current status\n📅 My cycle — period and ovulation estimates\n💕 Partner's cycle — view your partner's estimate\n👤 Mode — personal or partner mode\n⚙️ Settings — cycle and period length\n🌐 Language — Russian, English, or Korean\n↩️ Undo last entry — correct a mistake\n🗑 Delete my data — permanently erase your profile\n\n🔒 Your data is not shared with third parties.",
  },
  ko: {
    start: "안녕하세요, LOONA예요 🌙\n\n주기를 편안하고 안전하게 기록할 수 있도록 도와드려요.\n\n예측은 참고용이며 의료 조언이 아닙니다.",
    help: "LOONA 기능:\n\n🌙 주기 시작 — 오늘을 시작일로 기록\n✅ 생리 종료 — 오늘을 종료일로 기록\n✍️ 날짜 입력 — 달력에서 날짜 선택\n✨ 홈 — 현재 주기 상태 확인\n📅 내 주기 — 생리 및 배란일 예측\n💕 파트너 주기 — 파트너의 예측 확인\n👤 모드 — 본인 또는 파트너 모드\n⚙️ 설정 — 주기와 생리 기간 설정\n🌐 언어 — 러시아어, 영어, 한국어\n↩️ 최근 기록 취소 — 잘못된 기록 수정\n🗑 내 데이터 삭제 — 프로필 완전 삭제\n\n🔒 데이터는 제3자에게 제공되지 않습니다.",
  },
};

function registerStartHandler(bot) {
  bot.start(async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);
    if (!user) return ctx.reply("Unable to create profile. Please try later.");
    const lang = copy[user.language] ? user.language : "ru";
    await ctx.reply(copy[lang].start, mainKeyboard(user));
    return ctx.reply("🌐 Русский · English · 한국어", languageKeyboard);
  });

  bot.hears("❓ Помощь", async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);
    const lang = copy[user?.language] ? user.language : "ru";
    return ctx.reply(copy[lang].help, mainKeyboard(user));
  });
}

module.exports = registerStartHandler;
