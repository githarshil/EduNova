import { apiRequest } from '../../services/api';

export const getLiveConfig = () => apiRequest('/live/config');

export const createLiveRoom = ({ title, teacherCode }) =>
  apiRequest('/live/rooms', {
    method: 'POST',
    body: { title, teacherCode }
  });

export const getLiveRoom = (code) => apiRequest(`/live/rooms/${encodeURIComponent(code)}`);

export const getLiveRoomToken = (code, { displayName } = {}) =>
  apiRequest(`/live/rooms/${encodeURIComponent(code)}/token`, {
    method: 'POST',
    body: { displayName }
  });

export const endLiveRoom = (code) =>
  apiRequest(`/live/rooms/${encodeURIComponent(code)}/end`, {
    method: 'POST'
  });

export const getLiveTranscripts = (code) =>
  apiRequest(`/live/rooms/${encodeURIComponent(code)}/transcripts`);

function resolveWsBaseUrl() {
  const rawApi = import.meta.env.VITE_API_URL;
  if (rawApi) {
    const cleaned = rawApi.replace(/\/api\/?$/, '').replace(/\/$/, '');
    return cleaned.replace(/^http(s?):\/\//, 'ws$1://');
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}`;
}

/**
 * WebSocket client for /ws/live with exponential backoff reconnect.
 */
export class LiveWsClient {
  constructor({ code, role, onStatus, onMessage, onError }) {
    this.code = code;
    this.role = role;
    this.onStatus = onStatus;
    this.onMessage = onMessage;
    this.onError = onError;
    this.ws = null;
    this.closedIntentionally = false;
    this.attempt = 0;
    this.reconnectTimer = null;
    this.pingTimer = null;
  }

  connect() {
    this.closedIntentionally = false;
    this._openSocket(false);
  }

  _openSocket(isReconnect) {
    if (this.closedIntentionally) return;
    const token = localStorage.getItem('token') || '';
    if (!token) {
      this.onError?.('Missing authentication token.');
      return;
    }

    this.onStatus?.(isReconnect ? 'reconnecting' : 'connecting');
    const url = `${resolveWsBaseUrl()}/ws/live?code=${encodeURIComponent(this.code)}&role=${encodeURIComponent(this.role)}&token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onopen = () => {
      this.attempt = 0;
      this.onStatus?.('live');
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 20000);
    };

    ws.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      try {
        const msg = JSON.parse(event.data);
        this.onMessage?.(msg);
      } catch (_) {}
    };

    ws.onerror = () => {
      // Handled by onclose backoff
    };

    ws.onclose = (ev) => {
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
      if (this.closedIntentionally || ev.code === 4003 || ev.code === 1000) {
        return;
      }
      this._scheduleReconnect();
    };
  }

  _scheduleReconnect() {
    if (this.closedIntentionally) return;
    this.onStatus?.('reconnecting');
    const delayMs = Math.min(15000, 1000 * Math.pow(2, this.attempt));
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this._openSocket(true);
    }, delayMs);
  }

  sendPcm(arrayBuffer) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(arrayBuffer);
    }
  }

  sendControl(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  close() {
    this.closedIntentionally = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close(1000);
      } catch (_) {}
      this.ws = null;
    }
  }
}
