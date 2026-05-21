const { clearSessionCookie } = require("../_auth");
const { method, send } = require("../_http");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;
  clearSessionCookie(res);
  send(res, 200, { ok: true });
};
