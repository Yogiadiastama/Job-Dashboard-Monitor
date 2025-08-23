import React, { useState, createContext, useContext, ReactNode, useCallback, useEffect } from 'react';

type NotificationType = 'warning' | 'error' | 'success' | 'info';

interface NotificationState {
    message: string;
    type: NotificationType;
    visible: boolean;
}

interface NotificationContextType {
    notification: NotificationState;
    showNotification: (message: string, type: NotificationType) => void;
    hideNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notification, setNotification] = useState<NotificationState>({
        message: '',
        type: 'info',
        visible: false,
    });

    const showNotification = useCallback((message: string, type: NotificationType) => {
        setNotification({ message, type, visible: true });
    }, []);

    const hideNotification = useCallback(() => {
        setNotification((prev) => ({ ...prev, visible: false }));
    }, []);

    const value = { notification, showNotification, hideNotification };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

// --- Connectivity Context ---

interface ConnectivityContextType {
    isOffline: boolean;
    setOffline: (status: boolean, fromFirebase?: boolean) => void;
}

const ConnectivityContext = createContext<ConnectivityContextType | undefined>(undefined);

export const ConnectivityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const { showNotification } = useNotification();

    const setOffline = useCallback((status: boolean, fromFirebase: boolean = false) => {
        if (status === isOffline) return; // Only trigger on state change

        if (status) {
            const message = fromFirebase
                ? "Koneksi ke server gagal. Beralih ke mode offline."
                : "Koneksi internet terputus. Beralih ke mode offline.";
            showNotification(message, 'warning');
        } else {
            showNotification("Koneksi pulih. Anda kembali online.", 'success');
        }
        setIsOffline(status);
    }, [isOffline, showNotification]);

    useEffect(() => {
        const handleOnline = () => setOffline(false);
        const handleOffline = () => setOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [setOffline]);

    const value = { isOffline, setOffline };

    return (
        <ConnectivityContext.Provider value={value}>
            {children}
        </ConnectivityContext.Provider>
    );
};

export const useConnectivity = () => {
    const context = useContext(ConnectivityContext);
    if (context === undefined) {
        throw new Error('useConnectivity must be used within a ConnectivityProvider');
    }
    return context;
};
