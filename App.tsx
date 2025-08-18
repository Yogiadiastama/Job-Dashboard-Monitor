import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, writeBatch } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// --- Type Definitions ---
type UserRole = 'pegawai' | 'pimpinan' | 'admin';
type TaskStatus = 'Pending' | 'On Progress' | 'Completed';
type TaskPriority = 'Low' | 'Mid' | 'High';

interface UserData {
  id: string;
  uid: string;
  nama: string;
  email: string;
  noWhatsapp: string;
  role: UserRole;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  fileUrl?: string;
  rating?: number;
}

interface AuthContextType {
    user: User | null;
    userData: UserData | null;
    loading: boolean;
}

// --- Ikon SVG untuk UI yang lebih baik ---
const icons = {
  dashboard: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  tasks: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
  users: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  settings: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  logout: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  add: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>,
  edit: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>,
  delete: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
  upload: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>,
  whatsapp: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.487 5.235 3.487 8.413 0 6.557-5.338 11.892-11.894 11.892-1.99 0-3.896-.539-5.626-1.528L.057 24zM7.327 21.188c1.442.84 3.146 1.319 4.901 1.319 5.462 0 9.904-4.443 9.904-9.904s-4.442-9.904-9.904-9.904-9.903 4.443-9.903 9.904c0 2.021.601 3.931 1.687 5.625L4.831 19.82l2.496 1.368zM9.232 8.231c-.229-.481-.46-.49-.66-.498-.182-.008-.387-.008-.591 0-.205 0-.533.07-.817.387-.283.316-.94.922-.94 2.246s.964 2.602 1.095 2.774c.131.171 1.899 3.083 4.613 4.032.609.213 1.106.337 1.492.43.61.146 1.164.12 1.613-.087.502-.231 1.354-.666 1.546-1.311.192-.645.192-1.191.131-1.311-.06-.12-.229-.196-.482-.341-.254-.146-1.5- .737-1.732-.819-.232-.082-.399-.12-.566.12-.167.239-.656.819-.803.981-.148.161-.296.181-.548.06-.254-.12-.94- .316-1.899-1.147-.748-.656-1.229-1.476-1.386-1.716-.158-.24-.025-.387.111-.508.121-.107.27-.282.404-.422.135-.142.182-.24.272-.4-.091-.161-.045-.306-.091-.422-.045-.116-.566-1.354-.76-1.836z"/></svg>,
  star: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>,
  chart: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>,
  table: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM4 8h5v2H4V8z" clipRule="evenodd" /></svg>,
  download: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>,
  drag: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>,
  eye: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  eyeOff: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>,
};

// --- Konfigurasi Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyBme0QBJ2p57XROfLUF6L8cZgz5loE00Mo",
  authDomain: "dashboard-app-final.firebaseapp.com",
  projectId: "dashboard-app-final",
  storageBucket: "dashboard-app-final.appspot.com",
  messagingSenderId: "72857853228",
  appId: "1:72857853228:web:7de9a0dceada37dc79a089"
};

// --- Inisialisasi Firebase ---
let app, auth, db, storage;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
} catch (error) {
    console.error("Firebase initialization error. Please provide your Firebase config.", error);
}

