import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc, addDoc } from '@firebase/firestore';
import { ref, deleteObject } from '@firebase/storage';
import { db, storage, getFirestoreErrorMessage } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNotification, useConnectivity } from '../../hooks/useNotification';
import { Task, UserData, TrainingStatus, TaskPriority, TaskStatus, AIParsedTask } from '../../types';
import { ICONS } from '../../constants';
import TaskModal from './TaskModal';
import LoadingSpinner from '../common/LoadingSpinner';
import { analyzeTextForEntry } from '../../services/geminiService';
import AIInputModal from '../training/AddWithAIModal';
import EditableText from '../common/EditableText';
import { defaultTextContent } from '../../hooks/useCustomization';


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
    const { setOffline } = useConnectivity();
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
                const firebaseError = error as { code?: string };
                if (firebaseError.code === 'unavailable') {
                    setOffline(true, true);
                } else {
                    showNotification(getFirestoreErrorMessage(firebaseError), "warning");
                }
                setLoading(false);
            }
        );

        const usersUnsub = onSnapshot(collection(db, "users"), 
            (snapshot) => {
                setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData)));
            },
            (error) => {
                console.error("TaskManagement: Error fetching users:", error);
                const firebaseError = error as { code?: string };
                if (firebaseError.code === 'unavailable') {
                    setOffline(true, true);
                } else {
                    showNotification(getFirestoreErrorMessage(firebaseError), "warning");
                }
            }
        );
        
        return () => {
            tasksUnsub();
            usersUnsub();
        };
    }, [userData, showNotification, setOffline]);

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
        if (sortConfig.key !== key) return ' ▲▼';
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };
    
    const openModal = (task: Task | Partial<Task> | null = null) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTask(null);
    };

    const handleDelete = async (taskId: string, fileUrl?: string) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            try {
                if (fileUrl) {
                    await deleteObject(ref(storage, fileUrl));
                }
                await deleteDoc(doc(db, "tasks", taskId));
                alert("Task deleted successfully!");
            } catch (error) {
                console.error("Error deleting task: ", error);
                alert("Failed to delete task.");
            }
        }
    };
    
    const handleWhatsAppExport = (task: Task) => {
        const assignedUserName = getUserName(task.assignedTo);
        const formattedDueDate = new Date(task.dueDate).toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        const message = `*Task Detail - ProjectFlow Pro*\n\n` +
                        `*Title:* ${task.title}\n` +
                        `*Assigned To:* ${assignedUserName}\n\n` +
                        `*Description:*\n${task.description || 'No description.'}\n\n` +
                        `*Priority:* ${task.priority}\n` +
                        `*Due Date:* ${formattedDueDate}\n\n` +
                        `---\n` +
                        `_Note: The date when the task was assigned is not recorded in the system._`;

        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleExportToTraining = async (task: Task) => {
        if (window.confirm(`Are you sure you want to create a training schedule from the task "${task.title}"?`)) {
            try {
                const newTrainingData = {
                    nama: task.title,
                    tanggalMulai: task.dueDate,
                    tanggalSelesai: task.dueDate,
                    lokasi: 'To be determined',
                    pic: getUserName(task.assignedTo),
                    catatan: `Exported from task: ${task.description || 'No description.'}`,
                    status: 'Belum Dikonfirmasi' as TrainingStatus,
                };

                await addDoc(collection(db, "trainings"), newTrainingData);
                showNotification(`Task "${task.title}" successfully exported to the training dashboard.`, 'success');
            } catch (error) {
                console.error("Error exporting task to training: ", error);
                showNotification("Failed to export task to training.", 'error');
            }
        }
    };

    const handleProcessAIText = async (text: string) => {
        try {
            const result = await analyzeTextForEntry(text);
            if (result.entryType !== 'task' || !result.taskDetails) {
                throw new Error("The text you entered does not seem to be a task request. Please try again.");
            }

            const { title, description, assignedTo, dueDate, priority } = result.taskDetails;
            let assignedToUid = '';
            
            if (assignedTo) {
                const foundUser = users.find(u => u.nama.toLowerCase().includes(assignedTo.toLowerCase()));
                if (foundUser) {
                    assignedToUid = foundUser.uid;
                } else {
                    showNotification(`Employee "${assignedTo}" not found. Please select manually.`, 'warning');
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
            console.error("AI Text Processing Error:", error);
            throw error; // Re-throw for the modal to catch and display.
        }
    };

    const getUserName = (userId: string) => users.find(u => u.uid === userId)?.nama || 'Unknown';
    
    const priorityClass: { [key in TaskPriority]: string } = {
        High: 'bg-danger-bg text-danger-text',
        Mid: 'bg-warning-bg text-warning-text',
        Low: 'bg-success-bg text-success-text',
    };

    const statusClass: { [key in TaskStatus]: string } = {
        'On Progress': 'bg-info-bg text-info-text',
        'Completed': 'bg-success-bg text-success-text',
        'Pending': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
    };

    return (
        <div className="space-y-6 animate-fade-in-down">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                    <EditableText 
                        as="h1"
                        contentKey="tasks.title"
                        defaultText={defaultTextContent['tasks.title']}
                        className="text-3xl font-bold text-slate-800 dark:text-slate-100"
                    />
                    <EditableText 
                        as="p"
                        contentKey="tasks.description"
                        defaultText={defaultTextContent['tasks.description']}
                        className="text-slate-500 dark:text-slate-400 mt-1"
                    />
                </div>
                <div className="flex space-x-2 flex-shrink-0">
                    <button onClick={() => setIsAIModalOpen(true)} className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 shadow-sm hover:shadow-md transform hover:-translate-y-0.5">
                        {ICONS.magic}
                        <span>Add with AI</span>
                    </button>
                    <button onClick={() => openModal()} className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-sm hover:shadow-md transform hover:-translate-y-0.5">
                        {ICONS.add}
                        <span>Add Manually</span>
                    </button>
                </div>
            </div>
            
            {loading ? <LoadingSpinner text="Loading tasks..." /> : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-700/50">
                                <tr>
                                    <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">
                                        <button className="flex items-center gap-1" onClick={() => requestSort('title')}>Title<span className="text-slate-400">{getSortIndicator('title')}</span></button>
                                    </th>
                                    <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">Assigned To</th>
                                    <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">
                                        <button className="flex items-center gap-1" onClick={() => requestSort('dueDate')}>Due Date<span className="text-slate-400">{getSortIndicator('dueDate')}</span></button>
                                    </th>
                                    <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">
                                        <button className="flex items-center gap-1" onClick={() => requestSort('priority')}>Priority<span className="text-slate-400">{getSortIndicator('priority')}</span></button>
                                    </th>
                                    <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">
                                        <button className="flex items-center gap-1" onClick={() => requestSort('status')}>Status<span className="text-slate-400">{getSortIndicator('status')}</span></button>
                                    </th>
                                    <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {sortedTasks.map(task => (
                                    <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="p-4 font-medium text-slate-900 dark:text-slate-50">{task.title}</td>
                                        <td className="p-4">{getUserName(task.assignedTo)}</td>
                                        <td className="p-4">{new Date(task.dueDate).toLocaleDateString('id-ID')}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${priorityClass[task.priority]}`}>{task.priority}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusClass[task.status]}`}>{task.status}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center space-x-1 text-slate-500">
                                                <button onClick={() => openModal(task)} className="p-2 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-400/20 text-yellow-600 dark:text-yellow-400" title="Edit">{ICONS.edit}</button>
                                                <button onClick={() => handleDelete(task.id, task.fileUrl)} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-400/20 text-red-600 dark:text-red-400" title="Delete">{ICONS.delete}</button>
                                                <button onClick={() => handleWhatsAppExport(task)} className="p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-400/20 text-green-600 dark:text-green-400" title="Export to WhatsApp">{ICONS.whatsapp}</button>
                                                {userData?.role !== 'pegawai' && (
                                                     <button onClick={() => handleExportToTraining(task)} className="p-2 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400" title="Create Training from Task">{ICONS.graduationCap}</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {isModalOpen && <TaskModal task={editingTask} users={users} closeModal={closeModal} />}
            {isAIModalOpen && <AIInputModal 
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                onProcess={handleProcessAIText}
                title="Add from Text (AI)"
                prompt="Paste text from WhatsApp or your notes here to automatically create a new task or training."
            />}
        </div>
    );
};

export default TaskManagement;
