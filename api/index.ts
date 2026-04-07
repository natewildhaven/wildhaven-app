export default async function handler(req: any, res: any) {
  const mod = await import("../artifacts/api-server/src/app.js");
  const app = mod.default;
  return app(req, res);
}
