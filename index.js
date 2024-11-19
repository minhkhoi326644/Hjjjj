const WebSocket = require('ws');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const { tokens, guild_id, channel_id, self_mute, self_deaf, self_video } = config;

if (!tokens || tokens.length === 0) {
  console.error('[ERROR] No tokens found in config.json.');
  process.exit(1);
}

tokens.forEach((token, index) => {
  connectToDiscord(token, index);
});

function connectToDiscord(token, index) {
  console.log(`[INFO] Starting connection for token ${index + 1}`);

  const ws = new WebSocket('wss://gateway.discord.gg/?v=9&encoding=json');

  ws.on('open', () => {
    console.log(`[INFO] WebSocket opened for token ${index + 1}`);
  });

  ws.on('message', (data) => {
    const payload = JSON.parse(data);
    if (payload.op === 10) {
      const heartbeat_interval = payload.d.heartbeat_interval;
      const auth = {
        op: 2,
        d: {
          token,
          properties: {
            $os: 'linux',
            $browser: 'chrome',
            $device: 'pc'
          },
          presence: {
            status: 'online',
            afk: false
          }
        }
      };
      ws.send(JSON.stringify(auth));
      console.log(`[INFO] Sent authentication for token ${index + 1}`);

      setTimeout(() => {
        const joinVoice = {
          op: 4,
          d: {
            guild_id,
            channel_id,
            self_mute,
            self_deaf,
            self_video
          }
        };
        ws.send(JSON.stringify(joinVoice));
        console.log(`[INFO] Sent voice channel join request for token ${index + 1}`);
      }, 2000);

      setInterval(() => {
        ws.send(JSON.stringify({ op: 1, d: null }));
        console.log(`[INFO] Sent heartbeat for token ${index + 1}`);
      }, heartbeat_interval);
    }
  });

  ws.on('close', (code) => {
    console.error(`[ERROR] WebSocket closed for token ${index + 1} with code: ${code}`);
    console.log(`[INFO] Reconnecting in 5 seconds for token ${index + 1}`);
    setTimeout(() => connectToDiscord(token, index), 5000);
  });

  ws.on('error', (error) => {
    console.error(`[ERROR] WebSocket error for token ${index + 1}:`, error.message);
  });
}
