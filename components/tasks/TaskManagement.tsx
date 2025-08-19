import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { Task, UserData } from '../../types';
import { ICONS } from '../../constants';
import TaskModal from './TaskModal';
import LoadingSpinner from '../common/LoadingSpinner';

const TaskManagement: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const { userData } = useAuth();
    const { showNotification } = useNotification();
    
    useEffect(() => {
        if (!userData) return;
        const offlineMessage = "Anda sepertinya offline. Data yang ditampilkan mungkin sudah usang.";

        // Semua role kini dapat melihat semua pekerjaan
        const tasksUnsub = onSnapshot(collection(db, "tasks"), 
            (snapshot) => {
                const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
                setTasks(tasksData);
                setLoading(false);
            },
            (error) => {
                console.error("TaskManagement: Error fetching tasks:", error);
                showNotification(offlineMessage, "warning");
                setLoading(false);
            }
        );

        const usersUnsub = onSnapshot(collection(db, "users"), 
            (snapshot) => {
                const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
                setUsers(usersData);
            },
            (error) => {
                console.error("TaskManagement: Error fetching users:", error);
                showNotification(offlineMessage, "warning");
            }
        );
        
        return () => {
            tasksUnsub();
            usersUnsub();
        };
    }, [userData, showNotification]);
    
    const openModal = (task: Task | null = null) => {
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
                    const fileRef = ref(storage, fileUrl);
                    await deleteObject(fileRef);
                }
                await deleteDoc(doc(db, "tasks", taskId));
                showNotification("Pekerjaan berhasil dihapus!", "success");
            } catch (error) {
                console.error("Error deleting task: ", error);
                showNotification("Gagal menghapus pekerjaan.", "error");
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

    const handleAddTaskToCalendar = async (task: Task) => {
        if (!userData) {
            showNotification('Anda harus login untuk melakukan aksi ini.', 'warning');
            return;
        }

        if (window.confirm(`Tambahkan pekerjaan "${task.title}" ke kalender pada tanggal ${new Date(task.dueDate).toLocaleDateString('id-ID')}?`)) {
            try {
                const eventData = {
                    title: `Pekerjaan: ${task.title}`,
                    date: task.dueDate,
                    description: `Batas waktu untuk pekerjaan: "${task.title}". Ditugaskan kepada: ${getUserName(task.assignedTo)}.`,
                    createdBy: userData.uid,
                };
                await addDoc(collection(db, "events"), eventData);
                showNotification(`Pekerjaan "${task.title}" berhasil ditambahkan ke kalender.`, 'success');
            } catch (error) {
                console.error("Error adding task to calendar: ", error);
                showNotification("Gagal menambahkan pekerjaan ke kalender.", 'error');
            }
        }
    };

    const getUserName = (userId: string) => {
        const user = users.find(u => u.uid === userId);
        return user ? user.nama : 'Tidak diketahui';
    };
    
    const priorityClass: { [key: string]: string } = {
        High: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        Mid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        Low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    };

    const statusClass: { [key:string]: string } = {
        'On Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'Completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'Pending': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };

    if (!userData) return <LoadingSpinner />;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg animate-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h3 className="text-2xl font-bold">Daftar Pekerjaan</h3>
                {['admin', 'pimpinan', 'pegawai'].includes(userData.role) && (
                    <button onClick={() => openModal()} className="flex items-center justify-center sm:justify-start space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors transform hover:-translate-y-1 shadow-lg w-full sm:w-auto">
                        {ICONS.add}
                        <span>Tambah Pekerjaan</span>
                    </button>
                )}
            </div>
            
            {loading ? <LoadingSpinner text="Memuat pekerjaan..."/> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[640px]">
                        <thead>
                            <tr className="border-b-2 dark:border-gray-700">
                                <th className="p-4">Judul</th>
                                <th className="p-4">Ditugaskan Kepada</th>
                                <th className="p-4">Due Date</th>
                                <th className="p-4">Prioritas</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Rating</th>
                                <th className="p-4">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map(task => (
                                <tr key={task.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <td className="p-4 font-medium">{task.title}</td>
                                    <td className="p-4">{getUserName(task.assignedTo)}</td>
                                    <td className="p-4">{new Date(task.dueDate).toLocaleDateString('id-ID')}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${priorityClass[task.priority]}`}>
                                            {task.priority}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusClass[task.status]}`}>
                                            {task.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                       <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i} className={i < (task.rating || 0) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}>
                                                    {ICONS.star}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-4 flex items-center space-x-2">
                                        <button onClick={() => openModal(task)} className="p-2 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800 text-yellow-600 dark:text-yellow-300 transition-colors" title="Edit Pekerjaan">{ICONS.edit}</button>
                                        <button onClick={() => handleAddTaskToCalendar(task)} className="p-2 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 text-indigo-600 dark:text-indigo-300 transition-colors" title="Tambah ke Kalender">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </button>
                                        <button onClick={() => handleWhatsAppExport(task)} className="p-2 rounded-full hover:bg-green-200 dark:hover:bg-green-800 text-green-600 dark:text-green-300 transition-colors" title="Export Detail ke WhatsApp">
                                            {ICONS.whatsapp}
                                        </button>
                                        {['admin', 'pimpinan', 'pegawai'].includes(userData.role) && (
                                            <button onClick={() => handleDelete(task.id, task.fileUrl)} className="p-2 rounded-full hover:bg-red-200 dark:hover:bg-red-800 text-red-600 dark:text-red-300 transition-colors" title="Hapus Pekerjaan">{ICONS.delete}</button>
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