import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { NotificationProvider } from './hooks/useNotification';
import { isConfigured } from './services/firebase';
import LoginPage from './components/auth/LoginPage';
import MainLayout from './components/layout/MainLayout';
import LoadingSpinner from './components/common/LoadingSpinner';

// A component to show a warning if Firebase is not configured.
const FirebaseConfigWarning = () => (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-lg">
            <h1 className="text-2xl font-bold text-red-700 mb-4">Konfigurasi Firebase Diperlukan</h1>
            <p className="text-gray-700">
                Aplikasi ini memerlukan koneksi ke Firebase. Salin konfigurasi proyek Anda ke dalam file `services/firebase.ts`.
            </p>
             <p className="mt-4 text-sm text-gray-500">
                Anda bisa mendapatkan konfigurasi ini dari Firebase Console di jalur: Project Settings → General → Your apps → SDK setup and configuration.
            </p>
        </div>
    </div>
);

// Component to handle the main application logic: show login or main app.
const AppContent = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <LoadingSpinner text="Memuat Aplikasi..." />
            </div>
        );
    }

    // If a user is logged in, show the main application layout, otherwise show the login page.
    return user ? (
        <DndProvider backend={HTML5Backend}>
            <MainLayout />
        </DndProvider>
    ) : (
        <LoginPage />
    );
};

// The main App component that wraps everything.
export default function App() {
    // First, check if the Firebase configuration has been set.
    if (!isConfigured) {
        return <FirebaseConfigWarning />;
    }
    
    // If configured, provide the authentication context to the rest of the app.
    return (
        <AuthProvider>
            <NotificationProvider>
                <ThemeProvider>
                    <AppContent />
                </ThemeProvider>
            </NotificationProvider>
        </AuthProvider>
    );
}
