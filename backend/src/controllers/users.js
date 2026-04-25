const { getOnlineUsers } = require("../ws/socket");

async function getOnline(req, res) {
  return res.json({
    online: getOnlineUsers(),
    last_updated: new Date(),
  });
}

module.exports = { getOnline };
