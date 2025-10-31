import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions'; // 👈 Importar Functions
const firebaseConfig = {
  apiKey: 'AIzaSyAOGDqjKHDZ9T_4stYWN2aW2I4shcJRQEg',
  authDomain: 'wild-pictures-studio-contratos.firebaseapp.com',
  projectId: 'wild-pictures-studio-contratos',
  storageBucket: 'wild-pictures-studio-contratos.appspot.com',
  messagingSenderId: '1045086853975',
  appId: '1:1045086853975:web:70e0a13ceeb2485cd13c12'
};

// ✅ Inicializar Firebase de forma segura
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Use the standard getFirestore initialization which is more compatible across
// environments. Guard functions initialization to avoid throwing if environment
// blocks network or the functions SDK cannot be initialized.
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
let _functions: ReturnType<typeof getFunctions> | null = null;
try {
  _functions = getFunctions(app, 'us-central1');
} catch (e) {
  // In some environments initialization may fail (network restrictions, CSP).
  // Fail gracefully and let callers handle missing functions reference.
  // eslint-disable-next-line no-console
  console.warn('Warning: Firebase Functions could not be initialized:', e);
}
export const functions = _functions as any;
export const firebaseProjectId = firebaseConfig.projectId;

export default app;
