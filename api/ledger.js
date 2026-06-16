const { query } = require("./_db");
const { requireUser } = require("./_auth");
const { handleError, method, readJson, send } = require("./_http");

const EMPTY_LEDGER = { selectedCommunityId: "all", communities: [], properties: [], transactions: [] };

module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET", "PUT"])) return;
  try {
    const user = await requireUser(req);
    if (req.method === "GET") {
      const result = await query("select data, updated_at from ledger_snapshots where user_id = $1", [user.id]);
      send(res, 200, { data: result.rows[0]?.data || EMPTY_LEDGER, updatedAt: result.rows[0]?.updated_at || null });
      return;
    }

    const body = await readJson(req);
    const data = normalizeLedger(body.data);
    const result = await query(
      `insert into ledger_snapshots (user_id, data)
       values ($1, $2::jsonb)
       on conflict (user_id)
       do update set data = excluded.data, updated_at = now()
       returning updated_at`,
      [user.id, JSON.stringify(data)],
    );
    send(res, 200, { ok: true, updatedAt: result.rows[0].updated_at });
  } catch (error) {
    handleError(res, error);
  }
};

function normalizeLedger(data) {
  if (!data || typeof data !== "object") {
    const error = new Error("账本数据格式不正确");
    error.statusCode = 400;
    throw error;
  }
  return {
    selectedCommunityId: String(data.selectedCommunityId || "all"),
    communities: Array.isArray(data.communities) ? data.communities : [],
    properties: Array.isArray(data.properties) ? data.properties : [],
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
  };
}
