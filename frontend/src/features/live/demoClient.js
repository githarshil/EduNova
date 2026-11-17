import { apiRequest } from '../../services/api';

export const getDemoHealth = () => apiRequest('/live/demo/health');

export const getDemoScript = () => apiRequest('/live/demo/script');

export const translateDemoSentence = (payload) =>
  apiRequest('/live/demo/translate-sentence', {
    method: 'POST',
    body: payload
  });

export async function fetchOfflineDemoManifest() {
  const res = await fetch('/demo/manifest.json', { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error('Offline demo cache not found (/demo/manifest.json).');
  }
  return res.json();
}

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
 * WebSocket client for /ws/live/demo (no login required, one socket per presenter).
 */
export class DemoWsClient {
  constructor({ onStatus, onMessage, onError }) {
    this.onStatus = onStatus;
    this.onMessage = onMessage;
    this.onError = onError;
    this.ws = null;
    this.closedIntentionally = false;
    this.attempt = 0;
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.pendingPcm = [];
    this.pendingControls = [];
  }

  connect() {
    this.closedIntentionally = false;
    this._openSocket(false);
  }

  _openSocket(isReconnect) {
    if (this.closedIntentionally) return;
    this.onStatus?.(isReconnect ? 'reconnecting' : 'connecting');

    const url = `${resolveWsBaseUrl()}/ws/live/demo`;
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onopen = () => {
      this.attempt = 0;
      this.onStatus?.('live');
      while (this.pendingPcm.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(this.pendingPcm.shift());
      }
      while (this.pendingControls.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(this.pendingControls.shift()));
      }
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
      // Handled via onclose
    };

    ws.onclose = (ev) => {
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
      if (this.closedIntentionally || ev.code === 1000 || ev.code === 4003) {
        if (ev.code === 4003) {
          this.onError?.('Live demo is disabled or missing Sarvam API key on the server.');
        }
        return;
      }
      this._scheduleReconnect();
    };
  }

  _scheduleReconnect() {
    if (this.closedIntentionally) return;
    if (this.attempt >= 4) {
      this.onError?.('Lost connection to the translation server.');
      return;
    }
    this.onStatus?.('reconnecting');
    const delayMs = Math.min(10000, 1000 * Math.pow(2, this.attempt));
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this._openSocket(true);
    }, delayMs);
  }

  sendPcm(arrayBuffer) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(arrayBuffer);
    } else if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      if (this.pendingPcm.length < 40) {
        this.pendingPcm.push(arrayBuffer);
      }
    }
  }

  sendControl(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      this.pendingControls.push(payload);
    }
  }

  close() {
    this.closedIntentionally = true;
    this.pendingPcm.length = 0;
    this.pendingControls.length = 0;
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
