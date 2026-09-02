const crypto = require('crypto');

/**
 * Generates a free Jitsi Meet room link for a video consultation. Jitsi's
 * public server (meet.jit.si) needs no API key, account, or payment — any
 * URL of the form https://meet.jit.si/<room-name> instantly becomes a live
 * room the first participant to open it creates. The room name is a random
 * UUID (prefixed so it's recognizable in logs) so it can't be guessed.
 */
function buildVideoConsultLink() {
  return `https://meet.jit.si/hms-${crypto.randomUUID()}`;
}

module.exports = { buildVideoConsultLink };
