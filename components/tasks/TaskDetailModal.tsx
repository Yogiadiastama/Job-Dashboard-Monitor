
import React from 'react';
import { Task, TaskStatus, TaskPriority, UserData } from '../../types';
import { ICONS } from '../../constants';

// Helper for status styles
const getStatusStyles = (status: TaskStatus) => {
    switch (status) {
        case 'Pending': return { badge: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200' };
        case 'On Progress': return { badge: 'bg-info-bg text-info-text' };
        case 'Completed': return { badge: 'bg-success-bg text-success-text' };
        default: return { badge: 'bg-slate-200 text-slate-800' };
    }
};

// Helper for priority styles
const getPriorityStyles = (priority: TaskPriority) => {
    switch (priority) {
        case 'Low': return { text: 'text-success-text' };
        case 'Mid': return { text: 'text-warning-text' };
        case 'High': return { text: 'text-danger-text' };
        default: return { text: 'text-slate-500' };
    }
}

interface TaskDetailModalProps {
    task: Task;
    users: UserData[];
    onClose: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, users, onClose }) => {
    const { badge } = getStatusStyles(task.status);
    const { text: priorityColor } = getPriorityStyles(task.priority);

    const assignedToUser = users.find(u => u.uid === task.assignedTo)?.nama || 'Unknown';
    const assignedByUser = task.assignedBy ? (users.find(u => u.uid === task.assignedBy)?.nama || 'Unknown') : 'N/A';
    
    return (
        <div 
            className="fixed inset-0 z-50" 
            onClick={onClose}
        >
            <div 
                className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white dark:bg-slate-800 shadow-xl flex flex-col animate-slide-in-right"
                onClick={e => e.stopPropagation()}
            >
                {/* Scrollable Content Area */}
                <div className="flex-grow p-6 overflow-y-auto">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white pr-4">{task.title}</h2>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badge} flex-shrink-0`}>{task.status.toUpperCase()}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm text-slate-600 dark:text-slate-300">
                        <p className="flex items-center gap-3">{ICONS.person} <strong>Assigned To:</strong> {assignedToUser}</p>
                        <p className="flex items-center gap-3">{ICONS.calendar} <strong>Due Date:</strong> {new Date(task.dueDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        <p className="flex items-center gap-3">{ICONS.users} <strong>Assigned By:</strong> {assignedByUser}</p>
                        <p className={`flex items-center gap-3 font-semibold ${priorityColor}`}>{ICONS.bell} <strong>Priority:</strong> {task.priority}</p>
                    </div>

                    {task.rating && task.rating > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                             <h4 className="font-semibold mb-1 text-slate-800 dark:text-slate-200">Rating:</h4>
                             <div className="flex items-center text-yellow-400">
                                {[...Array(task.rating)].map((_, i) => <span key={`star-filled-${i}`}>{ICONS.star}</span>)}
                                {[...Array(5 - task.rating)].map((_, i) => <span key={`star-empty-${i}`} className="text-slate-300 dark:text-slate-600">{ICONS.star}</span>)}
                            </div>
                        </div>
                    )}

                    {task.description && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <h4 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Description:</h4>
                            <div className="max-h-48 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md border dark:border-slate-200 dark:border-slate-600">
                                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{task.description}</p>
                            </div>
                        </div>
                    )}

                    {task.fileUrl && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <h4 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Attachment:</h4>
                            <a href={task.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline">
                                View Attached File
                            </a>
                        </div>
                    )}
                </div>
                {/* Fixed Footer */}
                 <div className="flex-shrink-0 p-4 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskDetailModal;