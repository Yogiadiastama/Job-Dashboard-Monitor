

import React, { useState } from 'react';
import { addDoc, collection, doc, updateDoc } from '@firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from '@firebase/storage';
import { db, storage } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Task, TaskPriority, TaskStatus, UserData } from '../../types';

interface TaskModalProps {
    task: Task | Partial<Task> | null;
    users: UserData[];
    closeModal: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, users, closeModal }) => {
    const [title, setTitle] = useState(task?.title || '');
    const [description, setDescription] = useState(task?.description || '');
    const { userData } = useAuth();
    const [assignedTo, setAssignedTo] = useState(task?.assignedTo || '');
    const [dueDate, setDueDate] = useState(task?.dueDate || '');
    const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'Mid');
    const [status, setStatus] = useState<TaskStatus>(task?.status || 'Pending');
    const [rating, setRating] = useState(task?.rating || 0);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userData) return;

        if (!assignedTo) {
            alert("Please select an employee to assign the task to.");
            return;
        }
        
        setLoading(true);

        try {
            let fileUrl = (task as Task)?.fileUrl || '';
            if (file) {
                const storageRef = ref(storage, `task-files/${Date.now()}-${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                fileUrl = await getDownloadURL(snapshot.ref);
            }

            const now = new Date().toISOString();

            if (task && 'id' in task && task.id) {
                const taskData = { title, description, assignedTo, dueDate, priority, status, fileUrl, rating, updatedAt: now };
                await updateDoc(doc(db, "tasks", task.id), taskData);
                sendNotification(task.assignedTo, `Task "${title}" has been updated.`);
            } else {
                const taskData = { 
                    title, 
                    description, 
                    assignedTo, 
                    dueDate, 
                    priority, 
                    status, 
                    fileUrl, 
                    rating, 
                    createdAt: now,
                    updatedAt: now,
                    assignedBy: userData.uid,
                };
                await addDoc(collection(db, "tasks"), taskData);
                sendNotification(assignedTo, `You have a new task: "${title}".`);
            }
            
            closeModal();
        } catch (error) {
            console.error("Error saving task: ", error);
            alert("Failed to save task.");
        } finally {
            setLoading(false);
        }
    };
    
    // Simple notification simulation
    const sendNotification = (userId: string, message: string) => {
        const userToNotify = users.find(u => u.uid === userId);
        if (userToNotify) {
            console.log(`SENDING NOTIFICATION to ${userToNotify.nama}: ${message}`);
        }
    };

    if (!userData) return null;
    
    const inputStyle = "appearance-none border border-slate-300 dark:border-slate-600 rounded-lg w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200";
    const labelStyle = "block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300";


    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 modal-backdrop" onClick={closeModal}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold">{task && 'id' in task ? 'Edit Task' : 'Add New Task'}</h2>
                </div>
                <form id="task-modal-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className={labelStyle}>Title</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputStyle} required />
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelStyle}>Description</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} className={`${inputStyle} min-h-[100px]`} rows={4}></textarea>
                        </div>
                        <div>
                            <label className={labelStyle}>Assign To</label>
                            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className={inputStyle} required>
                                <option value="">Select Employee</option>
                                {users.map(user => (
                                    <option key={user.uid} value={user.uid}>{user.nama}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelStyle}>Due Date</label>
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputStyle} required />
                        </div>
                        <div>
                            <label className={labelStyle}>Priority</label>
                            <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className={inputStyle}>
                                <option>Low</option>
                                <option>Mid</option>
                                <option>High</option>
                            </select>
                        </div>
                         <div>
                            <label className={labelStyle}>Status</label>
                            <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className={inputStyle}>
                                <option>Pending</option>
                                <option>On Progress</option>
                                <option>Completed</option>
                            </select>
                        </div>
                        {task && 'id' in task && (
                            <div>
                                <label className={labelStyle}>Rating (1-5)</label>
                                <div className="flex space-x-1">
                                    {[...Array(5)].map((_, i) => (
                                        <button type="button" key={i} onClick={() => setRating(i + 1)} className={`text-3xl transition-colors ${i < rating ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600 hover:text-yellow-300'}`}>★</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="md:col-span-2">
                            <label className={labelStyle}>Upload File</label>
                            <input type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                            {task && 'fileUrl' in task && task.fileUrl && <a href={task.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary-500 text-sm mt-2 block hover:underline">View current file</a>}
                        </div>
                    </div>
                </form>
                 <div className="flex justify-end space-x-4 p-6 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={closeModal} className="px-6 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button type="submit" form="task-modal-form" disabled={loading} className="px-6 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50">
                        {loading ? 'Saving...' : 'Save Task'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskModal;