
let globalConfig = {};

function set(configObj) {
  globalConfig = { ...configObj };
}

function get(key) {
  return globalConfig[key];
}

function getAll() {
  return globalConfig;
}

module.exports = {
  set,
  get,
  getAll,
};
