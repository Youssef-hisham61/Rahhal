const { WebSocketServer } = require('ws');

const clients = new Set();

function initWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    clients.add(ws);

    ws.send(JSON.stringify({ type: 'connected' }));

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('close', () => { clients.delete(ws); });

    ws.on('error', () => { clients.delete(ws); });
  });

  const heartbeat = setInterval(() => {
    clients.forEach((ws) => {
      if (!ws.isAlive) {
        clients.delete(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));

  return wss;
}

function broadcast(data) {
  const payload = JSON.stringify(data);
  clients.forEach((ws) => {
    if (ws.readyState === 1) {
      ws.send(payload);
    }
  });
}

module.exports = { initWebSocket, broadcast };
