import { useState, useEffect, useRef, useCallback } from 'react';
import { saveSession, loadSession, clearSession } from '../services/sessionRecovery';

export function useCrashRecovery(toolKey) {
  const [hasRecoveredData, setHasRecoveredData] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const cacheChecked = useRef(false);

  useEffect(() => {
    if (cacheChecked.current) return;
    cacheChecked.current = true;

    async function checkCache() {
      const session = await loadSession(toolKey);
      if (session && session.files && session.files.length > 0) {
        setHasRecoveredData(true);
      }
    }
    checkCache();
  }, [toolKey]);

  const saveFilesToCache = useCallback(async (files, metadata = {}) => {
    if (files && files.length > 0) {
      await saveSession(toolKey, files, metadata);
    } else {
      await clearSession(toolKey);
    }
  }, [toolKey]);

  const recoverFiles = useCallback(async () => {
    setRecovering(true);
    const session = await loadSession(toolKey);
    setHasRecoveredData(false);
    setRecovering(false);
    return session || { files: [], metadata: {} };
  }, [toolKey]);

  const discardRecovery = useCallback(async () => {
    await clearSession(toolKey);
    setHasRecoveredData(false);
  }, [toolKey]);

  const clearCache = useCallback(async () => {
    await clearSession(toolKey);
  }, [toolKey]);

  return {
    hasRecoveredData,
    recovering,
    recoverFiles,
    discardRecovery,
    saveFilesToCache,
    clearCache
  };
}
