
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from '@firebase/firestore';
import { db, getFirestoreErrorMessage } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNotification, useConnectivity } from '../../hooks/useNotification';
import { Task, Training, UserData } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import { ICONS } from '../../constants';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import DashboardTaskModal from './DashboardTaskModal';
import DashboardTrainingModal from './DashboardTrainingModal';
import AIWeeklySummary from './AIWeeklySummary';

const DashboardStatCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    value: number | string;
    color: string;
    onClick?: () => void;
}> = ({ icon, title, value, color, onClick }) => (
    <div 
      className={`p-6 rounded-2xl shadow-lg transition-transform transform hover:-translate-y-1 flex items-start justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div>
        <h3 className="text-slate-500 dark:text-slate-400 font-semibold">{title}</h3>
        <p className="text-4xl font-bold text-slate-800 dark:text-slate-100 mt-2">{value}</p>
      </div>
      <div className={`w-12 h-12 flex items-center justify-center rounded-full ${color}`}>
        {icon}
      </div>
    </div>
);

const Dashboard: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [trainings, setTrainings] = useState<Training[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalData, setModalData] = useState<{ type: 'task' | 'training'; title: string; data: any[] } | null>(null);

    const { userData } = useAuth();
    const { showNotification } = useNotification();
    const { setOffline } = useConnectivity();

    useEffect(() => {
        if (!userData) return;
        
        let mounted = true;

        const collectionsToFetch = [
            { name: 'tasks', setter: setTasks },
            { name: 'trainings', setter: setTrainings },
            { name: 'users', setter: setUsers },
        ];

        const unsubs = collectionsToFetch.map(({ name, setter }) => 
            onSnapshot(collection(db, name), 
                (snapshot) => {
                    if (mounted) {
                        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        setter(data as any);
                    }
                },
                (error) => {
                    console.error(`Dashboard: Error fetching ${name}:`, error);
                    const firebaseError = error as { code?: string };
                    if (firebaseError.code === 'unavailable') setOffline(true, true);
                    else showNotification(getFirestoreErrorMessage(firebaseError), "warning");
                }
            )
        );
        
        // Use a timer to set loading to false to prevent flashing
        const timer = setTimeout(() => {
            if (mounted) setLoading(false);
        }, 500);

        return () => {
            mounted = false;
            unsubs.forEach(unsub => unsub());
            clearTimeout(timer);
        };
    }, [userData, showNotification, setOffline]);

    const dashboardStats = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const myTasks = (userData?.role === 'admin' || userData?.role === 'pimpinan')
            ? tasks
            : tasks.filter(t => t.assignedTo === userData?.uid);

        const pendingTasks = myTasks.filter(t => t.status === 'Pending');
        const onProgressTasks = myTasks.filter(t => t.status === 'On Progress');
        const lateTasks = myTasks.filter(t => t.dueDate < todayStr && t.status !== 'Completed');
        const upcomingTrainings = trainings.filter(t => t.tanggalMulai >= todayStr);

        const taskStatusDistribution = [
            { name: 'Pending', value: tasks.filter(t => t.status === 'Pending').length },
            { name: 'On Progress', value: tasks.filter(t => t.status === 'On Progress').length },
            { name: 'Completed', value: tasks.filter(t => t.status === 'Completed').length },
        ].filter(item => item.value > 0);

        return { pendingTasks, onProgressTasks, lateTasks, upcomingTrainings, taskStatusDistribution };
    }, [tasks, trainings, userData]);

    const handleOpenModal = (type: 'task' | 'training', title: string, data: any[]) => {
        if (data.length > 0) {
            setModalData({ type, title, data });
        }
    };

    const handleCloseModal = () => setModalData(null);
    
    if (loading) {
        return <div className="flex items-center justify-center h-full"><LoadingSpinner text="Loading dashboard..." /></div>;
    }

    const PIE_COLORS: { [key: string]: string } = { 'Pending': '#f59e0b', 'On Progress': '#3b82f6', 'Completed': '#10b981' };

    return (
        <div className="space-y-8 animate-fade-in-down">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Welcome back, {userData?.nama.split(' ')[0]}!</h1>
                <p className="text-slate-500 dark:text-slate-400">Here's your performance summary for today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <DashboardStatCard 
                    title="My Pending Tasks" 
                    value={dashboardStats.pendingTasks.length} 
                    icon={ICONS.tasks}
                    color="bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                    onClick={() => handleOpenModal('task', 'My Pending Tasks', dashboardStats.pendingTasks)}
                 />
                 <DashboardStatCard 
                    title="Tasks In Progress" 
                    value={dashboardStats.onProgressTasks.length} 
                    icon={ICONS.tasks}
                    color="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                    onClick={() => handleOpenModal('task', 'Tasks In Progress', dashboardStats.onProgressTasks)}
                 />
                 <DashboardStatCard 
                    title="Overdue Tasks" 
                    value={dashboardStats.lateTasks.length} 
                    icon={ICONS.bell}
                    color="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                    onClick={() => handleOpenModal('task', 'Overdue Tasks', dashboardStats.lateTasks)}
                 />
                 <DashboardStatCard 
                    title="Upcoming Trainings" 
                    value={dashboardStats.upcomingTrainings.length} 
                    icon={ICONS.training}
                    color="bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                    onClick={() => handleOpenModal('training', 'Upcoming Trainings', dashboardStats.upcomingTrainings)}
                 />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                 <div className="lg:col-span-3">
                     <AIWeeklySummary tasks={tasks} users={users} />
                 </div>
                 <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-full border border-slate-200 dark:border-slate-700">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Task Status Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={dashboardStats.taskStatusDistribution} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value">
                                    {dashboardStats.taskStatusDistribution.map((entry) => (
                                        <Cell key={`cell-${entry.name}`} fill={PIE_COLORS[entry.name]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid #ccc', borderRadius: '0.5rem' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                 </div>
            </div>

            {modalData?.type === 'task' && (
                <DashboardTaskModal isOpen={!!modalData} onClose={handleCloseModal} title={modalData.title} tasks={modalData.data} users={users} />
            )}
            {modalData?.type === 'training' && (
                 <DashboardTrainingModal isOpen={!!modalData} onClose={handleCloseModal} title={modalData.title} trainings={modalData.data} />
            )}
        </div>
    );
};

export default Dashboard;
