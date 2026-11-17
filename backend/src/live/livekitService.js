const { AccessToken } = require('livekit-server-sdk');

function getLiveKitConfig() {
  const url = process.env.LIVEKIT_URL || '';
  const apiKey = process.env.LIVEKIT_API_KEY || '';
  const apiSecret = process.env.LIVEKIT_API_SECRET || '';
  const configured = Boolean(url && apiKey && apiSecret);
  return { url, apiKey, apiSecret, configured };
}

/**
 * Generates a short-lived LiveKit JWT token.
 * Teacher: canPublish = true, canSubscribe = true.
 * Student: canPublish = false, canSubscribe = true (listen-only MVP).
 */
async function createLiveKitToken({ roomCode, identity, name, role }) {
  const { url, apiKey, apiSecret, configured } = getLiveKitConfig();
  if (!configured) {
    return {
      configured: false,
      url: null,
      token: null
    };
  }

  const isTeacher = role === 'teacher';
  const at = new AccessToken(apiKey, apiSecret, {
    identity: String(identity),
    name: String(name || identity),
    ttl: '65m'
  });

  at.addGrant({
    roomJoin: true,
    room: `edunova-live-${roomCode}`,
    canPublish: isTeacher,
    canSubscribe: true,
    canPublishData: false
  });

  const token = await at.toJwt();
  return {
    configured: true,
    url,
    token
  };
}

module.exports = {
  getLiveKitConfig,
  createLiveKitToken
};
