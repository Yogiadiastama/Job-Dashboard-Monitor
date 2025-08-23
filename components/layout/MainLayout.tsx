import React, { useState, useEffect, useCallback, useMemo, FC, ReactNode } from 'react';
import { signOut } from '@firebase/auth';
import { doc, updateDoc } from '@firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useConnectivity } from '../../hooks/useNotification';
import { useCustomization, defaultTextContent } from '../../hooks/useCustomization';
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
import EditableText from '../common/EditableText';


interface MenuItem {
    id: string;
    label: string;
    icon: ReactNode;
    roles: string[];
}

const MainLayout: React.FC = () => {
    const { user, userData } = useAuth();
    const { isOffline } = useConnectivity();
    const { isEditMode, getText } = useCustomization();
    
    const allMenuItems = useMemo<MenuItem[]>(() => [
        { id: 'dashboard', label: getText('dashboard.title', defaultTextContent['dashboard.title']), icon: ICONS.dashboard, roles: ['pegawai', 'pimpinan', 'admin'] },
        { id: 'tasks', label: getText('tasks.title', defaultTextContent['tasks.title']), icon: ICONS.tasks, roles: ['pegawai', 'pimpinan', 'admin'] },
        { id: 'training', label: getText('training.title', defaultTextContent['training.title']), icon: ICONS.training, roles: ['pimpinan', 'admin'] },
        { id: 'analytics', label: getText('analytics.title', defaultTextContent['analytics.title']), icon: ICONS.chartPie, roles: ['pegawai', 'pimpinan', 'admin'] },
        { id: 'search', label: getText('search.title', defaultTextContent['search.title']), icon: ICONS.search, roles: ['pimpinan', 'admin'] },
        { id: 'users', label: getText('users.title', defaultTextContent['users.title']), icon: ICONS.users, roles: ['admin'] },
        { id: 'settings', label: getText('settings.title', defaultTextContent['settings.title']), icon: ICONS.settings, roles: ['admin'] },
    ], [getText]);

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
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            {isEditMode && (
                <div className="fixed top-0 left-0 w-full bg-primary-600 text-white text-center py-2 z-50">
                    UI Edit Mode is ON. Click any text with a blue dashed border to edit.
                </div>
            )}
            {/* Sidebar */}
            <aside 
                className={`absolute md:relative z-30 w-64 bg-white dark:bg-slate-800 flex-shrink-0 flex flex-col transform ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out border-r border-slate-200 dark:border-slate-700`}
            >
                <div className="px-6 h-20 flex items-center" style={{ paddingTop: isEditMode ? '2rem' : '' }}>
                     <EditableText
                        as="h1"
                        contentKey="app.headerTitle"
                        defaultText={defaultTextContent['app.headerTitle']}
                        className="text-2xl font-bold text-primary-600 dark:text-primary-400"
                    />
                </div>
                <nav className="flex-grow px-4">
                    <ul className="space-y-1">
                        {menuItems.map((item, index) => {
                             const commonProps = {
                                isActive: activeMenu === item.id,
                                onClick: () => {
                                    setActiveMenu(item.id);
                                    setSidebarVisible(false);
                                }
                            };
                            if (userData.role === 'admin') {
                                return (
                                    <DraggableMenuItem
                                        key={item.id}
                                        id={item.id}
                                        index={index}
                                        moveMenuItem={moveMenuItem}
                                        {...commonProps}
                                    >
                                        <span className="w-6 h-6">{item.icon}</span>
                                        <span className="ml-3">{item.label}</span>
                                    </DraggableMenuItem>
                                );
                            }
                            return (
                                <li key={item.id}>
                                    <a
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); commonProps.onClick(); }}
                                        className={`relative flex items-center p-3 rounded-lg transition-colors group ${commonProps.isActive ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'}`}
                                    >
                                        {commonProps.isActive && <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary-600 rounded-r-full"></div>}
                                        <span className="w-6 h-6">{item.icon}</span>
                                        <span className="ml-3">{item.label}</span>
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
                <header 
                    className="h-20 bg-white dark:bg-slate-800 flex-shrink-0 flex justify-between items-center px-6 border-b border-slate-200 dark:border-slate-700" 
                    style={{ paddingTop: isEditMode ? '2.5rem' : '' }}
                >
                    <div className="flex items-center gap-4">
                        <button className="md:hidden text-slate-500" onClick={() => setSidebarVisible(!isSidebarVisible)}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                        </button>
                        <div>
                             <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{menuItems.find(m => m.id === activeMenu)?.label}</h2>
                             <p className="text-sm text-slate-500 dark:text-slate-400 hidden md:block">
                                {activeMenu === 'tasks' && getText('tasks.description', defaultTextContent['tasks.description'])}
                                {activeMenu === 'training' && getText('training.description', defaultTextContent['training.description'])}
                             </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        {/* This div is the target for the action buttons portal */}
                        <div id="header-actions" className="flex items-center space-x-2"></div>

                        {isOffline && (
                            <div title="You are in offline mode. Changes will sync when connection is restored." className="flex items-center space-x-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15zM21 21l-18-18" />
                                </svg>
                                <span>Offline</span>
                            </div>
                        )}
                        <div className="text-right hidden sm:block">
                            <p className="font-semibold text-slate-800 dark:text-slate-100">{userData.nama}</p>
                            <p className="text-sm capitalize text-slate-500 dark:text-slate-400">{userData.role}</p>
                        </div>
                        {userData.photoURL ? (
                            <img src={userData.photoURL} alt={userData.nama} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500">
                                {userData.nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                        )}
                        <button onClick={handleLogout} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500" title="Logout">
                            {ICONS.logout}
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 lg:p-8">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;