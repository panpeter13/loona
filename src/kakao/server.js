const express = require("express");
const logger = require("../utils/logger");
const { handleKakaoSkill } = require("./skillHandler");

function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "256kb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "loona", version: require("../../package.json").version });
  });

  app.post("/kakao/skill", async (req, res) => {
    try {
      res.json(await handleKakaoSkill(req.body));
    } catch (error) {
      logger.error("Kakao skill request failed", error);
      res.status(200).json({
        version: "2.0",
        template: { outputs: [{ simpleText: { text: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요." } }] },
      });
    }
  });

  return app;
}

function startKakaoServer() {
  const port = Number(process.env.PORT || 3000);
  return createApp().listen(port, "0.0.0.0", () => {
    logger.info("LOONA HTTP server started", { port });
  });
}

module.exports = { createApp, startKakaoServer };
