const supabase = require("../database/supabase");
const { getToday } = require("../utils/dateUtils");
const { daysBetween, predictCycle } = require("./predictionService");
const notificationCopy = {
  ru: { coming: (a, b) => `🌙 Приближается прогнозируемый диапазон нового цикла.\n\nОжидаемый диапазон: ${a} — ${b}`, today: "🌙 Сегодня наиболее вероятная дата начала нового цикла.\n\nЕсли он начался, отметьте начало в LOONA.", late: "📅 Прогнозируемый диапазон уже закончился, а новый цикл пока не отмечен.\n\nЕсли он начался, сохраните дату начала. При заметной задержке или беспокойстве обратитесь к врачу.", end: "🩸 Если период уже завершился, не забудьте отметить окончание ✅" },
  en: { coming: (a, b) => `🌙 The estimated range for your next cycle is approaching.\n\nEstimated range: ${a} — ${b}`, today: "🌙 Today is the most likely start date for your next cycle.\n\nIf it has started, record it in LOONA.", late: "📅 The estimated range has ended and a new cycle has not been recorded.\n\nSave the start date if it began. If a delay concerns you, contact a healthcare professional.", end: "🩸 If your period has ended, remember to record the end date ✅" },
  ko: { coming: (a, b) => `🌙 다음 주기의 예상 범위가 가까워지고 있어요.\n\n예상 범위: ${a} — ${b}`, today: "🌙 오늘은 다음 주기의 가장 가능성 높은 시작일이에요.\n\n시작됐다면 LOONA에 기록해 주세요.", late: "📅 예상 범위가 지났지만 새 주기가 아직 기록되지 않았어요.\n\n시작됐다면 날짜를 저장해 주세요. 지연이 걱정되면 의료 전문가와 상담하세요.", end: "🩸 생리가 끝났다면 종료일을 기록해 주세요 ✅" },
};

const partnerNotificationCopy = {
  ru: {
    coming: "💗 У партнёрши приближается ожидаемый диапазон нового цикла.\n\nВ ближайшие дни ей могут особенно пригодиться ваша забота и внимание.",
    today: "💗 Сегодня у партнёрши ожидаемая дата начала нового цикла.\n\nПоддержите её и спросите, чем можно помочь.",
    late: "💗 Ожидаемый диапазон нового цикла партнёрши уже прошёл.\n\nБудьте рядом и поддержите её, если она волнуется.",
  },
  en: {
    coming: "💗 Your partner’s estimated next-cycle range is approaching.\n\nA little extra care and attention may be especially welcome in the coming days.",
    today: "💗 Today is your partner’s estimated next-cycle start date.\n\nOffer your support and ask how you can help.",
    late: "💗 Your partner’s estimated next-cycle range has passed.\n\nBe there for them and offer support if they are worried.",
  },
  ko: {
    coming: "💗 파트너의 다음 주기 예상 범위가 가까워지고 있어요.\n\n며칠 동안 평소보다 조금 더 세심하게 살펴 주세요.",
    today: "💗 오늘은 파트너의 다음 주기 예상 시작일이에요.\n\n필요한 도움이 있는지 다정하게 물어봐 주세요.",
    late: "💗 파트너의 다음 주기 예상 범위가 지났어요.\n\n걱정하고 있다면 곁에서 편안하게 지지해 주세요.",
  },
};

function getCycleSubjectId(user) {
  return user.mode === "partner" ? user.linked_user_id : user.id;
}

function getPredictionNotificationCopy(user) {
  const copy = user.mode === "partner" ? partnerNotificationCopy : notificationCopy;
  return copy[user.language] || copy.ru;
}

async function runNotifications(bot) {
  const { data: openCycles, error } = await supabase
    .from("cycles")
    .select(
      `
      *,
      users (
        telegram_id,
        language,
        timezone
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
    const cycleSubjectId = getCycleSubjectId(user);

    if (!cycleSubjectId) {
      continue;
    }

    let cycleSubject = user;

    if (user.mode === "partner") {
      const { data: linkedUser, error: linkedUserError } = await supabase
        .from("users")
        .select("*")
        .eq("id", cycleSubjectId)
        .maybeSingle();

      if (linkedUserError || !linkedUser) {
        console.log("Ошибка получения профиля партнёрши:", linkedUserError);
        continue;
      }

      cycleSubject = linkedUser;
    }

    const { data: cycles, error: cyclesError } = await supabase
      .from("cycles")
      .select("*")
      .eq("user_id", cycleSubjectId)
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

    const prediction = predictCycle(cycles, cycleSubject);
    const message = getPredictionNotificationCopy(user);
    const todayString = getToday(user.timezone);

    if (!prediction) {
      continue;
    }

    const daysToRangeStart = daysBetween(
      todayString,
      prediction.nextPeriodStartRangeStart,
    );
    const daysToNextPeriod = daysBetween(todayString, prediction.nextPeriodStart);
    const daysSinceRangeEnd = daysBetween(prediction.nextPeriodStartRangeEnd, todayString);

    if (daysToRangeStart === 3) {
      const notificationType = `period_coming:${prediction.nextPeriodStartRangeStart}`;
      const alreadySent = await wasNotificationSent(user.id, notificationType);

      if (!alreadySent) {
        try {
          await bot.telegram.sendMessage(
            user.telegram_id,
            message.coming(prediction.nextPeriodStartRangeStart, prediction.nextPeriodStartRangeEnd),
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

    if (daysSinceRangeEnd === 7) {
      const notificationType = `period_late:${prediction.nextPeriodStartRangeEnd}`;
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
    const userToday = getToday(cycle.users?.timezone);
    const daysOpen = daysBetween(cycle.period_start, userToday);

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
  getCycleSubjectId,
  getPredictionNotificationCopy,
};
