
import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { ICONS } from '../../constants';
import Dashboard from '../dashboard/Dashboard';
import TaskManagement from '../tasks/TaskManagement';
import UserManagement from '../users/UserManagement';
import Settings from '../settings/Settings';
import LoadingSpinner from '../common/LoadingSpinner';

const MainLayout: React.FC = () => {
    const { userData } = useAuth();
    const [activeMenu, setActiveMenu] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const handleLogout = async () => {
        await signOut(auth);
    };
    
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard, roles: ['pegawai', 'pimpinan', 'admin'] },
        { id: 'tasks', label: 'Pekerjaan', icon: ICONS.tasks, roles: ['pegawai', 'pimpinan', 'admin'] },
        { id: 'users', label: 'Manajemen Pegawai', icon: ICONS.users, roles: ['admin'] },
        { id: 'settings', label: 'Pengaturan', icon: ICONS.settings, roles: ['admin'] },
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
      return <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900"><LoadingSpinner text="Memuat data pengguna..."/></div>;
    }

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            {/* Sidebar */}
            <aside className={`bg-white dark:bg-gray-800 shadow-xl transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                <div className="p-4 flex items-center justify-between">
                    <h1 className={`text-2xl font-bold text-blue-600 dark:text-blue-400 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>ProFlow</h1>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
                        {ICONS.drag}
                    </button>
                </div>
                <nav className="mt-8">
                    {menuItems.filter(item => item.roles.includes(userData.role)).map(item => (
                        <a
                            key={item.id}
                            href="#"
                            onClick={(e) => { e.preventDefault(); setActiveMenu(item.id); }}
                            className={`flex items-center py-3 px-6 my-1 transition-colors duration-200 ${activeMenu === item.id ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 border-r-4 border-blue-500' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            {item.icon}
                            <span className={`mx-4 font-medium transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 whitespace-nowrap' : 'opacity-0'}`}>{item.label}</span>
                        </a>
                    ))}
                </nav>
                <div className="absolute bottom-0 w-full">
                     <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); handleLogout(); }}
                        className={`flex items-center py-3 px-6 my-1 transition-colors duration-200 hover:bg-red-100 dark:hover:bg-red-900 text-red-500`}
                    >
                        {ICONS.logout}
                        <span className={`mx-4 font-medium transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 whitespace-nowrap' : 'opacity-0'}`}>Logout</span>
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
                       <img className="h-10 w-10 rounded-full object-cover" src={`https://ui-avatars.com/api/?name=${userData.nama}&background=random`} alt="User Avatar" />
                       <div>
                           <p className="font-semibold">{userData.nama}</p>
                           <p className="text-sm text-gray-500 capitalize">{userData.role}</p>
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

export default MainLayout;
