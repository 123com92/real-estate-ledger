const crypto = require("crypto");
const { query } = require("./_db");

const COOKIE_NAME = "rel_session";
const SESSION_DAYS = 7;

function sessionSecret() {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is not configured");
  }
  return secret || "development-session-secret-change-me";
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || "").split(":");
  if (!salt || !expected) return false;
  const actual = hashPassword(password, salt).split(":")[1];
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(value) {
  return crypto.createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function createToken(payload) {
  const body = base64url(JSON.stringify({ ...payload, exp: Date.now() + SESSION_DAYS * 86400000 }));
  return `${body}.${sign(body)}`;
}

function readToken(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function verifyToken(token) {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature || sign(body) !== signature) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function setSessionCookie(res, user) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const token = createToken({ userId: user.id });
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`,
  );
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

async function currentUser(req) {
  const payload = verifyToken(readToken(req));
  if (!payload?.userId) return null;
  const result = await query(
    "select id, email, name, role, status, created_at from app_users where id = $1",
    [payload.userId],
  );
  const user = result.rows[0];
  if (!user || user.status !== "active") return null;
  return user;
}

async function requireUser(req) {
  const user = await currentUser(req);
  if (!user) {
    const error = new Error("请先登录");
    error.statusCode = 401;
    throw error;
  }
  return user;
}

async function requireAdmin(req) {
  const user = await requireUser(req);
  if (user.role !== "admin") {
    const error = new Error("需要管理员权限");
    error.statusCode = 403;
    throw error;
  }
  return user;
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
  };
}

module.exports = {
  clearSessionCookie,
  currentUser,
  hashPassword,
  publicUser,
  requireAdmin,
  requireUser,
  setSessionCookie,
  verifyPassword,
};
