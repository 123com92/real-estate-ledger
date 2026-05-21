const { query } = require("../_db");
const { requireAdmin } = require("../_auth");
const { handleError, method, readJson, send } = require("../_http");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["PATCH"])) return;
  try {
    const admin = await requireAdmin(req);
    const id = req.query.id;
    const body = await readJson(req);
    const updates = [];
    const params = [];

    if (body.role) {
      if (!["admin", "member"].includes(body.role)) {
        const error = new Error("角色参数不正确");
        error.statusCode = 400;
        throw error;
      }
      updates.push(`role = $${params.length + 1}`);
      params.push(body.role);
    }
    if (body.status) {
      if (!["active", "disabled"].includes(body.status)) {
        const error = new Error("状态参数不正确");
        error.statusCode = 400;
        throw error;
      }
      updates.push(`status = $${params.length + 1}`);
      params.push(body.status);
    }
    if (!updates.length) {
      const error = new Error("没有需要更新的字段");
      error.statusCode = 400;
      throw error;
    }
    if (admin.id === id && body.status === "disabled") {
      const error = new Error("不能停用当前登录的管理员账号");
      error.statusCode = 400;
      throw error;
    }

    params.push(id);
    const result = await query(
      `update app_users
       set ${updates.join(", ")}, updated_at = now()
       where id = $${params.length}
       returning id`,
      params,
    );
    if (!result.rowCount) {
      const error = new Error("用户不存在");
      error.statusCode = 404;
      throw error;
    }
    send(res, 200, { ok: true });
  } catch (error) {
    handleError(res, error);
  }
};
