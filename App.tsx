import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { NotificationProvider, ConnectivityProvider } from './hooks/useNotification';
import { CustomizationProvider } from './hooks/useCustomization';
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
    const { user, userData, loading: authLoading } = useAuth();
    const { loading: themeLoading } = useTheme();

    // Centralized loading check for both auth and theme data
    if (authLoading || themeLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
                <LoadingSpinner text="Initializing App..." />
            </div>
        );
    }

    // If a user is logged in and we have their data, show the main app.
    if (user && userData) {
        return (
            <DndProvider backend={HTML5Backend}>
                <MainLayout />
            </DndProvider>
        );
    }

    // If there's no user, or user data failed to load, show the login page.
    return <LoginPage />;
};


// The main App component that wraps everything.
export default function App() {
    // First, check if the Firebase configuration has been set.
    if (!isConfigured) {
        return <FirebaseConfigWarning />;
    }
    
    // If configured, provide the authentication context to the rest of the app.
    return (
        <NotificationProvider>
            <ConnectivityProvider>
                <AuthProvider>
                    <ThemeProvider>
                        <CustomizationProvider>
                            <AppContent />
                        </CustomizationProvider>
                    </ThemeProvider>
                </AuthProvider>
            </ConnectivityProvider>
        </NotificationProvider>
    );
}
