const { currentUser, publicUser } = require("../_auth");
const { handleError, method, send } = require("../_http");

module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET"])) return;
  try {
    const user = await currentUser(req);
    if (!user) {
      const error = new Error("请先登录");
      error.statusCode = 401;
      throw error;
    }
    send(res, 200, { user: publicUser(user) });
  } catch (error) {
    handleError(res, error);
  }
};
