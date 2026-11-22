import { useEffect } from 'react';

export interface ToastProps {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
}

export function Toast({ message, onDismiss, durationMs = 2400 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(t);
  }, [message, onDismiss, durationMs]);

  if (!message) return null;
  return (
    <div role="status" className="ds-toast">
      {message}
    </div>
  );
}
