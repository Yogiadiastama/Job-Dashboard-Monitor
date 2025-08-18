
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBme0QBJ2p57XROfLUF6L8cZgz5loE00Mo",
  authDomain: "dashboard-app-final.firebaseapp.com",
  projectId: "dashboard-app-final",
  storageBucket: "dashboard-app-final.firebasestorage.app",
  messagingSenderId: "72857853228",
  appId: "1:72857853228:web:7de9a0dceada37dc79a089"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

const isConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY";

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.error("Firebase initialization error.", error);
  }
}

export { auth, db, storage, isConfigured };
