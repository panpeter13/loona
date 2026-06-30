const locales = require("../locales");

function t(user, key) {
  const lang = locales[user.language] || locales.ru;

  return key.split(".").reduce((obj, part) => obj?.[part], lang);
}

module.exports = {
  t,
};
