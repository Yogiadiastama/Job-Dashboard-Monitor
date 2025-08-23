import React, { useState, useEffect } from 'react';
import { getDocs, collection, doc, setDoc, updateDoc } from '@firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from '@firebase/storage';
import { db, storage } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useCustomization } from '../../hooks/useCustomization';
import { ICONS } from '../../constants';
import LoadingSpinner from '../common/LoadingSpinner';

const Settings: React.FC = () => {
    const { userData } = useAuth();
    const { themeSettings, loading: themeLoading } = useTheme();
    const { isEditMode, setIsEditMode } = useCustomization();

    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    
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
    
    const handleSaveTheme = async () => {
        setIsSavingTheme(true);
        try {
            let loginBgUrl = themeSettings.loginBgUrl;
            if (loginBgFile) {
                const storageRef = ref(storage, `theme/login-background.jpg`);
                await uploadBytes(storageRef, loginBgFile);
                loginBgUrl = await getDownloadURL(storageRef);
            }

            const newThemeSettings = { ...themeSettings, loginBgUrl };
            await setDoc(doc(db, "settings", "theme"), newThemeSettings, { merge: true });
            
            alert("Display settings saved successfully!");
        } catch (error) {
            console.error("Error saving theme settings: ", error);
            alert("Failed to save display settings.");
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
            alert("Profile picture updated successfully!");
        } catch (error) {
            console.error("Error saving profile picture: ", error);
            alert("Failed to save profile picture.");
        } finally {
            setIsSavingProfilePic(false);
        }
    };

    const handleExportAllData = async () => {
        alert("This feature is coming soon!");
    };

    if (themeLoading || !userData) {
        return <LoadingSpinner text="Loading settings..." />;
    }
    
    const renderSettingCard = (title: string, children: React.ReactNode) => (
         <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">{title}</h3>
            <div className="space-y-4">
                {children}
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in-down">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-8">
                    {renderSettingCard("Display", (
                        <div>
                            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Theme</label>
                            <select value={theme} onChange={e => setTheme(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-primary-500 focus:border-primary-500">
                                <option value="light">Light Mode</option>
                                <option value="dark">Dark Mode</option>
                            </select>
                        </div>
                    ))}

                    {userData.role === 'admin' && renderSettingCard("UI Customization", (
                        <div className="flex items-center space-x-4 p-4 bg-blue-50 dark:bg-primary-900/30 border border-blue-200 dark:border-primary-800 rounded-lg">
                           <label htmlFor="edit-mode-toggle" className="flex items-center cursor-pointer">
                               <div className="relative">
                                   <input type="checkbox" id="edit-mode-toggle" className="sr-only" checked={isEditMode} onChange={() => setIsEditMode(!isEditMode)} />
                                   <div className="block bg-slate-600 w-14 h-8 rounded-full"></div>
                                   <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${isEditMode ? 'transform translate-x-full bg-primary-600' : ''}`}></div>
                               </div>
                           </label>
                           <div>
                               <p className="font-semibold text-slate-800 dark:text-slate-100">UI Edit Mode</p>
                               <p className="text-sm text-slate-500 dark:text-slate-400">Enable to edit text directly on any page.</p>
                           </div>
                       </div>
                    ))}

                    {renderSettingCard("Data Export", (
                         <button onClick={handleExportAllData} className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                            {ICONS.download}
                            <span>Export All Data (CSV)</span>
                        </button>
                    ))}
                </div>

                {/* Right Column for Admin */}
                 <div className="space-y-8">
                    {userData.role === 'admin' && renderSettingCard("Application Branding", (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Login Page Background</label>
                                <input type="file" accept="image/*" onChange={e => setLoginBgFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                            </div>
                             <button onClick={handleSaveTheme} disabled={isSavingTheme} className="w-full flex items-center justify-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50">
                                {isSavingTheme ? <LoadingSpinner text="Saving..." /> : <span>Save Branding</span>}
                            </button>
                        </>
                    ))}

                    {renderSettingCard("My Profile", (
                        <>
                            <div>
                               <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">My Profile Picture</label>
                               <div className="flex items-center space-x-4">
                                   <img src={userData.photoURL || `https://ui-avatars.com/api/?name=${userData.nama}&background=random`} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
                                   <input type="file" accept="image/*" onChange={e => setProfilePicFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                               </div>
                           </div>
                           <button onClick={handleSaveProfilePic} disabled={isSavingProfilePic || !profilePicFile} className="w-full flex items-center justify-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50">
                               {isSavingProfilePic ? <LoadingSpinner text="Uploading..." /> : <span>Save Profile Picture</span>}
                           </button>
                        </>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Settings;
