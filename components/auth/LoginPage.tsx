import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from '@firebase/auth';
import { collection, getDocs, setDoc, doc } from '@firebase/firestore';
import { auth, db } from '../../services/firebase';
import { ICONS } from '../../constants';
import { useTheme } from '../../hooks/useTheme';
import EditableText from '../common/EditableText';
import { defaultTextContent } from '../../hooks/useCustomization';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [setupLoading, setSetupLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { themeSettings } = useTheme();

    const getFriendlyErrorMessage = (err: { code?: string, message?: string }): string => {
        const errorCode = err.code || '';
        const errorMessage = err.message || '';
        const combinedErrorString = `${errorCode} ${errorMessage}`;
        
        if (combinedErrorString.includes('requests-from-referer') || errorCode === 'auth/unauthorized-domain') {
            let domain = window.location.hostname;
            
            // This regex correctly captures domains with hyphens from "...-are-blocked" error messages.
            const domainMatch = combinedErrorString.match(/https?:\/\/([^\s)]+)-are-blocked/);
            if (domainMatch && domainMatch[1]) {
                domain = domainMatch[1];
            }
            
            if (domain && domain !== 'localhost') {
                return `Domain aplikasi ('${domain}') tidak diotorisasi. Buka Firebase Console > Authentication > Settings > Authorized domains, lalu tambahkan: ${domain} (tanpa "https://"). Ini adalah masalah umum di lingkungan pratinjau.`;
            }
            
            return `Domain aplikasi ini tidak diotorisasi oleh Firebase. Buka Firebase Console > Authentication > Settings > Authorized domains, lalu tambahkan domain tempat aplikasi ini berjalan.`;
        }

        switch (errorCode) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Login Gagal. Periksa kembali email dan password Anda.';
            case 'auth/network-request-failed':
                return 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
            case 'auth/operation-not-allowed':
                return 'Operasi ini tidak diizinkan oleh Firebase. Periksa pengaturan API key dan otorisasi domain di Google Cloud & Firebase Console.';
            case 'auth/email-already-in-use':
                return 'Email ini sudah terdaftar. Silakan gunakan email lain.';
            case 'auth/weak-password':
                return 'Password terlalu lemah. Gunakan minimal 6 karakter.';
            default:
                 if (combinedErrorString.includes('unavailable')) {
                     return 'Gagal terhubung ke server. Periksa koneksi internet Anda. Aplikasi mungkin berjalan dalam mode offline.';
                }
                return `Terjadi kesalahan yang tidak diketahui (${errorCode}). Silakan coba lagi.`;
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        let finalEmail = email;
        if (email.toLowerCase() === 'admin' && !email.includes('@')) {
            finalEmail = 'admin@proapp.local';
        }

        try {
            await signInWithEmailAndPassword(auth, finalEmail, password);
        } catch (err) {
            const firebaseError = err as { code?: string, message?: string };
            setError(getFriendlyErrorMessage(firebaseError));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleInitialAdminSetup = async () => {
        setSetupLoading(true);
        setError('');
        try {
            const usersCollection = collection(db, 'users');
            const usersSnapshot = await getDocs(usersCollection);

            if (!usersSnapshot.empty) {
                alert('Setup sudah selesai. Akun admin sudah ada.');
                setSetupLoading(false);
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, 'admin@proapp.local', 'Admin123');
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                nama: "Admin Utama",
                email: "admin@proapp.local",
                noWhatsapp: "081234567890",
                role: "admin",
                uid: user.uid
            });
            alert("Akun admin berhasil dibuat! Anda sekarang bisa login dengan email 'admin@proapp.local' atau username 'admin' dan password 'Admin123'.");

        } catch (error) {
            console.error("Error creating initial admin: ", error);
            const firebaseError = error as { code?: string; message?: string };
            const friendlyMessage = getFriendlyErrorMessage(firebaseError);
            setError(`Gagal membuat admin. Error: ${friendlyMessage}`);
        } finally {
            setSetupLoading(false);
        }
    };
    
    const loginPageStyle = themeSettings.loginBgUrl ? { backgroundImage: `url(${themeSettings.loginBgUrl})` } : {};

    return (
        <div 
            className="min-h-screen flex items-center justify-center p-4 transition-colors duration-500 bg-cover bg-center"
            style={{ ...loginPageStyle, backgroundColor: 'var(--app-bg)' }}
        >
            <div className="absolute inset-0 bg-black bg-opacity-50"></div>
            <div className="w-full max-w-md z-10">
                <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-8 transform transition-all hover:scale-105 duration-500 bg-opacity-90 dark:bg-opacity-90 backdrop-blur-sm" style={{backgroundColor: 'var(--card-bg)'}}>
                    <div className="text-center mb-8">
                         <EditableText 
                            as="h1" 
                            contentKey="login.title" 
                            defaultText={defaultTextContent['login.title']} 
                            className="text-3xl font-bold" 
                            style={{color: 'var(--text-primary)'}}
                        />
                        <EditableText 
                            as="p" 
                            contentKey="login.subtitle" 
                            defaultText={defaultTextContent['login.subtitle']}
                            className="mt-2"
                            style={{color: 'var(--text-secondary)'}}
                        />
                    </div>
                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                            <label className="block text-sm font-bold mb-2" htmlFor="username" style={{color: 'var(--text-primary)'}}>
                                Email atau Username 'admin'
                            </label>
                            <input
                                className="shadow-inner appearance-none border rounded-lg w-full py-3 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                                id="username"
                                type="text"
                                placeholder="e.g., user@example.com atau admin"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{backgroundColor: 'var(--app-bg)', color: 'var(--text-primary)'}}
                            />
                        </div>
                        <div className="mb-6 relative">
                            <label className="block text-sm font-bold mb-2" htmlFor="password" style={{color: 'var(--text-primary)'}}>
                                Password
                            </label>
                            <input
                                className="shadow-inner appearance-none border rounded-lg w-full py-3 px-4 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Masukkan password Anda"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{backgroundColor: 'var(--app-bg)', color: 'var(--text-primary)'}}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 top-7 pr-3 flex items-center text-sm leading-5">
                                {showPassword ? <span className="text-gray-500">{ICONS.eyeOff}</span> : <span className="text-gray-500">{ICONS.eye}</span>}
                            </button>
                        </div>
                        {error && <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 text-center animate-shake">{error}</p>}
                        <div className="flex items-center justify-between">
                            <button
                                className={`w-full text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-all duration-300 transform hover:-translate-y-1 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                type="submit"
                                disabled={loading}
                                style={{ backgroundColor: themeSettings.accentColor }}
                            >
                                {loading ? 'Logging in...' : 'Login'}
                            </button>
                        </div>
                    </form>
                    <div className="text-center mt-6">
                         <button
                            onClick={handleInitialAdminSetup}
                            disabled={setupLoading}
                            className="text-sm text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
                        >
                            {setupLoading ? 'Membuat admin...' : 'Setup Akun Admin Awal (Hanya untuk pertama kali)'}
                        </button>
                    </div>
                </div>
                <p className="text-center text-gray-200 text-xs mt-6">
                    &copy;2025 Your Company. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default LoginPage;