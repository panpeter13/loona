const cron = require("node-cron");
const { runNotifications } = require("./services/notificationService");
const { runHealthCheck } = require("./services/healthService");
const logger = require("./utils/logger");

const { Telegraf } = require("telegraf");

const registerStartHandler = require("./handlers/startHandler");
const registerCycleHandlers = require("./handlers/cycleHandlers");
const registerSettingsHandlers = require("./handlers/settingsHandlers");
const registerDeleteHandlers = require("./handlers/deleteHandlers");
const registerTextHandler = require("./handlers/textHandler");
const registerDashboardHandler = require("./handlers/dashboardHandler");
const registerSymptomHandlers = require("./handlers/symptomHandlers");

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.catch(async (error, ctx) => {
  logger.error("Необработанная ошибка Telegram update", {
    updateType: ctx.updateType,
    message: error?.message,
    stack: error?.stack,
  });

  try {
    await ctx.reply("Произошла временная ошибка. Попробуйте ещё раз позже.");
  } catch (replyError) {
    logger.error("Не удалось сообщить пользователю об ошибке", replyError);
  }
});

const registerAboutHandler = require("./handlers/aboutHandler");

const registerAdminHandler = require("./handlers/adminHandler");

const registerDonationHandler = require("./handlers/donationHandler");

registerStartHandler(bot);
registerDashboardHandler(bot);
registerSymptomHandlers(bot);
registerCycleHandlers(bot);
registerSettingsHandlers(bot);
registerDeleteHandlers(bot);
registerDonationHandler(bot);
registerAboutHandler(bot);
registerAdminHandler(bot);
registerTextHandler(bot);

cron.schedule("0 10 * * *", async () => {
  console.log("Проверка уведомлений...");

  await runNotifications(bot);
}, { timezone: process.env.APP_TIMEZONE || "Asia/Seoul" });

cron.schedule("*/15 * * * *", async () => {
  await runHealthCheck(bot);
});

async function start() {
  await bot.launch();
  await runHealthCheck(bot);
  logger.info("LOONA bot started", { version: require("../package.json").version });
}

start().catch((error) => {
  logger.error("LOONA failed to start", error);
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  logger.error("Unhandled promise rejection", error);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", error);
  try {
    bot.stop("uncaughtException");
  } finally {
    process.exit(1);
  }
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
