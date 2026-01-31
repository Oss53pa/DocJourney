/**
 * Firebase Realtime Database Sync Service
 *
 * Handles automatic synchronization of validation returns between
 * the HTML package (participant) and the DocJourney app (owner).
 *
 * Architecture:
 * - Channel ID = SHA-256 hash of owner email (prevents enumeration)
 * - Returns stored at: /returns/{channelId}/{returnId}
 * - Anonymous auth for participants (write-only)
 * - Owner listens in real-time for new returns
 * - Auto-delete after processing
 */

import type { ReturnFileData, FirebaseSyncConfig } from '../types';
import { processReturn } from './workflowService';
import { logActivity } from './activityService';

// Firebase SDK types (loaded dynamically)
interface FirebaseApp {
  name: string;
}

interface FirebaseDatabase {
  ref: (path: string) => DatabaseReference;
}

interface DatabaseReference {
  push: () => DatabaseReference;
  set: (value: unknown) => Promise<void>;
  remove: () => Promise<void>;
  on: (event: string, callback: (snapshot: DataSnapshot) => void) => void;
  off: (event?: string) => void;
  key: string | null;
}

interface DataSnapshot {
  val: () => unknown;
  key: string | null;
  forEach: (callback: (child: DataSnapshot) => boolean | void) => boolean;
}

// Global Firebase instances
let firebaseApp: FirebaseApp | null = null;
let firebaseDb: FirebaseDatabase | null = null;
let currentListener: { ref: DatabaseReference; channelId: string } | null = null;

/**
 * Generate a channel ID from the owner's email using SHA-256 hash
 */
export async function generateChannelId(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Initialize Firebase with the provided configuration
 */
export async function initializeFirebase(config: FirebaseSyncConfig): Promise<boolean> {
  if (!config.enabled || !config.apiKey || !config.databaseURL || !config.projectId) {
    return false;
  }

  try {
    // Dynamically load Firebase SDK if not already loaded
    if (typeof (window as unknown as { firebase?: unknown }).firebase === 'undefined') {
      await loadFirebaseSDK();
    }

    const firebase = (window as unknown as { firebase: {
      initializeApp: (config: object, name?: string) => FirebaseApp;
      app: (name?: string) => FirebaseApp;
      database: (app?: FirebaseApp) => FirebaseDatabase;
      auth: (app?: FirebaseApp) => { signInAnonymously: () => Promise<unknown> };
    } }).firebase;

    // Check if already initialized
    try {
      firebaseApp = firebase.app('docjourney-sync');
    } catch {
      // Initialize new app
      firebaseApp = firebase.initializeApp({
        apiKey: config.apiKey,
        databaseURL: config.databaseURL,
        projectId: config.projectId,
      }, 'docjourney-sync');
    }

    firebaseDb = firebase.database(firebaseApp);

    // Sign in anonymously
    const auth = firebase.auth(firebaseApp);
    await auth.signInAnonymously();

    return true;
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    return false;
  }
}

/**
 * Load Firebase SDK from CDN
 */
function loadFirebaseSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof (window as unknown as { firebase?: unknown }).firebase !== 'undefined') {
      resolve();
      return;
    }

    const scripts = [
      'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',
      'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
    ];

    let loaded = 0;
    const onLoad = () => {
      loaded++;
      if (loaded === scripts.length) {
        resolve();
      }
    };

    scripts.forEach((src, index) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false; // Load in order
      script.onload = onLoad;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));

      // Delay subsequent scripts to ensure order
      setTimeout(() => document.head.appendChild(script), index * 50);
    });
  });
}

/**
 * Start listening for incoming returns on the owner's channel
 */
export async function listenForReturns(
  channelId: string,
  onNewReturn: (returnData: ReturnFileData, returnId: string) => void
): Promise<() => void> {
  if (!firebaseDb) {
    throw new Error('Firebase not initialized');
  }

  // Stop any existing listener
  if (currentListener) {
    stopListening();
  }

  const returnsRef = firebaseDb.ref(`returns/${channelId}`);

  returnsRef.on('child_added', (snapshot: DataSnapshot) => {
    const returnData = snapshot.val() as ReturnFileData;
    const returnId = snapshot.key;
    if (returnData && returnId) {
      onNewReturn(returnData, returnId);
    }
  });

  currentListener = { ref: returnsRef, channelId };

  // Return cleanup function
  return () => stopListening();
}

/**
 * Stop listening for returns
 */
export function stopListening(): void {
  if (currentListener) {
    currentListener.ref.off();
    currentListener = null;
  }
}

/**
 * Remove a processed return from Firebase
 */
export async function removeProcessedReturn(channelId: string, returnId: string): Promise<void> {
  if (!firebaseDb) {
    throw new Error('Firebase not initialized');
  }

  const returnRef = firebaseDb.ref(`returns/${channelId}/${returnId}`);
  await returnRef.remove();
}

/**
 * Process an incoming return from Firebase
 */
export async function processRemoteReturn(
  returnData: ReturnFileData,
  returnId: string,
  channelId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Process the return using the existing workflow service
    const result = await processReturn(returnData.workflowId, returnData);

    if (result.success) {
      // Remove the processed return from Firebase
      await removeProcessedReturn(channelId, returnId);

      // Log the activity
      await logActivity({
        type: 'return_imported',
        workflowId: returnData.workflowId,
        documentId: returnData.documentId,
        description: `Retour automatique reçu de ${returnData.participant.name} (sync cloud)`,
        metadata: { syncSource: 'firebase', returnId },
      });
    }

    return result;
  } catch (error) {
    console.error('Error processing remote return:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erreur lors du traitement du retour',
    };
  }
}

/**
 * Check if Firebase sync is properly configured
 */
export function isSyncConfigured(settings: {
  firebaseSyncEnabled?: boolean;
  firebaseApiKey?: string;
  firebaseDatabaseURL?: string;
  firebaseProjectId?: string;
}): boolean {
  return !!(
    settings.firebaseSyncEnabled &&
    settings.firebaseApiKey &&
    settings.firebaseDatabaseURL &&
    settings.firebaseProjectId
  );
}

/**
 * Get Firebase config from settings
 */
export function getFirebaseConfig(settings: {
  firebaseSyncEnabled?: boolean;
  firebaseApiKey?: string;
  firebaseDatabaseURL?: string;
  firebaseProjectId?: string;
}): FirebaseSyncConfig | null {
  if (!isSyncConfigured(settings)) {
    return null;
  }

  return {
    enabled: true,
    apiKey: settings.firebaseApiKey!,
    databaseURL: settings.firebaseDatabaseURL!,
    projectId: settings.firebaseProjectId!,
  };
}

/**
 * Test Firebase connection
 */
export async function testFirebaseConnection(config: FirebaseSyncConfig): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const initialized = await initializeFirebase(config);
    if (!initialized) {
      return { success: false, message: 'Impossible d\'initialiser Firebase' };
    }

    // Test write access with a temporary test node
    const testChannelId = await generateChannelId('test@docjourney.local');
    const testRef = firebaseDb!.ref(`_test/${testChannelId}`);

    await testRef.set({ test: true, timestamp: Date.now() });
    await testRef.remove();

    return { success: true, message: 'Connexion Firebase établie avec succès' };
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erreur de connexion Firebase',
    };
  }
}
