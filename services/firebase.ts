import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "dashboard-app-final.firebaseapp.com",
  projectId: "dashboard-app-final",
  storageBucket: "dashboard-app-final.appspot.com",
  messagingSenderId: "72857853228",
  appId: "1:72857853228:web:7de9a0dceada37dc79a089"
};

// A simple check to see if the config is filled out. This is used by App.tsx to show a helpful warning.
export const isConfigured = firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("YOUR_");

// Initialize Firebase directly.
// This approach is more robust. If the configuration is invalid,
// it will throw a clear error on application load instead of failing later.
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Enable Firestore offline persistence
enableIndexedDbPersistence(db, { cacheSizeBytes: CACHE_SIZE_UNLIMITED })
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled
      // in one tab at a time.
      console.warn('Firestore persistence failed: Multiple tabs open. Offline functionality may be limited.');
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the
      // features required to enable persistence
      console.warn('Firestore persistence not available in this browser. Offline functionality will be disabled.');
    }
  });


export { auth, db, storage };