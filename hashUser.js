const crypto = require("crypto");

function hashUserId(telegramId) {
  return crypto
    .createHash("sha256")
    .update(telegramId.toString() + process.env.USER_HASH_SECRET)
    .digest("hex");
}

module.exports = hashUserId;
