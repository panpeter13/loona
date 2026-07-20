const supabase = require("../database/supabase");
const notificationCopy = {
  ru: { coming: (d) => `🌙 Следующий период может начаться примерно через 3 дня.\n\nОжидаемая дата: ${d}`, today: "🌙 Сегодня ожидаемая дата начала нового цикла.\n\nЕсли он начался, отметьте начало в LOONA.", late: "📅 Новый цикл пока не отмечен.\n\nЕсли он уже начался, отметьте дату начала, чтобы LOONA точнее считала прогноз.", end: "🩸 Обычно период длится около 5 дней.\n\nЕсли он уже завершился, не забудьте отметить окончание ✅" },
  en: { coming: (d) => `🌙 Your next period may start in about 3 days.\n\nEstimated date: ${d}`, today: "🌙 Your next cycle is expected to start today.\n\nIf it has started, record it in LOONA.", late: "📅 A new cycle has not been recorded yet.\n\nIf it has started, save the start date to improve future estimates.", end: "🩸 A period commonly lasts around 5 days.\n\nIf it has ended, remember to record the end date ✅" },
  ko: { coming: (d) => `🌙 약 3일 후 다음 생리가 시작될 수 있어요.\n\n예상일: ${d}`, today: "🌙 오늘은 다음 주기의 예상 시작일이에요.\n\n시작됐다면 LOONA에 기록해 주세요.", late: "📅 아직 새 주기가 기록되지 않았어요.\n\n이미 시작됐다면 더 정확한 예측을 위해 시작일을 기록해 주세요.", end: "🩸 생리는 보통 약 5일간 지속돼요.\n\n끝났다면 종료일을 기록해 주세요 ✅" },
};
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
        telegram_id,
        language
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
    const message = notificationCopy[user.language] || notificationCopy.ru;

    if (!prediction) {
      continue;
    }

    const daysToNextPeriod = daysBetween(
      todayString,
      prediction.nextPeriodStart,
    );

    if (daysToNextPeriod === 3) {
      const notificationType = `period_coming:${prediction.nextPeriodStart}`;
      const alreadySent = await wasNotificationSent(user.id, notificationType);

      if (!alreadySent) {
        try {
          await bot.telegram.sendMessage(
            user.telegram_id,
            message.coming(prediction.nextPeriodStart),
          );

          await saveNotification(user.id, notificationType);
        } catch (err) {
          console.log("Ошибка отправки уведомления о скором цикле:", err);
        }
      }
    }

    if (daysToNextPeriod === 0) {
      const notificationType = `period_today:${prediction.nextPeriodStart}`;
      const alreadySent = await wasNotificationSent(user.id, notificationType);

      if (!alreadySent) {
        try {
          await bot.telegram.sendMessage(
            user.telegram_id,
            message.today,
          );

          await saveNotification(user.id, notificationType);
        } catch (err) {
          console.log("Ошибка отправки уведомления на сегодня:", err);
        }
      }
    }

    if (daysToNextPeriod <= -7) {
      const notificationType = `period_late:${prediction.nextPeriodStart}`;
      const alreadySent = await wasNotificationSent(user.id, notificationType);

      if (!alreadySent) {
        try {
          await bot.telegram.sendMessage(
            user.telegram_id,
            message.late,
          );

          await saveNotification(user.id, notificationType);
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
        `period_end_reminder:${cycle.id}`,
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
          (notificationCopy[cycle.users?.language] || notificationCopy.ru).end,
        );

        await saveNotification(
          cycle.user_id,
          `period_end_reminder:${cycle.id}`,
        );
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
