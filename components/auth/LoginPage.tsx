import React, { useState } from 'react';
import { signInWithEmailAndPassword } from '@firebase/auth';
import { auth } from '../../services/firebase';
import { useTheme } from '../../hooks/useTheme';
import { useCustomization, defaultTextContent } from '../../hooks/useCustomization';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { themeSettings } = useTheme();
    const { getText } = useCustomization();

    const getFriendlyErrorMessage = (err: { code?: string, message?: string }): string => {
        const errorCode = err.code || '';
        const errorMessage = err.message || '';
        const combinedErrorString = `${errorCode} ${errorMessage}`;
        
        if (combinedErrorString.includes('requests-from-referer') || errorCode === 'auth/unauthorized-domain') {
            let extractedDomain: string | null = null;
            
            const domainMatch = combinedErrorString.match(/referer\s+(?:https?:\/\/)?([a-zA-Z0-9.-]+)/);
            if (domainMatch && domainMatch[1]) {
                extractedDomain = domainMatch[1];
            }

            const domainToDisplay = extractedDomain || window.location.hostname;
            
            if (domainToDisplay && domainToDisplay !== 'localhost') {
                return `Domain aplikasi ('${domainToDisplay}') tidak diotorisasi. Untuk memperbaikinya, buka Firebase Console > Authentication > Settings > Authorized domains, lalu tambahkan domain berikut: ${domainToDisplay}.`;
            }
            
            return `Domain aplikasi ini tidak diotorisasi oleh Firebase. Buka Firebase Console > Authentication > Settings > Authorized domains, dan tambahkan domain tempat aplikasi ini berjalan.`;
        }

        switch (errorCode) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Login Gagal. Silakan periksa email dan kata sandi Anda.';
            case 'auth/network-request-failed':
                return 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
            default:
                 if (combinedErrorString.includes('unavailable')) {
                     return 'Gagal terhubung ke server. Periksa koneksi internet Anda. Aplikasi mungkin berjalan dalam mode offline.';
                }
                return `Terjadi galat yang tidak diketahui (${errorCode}). Silakan coba lagi.`;
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        let finalEmail = email;
        // Allows admin to login with just 'admin' as username
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

    const inputStyle = "w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100";
    const labelStyle = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";
    
    return (
        <div 
            className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 bg-cover bg-center transition-colors duration-300"
            style={themeSettings.loginBgUrl ? { backgroundImage: `url(${themeSettings.loginBgUrl})` } : {}}
        >
            {/* If a custom bg is set, add an overlay for readability */}
            {themeSettings.loginBgUrl && <div className="absolute inset-0 bg-black/50 z-0"></div>}
            
            <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 space-y-6 animate-fade-in-down border border-slate-200 dark:border-slate-700">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                        {getText('app.headerTitle', defaultTextContent['app.headerTitle'])}
                    </h1>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">
                        Sign in to access your dashboard.
                    </p>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label htmlFor="email" className={labelStyle}>Email or Username</label>
                        <input
                            id="email"
                            type="text"
                            placeholder="e.g., admin or your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={inputStyle}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className={labelStyle}>Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={inputStyle}
                            required
                        />
                    </div>

                    {error && <p className="bg-red-100 border border-red-300 text-red-700 dark:bg-red-900/50 dark:border-red-700 dark:text-red-300 px-4 py-2 rounded-md text-center text-sm animate-shake">{error}</p>}
                    
                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 py-3 px-4 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
