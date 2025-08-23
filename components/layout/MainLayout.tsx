import React, { useState, useEffect, useCallback, useMemo, FC, ReactNode } from 'react';
import { signOut } from '@firebase/auth';
import { doc, updateDoc } from '@firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ICONS } from '../../constants';
import Dashboard from '../dashboard/Dashboard';
import TaskManagement from '../tasks/TaskManagement';
import UserManagement from '../users/UserManagement';
import Settings from '../settings/Settings';
import TrainingDashboard from '../training/TrainingDashboard';
import EmployeeSearch from '../search/EmployeeSearch';
import NotificationBanner from '../common/NotificationBanner';
import EmployeeAnalyticsDashboard from '../analytics/EmployeeAnalyticsDashboard';
import DraggableMenuItem from './DraggableMenuItem';

interface MenuItem {
    id: string;
    label: string;
    icon: ReactNode;
    roles: string[];
}

const MainLayout: React.FC = () => {
    const { user, userData } = useAuth();
    const { themeSettings } = useTheme();
    
    const allMenuItems = useMemo<MenuItem[]>(() => [
        { id: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard, roles: ['pegawai', 'pimpinan', 'admin'] },
        { id: 'tasks', label: 'Pekerjaan', icon: ICONS.tasks, roles: ['pegawai', 'pimpinan', 'admin'] },
        { id: 'training', label: 'Training', icon: ICONS.training, roles: ['pimpinan', 'admin'] },
        { id: 'analytics', label: 'Info Grafik Pegawai', icon: ICONS.chartPie, roles: ['pimpinan', 'admin'] },
        { id: 'search', label: 'Pencarian Pegawai', icon: ICONS.search, roles: ['pimpinan', 'admin'] },
        { id: 'users', label: 'Manajemen Pegawai', icon: ICONS.users, roles: ['admin'] },
        { id: 'settings', label: 'Pengaturan', icon: ICONS.settings, roles: ['admin'] },
    ], []);

    const initialMenuItems = useMemo(() => {
        const userRole = userData?.role || 'pegawai';
        const defaultFiltered = allMenuItems.filter(item => item.roles.includes(userRole));
        if (userData?.role === 'admin' && userData.menuOrder) {
            const ordered = userData.menuOrder
                .map(id => defaultFiltered.find(item => item.id === id))
                .filter((item): item is MenuItem => !!item);
            const remaining = defaultFiltered.filter(item => !userData.menuOrder?.includes(item.id));
            return [...ordered, ...remaining];
        }
        return defaultFiltered;
    }, [userData, allMenuItems]);
    
    const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);
    const [activeMenu, setActiveMenu] = useState(initialMenuItems[0]?.id || 'dashboard');
    const [isSidebarVisible, setSidebarVisible] = useState(false);

    useEffect(() => {
        setMenuItems(initialMenuItems);
        if (!initialMenuItems.find(item => item.id === activeMenu)) {
             setActiveMenu(initialMenuItems[0]?.id || 'dashboard');
        }
    }, [initialMenuItems, activeMenu]);

    const handleLogout = async () => {
        await signOut(auth);
    };

    const renderContent = () => {
        switch (activeMenu) {
            case 'dashboard': return <Dashboard />;
            case 'tasks': return <TaskManagement />;
            case 'training': return <TrainingDashboard />;
            case 'analytics': return <EmployeeAnalyticsDashboard />;
            case 'search': return <EmployeeSearch />;
            case 'users': return <UserManagement />;
            case 'settings': return <Settings />;
            default: return <Dashboard />;
        }
    };
    
    const saveMenuOrder = async (newOrder: string[]) => {
        if (userData?.uid) {
            try {
                const userDocRef = doc(db, 'users', userData.uid);
                await updateDoc(userDocRef, { menuOrder: newOrder });
            } catch (error) {
                console.error("Failed to save menu order:", error);
            }
        }
    };

    const moveMenuItem = useCallback((dragIndex: number, hoverIndex: number) => {
        setMenuItems(prevItems => {
            const newItems = [...prevItems];
            const [movedItem] = newItems.splice(dragIndex, 1);
            newItems.splice(hoverIndex, 0, movedItem);
            
            if (userData?.role === 'admin') {
                const newOrder = newItems.map(item => item.id);
                saveMenuOrder(newOrder);
            }
            return newItems;
        });
    }, [userData?.role]);


    if (!userData || !user) {
        return <div>Loading user data...</div>;
    }

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            {/* Sidebar */}
            <aside className={`absolute md:relative z-20 md:z-auto bg-white dark:bg-gray-800 w-64 p-4 space-y-4 transform ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out shadow-lg`}>
                <div className="text-center py-2">
                    <h1 className="text-2xl font-bold" style={{ color: themeSettings.accentColor }}>{themeSettings.headerTitle}</h1>
                </div>
                <nav className="flex-grow">
                    <ul>
                        {menuItems.map((item, index) => {
                            if (userData.role === 'admin') {
                                return (
                                    <DraggableMenuItem
                                        key={item.id}
                                        id={item.id}
                                        index={index}
                                        isActive={activeMenu === item.id}
                                        onClick={() => {
                                            setActiveMenu(item.id);
                                            setSidebarVisible(false);
                                        }}
                                        moveMenuItem={moveMenuItem}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </DraggableMenuItem>
                                );
                            }
                            return (
                                <li key={item.id}>
                                    <a
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setActiveMenu(item.id);
                                            setSidebarVisible(false);
                                        }}
                                        className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeMenu === item.id ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-semibold' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <NotificationBanner />
                <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center">
                    <button className="md:hidden" onClick={() => setSidebarVisible(!isSidebarVisible)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                    </button>
                    <h2 className="text-xl font-semibold hidden md:block">{menuItems.find(m => m.id === activeMenu)?.label}</h2>
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <p className="font-semibold">{userData.nama}</p>
                            <p className="text-sm text-gray-500 capitalize">{userData.role}</p>
                        </div>
                        {userData.photoURL ? (
                            <img src={userData.photoURL} alt={userData.nama} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-500">
                                {userData.nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                        )}
                        <button onClick={handleLogout} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Logout">
                            {ICONS.logout}
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-6">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
