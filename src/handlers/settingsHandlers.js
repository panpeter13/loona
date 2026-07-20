const {
  mainKeyboard,
  settingsKeyboard,
  modeKeyboard,
} = require("../keyboards/mainKeyboard");

const userStates = require("../states/userStates");
const supabase = require("../database/supabase");
const { getOrCreateUser } = require("../services/userService");

function generatePartnerCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const copy = {
  ru: { settings: "⚙️ Настройки\n\nВыберите нужное значение кнопкой:", mode: "Выберите режим:", own: (code) => `Режим включён: свой цикл 🌙\n\nКод для партнёра:\n${code}\n\nПартнёр сможет ввести этот код у себя в боте.`, partner: "Режим включён: партнёр 🤝\n\nВведите код партнёрши:", menu: "Главное меню" },
  en: { settings: "⚙️ Settings\n\nChoose a value:", mode: "Choose a mode:", own: (code) => `Personal cycle mode enabled 🌙\n\nPartner code:\n${code}\n\nYour partner can enter this code in their bot.`, partner: "Partner mode enabled 🤝\n\nEnter your partner's code:", menu: "Main menu" },
  ko: { settings: "⚙️ 설정\n\n값을 선택해 주세요:", mode: "모드를 선택해 주세요:", own: (code) => `내 주기 모드가 설정됐어요 🌙\n\n파트너 코드:\n${code}\n\n파트너가 자신의 봇에 이 코드를 입력할 수 있어요.`, partner: "파트너 모드가 설정됐어요 🤝\n\n파트너 코드를 입력해 주세요:", menu: "메인 메뉴" },
};

function registerSettingsHandlers(bot) {
  bot.hears("⚙️ Настройки", async (ctx) => {
    const user = await getOrCreateUser(ctx.from.id);
    const c = copy[user?.language] || copy.ru;
    return ctx.reply(
      c.settings,
      settingsKeyboard(user),
    );
  });

  bot.hears("👤 Режим", async (ctx) => {
    userStates[ctx.from.id] = {
      action: "choose_mode",
    };

    const user = await getOrCreateUser(ctx.from.id);
    const c = copy[user?.language] || copy.ru;
    return ctx.reply(c.mode, modeKeyboard(user));
  });

  bot.hears("🌙 Свой цикл", async (ctx) => {
    const state = userStates[ctx.from.id];

    if (!state || state.action !== "choose_mode") return;

    const user = await getOrCreateUser(ctx.from.id);

    const partnerCode = user.partner_code || generatePartnerCode();

    const { error } = await supabase
      .from("users")
      .update({
        mode: "female",
        partner_code: partnerCode,
        linked_user_id: null,
      })
      .eq("id", user.id);

    if (error) {
      console.log("Ошибка сохранения режима:", error);
      return ctx.reply("Не получилось включить режим.");
    }

    delete userStates[ctx.from.id];

    const c = copy[user?.language] || copy.ru;
    return ctx.reply(c.own(partnerCode), mainKeyboard(user));
  });

  bot.hears("🤝 Партнёр", async (ctx) => {
    const state = userStates[ctx.from.id];

    if (!state || state.action !== "choose_mode") return;

    const user = await getOrCreateUser(ctx.from.id);

    const { error } = await supabase
      .from("users")
      .update({
        mode: "partner",
        linked_user_id: null,
      })
      .eq("id", user.id);

    if (error) {
      console.log("Ошибка сохранения режима партнёра:", error);
      return ctx.reply("Не получилось включить режим партнёра.");
    }

    userStates[ctx.from.id] = {
      action: "enter_partner_code",
    };

    const c = copy[user?.language] || copy.ru;
    return ctx.reply(c.partner);
  });

  bot.hears("⬅️ Назад", async (ctx) => {
    delete userStates[ctx.from.id];
    const user = await getOrCreateUser(ctx.from.id);
    const c = copy[user?.language] || copy.ru;
    return ctx.reply(c.menu, mainKeyboard(user));
  });
}

module.exports = registerSettingsHandlers;
