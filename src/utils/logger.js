const SECRET_KEYS = [
  process.env.BOT_TOKEN,
  process.env.SUPABASE_SECRET_KEY,
  process.env.SUPABASE_KEY,
  process.env.OPENAI_API_KEY,
].filter(Boolean);

function sanitize(value) {
  let text;

  if (value instanceof Error) {
    text = value.stack || value.message;
  } else if (typeof value === "string") {
    text = value;
  } else {
    try {
      text = JSON.stringify(value);
    } catch {
      text = String(value);
    }
  }

  for (const secret of SECRET_KEYS) {
    text = text.split(secret).join("[REDACTED]");
  }

  // Bot tokens and JWT-like credentials must not end up in hosted logs.
  return text
    .replace(/bot\d+:[A-Za-z0-9_-]+/g, "bot[REDACTED]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]");
}

function write(level, message, details) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    environment: process.env.APP_ENV || "production",
    message: sanitize(message),
  };

  if (details !== undefined) entry.details = sanitize(details);

  const output = JSON.stringify(entry);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.log(output);
}

module.exports = {
  info: (message, details) => write("info", message, details),
  warn: (message, details) => write("warn", message, details),
  error: (message, details) => write("error", message, details),
  sanitize,
};
