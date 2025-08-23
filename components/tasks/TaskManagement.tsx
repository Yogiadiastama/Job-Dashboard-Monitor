import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc, addDoc } from '@firebase/firestore';
import { ref, deleteObject } from '@firebase/storage';
import { db, storage, getFirestoreErrorMessage } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { Task, UserData, TrainingStatus, TaskPriority, TaskStatus, AIParsedTask } from '../../types';
import { ICONS } from '../../constants';
import TaskModal from './TaskModal';
import LoadingSpinner from '../common/LoadingSpinner';
import { analyzeTextForEntry } from '../../services/geminiService';
import AIInputModal from '../training/AddWithAIModal';


type SortableTaskKeys = keyof Pick<Task, 'title' | 'dueDate' | 'priority' | 'status' | 'createdAt'>;

const TaskManagement: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | Partial<Task> | null>(null);
    const { userData } = useAuth();
    const { showNotification } = useNotification();
    const [sortConfig, setSortConfig] = useState<{ key: SortableTaskKeys; direction: 'ascending' | 'descending' }>({ key: 'createdAt', direction: 'descending' });
    const [isFabMenuOpen, setFabMenuOpen] = useState(false);
    
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
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];

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
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };
    
    const openModal = (task: Task | Partial<Task> | null = null) => {
        setEditingTask(task);
        setIsModalOpen(true);
        setFabMenuOpen(false);
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

    const handleProcessAIText = async (text: string) => {
        try {
            const result = await analyzeTextForEntry(text);
            if (result.entryType !== 'task' || !result.taskDetails) {
                showNotification("Teks yang Anda masukkan sepertinya bukan permintaan pekerjaan. Coba lagi.", "error");
                return;
            }

            const { title, description, assignedTo, dueDate, priority } = result.taskDetails;
            let assignedToUid = '';
            
            if (assignedTo) {
                const foundUser = users.find(u => u.nama.toLowerCase().includes(assignedTo.toLowerCase()));
                if (foundUser) {
                    assignedToUid = foundUser.uid;
                } else {
                    showNotification(`Pegawai "${assignedTo}" tidak ditemukan. Silakan pilih manual.`, 'warning');
                }
            }

            const partialTask: Partial<Task> = {
                title: title || '',
                description: description || '',
                assignedTo: assignedToUid,
                dueDate: dueDate || new Date().toISOString().split('T')[0],
                priority: priority || 'Mid',
                status: 'Pending',
            };
            
            setIsAIModalOpen(false);
            openModal(partialTask);

        } catch (error) {
            const err = error as Error;
            showNotification(err.message, 'error');
            console.error(err);
        }
    };

    const getUserName = (userId: string) => users.find(u => u.uid === userId)?.nama || 'Tidak diketahui';
    
    const priorityClass: { [key in TaskPriority]: string } = {
        High: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        Mid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        Low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    };

    const statusClass: { [key in TaskStatus]: string } = {
        'On Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'Completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'Pending': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };

    return (
        <div className="relative min-h-[calc(100vh-200px)]">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mb-6">
                <h3 className="text-2xl font-bold">Manajemen Pekerjaan</h3>
                <p className="text-gray-500 dark:text-gray-400">Kelola semua pekerjaan yang ditugaskan di sini.</p>
            </div>
            
            {loading ? <LoadingSpinner text="Memuat data pekerjaan..." /> : (
                <div className="overflow-x-auto bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 dark:border-gray-700">
                                <th className="p-4 cursor-pointer" onClick={() => requestSort('title')}>Judul{getSortIndicator('title')}</th>
                                <th className="p-4">Ditugaskan Kepada</th>
                                <th className="p-4 cursor-pointer" onClick={() => requestSort('dueDate')}>Batas Waktu{getSortIndicator('dueDate')}</th>
                                <th className="p-4 cursor-pointer" onClick={() => requestSort('priority')}>Prioritas{getSortIndicator('priority')}</th>
                                <th className="p-4 cursor-pointer" onClick={() => requestSort('status')}>Status{getSortIndicator('status')}</th>
                                <th className="p-4">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTasks.map(task => (
                                <tr key={task.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="p-4 font-medium">{task.title}</td>
                                    <td className="p-4">{getUserName(task.assignedTo)}</td>
                                    <td className="p-4">{new Date(task.dueDate).toLocaleDateString('id-ID')}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${priorityClass[task.priority]}`}>{task.priority}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusClass[task.status]}`}>{task.status}</span>
                                    </td>
                                    <td className="p-4 flex items-center space-x-1">
                                        <button onClick={() => openModal(task)} className="p-2 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800 text-yellow-600 dark:text-yellow-300" title="Edit">{ICONS.edit}</button>
                                        <button onClick={() => handleDelete(task.id, task.fileUrl)} className="p-2 rounded-full hover:bg-red-200 dark:hover:bg-red-800 text-red-600 dark:text-red-300" title="Hapus">{ICONS.delete}</button>
                                        <button onClick={() => handleWhatsAppExport(task)} className="p-2 rounded-full hover:bg-green-200 dark:hover:bg-green-800 text-green-600 dark:text-green-300" title="Export ke WhatsApp">{ICONS.whatsapp}</button>
                                        {userData?.role !== 'pegawai' && (
                                             <button onClick={() => handleExportToTraining(task)} className="p-2 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 text-indigo-600 dark:text-indigo-300" title="Buat Training dari Pekerjaan Ini">{ICONS.graduationCap}</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {isModalOpen && <TaskModal task={editingTask} users={users} closeModal={closeModal} />}
            {isAIModalOpen && <AIInputModal 
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                onProcess={handleProcessAIText}
                title="Tambah dari Teks (AI)"
                prompt="Tempelkan teks dari WhatsApp atau catatan Anda di sini untuk membuat pekerjaan atau training baru secara otomatis."
            />}

            {/* Floating Action Button */}
            <div className="absolute bottom-4 right-4 z-30">
                <div className="relative">
                     {isFabMenuOpen && (
                        <div className="flex flex-col items-center space-y-2 mb-2 animate-fade-in-up">
                            <div className="flex items-center space-x-2 group" onClick={() => { setIsAIModalOpen(true); setFabMenuOpen(false); }}>
                                <span className="hidden group-hover:block bg-white dark:bg-gray-700 text-sm px-2 py-1 rounded-md shadow-lg">Tambah dari Teks (AI)</span>
                                <button className="bg-white dark:bg-gray-700 p-3 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-600">
                                    {ICONS.magic}
                                </button>
                            </div>
                            <div className="flex items-center space-x-2 group" onClick={() => openModal()}>
                                <span className="hidden group-hover:block bg-white dark:bg-gray-700 text-sm px-2 py-1 rounded-md shadow-lg">Tambah Manual</span>
                                <button className="bg-white dark:bg-gray-700 p-3 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-600">
                                    {ICONS.add}
                                </button>
                            </div>
                        </div>
                    )}
                    <button 
                        onClick={() => setFabMenuOpen(!isFabMenuOpen)} 
                        className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-110"
                        aria-label="Tambah Pekerjaan"
                    >
                        {isFabMenuOpen ? (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        ) : ICONS.addLarge}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskManagement;