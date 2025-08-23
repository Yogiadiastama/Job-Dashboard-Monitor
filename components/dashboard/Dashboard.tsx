
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from '@firebase/firestore';
import { db, getFirestoreErrorMessage } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNotification, useConnectivity } from '../../hooks/useNotification';
import { Task, UserData, Training } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ICONS } from '../../constants';
import LoadingSpinner from '../common/LoadingSpinner';
import DashboardTaskModal from './DashboardTaskModal';
import DashboardTrainingModal from './DashboardTrainingModal';
import EditableText from '../common/EditableText';
import { defaultTextContent } from '../../hooks/useCustomization';
import AIWeeklySummary from './AIWeeklySummary';


const isTaskLate = (task: Task): boolean => {
    if (!task.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    return new Date(task.dueDate) < today && task.status !== 'Completed';
};

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; color: string; onClick?: () => void }> = ({ title, value, icon, color, onClick }) => {
    const colorClasses: { [key: string]: { bg: string, text: string } } = {
        blue: { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400' },
        green: { bg: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-600 dark:text-green-400' },
        yellow: { bg: 'bg-yellow-100 dark:bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400' },
        red: { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-600 dark:text-red-400' },
        purple: { bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400' },
        indigo: { bg: 'bg-indigo-100 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400' },
        slate: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-400' },
    };

    const styles = colorClasses[color] || colorClasses.slate;

    return (
        <div
            onClick={onClick}
            className={`bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center space-x-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg ${styles.bg}`}>
                <span className={styles.text}>{icon}</span>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
            </div>
        </div>
    );
};

const ActivityFeed: React.FC<{ users: UserData[] }> = ({ users }) => {
    const [activities, setActivities] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "tasks"), orderBy("updatedAt", "desc"), limit(7));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
            setActivities(tasksData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching recent activities:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    const getUserName = (uid: string) => users.find(u => u.uid === uid)?.nama || 'Unknown User';

    const formatRelativeTime = (dateString?: string) => {
        if (!dateString) return 'a while ago';
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = (now.getTime() - date.getTime()) / 1000;
        
        if (diffInSeconds < 60) return 'just now';
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
    };
    
    const getActivityText = (task: Task) => {
        const userName = getUserName(task.assignedTo);
        if (task.createdAt === task.updatedAt) {
            return <><strong>{userName}</strong> was assigned a new task: <em>{task.title}</em></>;
        }
        return <>Task for <strong>{userName}</strong>, <em>{task.title}</em>, was updated to <strong>{task.status}</strong></>;
    };

    return (
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">Recent Activity</h3>
            {loading ? <LoadingSpinner /> : (
                <ul className="space-y-4">
                    {activities.map(task => (
                        <li key={task.id} className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-300">
                                {ICONS.tasks}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-slate-700 dark:text-slate-300">{getActivityText(task)}</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(task.updatedAt)}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const Dashboard: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [trainings, setTrainings] = useState<Training[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const { userData } = useAuth();
    const { showNotification } = useNotification();
    const { setOffline } = useConnectivity();
    
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [modalTasks, setModalTasks] = useState<Task[]>([]);
    const [modalTaskTitle, setModalTaskTitle] = useState('');

    const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
    const [modalTrainings, setModalTrainings] = useState<Training[]>([]);
    const [modalTrainingTitle, setModalTrainingTitle] = useState('');


    useEffect(() => {
        if (!userData) return;
        
        let mounted = true;
        const unsubs: (() => void)[] = [];

        const fetchData = async () => {
            const tasksUnsub = onSnapshot(collection(db, "tasks"), 
                (snapshot) => {
                    if (!mounted) return;
                    const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
                    setTasks(tasksData);
                }, (error) => handleError(error, "tasks"));
            unsubs.push(tasksUnsub);

            const trainingsUnsub = onSnapshot(collection(db, "trainings"), 
                (snapshot) => {
                    if (!mounted) return;
                    const trainingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Training));
                    setTrainings(trainingsData);
                }, (error) => handleError(error, "trainings"));
            unsubs.push(trainingsUnsub);

            const usersUnsub = onSnapshot(collection(db, "users"), 
                (snapshot) => {
                    if (!mounted) return;
                    setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData)));
                }, (error) => handleError(error, "users"));
            unsubs.push(usersUnsub);

            // Wait for all initial data fetches to complete before setting loading to false
            Promise.all(unsubs).then(() => {
                 if(mounted) setLoading(false);
            });
        };

        const handleError = (error: any, context: string) => {
            console.error(`Dashboard: Error fetching ${context}:`, error);
            const firebaseError = error as { code?: string };
            if (firebaseError.code === 'unavailable') {
                setOffline(true, true);
            } else {
                showNotification(getFirestoreErrorMessage(firebaseError), "warning");
            }
        };

        fetchData();

        return () => {
            mounted = false;
            unsubs.forEach(unsub => unsub());
        };
    }, [userData, showNotification, setOffline]);

    const completedTasks = tasks.filter(task => task.status === 'Completed').length;
    const inProgressTasks = tasks.filter(task => task.status === 'On Progress').length;
    const lateTasks = tasks.filter(isTaskLate).length;
    
    const taskStats = [
        { title: 'Total Tasks', value: tasks.length, color: 'blue', filter: 'All', icon: ICONS.tasks },
        { title: 'Completed', value: completedTasks, color: 'green', filter: 'Completed', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        { title: 'On Progress', value: inProgressTasks, color: 'yellow', filter: 'On Progress', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" /></svg> },
        { title: 'Late', value: lateTasks, color: 'red', filter: 'Late', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingTrainings = trainings.filter(t => new Date(t.tanggalMulai) >= today).length;
    const pastTrainings = trainings.filter(t => new Date(t.tanggalSelesai) < today).length;

    const trainingStats = [
        { title: 'Total Trainings', value: trainings.length, color: 'purple', filter: 'All', icon: ICONS.training },
        { title: 'Upcoming', value: upcomingTrainings, color: 'indigo', filter: 'Upcoming', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
        { title: 'Past', value: pastTrainings, color: 'slate', filter: 'Past', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    ];
    
    const chartData = users
      .filter(u => u.role !== 'admin')
      .map(user => ({
        name: user.nama.split(' ')[0],
        'On Progress': tasks.filter(t => t.assignedTo === user.uid && t.status === 'On Progress').length,
        'Completed': tasks.filter(t => t.assignedTo === user.uid && t.status === 'Completed').length,
        'Late': tasks.filter(t => t.assignedTo === user.uid && isTaskLate(t)).length,
    }));

    const handleTaskStatCardClick = (filter: string, title: string) => {
        let filteredTasks: Task[] = [];
        switch (filter) {
            case 'All': filteredTasks = tasks; break;
            case 'Late': filteredTasks = tasks.filter(isTaskLate); break;
            default: filteredTasks = tasks.filter(task => task.status === filter); break;
        }
        setModalTasks(filteredTasks);
        setModalTaskTitle(`Task List: ${title}`);
        setIsTaskModalOpen(true);
    };
    
    const handleTrainingStatCardClick = (filter: string, title: string) => {
        let filteredTrainings: Training[] = [];
        switch (filter) {
            case 'All': filteredTrainings = trainings; break;
            case 'Upcoming': filteredTrainings = trainings.filter(t => new Date(t.tanggalMulai) >= today); break;
            case 'Past': filteredTrainings = trainings.filter(t => new Date(t.tanggalSelesai) < today); break;
        }
        setModalTrainings(filteredTrainings);
        setModalTrainingTitle(`Training List: ${title}`);
        setIsTrainingModalOpen(true);
    };

    if (loading || !userData) {
        return <div className="text-center p-10"><LoadingSpinner text="Loading dashboard..." /></div>;
    }

    return (
        <div className="animate-fade-in-down space-y-8">
            <AIWeeklySummary tasks={tasks} users={users} />
            <div>
                 <EditableText as="h2" contentKey="dashboard.tasks.title" defaultText={defaultTextContent['dashboard.tasks.title']} className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {taskStats.map(stat => (
                        <StatCard key={stat.title} title={stat.title} value={stat.value} color={stat.color} icon={stat.icon} onClick={() => handleTaskStatCardClick(stat.filter, stat.title)} />
                    ))}
                </div>
            </div>

             <div>
                 <EditableText as="h2" contentKey="dashboard.trainings.title" defaultText={defaultTextContent['dashboard.trainings.title']} className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {trainingStats.map(stat => (
                         <StatCard key={stat.title} title={stat.title} value={stat.value} color={stat.color} icon={stat.icon} onClick={() => handleTrainingStatCardClick(stat.filter, stat.title)} />
                    ))}
                </div>
            </div>

            {['admin', 'pimpinan', 'pegawai'].includes(userData.role) && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <ActivityFeed users={users} />
                    </div>
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <EditableText as="h3" contentKey="dashboard.employeeStats.title" defaultText={defaultTextContent['dashboard.employeeStats.title']} className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4" />
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                                    <XAxis dataKey="name" stroke="rgba(128, 128, 128, 0.5)" />
                                    <YAxis stroke="rgba(128, 128, 128, 0.5)" />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }} />
                                    <Legend />
                                    <Bar dataKey="On Progress" stackId="a" fill="#f59e0b" />
                                    <Bar dataKey="Completed" stackId="a" fill="#10b981" />
                                    <Bar dataKey="Late" stackId="a" fill="#ef4444" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
            <DashboardTaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={modalTaskTitle} tasks={modalTasks} users={users} />
            <DashboardTrainingModal isOpen={isTrainingModalOpen} onClose={() => setIsTrainingModalOpen(false)} title={modalTrainingTitle} trainings={modalTrainings} />
        </div>
    );
};

export default Dashboard;
