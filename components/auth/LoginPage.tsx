
import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from '@firebase/auth';
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
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [setupLoading, setSetupLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isResetMode, setIsResetMode] = useState(false);
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
                return 'User not found. Please check the email address.';
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
            case 'auth/invalid-email':
                return 'Invalid email format.';
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
        setMessage('');
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

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        if (!email.includes('@')) {
            setError('Please enter a valid email address to reset password.');
            setLoading(false);
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            setMessage(`Password reset link sent to ${email}. Please check your inbox.`);
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
    
    const containerClasses = `
        relative min-h-screen flex items-center justify-center p-4
        transition-colors duration-500 bg-cover bg-center
        ${isCanvaEmbed ? 'bg-slate-900' : 'bg-slate-50 dark:bg-slate-900'}
    `;

    return (
        <div 
            className={containerClasses}
            style={!isCanvaEmbed && themeSettings.loginBgUrl ? { backgroundImage: `url(${themeSettings.loginBgUrl})` } : {}}
        >
            {isCanvaEmbed && themeSettings.loginBgUrl && (
                 <iframe
                    key={themeSettings.loginBgUrl}
                    className="absolute w-full h-full top-0 left-0 border-none pointer-events-none"
                    src={themeSettings.loginBgUrl}
                    allowFullScreen
                    allow="fullscreen"
                    title="Login Background"
                ></iframe>
            )}
            
            <div className="w-full max-w-sm z-10 animate-fade-in-down">
                <div className="bg-white dark:bg-slate-800/90 shadow-2xl rounded-2xl p-8 backdrop-blur-sm border border-slate-200 dark:border-slate-700">
                    <div className="text-center mb-8">
                         <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                            {isResetMode ? 'Reset Password' : (
                                <EditableText 
                                    as="span" 
                                    contentKey="login.title" 
                                    defaultText={defaultTextContent['login.title']} 
                                />
                            )}
                         </h1>
                         <p className="mt-2 text-slate-500 dark:text-slate-400">
                            {isResetMode 
                                ? 'Enter your email to receive a reset link.' 
                                : (
                                    <EditableText 
                                        as="span" 
                                        contentKey="login.subtitle" 
                                        defaultText={defaultTextContent['login.subtitle']}
                                    />
                                )
                            }
                         </p>
                    </div>

                    {!isResetMode ? (
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
                            
                            <div className="flex justify-end">
                                <button 
                                    type="button" 
                                    onClick={() => { setIsResetMode(true); setError(''); setMessage(''); }}
                                    className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                                >
                                    Forgot Password?
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
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-6">
                             <div>
                                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300" htmlFor="reset-email">
                                    Email Address
                                </label>
                                <input
                                    className="appearance-none border border-slate-300 dark:border-slate-600 rounded-lg w-full py-3 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-primary-500 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                                    id="reset-email"
                                    type="email"
                                    placeholder="e.g., user@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            {error && <p className="bg-danger-bg border border-danger-border text-danger-text px-4 py-3 rounded-lg relative text-center text-sm animate-shake">{error}</p>}
                            {message && <p className="bg-success-bg border border-success-border text-success-text px-4 py-3 rounded-lg relative text-center text-sm">{message}</p>}

                            <div className="space-y-3">
                                <button
                                    className={`w-full text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg ${loading ? 'opacity-50 cursor-not-allowed bg-primary-400' : 'bg-primary-600 hover:bg-primary-700'}`}
                                    type="submit"
                                    disabled={loading}
                                >
                                    {loading ? 'Sending...' : 'Send Reset Link'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setIsResetMode(false); setError(''); setMessage(''); }}
                                    className="w-full text-slate-600 dark:text-slate-300 font-semibold py-3 px-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Back to Login
                                </button>
                            </div>
                        </form>
                    )}

                    {!isResetMode && (
                        <div className="text-center mt-8">
                             <button
                                onClick={handleInitialAdminSetup}
                                disabled={setupLoading}
                                className="text-xs text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 disabled:opacity-50 transition-colors"
                            >
                                {setupLoading ? 'Creating admin...' : 'Initial Admin Setup (First time only)'}
                            </button>
                        </div>
                    )}
                </div>
                <p className="text-center text-slate-500 dark:text-slate-400 text-xs mt-6">
                    &copy;2025 Your Company. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
