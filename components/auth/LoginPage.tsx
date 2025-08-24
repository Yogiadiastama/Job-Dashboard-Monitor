
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
            const domain = window.location.hostname;
            return `Domain aplikasi ('${domain}') tidak diotorisasi. Periksa dua hal: 1) Pastikan 'firebaseConfig' di file 'services/firebase.ts' sudah benar dan menunjuk ke proyek Firebase tempat data Anda disimpan. 2) Buka Firebase Console untuk proyek tersebut, lalu di Authentication > Settings > Authorized domains, tambahkan domain: ${domain} (tanpa "https://").`;
        }

        switch (errorCode) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Login Failed. Please check your email and password.';
            case 'auth/network-request-failed':
                return 'Failed to connect to the server. Check your internet connection.';
            case 'auth/operation-not-allowed':
                return 'This operation is not allowed by Firebase. Check API key settings and domain authorization in Google Cloud & Firebase Console.';
            case 'auth/email-already-in-use':
                return 'This email is already registered. Please use another email.';
            case 'auth/weak-password':
                return 'Password is too weak. Use at least 6 characters.';
            default:
                 if (combinedErrorString.includes('unavailable')) {
                     return 'Failed to connect to the server. Check your internet connection. The app may be running in offline mode.';
                }
                return `An unknown error occurred (${errorCode}). Please try again.`;
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
                alert('Setup has already been completed. An admin account exists.');
                setSetupLoading(false);
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, 'admin@proapp.local', 'Admin123');
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                nama: "Master Admin",
                email: "admin@proapp.local",
                noWhatsapp: "081234567890",
                role: "admin",
                uid: user.uid
            });
            alert("Admin account created! You can now log in with email 'admin@proapp.local' or username 'admin' and password 'Admin123'.");

        } catch (error) {
            console.error("Error creating initial admin: ", error);
            const firebaseError = error as { code?: string; message?: string };
            const friendlyMessage = getFriendlyErrorMessage(firebaseError);
            setError(`Failed to create admin. Error: ${friendlyMessage}`);
        } finally {
            setSetupLoading(false);
        }
    };
    
    const isCanvaEmbed = themeSettings.loginBgUrl?.includes('canva.com/design');

    return (
        <div 
            className="relative min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 transition-colors duration-500 bg-cover bg-center overflow-hidden"
            style={!isCanvaEmbed && themeSettings.loginBgUrl ? { backgroundImage: `url(${themeSettings.loginBgUrl})` } : {}}
        >
            {isCanvaEmbed && (
                 <iframe
                    loading="lazy"
                    className="absolute w-full h-full top-0 left-0 border-none pointer-events-none"
                    // Scale up slightly to ensure it covers the screen and hides Canva UI elements
                    style={{ transform: 'scale(1.2)', transformOrigin: 'center' }}
                    src={themeSettings.loginBgUrl}
                    allowFullScreen
                    allow="fullscreen"
                ></iframe>
            )}
            
            {!isCanvaEmbed && themeSettings.loginBgUrl && <div className="absolute inset-0 bg-black bg-opacity-50"></div>}
            
            <div className="w-full max-w-sm z-10 animate-fade-in-down">
                <div className="bg-white dark:bg-slate-800/90 shadow-2xl rounded-2xl p-8 backdrop-blur-sm border border-slate-200 dark:border-slate-700">
                    <div className="text-center mb-8">
                         <EditableText 
                            as="h1" 
                            contentKey="login.title" 
                            defaultText={defaultTextContent['login.title']} 
                            className="text-3xl font-bold text-slate-800 dark:text-slate-100" 
                        />
                        <EditableText 
                            as="p" 
                            contentKey="login.subtitle" 
                            defaultText={defaultTextContent['login.subtitle']}
                            className="mt-2 text-slate-500 dark:text-slate-400"
                        />
                    </div>
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300" htmlFor="username">
                                Email or Username 'admin'
                            </label>
                            <input
                                className="appearance-none border border-slate-300 dark:border-slate-600 rounded-lg w-full py-3 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-primary-500 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                                id="username"
                                type="text"
                                placeholder="e.g., user@example.com or admin"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300" htmlFor="password">
                                Password
                            </label>
                            <input
                                className="appearance-none border border-slate-300 dark:border-slate-600 rounded-lg w-full py-3 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-primary-500 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 top-7 pr-3 flex items-center text-sm leading-5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                                {showPassword ? ICONS.eyeOff : ICONS.eye}
                            </button>
                        </div>
                        {error && <p className="bg-danger-bg border border-danger-border text-danger-text px-4 py-3 rounded-lg relative text-center text-sm animate-shake">{error}</p>}
                        <div>
                            <button
                                className={`w-full text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg ${loading ? 'opacity-50 cursor-not-allowed bg-primary-400' : 'bg-primary-600 hover:bg-primary-700'}`}
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? 'Logging in...' : 'Login'}
                            </button>
                        </div>
                    </form>
                    <div className="text-center mt-8">
                         <button
                            onClick={handleInitialAdminSetup}
                            disabled={setupLoading}
                            className="text-xs text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 disabled:opacity-50 transition-colors"
                        >
                            {setupLoading ? 'Creating admin...' : 'Initial Admin Setup (First time only)'}
                        </button>
                    </div>
                </div>
                <p className="text-center text-slate-500 dark:text-slate-400 text-xs mt-6">
                    &copy;2025 Your Company. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
