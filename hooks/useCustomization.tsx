import React, { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from '@firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './useAuth';
import { CustomTextContent, CustomColors, CustomizationContextType } from '../types';

// --- Defaults ---
export const defaultTextContent: CustomTextContent = {
    'app.headerTitle': 'ProjectFlow Pro',
    'login.title': 'ProjectFlow Pro',
    'login.subtitle': 'Manajemen Proyek Generasi Berikutnya',
    'dashboard.title': 'Dashboard',
    'dashboard.tasks.title': 'Ringkasan Pekerjaan',
    'dashboard.trainings.title': 'Ringkasan Training',
    'dashboard.employeeStats.title': 'Overview Pekerjaan Pegawai',
    'tasks.title': 'Manajemen Pekerjaan',
    'tasks.description': 'Kelola semua pekerjaan yang ditugaskan di sini.',
    'training.title': 'Dashboard Training',
    'training.description': 'Pantau semua jadwal dan status konfirmasi training.',
    'analytics.title': 'Info Grafik Pegawai',
    'analytics.description': 'Visualisasi data sumber daya manusia.',
    'search.title': 'Pencarian Pegawai',
    'search.description': 'Akses informasi detail pegawai secara instan.',
    'users.title': 'Manajemen Pegawai',
    'settings.title': 'Pengaturan',
};

export const defaultColors: CustomColors = {
    // Light Theme
    '--app-bg': '#F3F4F6',
    '--sidebar-bg': '#FFFFFF',
    '--header-bg': '#FFFFFF',
    '--card-bg': '#FFFFFF',
    '--text-primary': '#111827',
    '--text-secondary': '#6B7280',
    // Dark Theme (prefixed with --dark-)
    '--dark-app-bg': '#111827',
    '--dark-sidebar-bg': '#1F2937',
    '--dark-header-bg': '#1F2937',
    '--dark-card-bg': '#1F2937',
    '--dark-text-primary': '#F9FAFB',
    '--dark-text-secondary': '#9CA3AF',
};

// --- Context ---
const CustomizationContext = createContext<CustomizationContextType | undefined>(undefined);

// --- Provider ---
export const CustomizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { userData } = useAuth();
    const [isEditMode, setIsEditMode] = useState(false);
    const [textContent, setTextContent] = useState<CustomTextContent>({});
    const [colors, setColors] = useState<CustomColors>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const textUnsub = onSnapshot(doc(db, "settings", "ui_content"), (docSnap) => {
            setTextContent(docSnap.exists() ? docSnap.data() : {});
            setLoading(false);
        }, (error) => { console.error("Error fetching text content:", error); setLoading(false); });

        const colorUnsub = onSnapshot(doc(db, "settings", "ui_colors"), (docSnap) => {
            setColors(docSnap.exists() ? docSnap.data() : {});
        }, (error) => { console.error("Error fetching colors:", error); });

        return () => {
            textUnsub();
            colorUnsub();
        };
    }, []);

    useEffect(() => {
        // Only admins can enter edit mode
        if (userData?.role !== 'admin') {
            setIsEditMode(false);
        }
    }, [userData]);

    useEffect(() => {
        const finalColors = { ...defaultColors, ...colors };
        const styleId = 'custom-theme-styles';
        let styleTag = document.getElementById(styleId);
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }
        
        const css = `
        :root {
            ${Object.entries(finalColors).filter(([k]) => !k.startsWith('--dark-')).map(([k, v]) => `${k}: ${v};`).join('\n')}
        }
        html.dark {
            ${Object.entries(finalColors).filter(([k]) => k.startsWith('--dark-')).map(([k, v]) => `${k.replace('--dark-', '--')}: ${v};`).join('\n')}
        }
        `;
        styleTag.innerHTML = css;
    }, [colors]);

    const getText = useCallback((key: string, defaultText: string) => {
        return textContent[key] || defaultText;
    }, [textContent]);

    const updateText = useCallback(async (key: string, value: string) => {
        const newTextContent = { ...textContent, [key]: value };
        setTextContent(newTextContent);
        await setDoc(doc(db, "settings", "ui_content"), { [key]: value }, { merge: true });
    }, [textContent]);

    const updateColor = useCallback(async (key: string, value: string) => {
        const newColors = { ...colors, [key]: value };
        setColors(newColors);
        await setDoc(doc(db, "settings", "ui_colors"), { [key]: value }, { merge: true });
    }, [colors]);

    const resetColors = useCallback(async () => {
        setColors({}); // Revert to defaults by clearing customizations
        await setDoc(doc(db, "settings", "ui_colors"), {}); // Clear in Firestore
    }, []);

    const value = {
        isEditMode,
        setIsEditMode,
        textContent,
        colors,
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
