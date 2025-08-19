import React, { useEffect } from 'react';
import { useNotification } from '../../hooks/useNotification';

const NotificationBanner: React.FC = () => {
    const { notification, hideNotification } = useNotification();
    const { message, type, visible } = notification;

    useEffect(() => {
        if (visible && (type === 'success' || type === 'info')) {
            const timer = setTimeout(() => {
                hideNotification();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [visible, type, hideNotification]);

    if (!visible) {
        return null;
    }

    const baseClasses = 'w-full p-4 text-white text-center text-sm font-medium flex justify-between items-center transition-all duration-300 animate-fade-in-up';
    const typeClasses = {
        warning: 'bg-yellow-500',
        error: 'bg-red-500',
        success: 'bg-green-500',
        info: 'bg-blue-500',
    };

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`}>
            <span>{message}</span>
            <button onClick={hideNotification} className="p-1 rounded-full hover:bg-black/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

export default NotificationBanner;
