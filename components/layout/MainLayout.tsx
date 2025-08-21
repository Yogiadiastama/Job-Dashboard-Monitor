import React, { useState, useEffect } from 'react';
import { signOut } from '@firebase/auth';
import { auth } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ICONS } from '../../constants';
import Dashboard from '../dashboard/Dashboard';
import TaskManagement from '../tasks/TaskManagement';
import UserManagement from '../users/UserManagement';
import Settings from '../settings/Settings';
import TrainingDashboard from '../training/TrainingDashboard';
import NotificationBanner from '../common/NotificationBanner';

const MainLayout: React.FC = () => {
    const { userData } = useAuth();
    const { themeSettings } = useTheme();
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
        { id: 'training', label: 'Training', icon: ICONS.training, roles: ['pegawai', 'pimpinan', 'admin'] },
        { id: 'users', label: 'Manajemen Pegawai', icon: ICONS.users, roles: ['admin'] },
        { id: 'settings', label: 'Pengaturan', icon: ICONS.settings, roles: ['admin'] },
    ];

    const renderContent = () => {
        switch (activeMenu) {
            case 'dashboard': return <Dashboard />;
            case 'tasks': return <TaskManagement />;
            case 'training': return <TrainingDashboard />;
            case 'users': return <UserManagement />;
            case 'settings': return <Settings />;
            default: return <Dashboard />;
        }
    };
    
    if (!userData) {
        return null; 
    }

    const UserAvatar = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
        const sizeClasses = {
            sm: 'w-8 h-8',
            md: 'w-10 h-10',
            lg: 'w-12 h-12',
        };
        const textSizeClasses = {
            sm: 'text-sm',
            md: 'text-base',
            lg: 'text-lg',
        };

        if (userData?.photoURL) {
            return <img src={userData.photoURL} alt={userData.nama} className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0`} />;
        }
        const initials = userData.nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        return (
            <div className={`${sizeClasses[size]} rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center font-bold text-primary-600 dark:text-primary-400 flex-shrink-0 ${textSizeClasses[size]}`}>
                {initials}
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200">
            {/* Overlay for mobile nav */}
            <div 
                className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden transition-opacity duration-300 ${isSidebarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setSidebarVisible(false)}
            ></div>

            {/* Sidebar */}
            <aside className={`bg-white dark:bg-neutral-800 shadow-lg transition-transform duration-300 w-64 fixed md:relative h-full z-30 transform flex flex-col ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-4 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700">
                    <h1 className="text-2xl font-bold" style={{ color: themeSettings.accentColor }}>{themeSettings.headerTitle}</h1>
                    <button onClick={() => setSidebarVisible(false)} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 md:hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <nav className="mt-4 flex-1">
                    {menuItems.filter(item => item.roles.includes(userData.role)).map(item => {
                        const isActive = activeMenu === item.id;
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
                                className={`flex items-center py-3 px-6 mx-2 my-1 rounded-lg transition-all duration-200 ${isActive ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 font-semibold' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 hover:text-neutral-900 dark:hover:text-neutral-100'}`}
                            >
                                {item.icon}
                                <span className="mx-4 font-medium whitespace-nowrap">{item.label}</span>
                            </a>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
                     <div className="flex items-center space-x-3 p-2 rounded-lg">
                       <UserAvatar size="md" />
                       <div className="flex-1 min-w-0">
                           <p className="font-semibold truncate">{userData.nama}</p>
                           <p className="text-sm text-neutral-500 dark:text-neutral-400 capitalize">{userData.role}</p>
                       </div>
                    </div>
                     <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); handleLogout(); }}
                        className="flex items-center py-3 px-4 mt-2 rounded-lg transition-colors duration-200 hover:bg-danger-bg dark:hover:bg-danger-bg/20 text-danger-text font-semibold"
                    >
                        {ICONS.logout}
                        <span className="mx-4 font-medium whitespace-nowrap">Logout</span>
                    </a>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                 <NotificationBanner />
                 <header className="flex flex-col sm:flex-row justify-between sm:items-center p-4 sm:p-6 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm z-10 border-b border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center">
                        <button onClick={() => setSidebarVisible(true)} className="md:hidden p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 mr-4">
                            {ICONS.drag}
                        </button>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100">Halo, {userData.nama.split(' ')[0]}!</h2>
                            <p className="text-neutral-500 dark:text-neutral-400">Selamat datang kembali.</p>
                        </div>
                    </div>
                    {/* User info moved to sidebar bottom for a cleaner header */}
                </header>
                <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default MainLayout;