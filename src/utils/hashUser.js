const crypto = require("crypto");

function hashUserId(telegramId) {
  return crypto.createHash("sha256").update(String(telegramId)).digest("hex");
}

module.exports = hashUserId;
