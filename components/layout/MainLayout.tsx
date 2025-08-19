import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ICONS } from '../../constants';
import Dashboard from '../dashboard/Dashboard';
import TaskManagement from '../tasks/TaskManagement';
import UserManagement from '../users/UserManagement';
import Settings from '../settings/Settings';
import LoadingSpinner from '../common/LoadingSpinner';
import Calendar from '../calendar/Calendar';
import NotificationBanner from '../common/NotificationBanner';

const MainLayout: React.FC = () => {
    const { userData } = useAuth();
    const { themeSettings, loading: themeLoading } = useTheme();
    const [activeMenu, setActiveMenu] = useState('dashboard');
    const [isSidebarVisible, setSidebarVisible] = useState(false);

    useEffect(() => {
        // Show sidebar by default on larger screens
        if (window.innerWidth >= 768) {
            setSidebarVisible(true);
        }
    }, []);
    
    useEffect(() => {
        // Apply accent color as CSS variable
        if(themeSettings.accentColor) {
            document.documentElement.style.setProperty('--accent-color', themeSettings.accentColor);
        }
    }, [themeSettings.accentColor]);

    const handleLogout = async () => {
        await signOut(auth);
    };
    
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard, roles: ['pegawai', 'pimpinan', 'admin'] },
        { id: 'tasks', label: 'Pekerjaan', icon: ICONS.tasks, roles: ['pegawai', 'pimpinan', 'admin'] },
        { id: 'calendar', label: 'Kalender', icon: ICONS.calendar, roles: ['pegawai', 'pimpinan', 'admin'] },
        { id: 'users', label: 'Manajemen Pegawai', icon: ICONS.users, roles: ['admin'] },
        { id: 'settings', label: 'Pengaturan', icon: ICONS.settings, roles: ['admin'] },
    ];

    const renderContent = () => {
        switch (activeMenu) {
            case 'dashboard': return <Dashboard />;
            case 'tasks': return <TaskManagement />;
            case 'calendar': return <Calendar />;
            case 'users': return <UserManagement />;
            case 'settings': return <Settings />;
            default: return <Dashboard />;
        }
    };
    
    if (themeLoading) {
      return <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900"><LoadingSpinner text="Memuat aplikasi..."/></div>;
    }

    if (!userData) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 text-center p-4">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Gagal Memuat Data Pengguna</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Tidak dapat mengambil detail profil Anda. Ini mungkin karena masalah koneksi internet. <br />
                    Silakan periksa koneksi Anda dan muat ulang halaman, atau coba lagi nanti.
                </p>
                <button
                    onClick={() => signOut(auth)}
                    className="bg-red-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-600 transition-colors"
                >
                    Logout
                </button>
            </div>
        );
    }


    const UserAvatar = () => {
        if (userData?.photoURL) {
            return <img src={userData.photoURL} alt={userData.nama} className="w-10 h-10 rounded-full object-cover" />;
        }
        const initials = userData.nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        return (
            <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center font-bold text-blue-600 dark:text-blue-300 flex-shrink-0"
                 style={{backgroundColor: `${themeSettings.accentColor}20`, color: themeSettings.accentColor}}
            >
                {initials}
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            {/* Overlay for mobile nav */}
            <div 
                className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden transition-opacity duration-300 ${isSidebarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setSidebarVisible(false)}
            ></div>

            {/* Sidebar */}
            <aside className={`bg-white dark:bg-gray-800 shadow-xl transition-transform duration-300 w-64 fixed md:relative h-full z-30 transform ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold" style={{ color: themeSettings.accentColor }}>{themeSettings.headerTitle}</h1>
                    <button onClick={() => setSidebarVisible(false)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 md:hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <nav className="mt-8">
                    {menuItems.filter(item => item.roles.includes(userData.role)).map(item => {
                        const isActive = activeMenu === item.id;
                        const activeStyle = {
                            backgroundColor: `${themeSettings.accentColor}1A`, // 10% opacity
                            color: themeSettings.accentColor,
                            borderColor: themeSettings.accentColor,
                        };
                        return (
                            <a
                                key={item.id}
                                href="#"
                                onClick={(e) => { 
                                    e.preventDefault(); 
                                    setActiveMenu(item.id); 
                                    if (window.innerWidth < 768) {
                                        setSidebarVisible(false);
                                    }
                                }}
                                className={`flex items-center py-3 px-6 my-1 transition-colors duration-200 ${!isActive ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : 'border-r-4'}`}
                                style={isActive ? activeStyle : {}}
                            >
                                {item.icon}
                                <span className="mx-4 font-medium whitespace-nowrap">{item.label}</span>
                            </a>
                        );
                    })}
                </nav>
                <div className="absolute bottom-0 w-full">
                     <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); handleLogout(); }}
                        className="flex items-center py-3 px-6 my-1 transition-colors duration-200 hover:bg-red-100 dark:hover:bg-red-900 text-red-500"
                    >
                        {ICONS.logout}
                        <span className="mx-4 font-medium whitespace-nowrap">Logout</span>
                    </a>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                 <NotificationBanner />
                 <header className="flex flex-col sm:flex-row justify-between sm:items-center p-4 sm:p-6 md:p-10 gap-4 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                        <button onClick={() => setSidebarVisible(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 mr-4">
                            {ICONS.drag}
                        </button>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold">Halo, {userData.nama.split(' ')[0]}!</h2>
                            <p className="text-gray-500 dark:text-gray-400">Selamat datang kembali.</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4 self-end sm:self-center">
                       <UserAvatar />
                       <div>
                           <p className="font-semibold">{userData.nama}</p>
                           <p className="text-sm text-gray-500 capitalize">{userData.role}</p>
                       </div>
                    </div>
                </header>
                <div className="flex-1 p-4 sm:p-6 md:p-10 overflow-y-auto">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default MainLayout;