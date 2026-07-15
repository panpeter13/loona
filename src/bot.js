const cron = require("node-cron");
const { runNotifications } = require("./services/notificationService");
const { runHealthCheck } = require("./services/healthService");

const { Telegraf } = require("telegraf");

const registerStartHandler = require("./handlers/startHandler");
const registerCycleHandlers = require("./handlers/cycleHandlers");
const registerSettingsHandlers = require("./handlers/settingsHandlers");
const registerDeleteHandlers = require("./handlers/deleteHandlers");
const registerTextHandler = require("./handlers/textHandler");
const registerDashboardHandler = require("./handlers/dashboardHandler");
const registerSymptomHandlers = require("./handlers/symptomHandlers");

const bot = new Telegraf(process.env.BOT_TOKEN);

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

bot.launch();
runHealthCheck(bot);

console.log("LOONA bot started");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
