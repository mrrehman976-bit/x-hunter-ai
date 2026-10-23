import { useState, useCallback } from 'react';
import type { XCredentials } from '@/types/settings';
import { defaultCredentials } from '@/types/settings';

export function useSettings(userId?: string) {
  // Initialize from localStorage synchronously if we have a userId
  const [credentials, setCredentials] = useState<XCredentials>(() => {
    if (!userId) return defaultCredentials;
    try {
      const raw = localStorage.getItem(`xhunter_settings_${userId}`);
      if (raw) return { ...defaultCredentials, ...JSON.parse(raw) };
    } catch {
      // ignore parse errors
    }
    return defaultCredentials;
  });
  const [saved, setSaved] = useState(false);

  const updateCredentials = useCallback((updates: Partial<XCredentials>) => {
    setCredentials((prev) => {
      const next = { ...prev, ...updates };
      // Persist to localStorage immediately on every change
      if (userId) {
        try {
          localStorage.setItem(`xhunter_settings_${userId}`, JSON.stringify(next));
        } catch (e) {
          console.error('Failed to persist settings to localStorage:', e);
        }
      }
      return next;
    });
    setSaved(false);
  }, [userId]);

  const saveCredentials = useCallback(() => {
    setSaved(true);
    // Also persist to localStorage on explicit save
    if (userId) {
      try {
        localStorage.setItem(`xhunter_settings_${userId}`, JSON.stringify(credentials));
      } catch (e) {
        console.error('Failed to save settings to localStorage:', e);
      }
    }
    setTimeout(() => setSaved(false), 3000);
  }, [userId, credentials]);

  return { credentials, setCredentials, updateCredentials, saveCredentials, saved };
}
