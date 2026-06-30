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

function registerSettingsHandlers(bot) {
  bot.hears("⚙️ Настройки", (ctx) => {
    return ctx.reply(
      "⚙️ Настройки\n\nВыберите нужное значение кнопкой:",
      settingsKeyboard,
    );
  });

  bot.hears("👤 Режим", (ctx) => {
    userStates[ctx.from.id] = {
      action: "choose_mode",
    };

    return ctx.reply("Выберите режим:", modeKeyboard);
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

    return ctx.reply(
      `Режим включён: свой цикл 🌙\n\nКод для партнёра:\n${partnerCode}\n\nПартнёр сможет ввести этот код у себя в боте.`,
      mainKeyboard,
    );
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

    return ctx.reply("Режим включён: партнёр 🤝\n\nВведите код партнёрши:");
  });

  bot.hears("⬅️ Назад", (ctx) => {
    delete userStates[ctx.from.id];
    return ctx.reply("Главное меню", mainKeyboard);
  });
}

module.exports = registerSettingsHandlers;
