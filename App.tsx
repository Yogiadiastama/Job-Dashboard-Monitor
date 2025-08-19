import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { NotificationProvider } from './hooks/useNotification';
import LoginPage from './components/auth/LoginPage';
import MainLayout from './components/layout/MainLayout';
import LoadingSpinner from './components/common/LoadingSpinner';

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
    // Provide the authentication context to the rest of the app.
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