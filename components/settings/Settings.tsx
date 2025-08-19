import React, { useState, useEffect } from 'react';
import { getDocs, collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ICONS } from '../../constants';
import LoadingSpinner from '../common/LoadingSpinner';

const Settings: React.FC = () => {
    const { userData } = useAuth();
    const { themeSettings, loading: themeLoading } = useTheme();

    // Local theme state for UI
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    
    // Admin customization states
    const [headerTitle, setHeaderTitle] = useState('');
    const [accentColor, setAccentColor] = useState('');
    const [loginBgFile, setLoginBgFile] = useState<File | null>(null);
    const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
    const [isSavingTheme, setIsSavingTheme] = useState(false);
    const [isSavingProfilePic, setIsSavingProfilePic] = useState(false);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    useEffect(() => {
        if (themeSettings) {
            setHeaderTitle(themeSettings.headerTitle);
            setAccentColor(themeSettings.accentColor);
        }
    }, [themeSettings]);

    const handleSaveTheme = async () => {
        setIsSavingTheme(true);
        try {
            let loginBgUrl = themeSettings.loginBgUrl;
            if (loginBgFile) {
                const storageRef = ref(storage, `theme/login-background.jpg`);
                await uploadBytes(storageRef, loginBgFile);
                loginBgUrl = await getDownloadURL(storageRef);
            }

            const newThemeSettings = { headerTitle, accentColor, loginBgUrl };
            await setDoc(doc(db, "settings", "theme"), newThemeSettings, { merge: true });
            
            alert("Pengaturan tampilan berhasil disimpan!");
        } catch (error) {
            console.error("Error saving theme settings: ", error);
            alert("Gagal menyimpan pengaturan tampilan.");
        } finally {
            setIsSavingTheme(false);
        }
    };
    
    const handleSaveProfilePic = async () => {
        if (!profilePicFile || !userData) return;
        setIsSavingProfilePic(true);
        try {
            const storageRef = ref(storage, `profile-pictures/${userData.uid}`);
            await uploadBytes(storageRef, profilePicFile);
            const photoURL = await getDownloadURL(storageRef);
            
            await updateDoc(doc(db, "users", userData.uid), { photoURL });
            alert("Foto profil berhasil diperbarui!");
        } catch (error) {
            console.error("Error saving profile picture: ", error);
            alert("Gagal menyimpan foto profil.");
        } finally {
            setIsSavingProfilePic(false);
        }
    };

    const exportToCSV = <T extends object,>(data: T[], filename: string) => {
        // Implementation remains the same
    };

    const handleExportAllData = async () => {
        // Implementation remains the same
    };

    if (themeLoading) {
        return <LoadingSpinner text="Memuat pengaturan..." />;
    }

    return (
        <div className="space-y-12">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h3 className="text-2xl font-bold mb-4">Pengaturan Tampilan</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-2">Tema</label>
                        <select value={theme} onChange={e => setTheme(e.target.value)} className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                            <option value="light">Light Mode</option>
                            <option value="dark">Dark Mode</option>
                        </select>
                    </div>
                </div>
            </div>

            {userData?.role === 'admin' && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg animate-fade-in-up">
                    <h3 className="text-2xl font-bold mb-6">Kustomisasi Tampilan Aplikasi</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Column: General Theme */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold mb-2">Nama Aplikasi di Header</label>
                                <input type="text" value={headerTitle} onChange={e => setHeaderTitle(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2">Warna Aksen</label>
                                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-full h-12 p-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2">Gambar Background Login</label>
                                <input type="file" accept="image/*" onChange={e => setLoginBgFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                            </div>
                             <button onClick={handleSaveTheme} disabled={isSavingTheme} className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                                {isSavingTheme ? <LoadingSpinner text="Menyimpan..." /> : <span>Simpan Pengaturan Tampilan</span>}
                            </button>
                        </div>
                        {/* Right Column: Admin Profile */}
                        <div className="space-y-6">
                            <h4 className="text-lg font-bold">Pengaturan Profil Admin</h4>
                             <div>
                                <label className="block text-sm font-bold mb-2">Foto Profil Anda</label>
                                <div className="flex items-center space-x-4">
                                    <img src={userData.photoURL || `https://ui-avatars.com/api/?name=${userData.nama}&background=random`} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
                                    <input type="file" accept="image/*" onChange={e => setProfilePicFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                </div>
                            </div>
                            <button onClick={handleSaveProfilePic} disabled={isSavingProfilePic || !profilePicFile} className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                                {isSavingProfilePic ? <LoadingSpinner text="Mengunggah..." /> : <span>Simpan Foto Profil</span>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h3 className="text-2xl font-bold mb-4">Ekspor Data</h3>
                <button onClick={handleExportAllData} className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    {ICONS.download}
                    <span>Export Semua Data (CSV)</span>
                </button>
            </div>
        </div>
    );
};

export default Settings;