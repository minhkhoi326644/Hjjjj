const WebSocket = require('ws');
const fetch = require('node-fetch');
const config = require('./config.json');

const { tokens, guild_id, channel_id, self_mute, self_deaf, self_video, status } = config;

if (!tokens || tokens.length === 0) {
  console.error('[ERROR] No tokens found in config.json.');
  process.exit(1);
}

const headers = (token) => ({
  Authorization: token,
  'Content-Type': 'application/json',
});

const validateToken = async (token) => {
  const response = await fetch('https://canary.discordapp.com/api/v9/users/@me', {
    headers: headers(token),
  });
  if (!response.ok) {
    console.error(`[ERROR] Token invalid: ${token}`);
    return null;
  }
  return await response.json();
};

const joiner = (token) => {
  const ws = new WebSocket('wss://gateway.discord.gg/?v=9&encoding=json');

  ws.on('open', () => {
    ws.on('message', (data) => {
      const start = JSON.parse(data);
      const heartbeat = start.d.heartbeat_interval;

      const auth = {
        op: 2,
        d: {
          token,
          properties: {
            $os: 'Windows 10',
            $browser: 'Google Chrome',
            $device: 'Windows',
          },
          presence: {
            status,
            afk: false,
          },
        },
        s: null,
        t: null,
      };

      const vc = {
        op: 4,
        d: {
          guild_id,
          channel_id,
          self_mute,
          self_deaf,
          self_video,
        },
      };

      ws.send(JSON.stringify(auth));
      ws.send(JSON.stringify(vc));

      setInterval(() => {
        ws.send(JSON.stringify({ op: 1, d: null }));
      }, heartbeat);
    });
  });

  ws.on('error', (error) => {
    console.error(`[ERROR] WebSocket error for token: ${token}`, error);
  });
};

const runJoiner = async () => {
  for (const token of tokens) {
    const userInfo = await validateToken(token);
    if (userInfo) {
      console.log(`Logged in as ${userInfo.username}#${userInfo.discriminator} (${userInfo.id}) using token: ${token}`);
      joiner(token);
    } else {
      console.error(`[ERROR] Skipping invalid token: ${token}`);
    }
  }
};

runJoiner();
