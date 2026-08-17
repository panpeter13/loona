const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");
const { handleKakaoSkill } = require("./skillHandler");

function validWebhookSecret(value) {
  const expected = process.env.KAKAO_WEBHOOK_SECRET;
  if (!expected || !value) return false;
  const actualBuffer = Buffer.from(String(value));
  const expectedBuffer = Buffer.from(expected);
  return expectedBuffer.length >= 32
    && actualBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "256kb" }));
  app.use("/assets", express.static(path.resolve(__dirname, "../../public/assets"), {
    fallthrough: false,
    immutable: true,
    maxAge: "7d",
  }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "loona", version: require("../../package.json").version });
  });

  app.get("/privacy", (_req, res) => {
    const privacyFile = path.resolve(__dirname, "../../public/privacy.html");
    res.type("html");
    fs.createReadStream(privacyFile).on("error", (error) => {
      logger.error("Privacy page unavailable", error);
      if (!res.headersSent) res.status(404).json({ error: "not_found" });
      else res.destroy();
    }).pipe(res);
  });

  app.get("/kakao", (_req, res) => {
    const landingFile = path.resolve(__dirname, "../../public/kakao.html");
    res.type("html");
    fs.createReadStream(landingFile).on("error", (error) => {
      logger.error("Kakao landing page unavailable", error);
      if (!res.headersSent) res.status(404).json({ error: "not_found" });
      else res.destroy();
    }).pipe(res);
  });

  app.post("/kakao/skill", async (req, res) => {
    if (!validWebhookSecret(req.query.token)) {
      logger.warn("Rejected unauthenticated Kakao skill request");
      return res.status(401).json({ error: "unauthorized" });
    }
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

module.exports = { createApp, startKakaoServer, validWebhookSecret };
