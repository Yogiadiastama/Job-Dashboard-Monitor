import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from '@firebase/firestore';
import { db, getFirestoreErrorMessage } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { Task, UserData, Training } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ICONS } from '../../constants';
import LoadingSpinner from '../common/LoadingSpinner';
import DashboardTaskModal from './DashboardTaskModal';
import DashboardTrainingModal from './DashboardTrainingModal';


const isTaskLate = (task: Task): boolean => {
    if (!task.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    return new Date(task.dueDate) < today && task.status !== 'Completed';
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; onClick: () => void }> = ({ title, value, icon, color, onClick }) => (
    <div 
        className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-md transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer flex items-center space-x-4"
        onClick={onClick}
    >
        <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/50 text-${color}-600 dark:text-${color}-400`}>
            {icon}
        </div>
        <div>
            <h3 className="text-neutral-500 dark:text-neutral-400 font-medium text-sm uppercase tracking-wider">{title}</h3>
            <p className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 mt-1">{value}</p>
        </div>
    </div>
);

const Dashboard: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [trainings, setTrainings] = useState<Training[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [loadingTrainings, setLoadingTrainings] = useState(true);
    const [viewMode, setViewMode] = useState('chart');
    const { userData } = useAuth();
    const { showNotification } = useNotification();
    
    // State for Task Modal
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [modalTasks, setModalTasks] = useState<Task[]>([]);
    const [modalTaskTitle, setModalTaskTitle] = useState('');

    // State for Training Modal
    const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
    const [modalTrainings, setModalTrainings] = useState<Training[]>([]);
    const [modalTrainingTitle, setModalTrainingTitle] = useState('');


    useEffect(() => {
        if (!userData) return;
        
        const tasksUnsub = onSnapshot(collection(db, "tasks"), 
            (snapshot) => {
                const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
                setTasks(tasksData);
                setLoadingTasks(false);
            },
            (error) => {
                console.error("Dashboard: Error fetching tasks:", error);
                showNotification(getFirestoreErrorMessage(error as { code?: string }), "warning");
                setLoadingTasks(false);
            }
        );
        
        const trainingsUnsub = onSnapshot(collection(db, "trainings"), 
            (snapshot) => {
                const trainingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Training));
                setTrainings(trainingsData);
                setLoadingTrainings(false);
            },
            (error) => {
                console.error("Dashboard: Error fetching trainings:", error);
                showNotification(getFirestoreErrorMessage(error as { code?: string }), "warning");
                setLoadingTrainings(false);
            }
        );

        let usersUnsub = () => {};
        if (['admin', 'pimpinan', 'pegawai'].includes(userData.role)) {
            usersUnsub = onSnapshot(collection(db, "users"), 
                (snapshot) => {
                    setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData)));
                },
                (error) => {
                     console.error("Dashboard: Error fetching users:", error);
                     showNotification(getFirestoreErrorMessage(error as { code?: string }), "warning");
                }
            );
        }
        
        return () => {
            tasksUnsub();
            trainingsUnsub();
            usersUnsub();
        };
    }, [userData, showNotification]);

    // Task stats
    const completedTasks = tasks.filter(task => task.status === 'Completed').length;
    const inProgressTasks = tasks.filter(task => task.status === 'On Progress').length;
    const lateTasksCount = tasks.filter(isTaskLate).length;
    
    const taskStats = [
        { title: 'Total Pekerjaan', value: tasks.length, color: 'primary', icon: ICONS.tasks, filter: 'All' },
        { title: 'Completed', value: completedTasks, color: 'green', icon: ICONS.star, filter: 'Completed' },
        { title: 'On Progress', value: inProgressTasks, color: 'yellow', icon: ICONS.chart, filter: 'On Progress' },
        { title: 'Late', value: lateTasksCount, color: 'red', icon: ICONS.bell, filter: 'Late' },
    ];

    // Training stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingTrainings = trainings.filter(t => new Date(t.tanggalMulai) >= today).length;
    const pastTrainings = trainings.filter(t => new Date(t.tanggalSelesai) < today).length;

    const trainingStats = [
        { title: 'Total Training', value: trainings.length, color: 'purple', icon: ICONS.training, filter: 'All' },
        { title: 'Akan Datang', value: upcomingTrainings, color: 'indigo', icon: ICONS.calendar, filter: 'Upcoming' },
        { title: 'Telah Lewat', value: pastTrainings, color: 'gray', icon: ICONS.logout, filter: 'Past' },
    ];
    
    const employeeOfTheMonth = () => {
        if (users.length === 0 || tasks.length === 0) return { nama: 'N/A', completed: 0, photoURL: '' };
        const employeeStats = users.map(user => ({
            ...user,
            completed: tasks.filter(task => task.assignedTo === user.uid && task.status === 'Completed').length
        }));
        return employeeStats.sort((a, b) => b.completed - a.completed)[0];
    };
    
    const bestEmployee = employeeOfTheMonth();

    const chartData = users
      .filter(u => u.role !== 'admin')
      .map(user => ({
        name: user.nama.split(' ')[0],
        'On Progress': tasks.filter(t => t.assignedTo === user.uid && t.status === 'On Progress').length,
        'Completed': tasks.filter(t => t.assignedTo === user.uid && t.status === 'Completed').length,
        'Late': tasks.filter(t => t.assignedTo === user.uid && isTaskLate(t)).length,
    }));

    const handleWhatsAppExport = () => {
        let message = `*Ringkasan Pekerjaan ProjectFlow Pro*:\n\n` +
                        `- Total Pekerjaan: *${tasks.length}*\n` +
                        `- Selesai: *${completedTasks}*\n` +
                        `- Dalam Proses: *${inProgressTasks}*\n` +
                        `- Terlambat: *${lateTasksCount}*`;
        
        if (bestEmployee.nama !== 'N/A') {
            message += `\n\n*Pegawai Terbaik Bulan Ini*: ${bestEmployee.nama} (${bestEmployee.completed} pekerjaan selesai)`;
        }
        
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleTaskStatCardClick = (filter: string, title: string) => {
        let filteredTasks: Task[] = [];
        switch (filter) {
            case 'All': filteredTasks = tasks; break;
            case 'Late': filteredTasks = tasks.filter(isTaskLate); break;
            default: filteredTasks = tasks.filter(task => task.status === filter); break;
        }
        setModalTasks(filteredTasks);
        setModalTaskTitle(`Daftar Pekerjaan: ${title}`);
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
        setModalTrainingTitle(`Daftar Training: ${title}`);
        setIsTrainingModalOpen(true);
    };

    if (loadingTasks || loadingTrainings || !userData) {
        return <div className="text-center p-10"><LoadingSpinner text="Memuat dashboard..." /></div>;
    }

    return (
        <div className="animate-fade-in-up space-y-8">
            {/* Task Stat Cards */}
            <div>
                 <h2 className="text-xl font-bold text-neutral-700 dark:text-neutral-300 mb-4">Ringkasan Pekerjaan</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {taskStats.map(stat => (
                        <StatCard 
                            key={stat.title} 
                            title={stat.title}
                            value={stat.value}
                            icon={stat.icon}
                            color={stat.color}
                            onClick={() => handleTaskStatCardClick(stat.filter, stat.title)}
                        />
                    ))}
                </div>
            </div>

            {/* Training Stat Cards */}
             <div>
                 <h2 className="text-xl font-bold text-neutral-700 dark:text-neutral-300 mb-4">Ringkasan Training</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                     {trainingStats.map(stat => (
                        <StatCard 
                            key={stat.title} 
                            title={stat.title}
                            value={stat.value}
                            icon={stat.icon}
                            color={stat.color}
                            onClick={() => handleTrainingStatCardClick(stat.filter, stat.title)}
                        />
                    ))}
                </div>
            </div>

            {['admin', 'pimpinan', 'pegawai'].includes(userData.role) && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-md flex flex-col items-center justify-center text-center">
                        <h3 className="text-lg font-bold text-neutral-700 dark:text-neutral-200 mb-4">Pegawai Terbaik Bulan Ini</h3>
                        <div className="relative">
                            <img className="h-24 w-24 rounded-full object-cover ring-4 ring-yellow-400 dark:ring-yellow-500 mb-4" src={bestEmployee.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(bestEmployee.nama)}&background=random&color=fff`} alt="Best Employee" />
                            <span className="absolute bottom-4 -right-1 bg-yellow-400 p-1.5 rounded-full text-white">
                                {ICONS.star}
                            </span>
                        </div>
                        <p className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">{bestEmployee.nama}</p>
                        <p className="text-neutral-500 dark:text-neutral-400">{bestEmployee.completed} pekerjaan selesai</p>
                    </div>

                    <div className="lg:col-span-2 bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-md">
                        <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Overview Pekerjaan Pegawai</h3>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg ${viewMode === 'table' ? 'bg-primary-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}>{ICONS.table}</button>
                                <button onClick={() => setViewMode('chart')} className={`p-2 rounded-lg ${viewMode === 'chart' ? 'bg-primary-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}>{ICONS.chart}</button>
                                <button onClick={handleWhatsAppExport} className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
                                    {ICONS.whatsapp}
                                    <span className="hidden sm:inline">Export</span>
                                </button>
                            </div>
                        </div>

                        {viewMode === 'chart' ? (
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={document.documentElement.classList.contains('dark') ? '#475569' : '#e2e8f0'} />
                                        <XAxis dataKey="name" tick={{ fill: document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#64748b' }} />
                                        <YAxis tick={{ fill: document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#64748b' }}/>
                                        <Tooltip contentStyle={{ backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff', border: '1px solid #334155', borderRadius: '0.5rem' }} />
                                        <Legend />
                                        <Bar dataKey="On Progress" stackId="a" fill="#f59e0b" />
                                        <Bar dataKey="Completed" stackId="a" fill="#22c55e" />
                                        <Bar dataKey="Late" stackId="a" fill="#ef4444" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b dark:border-neutral-700">
                                            <th className="p-3 font-semibold text-neutral-600 dark:text-neutral-300">Nama Pegawai</th>
                                            <th className="p-3 text-center font-semibold text-neutral-600 dark:text-neutral-300">On Progress</th>
                                            <th className="p-3 text-center font-semibold text-neutral-600 dark:text-neutral-300">Completed</th>
                                            <th className="p-3 text-center font-semibold text-neutral-600 dark:text-neutral-300">Late</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.filter(u => u.role !== 'admin').map(user => (
                                            <tr key={user.id} className="border-b dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                                                <td className="p-3 font-medium">{user.nama}</td>
                                                <td className="p-3 text-center">{tasks.filter(t => t.assignedTo === user.uid && t.status === 'On Progress').length}</td>
                                                <td className="p-3 text-center">{tasks.filter(t => t.assignedTo === user.uid && t.status === 'Completed').length}</td>
                                                <td className="p-3 text-center">{tasks.filter(t => t.assignedTo === user.uid && isTaskLate(t)).length}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <DashboardTaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                title={modalTaskTitle}
                tasks={modalTasks}
                users={users}
            />
            <DashboardTrainingModal
                isOpen={isTrainingModalOpen}
                onClose={() => setIsTrainingModalOpen(false)}
                title={modalTrainingTitle}
                trainings={modalTrainings}
            />
        </div>
    );
};

export default Dashboard;