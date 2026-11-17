import React from 'react';
import { Loader2, Radio, RefreshCw, FastForward } from 'lucide-react';

const STATUS_MAP = {
  connecting: {
    label: 'Connecting',
    cls: 'live-status-chip--connecting',
    Icon: Loader2
  },
  live: {
    label: 'Live',
    cls: 'live-status-chip--live',
    Icon: Radio
  },
  reconnecting: {
    label: 'Reconnecting',
    cls: 'live-status-chip--reconnecting',
    Icon: RefreshCw
  },
  catching_up: {
    label: 'Catching up',
    cls: 'live-status-chip--catching-up',
    Icon: FastForward
  }
};

export default function StatusChip({ status = 'connecting' }) {
  const entry = STATUS_MAP[status] || STATUS_MAP.connecting;
  const Icon = entry.Icon;

  return (
    <span className={`live-status-chip ${entry.cls}`} role="status" aria-live="polite">
      <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
      <span>{entry.label}</span>
    </span>
  );
}
