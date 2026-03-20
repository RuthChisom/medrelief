"use client";
import { useState, useCallback } from 'react';

export type ToastItem = {
  id: number;
  type: 'success' | 'error';
  message: string;
};

let _nextId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const notify = useCallback((type: 'success' | 'error', message: string) => {
    const id = _nextId++;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  return { toasts, notify, dismiss };
}
