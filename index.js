const supabase = require("./supabase");
const hashUserId = require("./hashUser");

require("dotenv").config();

const { Telegraf, Markup } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

const userStates = {};

const mainKeyboard = Markup.keyboard([
  ["🌙 Начались месячные", "✅ Закончились"],
  ["✍️ Указать дату начала", "✍️ Указать дату окончания"],
  ["📅 Мой цикл", "🩺 Симптомы"],
  ["⚙️ Настройки", "↩️ Отменить последнюю запись"],
  ["📤 Экспорт данных", "🗑 Удалить мои данные"],
  ["❓ Помощь"],
]).resize();

const cancelKeyboard = Markup.keyboard([["❌ Отмена"]]).resize();

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseDate(input) {
  const text = input.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const match = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function isValidDate(dateString) {
  const date = new Date(dateString);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === dateString
  );
}

function getCycleDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

async function getOrCreateUser(telegramId) {
  const userHash = hashUserId(telegramId);

  const { data: existingUser, error: selectError } = await supabase
    .from("users")
    .select("*")
    .eq("user_hash", userHash)
    .maybeSingle();

  if (selectError) {
    console.log("Ошибка поиска пользователя:", selectError);
    return null;
  }

  if (existingUser) {
    return existingUser;
  }

  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({
      user_hash: userHash,
    })
    .select()
    .single();

  if (insertError) {
    console.log("Ошибка создания пользователя:", insertError);
    return null;
  }

  return newUser;
}

