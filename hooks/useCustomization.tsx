import React, { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from '@firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './useAuth';
import { CustomTextContent, CustomColors, CustomizationContextType } from '../types';

// --- Defaults ---
export const defaultTextContent: CustomTextContent = {
    'app.headerTitle': 'Job Dashboard Monitor',
    'login.title': 'Welcome Back',
    'login.subtitle': 'Sign in to access your dashboard.',
    'dashboard.title': 'Dashboard',
    'dashboard.tasks.title': 'Task Overview',
    'dashboard.trainings.title': 'Training Schedule',
    'dashboard.employeeStats.title': 'Employee Performance',
    'tasks.title': 'Task Management',
    'tasks.description': 'Organize, assign, and track all team tasks.',
    'training.title': 'Training Dashboard',
    'training.description': 'Manage all upcoming and past training sessions.',
    'analytics.title': 'Employee Analytics',
    'analytics.description': 'Visualize human resources data and insights.',
    'search.title': 'Employee Directory',
    'search.description': 'Instantly access detailed employee profiles.',
    'users.title': 'User Management',
    'settings.title': 'Settings',
};

// Colors are now handled by tailwind.config.js and this is no longer needed.
export const defaultColors: CustomColors = {};

// --- Context ---
const CustomizationContext = createContext<CustomizationContextType | undefined>(undefined);

// --- Provider ---
export const CustomizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { userData } = useAuth();
    const [isEditMode, setIsEditMode] = useState(false);
    const [textContent, setTextContent] = useState<CustomTextContent>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const textUnsub = onSnapshot(doc(db, "settings", "ui_content"), (docSnap) => {
            setTextContent(docSnap.exists() ? docSnap.data() : {});
            setLoading(false);
        }, (error) => { console.error("Error fetching text content:", error); setLoading(false); });
        
        return () => {
            textUnsub();
        };
    }, []);

    useEffect(() => {
        // Only admins can enter edit mode
        if (userData?.role !== 'admin') {
            setIsEditMode(false);
        }
    }, [userData]);

    const getText = useCallback((key: string, defaultText: string) => {
        return textContent[key] || defaultText;
    }, [textContent]);

    const updateText = useCallback(async (key: string, value: string) => {
        const newTextContent = { ...textContent, [key]: value };
        setTextContent(newTextContent);
        await setDoc(doc(db, "settings", "ui_content"), { [key]: value }, { merge: true });
    }, [textContent]);

    // Color update/reset functions are removed as this is now handled by Tailwind.
    const updateColor = async (key: string, value: string) => Promise.resolve();
    const resetColors = async () => Promise.resolve();

    const value = {
        isEditMode,
        setIsEditMode,
        textContent,
        colors: {}, // Return empty object
        getText,
        updateText,
        updateColor,
        resetColors,
    };

    return (
        <CustomizationContext.Provider value={value}>
            {!loading && children}
        </CustomizationContext.Provider>
    );
};

// --- Hook ---
export const useCustomization = () => {
    const context = useContext(CustomizationContext);
    if (context === undefined) {
        throw new Error('useCustomization must be used within a CustomizationProvider');
    }
    return context;
};