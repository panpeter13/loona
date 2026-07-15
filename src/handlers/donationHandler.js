const { getOrCreateUser } = require("../services/userService");
const {
  recordPaidDonation,
  getUserDonations,
} = require("../services/donationService");

function registerDonationHandler(bot) {
  bot.action(/^donate_stars:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const amountStars = Number(ctx.match[1]);
    const user = await getOrCreateUser(ctx.from.id);

    if (!user) {
      return ctx.reply("Не получилось найти профиль.");
    }

    const payload = `donation:${user.id}:${amountStars}:${Date.now()}`;

    return ctx.replyWithInvoice({
      title: "Поддержка LOONA",
      description: `Донат на развитие LOONA: ${amountStars} Stars`,
      payload,
      provider_token: "",
      currency: "XTR",
      prices: [
        {
          label: `${amountStars} Stars`,
          amount: amountStars,
        },
      ],
    });
  });

  bot.on("pre_checkout_query", async (ctx) => {
    return ctx.answerPreCheckoutQuery(true);
  });

  bot.on("successful_payment", async (ctx) => {
    const payment = ctx.message.successful_payment;
    const user = await getOrCreateUser(ctx.from.id);

    if (!user) {
      console.error("Оплата получена, но профиль пользователя не найден");
      return ctx.reply("Оплата получена. Свяжитесь с поддержкой LOONA.");
    }

    const { error } = await recordPaidDonation({
      userId: user.id,
      telegramId: ctx.from.id,
      amountStars: payment.total_amount,
      payload: payment.invoice_payload,
      telegramPaymentChargeId: payment.telegram_payment_charge_id,
      providerPaymentChargeId: payment.provider_payment_charge_id,
    });

    if (error) {
      console.log("===== ОШИБКА SUPABASE =====");
      console.dir(error, { depth: null });

      return ctx.reply(`Ошибка Supabase:\n${error.message}`);
    }

    return ctx.reply(
      "Спасибо за поддержку LOONA 💫\n\n" +
        "Донат получен. Это поможет развивать проект дальше.",
    );
  });

  bot.action("my_donations", async (ctx) => {
    await ctx.answerCbQuery();

    const user = await getOrCreateUser(ctx.from.id);

    if (!user) {
      return ctx.reply("Не получилось найти профиль.");
    }

    const { data, error } = await getUserDonations(user.id);

    if (error) {
      console.log("Ошибка получения донатов:", error);
      return ctx.reply("Не получилось загрузить донаты.");
    }

    if (!data || data.length === 0) {
      return ctx.reply("Пока донатов нет.");
    }

    const total = data.reduce((sum, item) => sum + item.amount_stars, 0);

    return ctx.reply(
      `💫 Твои донаты\n\n` +
        `Всего: ${total} Stars\n` +
        `Количество донатов: ${data.length}`,
    );
  });
}

module.exports = registerDonationHandler;
