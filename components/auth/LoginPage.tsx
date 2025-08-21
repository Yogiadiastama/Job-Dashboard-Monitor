import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from '@firebase/auth';
import { collection, getDocs, setDoc, doc } from '@firebase/firestore';
import { auth, db } from '../../services/firebase';
import { ICONS } from '../../constants';
import { useTheme } from '../../hooks/useTheme';

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
            className="min-h-screen bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center p-4 transition-colors duration-500 bg-cover bg-center"
            style={loginPageStyle}
        >
            <div className="absolute inset-0 bg-neutral-950 bg-opacity-60"></div>
            <div className="w-full max-w-md z-10">
                <div className="bg-white/80 dark:bg-neutral-900/80 shadow-xl rounded-2xl p-8 backdrop-blur-lg">
                    <div className="text-center mb-8">
                        <div className="inline-block p-3 rounded-full bg-primary-100 dark:bg-primary-900/50 mb-4">
                             <svg className="h-8 w-8 text-primary-600 dark:text-primary-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-neutral-800 dark:text-white">{themeSettings.headerTitle}</h1>
                        <p className="text-neutral-500 dark:text-neutral-400 mt-2">Manajemen Proyek Generasi Berikutnya</p>
                    </div>
                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                            <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2" htmlFor="username">
                                Email atau Username 'admin'
                            </label>
                            <input
                                className="appearance-none border border-neutral-300 dark:border-neutral-700 rounded-lg w-full py-3 px-4 text-neutral-700 dark:text-neutral-200 bg-white/50 dark:bg-neutral-800/50 leading-tight focus:outline-none focus:ring-2 focus:ring-primary-500"
                                id="username"
                                type="text"
                                placeholder="e.g., user@example.com atau admin"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-6 relative">
                            <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2" htmlFor="password">
                                Password
                            </label>
                            <input
                                className="appearance-none border border-neutral-300 dark:border-neutral-700 rounded-lg w-full py-3 px-4 text-neutral-700 dark:text-neutral-200 bg-white/50 dark:bg-neutral-800/50 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-primary-500"
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Masukkan password Anda"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 top-7 pr-3 flex items-center text-sm leading-5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                                {showPassword ? ICONS.eyeOff : ICONS.eye}
                            </button>
                        </div>
                        {error && <p className="bg-danger-bg border border-danger text-danger-text px-4 py-3 rounded-lg relative mb-4 text-center animate-shake">{error}</p>}
                        <div className="flex items-center justify-between">
                            <button
                                className={`w-full text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                            className="text-sm text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 disabled:opacity-50"
                        >
                            {setupLoading ? 'Membuat admin...' : 'Setup Akun Admin Awal (Hanya untuk pertama kali)'}
                        </button>
                    </div>
                </div>
                <p className="text-center text-neutral-400 text-xs mt-6">
                    &copy;2025 Your Company. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default LoginPage;