async function getLastCycle(userId) {
  const { data, error } = await supabase
    .from("cycles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data, error };
}

async function getOpenCycle(userId) {
  const { data, error } = await supabase
    .from("cycles")
    .select("*")
    .eq("user_id", userId)
    .is("period_end", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data, error };
}

async function createCycle(user, date) {
  return supabase.from("cycles").insert({
    user_id: user.id,
    period_start: date,
    period_end: null,
    cycle_length: user.cycle_length || 28,
    period_length: user.period_length || 5,
  });
}

async function closeCycle(cycleId, date) {
  return supabase
    .from("cycles")
    .update({
      period_end: date,
    })
    .eq("id", cycleId);
}

bot.start(async (ctx) => {
  const user = await getOrCreateUser(ctx.from.id);

  if (!user) {
    return ctx.reply("Не получилось создать профиль. Попробуйте позже.");
  }

  ctx.reply(
    "Привет. Я LOONA 🌙\n\n" +
      "Я помогу отслеживать цикл анонимно.\n\n" +
      "Важно: прогнозы примерные и не являются медицинской рекомендацией.",
    mainKeyboard,
  );
});

bot.hears("🌙 Начались месячные", async (ctx) => {
  const user = await getOrCreateUser(ctx.from.id);

  if (!user) {
    return ctx.reply("Не получилось найти профиль.");
  }

  const today = getToday();

  const { data: openedCycle, error: findError } = await getOpenCycle(user.id);

  if (findError) {
    console.log("Ошибка поиска открытого цикла:", findError);
    return ctx.reply("Не получилось проверить текущий цикл.");
  }

  if (openedCycle) {
    return ctx.reply(
      `Уже есть открытая запись 🌙\n\nНачало: ${openedCycle.period_start}\n\nСначала нажмите ✅ Закончились или ↩️ Отменить последнюю запись.`,
    );
  }

  const { error } = await createCycle(user, today);

  if (error) {
    console.log("Ошибка сохранения начала:", error);
    return ctx.reply("Не получилось сохранить дату.");
  }

  ctx.reply(`Записала начало: ${today} 🌙`);
});

bot.hears("✅ Закончились", async (ctx) => {
  const user = await getOrCreateUser(ctx.from.id);

  if (!user) {
    return ctx.reply("Не получилось найти профиль.");
  }

  const today = getToday();

  const { data: cycle, error: findError } = await getOpenCycle(user.id);

  if (findError) {
    console.log("Ошибка поиска открытого цикла:", findError);
    return ctx.reply("Не получилось проверить текущий цикл.");
  }

  if (!cycle) {
    return ctx.reply(
      "Нет открытого цикла. Сначала отметьте начало месячных 🌙",
    );
  }

  if (today < cycle.period_start) {
    return ctx.reply("Дата окончания не может быть раньше даты начала.");
  }

  const { error } = await closeCycle(cycle.id, today);

  if (error) {
    console.log("Ошибка сохранения окончания:", error);
    return ctx.reply("Не получилось сохранить дату окончания.");
  }

  ctx.reply(`Записала окончание: ${today} ✅`);
});

bot.hears("✍️ Указать дату начала", (ctx) => {
  userStates[ctx.from.id] = {
    action: "manual_start",
  };

  ctx.reply(
    "Введите дату начала в формате:\n\n2026-06-04\nили\n04.06.2026",
    cancelKeyboard,
  );
});

bot.hears("✍️ Указать дату окончания", (ctx) => {
  userStates[ctx.from.id] = {
    action: "manual_end",
  };

  ctx.reply(
    "Введите дату окончания в формате:\n\n2026-06-04\nили\n04.06.2026",
    cancelKeyboard,
  );
});

bot.hears("📅 Мой цикл", async (ctx) => {
  const user = await getOrCreateUser(ctx.from.id);

  if (!user) {
    return ctx.reply("Не получилось найти профиль.");
  }

  const { data: lastCycle, error } = await getLastCycle(user.id);

  if (error) {
    console.log("Ошибка получения цикла:", error);
    return ctx.reply("Не получилось загрузить данные.");
  }

  if (!lastCycle) {
    return ctx.reply("Пока данных нет. Отметьте начало месячных 🌙");
  }

  const cycleLength = lastCycle.cycle_length || user.cycle_length || 28;
  const periodLength = lastCycle.period_length || user.period_length || 5;

  const nextPeriodStart = addDays(lastCycle.period_start, cycleLength);
  const nextPeriodEnd = addDays(nextPeriodStart, periodLength - 1);
  const ovulationDate = addDays(nextPeriodStart, -14);
  const fertileStart = addDays(ovulationDate, -5);
  const fertileEnd = addDays(ovulationDate, 1);

  ctx.reply(
    `📅 Последняя запись\n\n` +
      `Начало: ${lastCycle.period_start}\n` +
      `Конец: ${lastCycle.period_end || "ещё не отмечен"}\n\n` +
      `Длина цикла: ${cycleLength} дней\n` +
      `Длительность месячных: ${periodLength} дней\n\n` +
      `Следующие месячные примерно:\n${nextPeriodStart} — ${nextPeriodEnd}\n\n` +
      `Овуляция примерно: ${ovulationDate}\n` +
      `Фертильное окно примерно:\n${fertileStart} — ${fertileEnd}\n\n` +
      `Это примерный прогноз, не медицинская гарантия. Организм не календарь Google, увы.`,
  );
});

bot.hears("↩️ Отменить последнюю запись", async (ctx) => {
  const user = await getOrCreateUser(ctx.from.id);

  if (!user) {
    return ctx.reply("Не получилось найти профиль.");
  }

  const { data: lastCycle, error } = await getLastCycle(user.id);

  if (error) {
    console.log("Ошибка поиска последней записи:", error);
    return ctx.reply("Не получилось найти последнюю запись.");
  }

  if (!lastCycle) {
    return ctx.reply("Пока нечего отменять.");
  }

  if (!lastCycle.period_end) {
    const { error: deleteError } = await supabase
      .from("cycles")
      .delete()
      .eq("id", lastCycle.id);

    if (deleteError) {
      console.log("Ошибка удаления:", deleteError);
      return ctx.reply("Не получилось отменить запись.");
    }

    return ctx.reply(
      `Отменила начало 🌙\n\nУдалено: ${lastCycle.period_start}`,
    );
  }

  const { error: updateError } = await supabase
    .from("cycles")
    .update({
      period_end: null,
    })
    .eq("id", lastCycle.id);

  if (updateError) {
    console.log("Ошибка отката окончания:", updateError);
    return ctx.reply("Не получилось отменить окончание.");
  }

  ctx.reply(
    `Отменила окончание ✅\n\nНачало осталось: ${lastCycle.period_start}`,
  );
});

bot.hears("⚙️ Настройки", (ctx) => {
  ctx.reply(
    "⚙️ Настройки\n\n" +
      "Напишите:\n\n" +
      "цикл 28\n" +
      "месячные 5\n\n" +
      "Примеры:\n" +
      "цикл 30\n" +
      "месячные 6",
  );
});

bot.hears("🩺 Симптомы", (ctx) => {
  ctx.reply(
    "🩺 Симптомы\n\n" +
      "Напишите симптом в формате:\n\n" +
      "симптом боль 4\n" +
      "симптом голова 2\n" +
      "симптом настроение 5\n\n" +
      "Число от 1 до 5 — сила симптома.",
  );
});

bot.hears("📤 Экспорт данных", async (ctx) => {
  const user = await getOrCreateUser(ctx.from.id);

  if (!user) {
    return ctx.reply("Не получилось найти профиль.");
  }

  const { data: cycles, error: cyclesError } = await supabase
    .from("cycles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const { data: symptoms, error: symptomsError } = await supabase
    .from("symptoms")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (cyclesError || symptomsError) {
    console.log("Ошибка экспорта:", cyclesError || symptomsError);
    return ctx.reply("Не получилось экспортировать данные.");
  }

  const exportData = {
    exported_at: new Date().toISOString(),
    settings: {
      cycle_length: user.cycle_length,
      period_length: user.period_length,
      timezone: user.timezone,
      language: user.language,
    },
    cycles,
    symptoms,
  };

  const json = JSON.stringify(exportData, null, 2);

  if (json.length > 3500) {
    return ctx.reply(
      "Данных уже много. Позже сделаем экспорт файлом JSON. Пока Telegram душит длинные сообщения, как бюрократ справку.",
    );
  }

  ctx.reply(`Ваши данные:\n\n\`\`\`json\n${json}\n\`\`\``, {
    parse_mode: "Markdown",
  });
});

bot.hears("🗑 Удалить мои данные", (ctx) => {
  userStates[ctx.from.id] = {
    action: "confirm_delete",
  };

  ctx.reply(
    "Это удалит все данные: циклы, симптомы и профиль.\n\nДля подтверждения напишите:\n\nУДАЛИТЬ",
    cancelKeyboard,
  );
});

bot.hears("❌ Отмена", (ctx) => {
  delete userStates[ctx.from.id];
  ctx.reply("Отменено.", mainKeyboard);
});

bot.hears("❓ Помощь", (ctx) => {
  ctx.reply(
    "LOONA умеет:\n\n" +
      "🌙 Начались месячные — записать начало сегодня\n" +
      "✅ Закончились — записать окончание сегодня\n" +
      "✍️ Указать дату начала — ручной ввод даты\n" +
      "✍️ Указать дату окончания — ручной ввод даты\n" +
      "📅 Мой цикл — прогноз месячных и овуляции\n" +
      "🩺 Симптомы — запись симптомов\n" +
      "⚙️ Настройки — длина цикла и месячных\n" +
      "↩️ Отменить последнюю запись — откат ошибки\n" +
      "📤 Экспорт данных — выгрузка\n" +
      "🗑 Удалить мои данные — полное удаление\n\n" +
      "Telegram ID не хранится. Используется только хэш.",
  );
});

bot.on("text", async (ctx) => {
  const text = ctx.message.text.trim();
  const state = userStates[ctx.from.id];

  const user = await getOrCreateUser(ctx.from.id);

  if (!user) {
    return ctx.reply("Не получилось найти профиль.");
  }

  if (state?.action === "manual_start") {
    const date = parseDate(text);

    if (!date || !isValidDate(date)) {
      return ctx.reply("Дата не распознана. Пример: 2026-06-04 или 04.06.2026");
    }

    const { data: openedCycle, error: findError } = await getOpenCycle(user.id);

    if (findError) {
      console.log("Ошибка поиска открытого цикла:", findError);
      return ctx.reply("Не получилось проверить текущий цикл.");
    }

    if (openedCycle) {
      return ctx.reply(
        `Уже есть открытая запись: ${openedCycle.period_start}\n\nСначала закройте или отмените её.`,
        mainKeyboard,
      );
    }

    const { error } = await createCycle(user, date);

    if (error) {
      console.log("Ошибка ручного начала:", error);
      return ctx.reply("Не получилось сохранить дату.");
    }

    delete userStates[ctx.from.id];
    return ctx.reply(`Записала начало: ${date} 🌙`, mainKeyboard);
  }

  if (state?.action === "manual_end") {
    const date = parseDate(text);

    if (!date || !isValidDate(date)) {
      return ctx.reply("Дата не распознана. Пример: 2026-06-04 или 04.06.2026");
    }

    const { data: cycle, error: findError } = await getOpenCycle(user.id);

    if (findError) {
      console.log("Ошибка поиска открытого цикла:", findError);
      return ctx.reply("Не получилось проверить текущий цикл.");
    }

    if (!cycle) {
      delete userStates[ctx.from.id];
      return ctx.reply("Нет открытого цикла.", mainKeyboard);
    }

    if (date < cycle.period_start) {
      return ctx.reply("Дата окончания не может быть раньше даты начала.");
    }

    const periodDays = getCycleDays(cycle.period_start, date);

    if (periodDays > 14) {
      return ctx.reply(
        "Период получился больше 14 дней. Проверьте дату. Если всё верно — позже добавим подтверждение таких случаев.",
      );
    }

    const { error } = await closeCycle(cycle.id, date);

    if (error) {
      console.log("Ошибка ручного окончания:", error);
      return ctx.reply("Не получилось сохранить дату окончания.");
    }

    delete userStates[ctx.from.id];
    return ctx.reply(`Записала окончание: ${date} ✅`, mainKeyboard);
  }

  if (state?.action === "confirm_delete") {
    if (text !== "УДАЛИТЬ") {
      return ctx.reply("Для подтверждения нужно написать ровно: УДАЛИТЬ");
    }

    await supabase.from("symptoms").delete().eq("user_id", user.id);
    await supabase.from("cycles").delete().eq("user_id", user.id);

    const { error } = await supabase.from("users").delete().eq("id", user.id);

    if (error) {
      console.log("Ошибка удаления данных:", error);
      return ctx.reply("Не получилось удалить данные.");
    }

    delete userStates[ctx.from.id];
    return ctx.reply("Все данные удалены 🗑", mainKeyboard);
  }

  const cycleMatch = text.match(/^цикл\s+(\d+)$/i);

  if (cycleMatch) {
    const value = Number(cycleMatch[1]);

    if (value < 15 || value > 60) {
      return ctx.reply("Длина цикла должна быть от 15 до 60 дней.");
    }

    const { error } = await supabase
      .from("users")
      .update({
        cycle_length: value,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.log("Ошибка настройки цикла:", error);
      return ctx.reply("Не получилось сохранить настройку.");
    }

    return ctx.reply(`Сохранила длину цикла: ${value} дней`);
  }

  const periodMatch = text.match(/^месячные\s+(\d+)$/i);

  if (periodMatch) {
    const value = Number(periodMatch[1]);

    if (value < 1 || value > 14) {
      return ctx.reply("Длительность месячных должна быть от 1 до 14 дней.");
    }

    const { error } = await supabase
      .from("users")
      .update({
        period_length: value,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.log("Ошибка настройки месячных:", error);
      return ctx.reply("Не получилось сохранить настройку.");
    }

    return ctx.reply(`Сохранила длительность месячных: ${value} дней`);
  }

  const symptomMatch = text.match(/^симптом\s+(.+)\s+([1-5])$/i);

  if (symptomMatch) {
    const type = symptomMatch[1].trim();
    const intensity = Number(symptomMatch[2]);
    const today = getToday();

    const { data: lastCycle } = await getLastCycle(user.id);

    const { error } = await supabase.from("symptoms").insert({
      user_id: user.id,
      cycle_id: lastCycle?.id || null,
      symptom_date: today,
      type,
      intensity,
    });

    if (error) {
      console.log("Ошибка сохранения симптома:", error);
      return ctx.reply("Не получилось сохранить симптом.");
    }

    return ctx.reply(`Сохранила симптом: ${type}, сила ${intensity}/5 🩺`);
  }

  ctx.reply("Не поняла команду. Нажмите ❓ Помощь.");
});

bot.launch();

console.log("LOONA bot started");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
