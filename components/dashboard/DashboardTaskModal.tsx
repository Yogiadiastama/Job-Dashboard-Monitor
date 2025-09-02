
import React from 'react';
import { Task, UserData } from '../../types';

interface DashboardTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    tasks: Task[];
    users: UserData[];
}

const DashboardTaskModal: React.FC<DashboardTaskModalProps> = ({ isOpen, onClose, title, tasks, users }) => {
    if (!isOpen) return null;

    const getUserName = (userId: string) => {
        const user = users.find(u => u.uid === userId);
        return user ? user.nama : 'Tidak diketahui';
    };

    const statusClass: { [key:string]: string } = {
        'On Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'Completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'Pending': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in-up modal-backdrop" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl p-6 sm:p-8 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="overflow-y-auto">
                    {tasks.length > 0 ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b-2 dark:border-gray-700">
                                    <th className="p-3 sm:p-4">Judul</th>
                                    <th className="p-3 sm:p-4">Ditugaskan Kepada</th>
                                    <th className="p-3 sm:p-4">Due Date</th>
                                    <th className="p-3 sm:p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map(task => (
                                    <tr key={task.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="p-3 sm:p-4 font-medium">{task.title}</td>
                                        <td className="p-3 sm:p-4">{getUserName(task.assignedTo)}</td>
                                        <td className="p-3 sm:p-4">{new Date(task.dueDate).toLocaleDateString('id-ID')}</td>
                                        <td className="p-3 sm:p-4">
                                            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusClass[task.status] || 'bg-gray-100 text-gray-800'}`}>
                                                {task.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-10">Tidak ada pekerjaan dalam kategori ini.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardTaskModal;