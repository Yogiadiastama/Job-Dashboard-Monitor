

import React, { useState, useEffect, useCallback, useMemo, FC, ReactNode } from 'react';
import { signOut } from '@firebase/auth';
import { doc, updateDoc, collection, onSnapshot } from '@firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useConnectivity } from '../../hooks/useNotification';
import { useCustomization, defaultTextContent } from '../../hooks/useCustomization';
import { ICONS } from '../../constants';
import { Task, Training, UserData, AIInput } from '../../types';
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
import TaskModal from '../tasks/TaskModal';
import TrainingModal from '../training/TrainingModal'; 
import AIInputModal from '../training/AddWithAIModal';
import { analyzeInputForEntry } from '../../services/geminiService';


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
    
    // Global State for Modals
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | Partial<Task> | null>(null);
    const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
    const [editingTraining, setEditingTraining] = useState<Training | Partial<Training> | null>(null);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    
    // Data needed by modals
    const [users, setUsers] = useState<UserData[]>([]);
    
    useEffect(() => {
        const usersUnsub = onSnapshot(collection(db, "users"), (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData)));
        });
        return () => usersUnsub();
    }, []);

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
    
    // Modal Handlers
    const handleOpenTaskModal = (task: Task | Partial<Task> | null = null) => { setEditingTask(task); setIsTaskModalOpen(true); };
    const handleCloseTaskModal = () => { setEditingTask(null); setIsTaskModalOpen(false); };
    const handleOpenTrainingModal = (training: Training | Partial<Training> | null = null) => { setEditingTraining(training); setIsTrainingModalOpen(true); };
    const handleCloseTrainingModal = () => { setEditingTraining(null); setIsTrainingModalOpen(false); };
    
    const handleProcessAIInput = async (input: AIInput) => {
        const result = await analyzeInputForEntry(input);
        if (result.entryType === 'task' && result.taskDetails) {
            const { title, description, assignedTo, dueDate, priority } = result.taskDetails;
            let assignedToUid = '';
            if (assignedTo) {
                const foundUser = users.find(u => u.nama.toLowerCase().includes(assignedTo.toLowerCase()));
                assignedToUid = foundUser ? foundUser.uid : '';
            }
            handleOpenTaskModal({ title, description, assignedTo: assignedToUid, dueDate, priority, status: 'Pending' });
        } else if (result.entryType === 'training' && result.trainingDetails) {
            const { nama, tanggalMulai, tanggalSelesai, lokasi, pic, catatan } = result.trainingDetails;
            const today = new Date().toISOString().split('T')[0];
            handleOpenTrainingModal({ nama, tanggalMulai: tanggalMulai || today, tanggalSelesai: tanggalSelesai || tanggalMulai || today, lokasi, pic, catatan, status: 'Belum Dikonfirmasi' });
        } else {
            throw new Error("Teks atau gambar tidak dapat dikenali sebagai tugas atau pelatihan.");
        }
        setIsAIModalOpen(false);
    };

    const handleLogout = async () => { await signOut(auth); };

    const renderContent = () => {
        const props = { onEditTask: handleOpenTaskModal, onEditTraining: handleOpenTrainingModal, users };
        switch (activeMenu) {
            case 'dashboard': return <Dashboard onEditTask={handleOpenTaskModal} />;
            case 'tasks': return <TaskManagement {...props} />;
            case 'training': return <TrainingDashboard {...props} />;
            case 'analytics': return <EmployeeAnalyticsDashboard />;
            case 'search': return <EmployeeSearch />;
            case 'users': return <UserManagement />;
            case 'settings': return <Settings />;
            default: return <Dashboard onEditTask={handleOpenTaskModal} />;
        }
    };
    
    const saveMenuOrder = async (newOrder: string[]) => {
        if (userData?.uid) {
            try {
                await updateDoc(doc(db, 'users', userData.uid), { menuOrder: newOrder });
            } catch (error) { console.error("Failed to save menu order:", error); }
        }
    };

    const moveMenuItem = useCallback((dragIndex: number, hoverIndex: number) => {
        setMenuItems(prevItems => {
            const newItems = [...prevItems];
            const [movedItem] = newItems.splice(dragIndex, 1);
            newItems.splice(hoverIndex, 0, movedItem);
            if (userData?.role === 'admin') {
                saveMenuOrder(newItems.map(item => item.id));
            }
            return newItems;
        });
    }, [userData?.role]);


    if (!userData || !user) { return <div>Loading user data...</div>; }
    
    const showAddButtons = ['tasks', 'training'].includes(activeMenu);

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            {isEditMode && (
                <div className="fixed top-0 left-0 w-full bg-primary-600 text-white text-center py-2 z-50">
                    UI Edit Mode is ON. Click any text with a blue dashed border to edit.
                </div>
            )}
            <aside className={`absolute md:relative z-30 w-64 bg-white dark:bg-slate-800 flex-shrink-0 flex flex-col transform ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out border-r border-slate-200 dark:border-slate-700`}>
                <div className="px-6 h-20 flex items-center" style={{ paddingTop: isEditMode ? '2rem' : '' }}>
                     <EditableText as="h1" contentKey="app.headerTitle" defaultText={defaultTextContent['app.headerTitle']} className="text-2xl font-bold text-primary-600 dark:text-primary-400" />
                </div>
                <nav className="flex-grow px-4">
                    <ul className="space-y-1">
                        {menuItems.map((item, index) => (
                            <DraggableMenuItem key={item.id} id={item.id} index={index} moveMenuItem={moveMenuItem} isActive={activeMenu === item.id} onClick={() => { setActiveMenu(item.id); setSidebarVisible(false); }}>
                                {userData.role === 'admin' ? (
                                    <>
                                        <span className="w-6 h-6">{item.icon}</span>
                                        <span className="ml-3">{item.label}</span>
                                    </>
                                ) : (
                                    <a href="#" onClick={(e) => e.preventDefault()} className={`relative flex items-center p-3 rounded-lg transition-colors group w-full ${activeMenu === item.id ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'}`}>
                                        {activeMenu === item.id && <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary-600 rounded-r-full"></div>}
                                        <span className="w-6 h-6">{item.icon}</span>
                                        <span className="ml-3">{item.label}</span>
                                    </a>
                                )}
                            </DraggableMenuItem>
                        ))}
                    </ul>
                </nav>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden">
                <NotificationBanner />
                <header className="h-20 bg-white dark:bg-slate-800 flex-shrink-0 flex justify-between items-center px-6 border-b border-slate-200 dark:border-slate-700" style={{ paddingTop: isEditMode ? '2.5rem' : '' }}>
                    <div className="flex items-center gap-4">
                        <button className="md:hidden text-slate-500" onClick={() => setSidebarVisible(!isSidebarVisible)}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                        </button>
                        <h2 className="text-xl font-semibold hidden md:block text-slate-800 dark:text-slate-100">{menuItems.find(m => m.id === activeMenu)?.label}</h2>
                    </div>
                    <div className="flex items-center space-x-2">
                        {showAddButtons && (
                             <>
                                {/* Desktop Buttons */}
                                <div className="hidden sm:flex items-center space-x-2">
                                    <button onClick={() => setIsAIModalOpen(true)} className="flex items-center space-x-2 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-3 py-2 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900 transition-colors text-sm font-semibold" title="Tambah dengan AI">
                                        {ICONS.magic}
                                        <span>Tambah AI</span>
                                    </button>
                                    <button onClick={activeMenu === 'tasks' ? () => handleOpenTaskModal() : () => handleOpenTrainingModal()} className="flex items-center space-x-2 bg-primary-600 text-white px-3 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-semibold" title="Tambah Manual">
                                        {ICONS.add}
                                        <span>Tambah Manual</span>
                                    </button>
                                </div>
                                {/* Mobile Buttons */}
                                <div className="flex sm:hidden items-center space-x-2">
                                    <button onClick={() => setIsAIModalOpen(true)} className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900 transition-colors" title="Tambah dengan AI">
                                        {ICONS.magic}
                                    </button>
                                    <button onClick={activeMenu === 'tasks' ? () => handleOpenTaskModal() : () => handleOpenTrainingModal()} className="p-2 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors" title="Tambah Manual">
                                        {ICONS.add}
                                    </button>
                                </div>
                            </>
                        )}
                        <div className="flex items-center space-x-4 pl-2">
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
                            <button onClick={handleLogout} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500" title="Logout">{ICONS.logout}</button>
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 lg:p-8">
                    {renderContent()}
                </main>
            </div>
            
            {/* Render Modals Globally */}
            {isTaskModalOpen && <TaskModal task={editingTask} users={users} closeModal={handleCloseTaskModal} />}
            {isTrainingModalOpen && <TrainingModal training={editingTraining} closeModal={handleCloseTrainingModal} />}
            {isAIModalOpen && <AIInputModal 
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                onProcess={handleProcessAIInput}
                title={`Tambah ${activeMenu === 'tasks' ? 'Tugas' : 'Pelatihan'} dengan AI`}
                prompt={`Tempel teks atau screenshot untuk membuat ${activeMenu === 'tasks' ? 'tugas' : 'pelatihan'} baru secara otomatis.`}
            />}
        </div>
    );
};

export default MainLayout;