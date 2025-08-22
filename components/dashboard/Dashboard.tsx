
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

const Dashboard: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [trainings, setTrainings] = useState<Training[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [loadingTrainings, setLoadingTrainings] = useState(true);
    const [viewMode, setViewMode] = useState('table');
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
    const lateTasks = tasks.filter(isTaskLate).length;
    
    const taskStats = [
        { title: 'Total Pekerjaan', value: tasks.length, color: 'blue', filter: 'All' },
        { title: 'Completed', value: completedTasks, color: 'green', filter: 'Completed' },
        { title: 'On Progress', value: inProgressTasks, color: 'yellow', filter: 'On Progress' },
        { title: 'Late', value: lateTasks, color: 'red', filter: 'Late' },
    ];

    // Training stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingTrainings = trainings.filter(t => new Date(t.tanggalMulai) >= today).length;
    const pastTrainings = trainings.filter(t => new Date(t.tanggalSelesai) < today).length;

    const trainingStats = [
        { title: 'Total Training', value: trainings.length, color: 'purple', filter: 'All' },
        { title: 'Akan Datang', value: upcomingTrainings, color: 'indigo', filter: 'Upcoming' },
        { title: 'Telah Lewat', value: pastTrainings, color: 'gray', filter: 'Past' },
    ];
    
    const employeeOfTheMonth = () => {
        if (users.length === 0 || tasks.length === 0) return { nama: 'N/A', completed: 0 };
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
                        `- Terlambat: *${lateTasks}*`;
        
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
                 <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">Ringkasan Pekerjaan</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {taskStats.map(stat => (
                        <div 
                            key={stat.title} 
                            className={`bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-${stat.color}-500 transform transition-transform duration-300 hover:-translate-y-2 hover:shadow-xl cursor-pointer`}
                            onClick={() => handleTaskStatCardClick(stat.filter, stat.title)}
                        >
                            <h3 className="text-gray-500 dark:text-gray-400 font-medium">{stat.title}</h3>
                            <p className="text-4xl font-bold mt-2">{stat.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Training Stat Cards */}
             <div>
                 <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">Ringkasan Training</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {trainingStats.map(stat => (
                        <div 
                            key={stat.title} 
                            className={`bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-${stat.color}-500 transform transition-transform duration-300 hover:-translate-y-2 hover:shadow-xl cursor-pointer`}
                            onClick={() => handleTrainingStatCardClick(stat.filter, stat.title)}
                        >
                            <h3 className="text-gray-500 dark:text-gray-400 font-medium">{stat.title}</h3>
                            <p className="text-4xl font-bold mt-2">{stat.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {['admin', 'pimpinan', 'pegawai'].includes(userData.role) && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col items-center justify-center text-center">
                        <h3 className="text-xl font-bold mb-4">Pegawai Terbaik Bulan Ini</h3>
                        <img className="h-24 w-24 rounded-full object-cover ring-4 ring-yellow-400 mb-4" src={`https://ui-avatars.com/api/?name=${bestEmployee.nama}&background=random&color=fff`} alt="Best Employee" />
                        <p className="text-2xl font-semibold">{bestEmployee.nama}</p>
                        <p className="text-gray-500 dark:text-gray-400">{bestEmployee.completed} pekerjaan selesai</p>
                    </div>

                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                        <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Overview Pekerjaan Pegawai</h3>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg ${viewMode === 'table' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{ICONS.table}</button>
                                <button onClick={() => setViewMode('chart')} className={`p-2 rounded-lg ${viewMode === 'chart' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{ICONS.chart}</button>
                                <button onClick={handleWhatsAppExport} className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
                                    {ICONS.whatsapp}
                                    <span>Export</span>
                                </button>
                            </div>
                        </div>

                        {viewMode === 'chart' ? (
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip contentStyle={{ backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#fff', border: 'none', borderRadius: '0.5rem' }} />
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