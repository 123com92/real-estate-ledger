const { query } = require("../_db");
const { publicUser, requireAdmin } = require("../_auth");
const { handleError, method, send } = require("../_http");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET"])) return;
  try {
    await requireAdmin(req);
    const result = await query(
      "select id, email, name, role, status, created_at from app_users order by created_at desc",
    );
    send(res, 200, { users: result.rows.map(publicUser) });
  } catch (error) {
    handleError(res, error);
  }
};
