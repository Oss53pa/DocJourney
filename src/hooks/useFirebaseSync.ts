/**
 * useFirebaseSync Hook
 *
 * React hook for managing Firebase real-time sync state.
 * Listens for incoming returns and processes them automatically.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSettings } from './useSettings';
import {
  initializeFirebase,
  generateChannelId,
  listenForReturns,
  processRemoteReturn,
  stopListening,
  isSyncConfigured,
  getFirebaseConfig,
} from '../services/firebaseSyncService';
import type { ReturnFileData } from '../types';

export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface PendingReturn {
  id: string;
  data: ReturnFileData;
  receivedAt: Date;
  processing: boolean;
}

export interface FirebaseSyncState {
  status: SyncStatus;
  isEnabled: boolean;
  channelId: string | null;
  pendingReturns: PendingReturn[];
  lastError: string | null;
  processedCount: number;
}

export interface UseFirebaseSyncResult extends FirebaseSyncState {
  connect: () => Promise<void>;
  disconnect: () => void;
  processReturn: (returnId: string) => Promise<{ success: boolean; message: string }>;
  clearError: () => void;
}

export function useFirebaseSync(): UseFirebaseSyncResult {
  const { settings, loading: settingsLoading } = useSettings();
  const [status, setStatus] = useState<SyncStatus>('disconnected');
  const [channelId, setChannelId] = useState<string | null>(null);
  const [pendingReturns, setPendingReturns] = useState<PendingReturn[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [processedCount, setProcessedCount] = useState(0);

  const cleanupRef = useRef<(() => void) | null>(null);
  const isConnectingRef = useRef(false);

  const isEnabled = !settingsLoading && isSyncConfigured(settings);

  // Handle new return from Firebase
  const handleNewReturn = useCallback((returnData: ReturnFileData, returnId: string) => {
    setPendingReturns(prev => {
      // Avoid duplicates
      if (prev.some(r => r.id === returnId)) {
        return prev;
      }
      return [...prev, {
        id: returnId,
        data: returnData,
        receivedAt: new Date(),
        processing: false,
      }];
    });
  }, []);

  // Auto-process returns as they come in
  const processReturnById = useCallback(async (returnId: string): Promise<{ success: boolean; message: string }> => {
    const pendingReturn = pendingReturns.find(r => r.id === returnId);
    if (!pendingReturn || !channelId) {
      return { success: false, message: 'Retour non trouvé' };
    }

    // Mark as processing
    setPendingReturns(prev =>
      prev.map(r => r.id === returnId ? { ...r, processing: true } : r)
    );

    try {
      const result = await processRemoteReturn(pendingReturn.data, returnId, channelId);

      if (result.success) {
        // Remove from pending list
        setPendingReturns(prev => prev.filter(r => r.id !== returnId));
        setProcessedCount(prev => prev + 1);
      } else {
        // Unmark processing on error
        setPendingReturns(prev =>
          prev.map(r => r.id === returnId ? { ...r, processing: false } : r)
        );
      }

      return result;
    } catch (error) {
      setPendingReturns(prev =>
        prev.map(r => r.id === returnId ? { ...r, processing: false } : r)
      );
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur de traitement',
      };
    }
  }, [pendingReturns, channelId]);

  // Connect to Firebase
  const connect = useCallback(async () => {
    if (isConnectingRef.current || status === 'connected') {
      return;
    }

    if (!isEnabled) {
      setLastError('Firebase sync non configuré');
      return;
    }

    isConnectingRef.current = true;
    setStatus('connecting');
    setLastError(null);

    try {
      const config = getFirebaseConfig(settings);
      if (!config) {
        throw new Error('Configuration Firebase invalide');
      }

      // Initialize Firebase
      const initialized = await initializeFirebase(config);
      if (!initialized) {
        throw new Error('Impossible d\'initialiser Firebase');
      }

      // Generate channel ID from owner email
      const newChannelId = await generateChannelId(settings.ownerEmail);
      setChannelId(newChannelId);

      // Start listening for returns
      const cleanup = await listenForReturns(newChannelId, handleNewReturn);
      cleanupRef.current = cleanup;

      setStatus('connected');
    } catch (error) {
      console.error('Firebase connection error:', error);
      setStatus('error');
      setLastError(error instanceof Error ? error.message : 'Erreur de connexion');
    } finally {
      isConnectingRef.current = false;
    }
  }, [isEnabled, settings, handleNewReturn, status]);

  // Disconnect from Firebase
  const disconnect = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    stopListening();
    setStatus('disconnected');
    setChannelId(null);
    setPendingReturns([]);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  // Auto-connect when settings are loaded and sync is enabled
  useEffect(() => {
    if (!settingsLoading && isEnabled && status === 'disconnected') {
      connect();
    }
  }, [settingsLoading, isEnabled, status, connect]);

  // Auto-process pending returns
  useEffect(() => {
    const unprocessed = pendingReturns.filter(r => !r.processing);
    if (unprocessed.length > 0 && channelId) {
      // Process the oldest return first
      const oldest = unprocessed[0];
      processReturnById(oldest.id);
    }
  }, [pendingReturns, channelId, processReturnById]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      stopListening();
    };
  }, []);

  return {
    status,
    isEnabled,
    channelId,
    pendingReturns,
    lastError,
    processedCount,
    connect,
    disconnect,
    processReturn: processReturnById,
    clearError,
  };
}
