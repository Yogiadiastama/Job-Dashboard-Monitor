
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, deleteDoc, doc } from '@firebase/firestore';
import { ref, deleteObject } from '@firebase/storage';
import { db, storage, getFirestoreErrorMessage } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNotification, useConnectivity } from '../../hooks/useNotification';
import { Task, UserData, TaskPriority, TaskStatus, Training } from '../../types';
import { ICONS } from '../../constants';
import LoadingSpinner from '../common/LoadingSpinner';
import KanbanBoard from './KanbanBoard';

type SortableTaskKeys = keyof Pick<Task, 'title' | 'dueDate' | 'priority' | 'status' | 'createdAt'>;

interface TaskManagementProps {
    onEditTask: (task: Task | Partial<Task>) => void;
    onEditTraining: (training: Partial<Training>) => void;
    users: UserData[];
}

const TaskManagement: React.FC<TaskManagementProps> = ({ onEditTask, onEditTraining, users }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const { userData } = useAuth();
    const { showNotification } = useNotification();
    const { setOffline } = useConnectivity();
    const [sortConfig, setSortConfig] = useState<{ key: SortableTaskKeys; direction: 'ascending' | 'descending' }>({ key: 'createdAt', direction: 'descending' });
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
    
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
                if (firebaseError.code === 'unavailable') setOffline(true, true);
                else showNotification(getFirestoreErrorMessage(firebaseError), "warning");
                setLoading(false);
            }
        );
        return () => tasksUnsub();
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

    const handleDelete = async (taskId: string, fileUrl?: string) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            try {
                if (fileUrl) await deleteObject(ref(storage, fileUrl));
                await deleteDoc(doc(db, "tasks", taskId));
                showNotification("Task deleted successfully!", "success");
            } catch (error) {
                console.error("Error deleting task: ", error);
                showNotification("Failed to delete task.", "error");
            }
        }
    };
    
    const handleCreateTrainingFromTask = (task: Task) => {
        const assignedUserName = users.find(u => u.uid === task.assignedTo)?.nama || '';
        const trainingDetails: Partial<Training> = {
            nama: task.title,
            catatan: task.description,
            pic: assignedUserName,
            status: 'Belum Dikonfirmasi',
        };
        onEditTraining(trainingDetails);
    };

    const getUserName = (userId: string) => users.find(u => u.uid === userId)?.nama || 'Unknown';
    
    const priorityClass: { [key in TaskPriority]: string } = {
        High: 'bg-danger-bg text-danger-text', Mid: 'bg-warning-bg text-warning-text', Low: 'bg-success-bg text-success-text',
    };
    const statusClass: { [key in TaskStatus]: string } = {
        'On Progress': 'bg-info-bg text-info-text', 'Completed': 'bg-success-bg text-success-text', 'Pending': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
    };

    return (
        <div className="space-y-6 animate-fade-in-down">
             <div className="flex justify-end">
                <div className="flex items-center p-1 bg-slate-200 dark:bg-slate-700 rounded-lg">
                    <button onClick={() => setViewMode('list')} className={`px-4 py-1 rounded-md text-sm font-semibold ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 shadow' : 'text-slate-600 dark:text-slate-300'}`}>List</button>
                    <button onClick={() => setViewMode('board')} className={`px-4 py-1 rounded-md text-sm font-semibold ${viewMode === 'board' ? 'bg-white dark:bg-slate-800 shadow' : 'text-slate-600 dark:text-slate-300'}`}>Board</button>
                </div>
            </div>
            
            {loading ? <LoadingSpinner text="Loading tasks..." /> : (
                viewMode === 'list' ? (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-700/50">
                                    <tr>
                                        <th className="p-4"><button className="font-semibold flex items-center gap-1" onClick={() => requestSort('title')}>Title<span className="text-slate-400">{getSortIndicator('title')}</span></button></th>
                                        <th className="p-4 font-semibold">Assigned To</th>
                                        <th className="p-4"><button className="font-semibold flex items-center gap-1" onClick={() => requestSort('dueDate')}>Due Date<span className="text-slate-400">{getSortIndicator('dueDate')}</span></button></th>
                                        <th className="p-4"><button className="font-semibold flex items-center gap-1" onClick={() => requestSort('priority')}>Priority<span className="text-slate-400">{getSortIndicator('priority')}</span></button></th>
                                        <th className="p-4"><button className="font-semibold flex items-center gap-1" onClick={() => requestSort('status')}>Status<span className="text-slate-400">{getSortIndicator('status')}</span></button></th>
                                        <th className="p-4 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {sortedTasks.map(task => (
                                        <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="p-4 font-medium text-slate-900 dark:text-slate-50">{task.title}</td>
                                            <td className="p-4">{getUserName(task.assignedTo)}</td>
                                            <td className="p-4">{new Date(task.dueDate).toLocaleDateString('id-ID')}</td>
                                            <td className="p-4"><span className={`px-3 py-1 text-xs font-semibold rounded-full ${priorityClass[task.priority]}`}>{task.priority}</span></td>
                                            <td className="p-4"><span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusClass[task.status]}`}>{task.status}</span></td>
                                            <td className="p-4">
                                                <div className="flex items-center space-x-1 text-slate-500">
                                                    <button onClick={() => handleCreateTrainingFromTask(task)} className="p-2 rounded-full hover:bg-purple-100 dark:hover:bg-purple-400/20 text-purple-600 dark:text-purple-400" title="Create Training from Task">{ICONS.graduationCap}</button>
                                                    <button onClick={() => onEditTask(task)} className="p-2 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-400/20 text-yellow-600 dark:text-yellow-400" title="Edit">{ICONS.edit}</button>
                                                    <button onClick={() => handleDelete(task.id, task.fileUrl)} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-400/20 text-red-600 dark:text-red-400" title="Delete">{ICONS.delete}</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <KanbanBoard tasks={tasks} users={users} onEditTask={onEditTask} onEditTraining={onEditTraining} />
                )
            )}
        </div>
    );
};

export default TaskManagement;