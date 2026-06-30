const supabase = require("../database/supabase");
const { predictCycle } = require("./predictionService");

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function daysBetween(date1, date2) {
  const first = new Date(date1);
  const second = new Date(date2);

  return Math.floor((second - first) / (1000 * 60 * 60 * 24));
}

async function runNotifications(bot) {
  const today = new Date();
  const todayString = formatDate(today);

  const { data: openCycles, error } = await supabase
    .from("cycles")
    .select(
      `
      *,
      users (
        telegram_id
      )
    `,
    )
    .is("period_end", null);

  if (error) {
    console.log("Ошибка уведомлений:", error);
    return;
  }

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("*")
    .not("telegram_id", "is", null);

  if (usersError) {
    console.log("Ошибка получения пользователей:", usersError);
    return;
  }

  for (const user of users) {
    const { data: cycles, error: cyclesError } = await supabase
      .from("cycles")
      .select("*")
      .eq("user_id", user.id)
      .order("period_start", { ascending: true });

    if (cyclesError) {
      console.log("Ошибка получения циклов пользователя:", cyclesError);
      continue;
    }

    if (!cycles || cycles.length === 0) {
      continue;
    }

    const hasOpenCycle = cycles.some((cycle) => !cycle.period_end);

    if (hasOpenCycle) {
      continue;
    }

    const prediction = predictCycle(cycles, user);

    if (!prediction) {
      continue;
    }

    const daysToNextPeriod = daysBetween(
      todayString,
      prediction.nextPeriodStart,
    );

    if (daysToNextPeriod === 3) {
      const alreadySent = await wasNotificationSent(user.id, "period_coming");

      if (!alreadySent) {
        try {
          await bot.telegram.sendMessage(
            user.telegram_id,
            `🌙 Следующие месячные могут начаться примерно через 3 дня.\n\nОжидаемая дата: ${prediction.nextPeriodStart}`,
          );

          await saveNotification(user.id, "period_coming");
        } catch (err) {
          console.log("Ошибка отправки уведомления о скором цикле:", err);
        }
      }
    }

    if (daysToNextPeriod === 0) {
      const alreadySent = await wasNotificationSent(user.id, "period_today");

      if (!alreadySent) {
        try {
          await bot.telegram.sendMessage(
            user.telegram_id,
            "🌙 Сегодня ожидаемая дата начала нового цикла.\n\nЕсли месячные начались, отметьте начало в LOONA.",
          );

          await saveNotification(user.id, "period_today");
        } catch (err) {
          console.log("Ошибка отправки уведомления на сегодня:", err);
        }
      }
    }

    if (daysToNextPeriod <= -7) {
      const alreadySent = await wasNotificationSent(user.id, "period_late");

      if (!alreadySent) {
        try {
          await bot.telegram.sendMessage(
            user.telegram_id,
            "📅 Новый цикл пока не отмечен.\n\nЕсли месячные уже начались, отметьте дату начала, чтобы LOONA точнее считала прогноз.",
          );

          await saveNotification(user.id, "period_late");
        } catch (err) {
          console.log("Ошибка отправки уведомления о задержке:", err);
        }
      }
    }
  }

  for (const cycle of openCycles) {
    const startDate = new Date(cycle.period_start);

    const daysOpen = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

    if (daysOpen >= 5) {
      const alreadySent = await wasNotificationSent(
        cycle.user_id,
        "period_end_reminder",
      );

      if (alreadySent) {
        continue;
      }

      try {
        if (!cycle.users?.telegram_id) {
          console.log("Нет telegram_id у пользователя:", cycle.user_id);
          continue;
        }

        await bot.telegram.sendMessage(
          cycle.users.telegram_id,
          "🩸 Обычно месячные длятся около 5 дней.\n\nЕсли они уже закончились, не забудьте отметить окончание ✅",
        );

        await saveNotification(cycle.user_id, "period_end_reminder");
      } catch (err) {
        console.log("Ошибка отправки или сохранения:", err);
      }
    }
  }
}

async function wasNotificationSent(userId, type) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.log("Ошибка проверки уведомления:", error);
    return false;
  }

  return !!data;
}

async function saveNotification(userId, type) {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      type,
    })
    .select()
    .single();

  if (error) {
    console.log("Ошибка сохранения уведомления:", error);
    return null;
  }

  console.log("Уведомление сохранено:", data);
  return data;
}

module.exports = {
  runNotifications,
  wasNotificationSent,
  saveNotification,
};
