import React from 'react';
import { Task, TaskStatus, TaskPriority, UserData } from '../../types';
import { ICONS } from '../../constants';

const getStatusStyles = (status: TaskStatus) => {
    switch (status) {
        case 'Pending': return { badge: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200' };
        case 'On Progress': return { badge: 'bg-info-bg text-info-text' };
        case 'Completed': return { badge: 'bg-success-bg text-success-text' };
        default: return { badge: 'bg-slate-200 text-slate-800' };
    }
};

const getPriorityStyles = (priority: TaskPriority) => {
    switch (priority) {
        case 'Low': return 'text-success-text';
        case 'Mid': return 'text-warning-text';
        case 'High': return 'text-danger-text';
        default: return 'text-slate-500';
    }
}

interface TaskDetailModalProps {
    task: Task;
    users: UserData[];
    onClose: () => void;
    onEdit: (task: Task) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, users, onClose, onEdit }) => {
    const { badge } = getStatusStyles(task.status);
    const assignedToUser = users.find(u => u.uid === task.assignedTo)?.nama || 'Unknown';
    const assignedByUser = task.assignedBy ? (users.find(u => u.uid === task.assignedBy)?.nama || 'Unknown') : 'System';

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-start z-50 p-4 animate-fade-in-up overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl transform transition-all my-8"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white pr-4">{task.title}</h2>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badge} flex-shrink-0`}>{task.status.toUpperCase()}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm text-slate-600 dark:text-slate-300">
                        <p className="flex items-center gap-3">{ICONS.calendar} <strong>Batas Waktu:</strong> {new Date(task.dueDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        <p className={`flex items-center gap-3 font-semibold ${getPriorityStyles(task.priority)}`}>{ICONS.bell} <strong>Prioritas:</strong> {task.priority}</p>
                        <p className="flex items-center gap-3">{ICONS.person} <strong>Ditugaskan Kepada:</strong> {assignedToUser}</p>
                        <p className="flex items-center gap-3">{ICONS.person} <strong>Ditugaskan Oleh:</strong> {assignedByUser}</p>
                         {task.rating && task.rating > 0 && (
                            <div className="flex items-center gap-3 sm:col-span-2">
                                <strong>Rating:</strong>
                                <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                        <span key={i} className={`text-xl ${i < (task.rating || 0) ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`}>★</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {task.fileUrl && (
                             <p className="flex items-center gap-3 sm:col-span-2">{ICONS.download} <strong>Lampiran:</strong> <a href={task.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Lihat File</a></p>
                        )}
                    </div>
                    {task.description && (
                        <>
                            <hr className="my-4 dark:border-slate-600"/>
                            <div>
                                <h4 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Deskripsi:</h4>
                                <div className="max-h-48 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md border dark:border-slate-200 dark:border-slate-600">
                                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{task.description}</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                 <div className="p-4 bg-slate-50 dark:bg-slate-700/50 flex justify-end items-center gap-4 rounded-b-lg">
                    <button onClick={() => onEdit(task)} className="flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-900 transition-colors">
                        {ICONS.edit} Edit
                    </button>
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskDetailModal;