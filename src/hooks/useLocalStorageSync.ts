import { useEffect, useRef, useState, useCallback } from 'react';
import { AttemptState, TrackId } from '../types';
import { saveAttemptState, loadAttemptState } from '../services/storage';

interface UseLocalStorageSyncOptions {
  state: AttemptState;
  trackId: TrackId;
  debounceMs?: number;
}

interface UseLocalStorageSyncReturn {
  lastSavedAt: string;
  isSaving: boolean;
  forceSave: () => void;
  restoreState: () => AttemptState | null;
}

/**
 * Custom hook that manages assessment state local persistence & automatic recovery.
 * Debounces rapid writes, synchronizes to localStorage on every change, and handles
 * beforeunload to guarantee zero progress loss on page reloads or network hiccups.
 */
export function useLocalStorageSync({
  state,
  trackId,
  debounceMs = 400,
}: UseLocalStorageSyncOptions): UseLocalStorageSyncReturn {
  const [lastSavedAt, setLastSavedAt] = useState<string>(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [isSaving, setIsSaving] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const performSave = useCallback(() => {
    try {
      setIsSaving(true);
      saveAttemptState(stateRef.current);
      setLastSavedAt(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch (err) {
      console.error('Failed to sync assessment state to localStorage:', err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Save when state changes (debounced)
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [state, debounceMs, performSave]);

  // Synchronous flush on window unload/page refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveAttemptState(stateRef.current);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const forceSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    performSave();
  }, [performSave]);

  const restoreState = useCallback(() => {
    return loadAttemptState(trackId);
  }, [trackId]);

  return {
    lastSavedAt,
    isSaving,
    forceSave,
    restoreState,
  };
}
