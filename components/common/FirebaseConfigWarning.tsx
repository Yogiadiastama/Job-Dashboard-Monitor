import React from 'react';

const FirebaseConfigWarning: React.FC = () => {
    return (
        <div className="min-h-screen bg-red-50 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-8 max-w-2xl w-full border-l-4 border-red-500">
                <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
                    Konfigurasi Firebase Diperlukan
                </h1>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                    Aplikasi ini memerlukan koneksi ke Firebase. Salin konfigurasi proyek Anda ke dalam file <code className="bg-gray-200 dark:bg-gray-700 p-1 rounded text-sm font-mono">services/firebase.ts</code>.
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Anda bisa mendapatkan konfigurasi ini dari Firebase Console di jalur: <br />
                    <span className="font-semibold">Project Settings → General → Your apps → SDK setup and configuration.</span>
                </p>
            </div>
        </div>
    );
};

export default FirebaseConfigWarning;
