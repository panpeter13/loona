const STATE_TTL_MS = 15 * 60 * 1000;
const states = {};

const userStates = new Proxy(states, {
  get(target, property) {
    const state = target[property];
    if (state && state.expiresAt <= Date.now()) {
      delete target[property];
      return undefined;
    }
    return state?.value;
  },
  set(target, property, value) {
    target[property] = { value, expiresAt: Date.now() + STATE_TTL_MS };
    return true;
  },
  deleteProperty(target, property) {
    return delete target[property];
  },
});

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, state] of Object.entries(states)) {
    if (state.expiresAt <= now) delete states[key];
  }
}, 5 * 60 * 1000);
cleanupTimer.unref();

module.exports = userStates;
