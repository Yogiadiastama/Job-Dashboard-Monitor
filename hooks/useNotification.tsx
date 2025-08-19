import React, { useState, createContext, useContext, ReactNode, useCallback } from 'react';

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