// --- Konteks untuk Autentikasi dan Data Pengguna ---
const AuthContext = createContext<AuthContextType>({ user: null, userData: null, loading: true });

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                // Ambil data pengguna dari Firestore
                const userDocRef = doc(db, "users", firebaseUser.uid);
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    setUserData({ id: docSnap.id, ...docSnap.data() } as UserData);
                } else {
                    console.log("No such user document!");
                    setUserData(null);
                }
            } else {
                setUser(null);
                setUserData(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const value = { user, userData, loading };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// Hook untuk menggunakan konteks Auth
const useAuth = (): AuthContextType => {
    return useContext(AuthContext);
};

// --- Komponen Halaman Login ---
const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        let loginEmail = email;
        // Logika khusus untuk username
        if (!email.includes('@')) {
            if (email.toLowerCase() === 'admin') {
                loginEmail = 'admin@proapp.local';
            } else {
                loginEmail = `${email.toLowerCase()}@proapp.local`;
            }
        }

        try {
            await signInWithEmailAndPassword(auth, loginEmail, password);
        } catch (err) {
            setError('Login Gagal. Periksa kembali username dan password Anda.');
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
                                Username
                            </label>
                            <input
                                className="shadow-inner appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-200 dark:bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                                id="username"
                                type="text"
                                placeholder="e.g., admin atau yogi"
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
                                {showPassword ? <span className="text-gray-500">{icons.eyeOff}</span> : <span className="text-gray-500">{icons.eye}</span>}
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

// --- Komponen Utama Aplikasi (Setelah Login) ---
const MainApp = () => {
    const { userData } = useAuth();
    const [activeMenu, setActiveMenu] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const handleLogout = async () => {
        await signOut(auth);
    };
    
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: icons.dashboard, roles: ['pegawai', 'pimpinan', 'admin'] },
        { id: 'tasks', label: 'Pekerjaan', icon: icons.tasks, roles: ['pegawai', 'pimpinan', 'admin'] },
        { id: 'users', label: 'Manajemen Pegawai', icon: icons.users, roles: ['admin'] },
        { id: 'settings', label: 'Pengaturan', icon: icons.settings, roles: ['admin'] },
    ];

    const renderContent = () => {
        switch (activeMenu) {
            case 'dashboard': return <Dashboard />;
            case 'tasks': return <TaskManagement />;
            case 'users': return <UserManagement />;
            case 'settings': return <Settings />;
            default: return <Dashboard />;
        }
    };
    
    if (!userData) {
      return <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900"><div className="text-xl">Memuat data pengguna...</div></div>;
    }

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            {/* Sidebar */}
            <aside className={`bg-white dark:bg-gray-800 shadow-xl transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                <div className="p-4 flex items-center justify-between">
                    <h1 className={`text-2xl font-bold text-blue-600 dark:text-blue-400 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>ProFlow</h1>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
                        {icons.drag}
                    </button>
                </div>
                <nav className="mt-8">
                    {menuItems.filter(item => userData.role && item.roles.includes(userData.role)).map(item => (
                        <a
                            key={item.id}
                            href="#"
                            onClick={() => setActiveMenu(item.id)}
                            className={`flex items-center py-3 px-6 my-1 transition-colors duration-200 ${activeMenu === item.id ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 border-r-4 border-blue-500' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            {item.icon}
                            <span className={`mx-4 font-medium transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
                        </a>
                    ))}
                </nav>
                <div className="absolute bottom-0 w-full">
                     <a
                        href="#"
                        onClick={handleLogout}
                        className={`flex items-center py-3 px-6 my-1 transition-colors duration-200 hover:bg-red-100 dark:hover:bg-red-900 text-red-500`}
                    >
                        {icons.logout}
                        <span className={`mx-4 font-medium transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Logout</span>
                    </a>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-10 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold">Halo, {userData.nama.split(' ')[0]}!</h2>
                        <p className="text-gray-500 dark:text-gray-400">Selamat datang kembali. Ini ringkasan Anda hari ini.</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        </div>
                        <div className="flex items-center space-x-2">
                           <img className="h-10 w-10 rounded-full object-cover" src={`https://ui-avatars.com/api/?name=${userData.nama}&background=random`} alt="User Avatar" />
                           <div>
                               <p className="font-semibold">{userData.nama}</p>
                               <p className="text-sm text-gray-500 capitalize">{userData.role}</p>
                           </div>
                        </div>
                    </div>
                </header>
                <div className="transition-opacity duration-500">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

// --- Komponen Dashboard ---
const Dashboard = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'chart'
    const { userData } = useAuth();

    useEffect(() => {
        const tasksUnsub = onSnapshot(collection(db, "tasks"), (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
            setTasks(tasksData);
            setLoading(false);
        });

        const usersUnsub = onSnapshot(collection(db, "users"), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
            setUsers(usersData);
        });
        
        return () => {
            tasksUnsub();
            usersUnsub();
        };
    }, []);

    const getStatusCount = (status: TaskStatus) => tasks.filter(task => task.status === status).length;
    
    const completedTasks = getStatusCount('Completed');
    const inProgressTasks = getStatusCount('On Progress');
    const lateTasks = tasks.filter(task => new Date(task.dueDate) < new Date() && task.status !== 'Completed').length;

    const employeeOfTheMonth = () => {
        if (users.length === 0 || tasks.length === 0) return { nama: 'N/A', completed: 0 };
        
        const employeeStats = users.map(user => {
            const completed = tasks.filter(task => task.assignedTo === user.id && task.status === 'Completed').length;
            return { ...user, completed };
        });

        return employeeStats.sort((a, b) => b.completed - a.completed)[0];
    };
    
    const bestEmployee = employeeOfTheMonth();

    const stats = [
        { title: 'Total Pekerjaan', value: tasks.length, color: 'blue' },
        { title: 'Completed', value: completedTasks, color: 'green' },
        { title: 'On Progress', value: inProgressTasks, color: 'yellow' },
        { title: 'Late', value: lateTasks, color: 'red' },
    ];
    
    const chartData = users
      .filter(u => u.role !== 'admin')
      .map(user => ({
        name: user.nama.split(' ')[0],
        'On Progress': tasks.filter(t => t.assignedTo === user.id && t.status === 'On Progress').length,
        'Completed': tasks.filter(t => t.assignedTo === user.id && t.status === 'Completed').length,
        'Late': tasks.filter(t => t.assignedTo === user.id && new Date(t.dueDate) < new Date() && t.status !== 'Completed').length,
    }));

    const handleWhatsAppExport = () => {
        const message = `*Ringkasan Pekerjaan ProjectFlow Pro*:\n\n` +
                        `- Total Pekerjaan: *${tasks.length}*\n` +
                        `- Selesai: *${completedTasks}*\n` +
                        `- Dalam Proses: *${inProgressTasks}*\n` +
                        `- Terlambat: *${lateTasks}*\n\n` +
                        `*Pegawai Terbaik Bulan Ini*: ${bestEmployee.nama} (${bestEmployee.completed} pekerjaan selesai)`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    if (loading || !userData) {
        return <div className="text-center p-10">Memuat dashboard...</div>;
    }

    return (
        <div>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map(stat => (
                    <div key={stat.title} className={`bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-${stat.color}-500 transform transition-transform duration-300 hover:-translate-y-2`}>
                        <h3 className="text-gray-500 dark:text-gray-400 font-medium">{stat.title}</h3>
                        <p className="text-4xl font-bold mt-2">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                 {/* Employee of the Month */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col items-center justify-center text-center">
                    <h3 className="text-xl font-bold mb-4">Pegawai Terbaik Bulan Ini</h3>
                    <img className="h-24 w-24 rounded-full object-cover ring-4 ring-yellow-400 mb-4" src={`https://ui-avatars.com/api/?name=${bestEmployee.nama}&background=random`} alt="Best Employee" />
                    <p className="text-2xl font-semibold">{bestEmployee.nama}</p>
                    <p className="text-gray-500 dark:text-gray-400">{bestEmployee.completed} pekerjaan selesai</p>
                </div>

                {/* Overview */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Overview Pekerjaan Pegawai</h3>
                        <div className="flex items-center space-x-2">
                            {userData.role === 'admin' && (
                                <>
                                    <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg ${viewMode === 'table' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{icons.table}</button>
                                    <button onClick={() => setViewMode('chart')} className={`p-2 rounded-lg ${viewMode === 'chart' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{icons.chart}</button>
                                </>
                            )}
                            <button onClick={handleWhatsAppExport} className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
                                {icons.whatsapp}
                                <span>Export</span>
                            </button>
                        </div>
                    </div>

                    {viewMode === 'chart' && userData.role === 'admin' ? (
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
                                    <Legend />
                                    <Bar dataKey="On Progress" stackId="a" fill="#f59e0b" />
                                    <Bar dataKey="Completed" stackId="a" fill="#10b981" />
                                    <Bar dataKey="Late" stackId="a" fill="#ef4444" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b dark:border-gray-700">
                                        <th className="p-3">Nama Pegawai</th>
                                        <th className="p-3 text-center">On Progress</th>
                                        <th className="p-3 text-center">Completed</th>
                                        <th className="p-3 text-center">Late</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.filter(u => u.role !== 'admin').map(user => (
                                        <tr key={user.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="p-3 font-medium">{user.nama}</td>
                                            <td className="p-3 text-center">{tasks.filter(t => t.assignedTo === user.id && t.status === 'On Progress').length}</td>
                                            <td className="p-3 text-center">{tasks.filter(t => t.assignedTo === user.id && t.status === 'Completed').length}</td>
                                            <td className="p-3 text-center">{tasks.filter(t => t.assignedTo === user.id && new Date(t.dueDate) < new Date() && t.status !== 'Completed').length}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Komponen Manajemen Pekerjaan ---
const TaskManagement = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const { userData } = useAuth();
    
    useEffect(() => {
        if (!userData) return;
        const q = userData.role === 'pegawai' 
            ? query(collection(db, "tasks"), where("assignedTo", "==", userData.uid))
            : collection(db, "tasks");

        const tasksUnsub = onSnapshot(q, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
            setTasks(tasksData);
            setLoading(false);
        });

        const usersUnsub = onSnapshot(collection(db, "users"), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
            setUsers(usersData);
        });
        
        return () => {
            tasksUnsub();
            usersUnsub();
        };
    }, [userData]);
    
    const openModal = (task: Task | null = null) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTask(null);
    };

    const handleDelete = async (taskId: string, fileUrl?: string) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus pekerjaan ini?')) {
            try {
                // Hapus file dari storage jika ada
                if (fileUrl) {
                    const fileRef = ref(storage, fileUrl);
                    await deleteObject(fileRef);
                }
                // Hapus task dari firestore
                await deleteDoc(doc(db, "tasks", taskId));
                alert("Pekerjaan berhasil dihapus!");
            } catch (error) {
                console.error("Error deleting task: ", error);
                alert("Gagal menghapus pekerjaan.");
            }
        }
    };
    
    const getUserName = (userId: string) => {
        const user = users.find(u => u.id === userId || u.uid === userId);
        return user ? user.nama : 'Tidak diketahui';
    };
    
    const priorityClass: { [key: string]: string } = {
        High: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        Mid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        Low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    };

    const statusClass: { [key: string]: string } = {
        'On Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'Completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'Pending': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };

    if (!userData) return <div className="text-center p-10">Memuat...</div>;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Daftar Pekerjaan</h3>
                {['admin', 'pimpinan'].includes(userData.role) && (
                    <button onClick={() => openModal()} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors transform hover:-translate-y-1 shadow-lg">
                        {icons.add}
                        <span>Tambah Pekerjaan</span>
                    </button>
                )}
            </div>
            
            {loading ? <p>Memuat pekerjaan...</p> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 dark:border-gray-700">
                                <th className="p-4">Judul</th>
                                {userData.role !== 'pegawai' && <th className="p-4">Ditugaskan Kepada</th>}
                                <th className="p-4">Due Date</th>
                                <th className="p-4">Prioritas</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Rating</th>
                                <th className="p-4">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map(task => (
                                <tr key={task.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <td className="p-4 font-medium">{task.title}</td>
                                    {userData.role !== 'pegawai' && <td className="p-4">{getUserName(task.assignedTo)}</td>}
                                    <td className="p-4">{new Date(task.dueDate).toLocaleDateString('id-ID')}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${priorityClass[task.priority]}`}>
                                            {task.priority}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusClass[task.status]}`}>
                                            {task.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                       <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i} className={i < (task.rating || 0) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}>
                                                    {icons.star}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-4 flex items-center space-x-2">
                                        <button onClick={() => openModal(task)} className="p-2 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800 text-yellow-600 dark:text-yellow-300 transition-colors">{icons.edit}</button>
                                        {['admin', 'pimpinan'].includes(userData.role) && (
                                            <button onClick={() => handleDelete(task.id, task.fileUrl)} className="p-2 rounded-full hover:bg-red-200 dark:hover:bg-red-800 text-red-600 dark:text-red-300 transition-colors">{icons.delete}</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && <TaskModal task={editingTask} users={users} closeModal={closeModal} />}
        </div>
    );
};

// --- Modal untuk Tambah/Edit Pekerjaan ---
const TaskModal = ({ task, users, closeModal }: { task: Task | null, users: UserData[], closeModal: () => void }) => {
    const [title, setTitle] = useState(task ? task.title : '');
    const [description, setDescription] = useState(task ? task.description : '');
    const [assignedTo, setAssignedTo] = useState(task ? task.assignedTo : '');
    const [dueDate, setDueDate] = useState(task ? task.dueDate : '');
    const [priority, setPriority] = useState<TaskPriority>(task ? task.priority : 'Mid');
    const [status, setStatus] = useState<TaskStatus>(task ? task.status : 'On Progress');
    const [rating, setRating] = useState(task ? task.rating || 0 : 0);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const { userData } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let fileUrl = task ? task.fileUrl : '';
            if (file) {
                // Jika ada file baru, upload
                const storageRef = ref(storage, `task-files/${Date.now()}-${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                fileUrl = await getDownloadURL(snapshot.ref);
            }

            const taskData = { title, description, assignedTo, dueDate, priority, status, fileUrl, rating };
            
            if (task) {
                // Edit
                await updateDoc(doc(db, "tasks", task.id), taskData);
                // NOTIFIKASI (implementasi sederhana)
                sendNotification(task.assignedTo, `Pekerjaan "${title}" telah diperbarui.`);
            } else {
                // Tambah
                await addDoc(collection(db, "tasks"), taskData);
                // NOTIFIKASI (implementasi sederhana)
                sendNotification(assignedTo, `Anda mendapat pekerjaan baru: "${title}".`);
            }
            
            closeModal();
        } catch (error) {
            console.error("Error saving task: ", error);
            alert("Gagal menyimpan pekerjaan.");
        } finally {
            setLoading(false);
        }
    };

    const sendNotification = async (userId: string, message: string) => {
        // Ini adalah implementasi tiruan.
        // Di aplikasi nyata, ini akan memicu Firebase Function untuk mengirim email/WA.
        const userToNotify = users.find(u => u.id === userId || u.uid === userId);
        if (userToNotify) {
            console.log(`MENGIRIM NOTIFIKASI ke ${userToNotify.nama} (WA: ${userToNotify.noWhatsapp}, Email: ${userToNotify.email}): ${message}`);
            alert(`Notifikasi (simulasi) terkirim ke ${userToNotify.nama}: ${message}`);
        }
    };
    
    if(!userData) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl p-8 max-h-screen overflow-y-auto animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-6">{task ? 'Edit Pekerjaan' : 'Tambah Pekerjaan Baru'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Kolom Kiri */}
                        <div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2">Judul</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2">Deskripsi</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" rows={5}></textarea>
                            </div>
                            {['admin', 'pimpinan'].includes(userData.role) && (
                                <div className="mb-4">
                                    <label className="block text-sm font-bold mb-2">Tugaskan Kepada</label>
                                    <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required>
                                        <option value="">Pilih Pegawai</option>
                                        {users.filter(u => u.role !== 'admin').map(user => (
                                            <option key={user.id} value={user.uid}>{user.nama}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        {/* Kolom Kanan */}
                        <div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2">Due Date</label>
                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2">Prioritas</label>
                                <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                                    <option>Low</option>
                                    <option>Mid</option>
                                    <option>High</option>
                                </select>
                            </div>
                             <div className="mb-4">
                                <label className="block text-sm font-bold mb-2">Status</label>
                                <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                                    <option>Pending</option>
                                    <option>On Progress</option>
                                    <option>Completed</option>
                                </select>
                            </div>
                            {userData.role === 'pimpinan' && task && (
                                <div className="mb-4">
                                    <label className="block text-sm font-bold mb-2">Rating (1-5)</label>
                                    <div className="flex space-x-1">
                                        {[...Array(5)].map((_, i) => (
                                            <button type="button" key={i} onClick={() => setRating(i + 1)} className={`text-2xl ${i < rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}>★</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2">Upload File</label>
                                <input type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                {task && task.fileUrl && <a href={task.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm mt-2 block">Lihat file saat ini</a>}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end space-x-4 mt-8">
                        <button type="button" onClick={closeModal} className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Batal</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
                            {loading ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Komponen Manajemen Pengguna (Admin) ---
const UserManagement = () => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
            setUsers(usersData);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const openModal = (user: UserData | null = null) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleDelete = async (userId: string) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus pegawai ini? Semua pekerjaan yang ditugaskan kepadanya tidak akan terhapus.')) {
            try {
                // Note: Deleting user from Firestore doesn't delete from Auth.
                // For a full solution, a Firebase Function would be needed to delete the Auth user.
                await deleteDoc(doc(db, "users", userId));
                alert("Pegawai berhasil dihapus.");
            } catch (error) {
                console.error("Error deleting user: ", error);
                alert("Gagal menghapus pegawai.");
            }
        }
    };
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Manajemen Pegawai</h3>
                <button onClick={() => openModal()} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    {icons.add}
                    <span>Tambah Pegawai</span>
                </button>
            </div>
            {loading ? <p>Memuat data pegawai...</p> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 dark:border-gray-700">
                                <th className="p-4">Nama</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">No. WhatsApp</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="p-4 font-medium">{user.nama}</td>
                                    <td className="p-4">{user.email}</td>
                                    <td className="p-4">{user.noWhatsapp}</td>
                                    <td className="p-4 capitalize">{user.role}</td>
                                    <td className="p-4 flex items-center space-x-2">
                                        <button onClick={() => openModal(user)} className="p-2 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800 text-yellow-600 dark:text-yellow-300">{icons.edit}</button>
                                        {user.role !== 'admin' && <button onClick={() => handleDelete(user.id)} className="p-2 rounded-full hover:bg-red-200 dark:hover:bg-red-800 text-red-600 dark:text-red-300">{icons.delete}</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {isModalOpen && <UserModal user={editingUser} closeModal={closeModal} />}
        </div>
    );
};

// --- Modal untuk Tambah/Edit Pengguna ---
const UserModal = ({ user, closeModal }: { user: UserData | null, closeModal: () => void }) => {
    const [nama, setNama] = useState(user ? user.nama : '');
    const [email, setEmail] = useState(user ? user.email : '');
    const [noWhatsapp, setNoWhatsapp] = useState(user ? user.noWhatsapp : '');
    const [role, setRole] = useState<UserRole>(user ? user.role : 'pegawai');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (user) { // Edit
                const userRef = doc(db, "users", user.id);
                await updateDoc(userRef, { nama, email, noWhatsapp, role });
            } else { // Tambah
                const firstName = nama.split(' ')[0].toLowerCase();
                const username = `${firstName}@proapp.local`;
                const password = `${firstName}123`;
                
                await addDoc(collection(db, "users"), {
                    nama,
                    email,
                    noWhatsapp,
                    role,
                    uid: `placeholder-uid-${Date.now()}`
                });
                alert(`Pegawai ${nama} ditambahkan. Username: ${firstName}, Password: ${password}. (Simulasi Auth - Akun Auth harus dibuat terpisah oleh Admin)`);
            }
            closeModal();
        } catch (error) {
            console.error("Error saving user: ", error);
            alert("Gagal menyimpan data pegawai. Pastikan email unik. Error: " + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-6">{user ? 'Edit Pegawai' : 'Tambah Pegawai Baru'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Nama Lengkap</label>
                        <input type="text" value={nama} onChange={e => setNama(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Nomor WhatsApp</label>
                        <input type="tel" value={noWhatsapp} onChange={e => setNoWhatsapp(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Role</label>
                        <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                            <option value="pegawai">Pegawai</option>
                            <option value="pimpinan">Pimpinan</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div className="flex justify-end space-x-4 mt-8">
                        <button type="button" onClick={closeModal} className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Batal</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                            {loading ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Komponen Pengaturan (Admin) ---
const Settings = () => {
    // State untuk tema, warna, dll.
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    const exportToCSV = (data: any[], filename: string) => {
        if (data.length === 0) return;
        const csvContent = "data:text/csv;charset=utf-8," 
            + [Object.keys(data[0])].concat(data.map(item => Object.values(item))).map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportAllData = async () => {
        const tasksSnapshot = await getDocs(collection(db, "tasks"));
        const usersSnapshot = await getDocs(collection(db, "users"));
        
        const tasksData = tasksSnapshot.docs.map(doc => doc.data());
        const usersData = usersSnapshot.docs.map(doc => doc.data());

        exportToCSV(tasksData, "semua_pekerjaan.csv");
        exportToCSV(usersData, "semua_pegawai.csv");
        alert("Data berhasil diekspor!");
    };
    
    // Fungsi untuk setup awal (hanya dijalankan sekali)
    const setupInitialAdmin = async () => {
        if (!window.confirm("Ini akan membuat user admin awal. Hanya jalankan jika ini adalah setup pertama kali. Lanjutkan?")) return;
        
        try {
            // Ini akan gagal jika user sudah ada.
            const userCredential = await createUserWithEmailAndPassword(auth, 'admin@proapp.local', 'Admin123');
            const user = userCredential.user;
            
            // Simpan data admin di Firestore
            await setDoc(doc(db, "users", user.uid), {
                nama: "Admin Utama",
                email: "admin@proapp.local",
                noWhatsapp: "081234567890",
                role: "admin",
                uid: user.uid,
                id: user.uid
            });
            alert("User admin berhasil dibuat! Silakan login.");
        } catch (error) {
            console.error("Error creating initial admin: ", error);
            alert("Gagal membuat admin. Kemungkinan user sudah ada. Error: " + (error as Error).message);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-8">
            <div>
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
            
            <div>
                <h3 className="text-2xl font-bold mb-4">Ekspor Data</h3>
                <button onClick={handleExportAllData} className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    {icons.download}
                    <span>Export Semua Pekerjaan & Pegawai (CSV)</span>
                </button>
            </div>
            
            <div>
                <h3 className="text-2xl font-bold mb-4">Tindakan Berbahaya</h3>
                <p className="text-sm text-gray-500 mb-2">Gunakan tombol ini hanya untuk setup awal aplikasi.</p>
                <button onClick={setupInitialAdmin} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                    Setup Akun Admin Awal
                </button>
            </div>

        </div>
    );
};


// --- Komponen App Utama ---
export default function App() {
    // Cek jika konfigurasi Firebase ada
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("AIzaSyB")) {
        // Simple check if the key looks like a real key.
        // A better check might be needed, but this prevents running with the example key.
    } else if (firebaseConfig.apiKey === "AIzaSyBme0QBJ2p57XROfLUF6L8cZgz5loE00Mo") {
        // Still using the sample key, proceed for now
    } else {
         return (
            <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-lg">
                    <h1 className="text-2xl font-bold text-red-700 mb-4">Konfigurasi Firebase Diperlukan</h1>
                    <p className="text-gray-700">
                        Aplikasi ini memerlukan koneksi ke Firebase untuk berfungsi. Silakan ganti placeholder `firebaseConfig` di dalam kode dengan konfigurasi proyek Firebase Anda sendiri.
                    </p>
                    <p className="mt-4 text-sm text-gray-500">
                        Anda bisa mendapatkan konfigurasi ini dari Firebase Console di jalur: Project Settings → General → Your apps → SDK setup and configuration.
                    </p>
                </div>
            </div>
        );
    }
    
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

const AppContent = () => {
    const { user, loading } = useAuth();
    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900"><div className="text-xl">Memuat Aplikasi...</div></div>;
    }
    return user ? <DndProvider backend={HTML5Backend}><MainApp /></DndProvider> : <LoginPage />;
};
