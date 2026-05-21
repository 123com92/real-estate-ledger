const { query } = require("../_db");
const { handleError, method, readJson, send } = require("../_http");
const { hashPassword, publicUser, setSessionCookie } = require("../_auth");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;
  try {
    const body = await readJson(req);
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const password = String(body.password || "");
    if (!email || !email.includes("@")) {
      const error = new Error("请填写有效邮箱");
      error.statusCode = 400;
      throw error;
    }
    if (password.length < 8) {
      const error = new Error("密码至少需要 8 位");
      error.statusCode = 400;
      throw error;
    }

    const count = await query("select count(*)::int as count from app_users");
    const role = count.rows[0].count === 0 ? "admin" : "member";
    const result = await query(
      `insert into app_users (email, name, password_hash, role)
       values ($1, $2, $3, $4)
       returning id, email, name, role, status, created_at`,
      [email, name || email.split("@")[0], hashPassword(password), role],
    );
    const user = result.rows[0];
    await query(
      `insert into ledger_snapshots (user_id, data)
       values ($1, $2::jsonb)
       on conflict (user_id) do nothing`,
      [user.id, JSON.stringify({ selectedCommunityId: "all", communities: [], properties: [], transactions: [] })],
    );
    setSessionCookie(res, user);
    send(res, 201, { user: publicUser(user) });
  } catch (error) {
    if (error.code === "23505") error = Object.assign(new Error("这个邮箱已经注册"), { statusCode: 409 });
    handleError(res, error);
  }
};
