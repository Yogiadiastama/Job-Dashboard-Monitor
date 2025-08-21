import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc, addDoc } from '@firebase/firestore';
import { ref, deleteObject } from '@firebase/storage';
import { db, storage, getFirestoreErrorMessage } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { Task, UserData, TrainingStatus, TaskPriority, TaskStatus } from '../../types';
import { ICONS } from '../../constants';
import TaskModal from './TaskModal';
import LoadingSpinner from '../common/LoadingSpinner';

type SortableTaskKeys = keyof Pick<Task, 'title' | 'dueDate' | 'priority' | 'status' | 'createdAt'>;

const TaskManagement: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
    const { userData } = useAuth();
    const { showNotification } = useNotification();
    const [sortConfig, setSortConfig] = useState<{ key: SortableTaskKeys; direction: 'ascending' | 'descending' }>({ key: 'createdAt', direction: 'descending' });
    
    useEffect(() => {
        if (!userData) return;

        const tasksUnsub = onSnapshot(collection(db, "tasks"), 
            (snapshot) => {
                const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
                setTasks(tasksData);
                setLoading(false);
            },
            (error) => {
                console.error("TaskManagement: Error fetching tasks:", error);
                showNotification(getFirestoreErrorMessage(error as { code?: string }), "warning");
                setLoading(false);
            }
        );

        const usersUnsub = onSnapshot(collection(db, "users"), 
            (snapshot) => {
                setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData)));
            },
            (error) => {
                console.error("TaskManagement: Error fetching users:", error);
                showNotification(getFirestoreErrorMessage(error as { code?: string }), "warning");
            }
        );
        
        return () => {
            tasksUnsub();
            usersUnsub();
        };
    }, [userData, showNotification]);

    const sortedTasks = useMemo(() => {
        let sortableItems = [...tasks];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key as keyof Task];
                const valB = b[sortConfig.key as keyof Task];

                if (valA === undefined || valA === null) return 1;
                if (valB === undefined || valB === null) return -1;
                
                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [tasks, sortConfig]);

    const requestSort = (key: SortableTaskKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableTaskKeys) => {
        if (sortConfig.key !== key) return <span className="text-neutral-400"> T </span>;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };
    
    const openModal = (task: Partial<Task> | null = null) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTask(null);
    };

    const handleDelete = async (taskId: string, fileUrl?: string) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus pekerjaan ini?')) {
            try {
                if (fileUrl) {
                    await deleteObject(ref(storage, fileUrl));
                }
                await deleteDoc(doc(db, "tasks", taskId));
                alert("Pekerjaan berhasil dihapus!");
            } catch (error) {
                console.error("Error deleting task: ", error);
                alert("Gagal menghapus pekerjaan.");
            }
        }
    };
    
    const handleWhatsAppExport = (task: Task) => {
        const assignedUserName = getUserName(task.assignedTo);
        const formattedDueDate = new Date(task.dueDate).toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        const message = `*Detail Pekerjaan - ProjectFlow Pro*\n\n` +
                        `*Judul:* ${task.title}\n` +
                        `*Ditugaskan Kepada:* ${assignedUserName}\n\n` +
                        `*Deskripsi:*\n${task.description || 'Tidak ada deskripsi.'}\n\n` +
                        `*Prioritas:* ${task.priority}\n` +
                        `*Batas Waktu:* ${formattedDueDate}\n\n` +
                        `---\n` +
                        `_Catatan: Tanggal kapan pekerjaan diberikan tidak tercatat dalam sistem._`;

        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleExportToTraining = async (task: Task) => {
        if (window.confirm(`Apakah Anda yakin ingin membuat jadwal training dari pekerjaan "${task.title}"?`)) {
            try {
                const newTrainingData = {
                    nama: task.title,
                    tanggalMulai: task.dueDate,
                    tanggalSelesai: task.dueDate,
                    lokasi: 'Akan ditentukan',
                    pic: getUserName(task.assignedTo),
                    catatan: `Diekspor dari pekerjaan: ${task.description || 'Tidak ada deskripsi.'}`,
                    status: 'Belum Dikonfirmasi' as TrainingStatus,
                };

                await addDoc(collection(db, "trainings"), newTrainingData);
                showNotification(`Pekerjaan "${task.title}" berhasil diekspor ke dashboard training.`, 'success');
            } catch (error) {
                console.error("Error exporting task to training: ", error);
                showNotification("Gagal mengekspor pekerjaan ke training.", 'error');
            }
        }
    };

    const getUserName = (userId: string) => users.find(u => u.uid === userId)?.nama || 'Tidak diketahui';
    
    const priorityClass: { [key in TaskPriority]: string } = {
        High: 'bg-danger-bg text-danger-text',
        Mid: 'bg-warning-bg text-warning-text',
        Low: 'bg-success-bg text-success-text',
    };

    const statusClass: { [key in TaskStatus]: string } = {
        'On Progress': 'bg-info-bg text-info-text',
        'Completed': 'bg-success-bg text-success-text',
        'Pending': 'bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200',
    };

    if (!userData) return <LoadingSpinner />;

    return (
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-md animate-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h3 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Daftar Pekerjaan</h3>
                {['admin', 'pimpinan', 'pegawai'].includes(userData.role) && (
                    <button 
                        onClick={() => openModal()} 
                        className="flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        title="Tambah Pekerjaan"
                    >
                        {ICONS.add}
                        <span>Tambah Pekerjaan</span>
                    </button>
                )}
            </div>
            
            {loading ? <LoadingSpinner text="Memuat pekerjaan..."/> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead>
                            <tr className="border-b-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700/50">
                                {['title', 'dueDate', 'createdAt', 'priority', 'status'].map(key => (
                                    <th key={key} className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider cursor-pointer" onClick={() => requestSort(key as SortableTaskKeys)}>
                                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                        {getSortIndicator(key as SortableTaskKeys)}
                                    </th>
                                ))}
                                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">Ditugaskan</th>
                                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">Rating</th>
                                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTasks.map(task => (
                                <tr key={task.id} className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors">
                                    <td className="p-4 font-medium text-neutral-800 dark:text-neutral-100">{task.title}</td>
                                    <td className="p-4 text-neutral-600 dark:text-neutral-300">{new Date(task.dueDate).toLocaleDateString('id-ID')}</td>
                                    <td className="p-4 text-neutral-600 dark:text-neutral-300">{task.createdAt ? new Date(task.createdAt).toLocaleDateString('id-ID') : '-'}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${priorityClass[task.priority]}`}>{task.priority}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusClass[task.status]}`}>{task.status}</span>
                                    </td>
                                    <td className="p-4 text-neutral-600 dark:text-neutral-300">{getUserName(task.assignedTo)}</td>
                                    <td className="p-4">
                                       <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i} className={i < (task.rating || 0) ? 'text-yellow-400' : 'text-neutral-300 dark:text-neutral-600'}>{ICONS.star}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-4 flex items-center space-x-2">
                                        <button onClick={() => openModal(task)} className="p-2 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-800/50 text-yellow-500 transition-colors" title="Edit Pekerjaan">{ICONS.edit}</button>
                                        <button onClick={() => handleWhatsAppExport(task)} className="p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-800/50 text-green-500 transition-colors" title="Export Detail ke WhatsApp">{ICONS.whatsapp}</button>
                                        <button onClick={() => handleExportToTraining(task)} className="p-2 rounded-full hover:bg-purple-100 dark:hover:bg-purple-800/50 text-purple-500 transition-colors" title="Export ke Training">{ICONS.graduationCap}</button>
                                        {['admin', 'pimpinan', 'pegawai'].includes(userData.role) && (
                                            <button onClick={() => handleDelete(task.id, task.fileUrl)} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-800/50 text-red-500 transition-colors" title="Hapus Pekerjaan">{ICONS.delete}</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && <TaskModal task={editingTask} users={users} closeModal={closeModal} />}
        </div>
    );
};

export default TaskManagement;