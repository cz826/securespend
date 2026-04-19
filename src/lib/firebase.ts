import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Connection test as required by instructions
async function testConnection() {
  try {
    // We use a dummy path to test server connectivity
    await getDocFromServer(doc(db, '_internal_', 'probe'));
  } catch (error: any) {
    if (error?.message?.includes('offline')) {
      console.warn("Firebase client is offline. Features may be limited.");
    }
  }
}
testConnection();

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: any[];
  }
}

export function handleFirestoreError(error: any, operation: FirestoreErrorInfo['operationType'], path: string | null): never {
  const authInfo = {
    userId: auth.currentUser?.uid || 'anonymous',
    email: auth.currentUser?.email || 'none',
    emailVerified: auth.currentUser?.emailVerified || false,
    isAnonymous: auth.currentUser?.isAnonymous || true,
    providerInfo: auth.currentUser?.providerData || []
  };

  const errorInfo: FirestoreErrorInfo = {
    error: error.message || 'Unknown error',
    operationType: operation,
    path,
    authInfo
  };

  throw new Error(JSON.stringify(errorInfo));
}
