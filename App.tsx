
import React from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { isConfigured } from './services/firebase';
import LoginPage from './components/auth/LoginPage';
import MainLayout from './components/layout/MainLayout';
import LoadingSpinner from './components/common/LoadingSpinner';

const FirebaseNotConfigured: React.FC = () => (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-lg">
            <h1 className="text-2xl font-bold text-red-700 mb-4">Konfigurasi Firebase Diperlukan</h1>
            <p className="text-gray-700">
                Aplikasi ini memerlukan koneksi ke Firebase untuk berfungsi. Silakan ganti placeholder `firebaseConfig` di dalam file `services/firebase.ts` dengan konfigurasi proyek Firebase Anda sendiri.
            </p>
            <p className="mt-4 text-sm text-gray-500">
                Anda bisa mendapatkan konfigurasi ini dari Firebase Console (Project Settings > General > Your apps > SDK setup and configuration).
            </p>
        </div>
    </div>
);

const AppContent: React.FC = () => {
    const { user, loading } = useAuth();
    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900"><LoadingSpinner /></div>;
    }
    return user ? <MainLayout /> : <LoginPage />;
};

const App: React.FC = () => {
    if (!isConfigured) {
        return <FirebaseNotConfigured />;
    }
    
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
