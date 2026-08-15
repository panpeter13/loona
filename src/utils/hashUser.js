const crypto = require("crypto");

function legacyHashUserId(userId) {
  return crypto.createHash("sha256").update(String(userId)).digest("hex");
}

function hashUserId(userId) {
  const pepper = process.env.HASH_PEPPER;
  if (!pepper || Buffer.byteLength(pepper, "utf8") < 32) {
    throw new Error("HASH_PEPPER must contain at least 32 bytes");
  }
  return crypto.createHmac("sha256", pepper).update(String(userId)).digest("hex");
}

module.exports = hashUserId;
module.exports.legacyHashUserId = legacyHashUserId;
