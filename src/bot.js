const { Telegraf } = require("telegraf");

const registerStartHandler = require("./handlers/startHandler");
const registerCycleHandlers = require("./handlers/cycleHandlers");
const registerSettingsHandlers = require("./handlers/settingsHandlers");
const registerSymptomHandlers = require("./handlers/symptomHandlers");
const registerExportHandlers = require("./handlers/exportHandlers");
const registerDeleteHandlers = require("./handlers/deleteHandlers");
const registerTextHandler = require("./handlers/textHandler");

const bot = new Telegraf(process.env.BOT_TOKEN);

registerStartHandler(bot);
registerCycleHandlers(bot);
registerSettingsHandlers(bot);
registerSymptomHandlers(bot);
registerExportHandlers(bot);
registerDeleteHandlers(bot);
registerTextHandler(bot);

bot.launch();

console.log("LOONA bot started");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
