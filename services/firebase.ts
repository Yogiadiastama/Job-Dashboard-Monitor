import { initializeApp } from '@firebase/app';
import { getAuth } from '@firebase/auth';
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from '@firebase/firestore';
import { getStorage } from '@firebase/storage';

// ==========================================================================================
// KONFIGURASI FIREBASE (PROYEK LAMA: 'dashboard-app-final')
// ==========================================================================================
// Konfigurasi ini telah diperbarui untuk menunjuk ke proyek Firebase lama Anda.
// Ini memastikan bahwa aplikasi baru Anda ('jobdashboardmonitor') dapat mengakses
// semua data (pengguna, tugas, dll.) yang sudah ada tanpa perlu migrasi.
// Pastikan domain 'jobdashboardmonitor.netlify.app' telah ditambahkan ke
// "Authorized domains" di pengaturan Authentication proyek Firebase ini.
// ==========================================================================================
export const firebaseConfig = {
  apiKey: "AIzaSyBme0QBJ2p57XROfLUF6L8cZgz5loE00Mo",
  authDomain: "dashboard-app-final.firebaseapp.com",
  projectId: "dashboard-app-final",
  storageBucket: "dashboard-app-final.firebasestorage.app",
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
// The cache size settings are now passed during Firestore initialization.
const db = getFirestore(app);
const storage = getStorage(app);

// Enable Firestore offline persistence
enableIndexedDbPersistence(db)
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

export const getFirestoreErrorMessage = (error: { code?: string }): string => {
    console.error("Firestore Error:", error); // Log the full error for debugging
    switch (error.code) {
        case 'unavailable':
            return "Gagal terhubung ke server. Periksa koneksi internet Anda. Aplikasi akan berjalan dalam mode offline.";
        case 'permission-denied':
            return "Akses ditolak. Anda tidak memiliki izin untuk melihat data ini. Hubungi administrator.";
        case 'unauthenticated':
             return "Sesi Anda telah berakhir. Silakan login kembali untuk melanjutkan.";
        default:
            return "Gagal memuat data karena masalah jaringan atau server. Data yang ditampilkan mungkin sudah usang.";
    }
};

export { auth, db, storage };