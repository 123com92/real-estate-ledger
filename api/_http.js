function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function method(req, res, allowed) {
  if (allowed.includes(req.method)) return true;
  res.setHeader("Allow", allowed.join(", "));
  send(res, 405, { error: "请求方法不支持" });
  return false;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("请求体不是有效 JSON");
    error.statusCode = 400;
    throw error;
  }
}

function handleError(res, error) {
  const status = error.statusCode || 500;
  const message =
    status >= 500 && error.message === "DATABASE_URL is not configured"
      ? "数据库未配置：请在 Vercel 环境变量中设置 DATABASE_URL"
      : status >= 500 && error.message === "SESSION_SECRET is not configured"
        ? "会话密钥未配置：请在 Vercel 环境变量中设置 SESSION_SECRET"
      : error.message || "服务异常";
  send(res, status, { error: message });
}

module.exports = { send, method, readJson, handleError };
