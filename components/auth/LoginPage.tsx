import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { ICONS } from '../../constants';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        let finalEmail = email;
        // Special handling for the 'admin' username for convenience.
        // All other users must enter their full email address.
        if (email.toLowerCase() === 'admin' && !email.includes('@')) {
            finalEmail = 'admin@proapp.local';
        }

        try {
            await signInWithEmailAndPassword(auth, finalEmail, password);
        } catch (err) {
            setError('Login Gagal. Periksa kembali email dan password Anda.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-500">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-8 transform transition-all hover:scale-105 duration-500">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">ProjectFlow Pro</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">Manajemen Proyek Generasi Berikutnya</p>
                    </div>
                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="username">
                                Email atau Username 'admin'
                            </label>
                            <input
                                className="shadow-inner appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-200 dark:bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                                id="username"
                                type="text"
                                placeholder="e.g., user@example.com atau admin"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-6 relative">
                            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="password">
                                Password
                            </label>
                            <input
                                className="shadow-inner appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-200 dark:bg-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="******************"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 top-7 pr-3 flex items-center text-sm leading-5">
                                {showPassword ? <span className="text-gray-500">{ICONS.eyeOff}</span> : <span className="text-gray-500">{ICONS.eye}</span>}
                            </button>
                        </div>
                        {error && <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 text-center animate-shake">{error}</p>}
                        <div className="flex items-center justify-between">
                            <button
                                className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-all duration-300 transform hover:-translate-y-1 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? 'Logging in...' : 'Login'}
                            </button>
                        </div>
                    </form>
                </div>
                <p className="text-center text-gray-500 text-xs mt-6">
                    &copy;2025 Your Company. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
