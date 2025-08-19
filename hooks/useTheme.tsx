import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { db, doc, onSnapshot } from '../services/firebase';
import { ThemeSettings } from '../types';
import { useNotification } from './useNotification';

interface ThemeContextType {
    themeSettings: ThemeSettings;
    loading: boolean;
}

const defaultTheme: ThemeSettings = {
    headerTitle: 'ProFlow',
    accentColor: '#4F46E5', // Indigo-600
    loginBgUrl: '',
};

const ThemeContext = createContext<ThemeContextType>({
    themeSettings: defaultTheme,
    loading: true,
});

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [themeSettings, setThemeSettings] = useState<ThemeSettings>(defaultTheme);
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();

    useEffect(() => {
        const docRef = doc(db, "settings", "theme");
        const unsubscribe = onSnapshot(docRef, 
            (docSnap) => {
                if (docSnap.exists()) {
                    setThemeSettings({ ...defaultTheme, ...docSnap.data() } as ThemeSettings);
                } else {
                    setThemeSettings(defaultTheme);
                }
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [showNotification]);

    const value = { themeSettings, loading };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    return useContext(ThemeContext);
};