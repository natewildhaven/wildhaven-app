module.exports = async (req, res) => {
  const mod = await import("../artifacts/api-server/src/app.js");
  const app = mod.default;
  return app(req, res);
};
