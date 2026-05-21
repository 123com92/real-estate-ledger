const { query } = require("../_db");
const { publicUser, setSessionCookie, verifyPassword } = require("../_auth");
const { handleError, method, readJson, send } = require("../_http");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;
  try {
    const body = await readJson(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const result = await query(
      "select id, email, name, password_hash, role, status, created_at from app_users where email = $1",
      [email],
    );
    const user = result.rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      const error = new Error("邮箱或密码不正确");
      error.statusCode = 401;
      throw error;
    }
    if (user.status !== "active") {
      const error = new Error("账号已停用，请联系管理员");
      error.statusCode = 403;
      throw error;
    }
    setSessionCookie(res, user);
    send(res, 200, { user: publicUser(user) });
  } catch (error) {
    handleError(res, error);
  }
};
