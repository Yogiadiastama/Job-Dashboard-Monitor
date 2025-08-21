import React, { useState } from 'react';
import { addDoc, collection, doc, updateDoc } from '@firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from '@firebase/storage';
import { db, storage } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Task, TaskPriority, TaskStatus, UserData } from '../../types';

interface TaskModalProps {
    task: Partial<Task> | null;
    users: UserData[];
    closeModal: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, users, closeModal }) => {
    const [title, setTitle] = useState(task?.title || '');
    const [description, setDescription] = useState(task?.description || '');
    const [assignedTo, setAssignedTo] = useState(task?.assignedTo || '');
    const [dueDate, setDueDate] = useState(task?.dueDate || '');
    const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'Mid');
    const [status, setStatus] = useState<TaskStatus>(task?.status || 'On Progress');
    const [rating, setRating] = useState(task?.rating || 0);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const { userData } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userData) return;
        setLoading(true);

        try {
            let fileUrl = task?.fileUrl || '';
            if (file) {
                const storageRef = ref(storage, `task-files/${Date.now()}-${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                fileUrl = await getDownloadURL(snapshot.ref);
            }

            if (task && task.id) {
                const taskData = { title, description, assignedTo, dueDate, priority, status, fileUrl, rating };
                await updateDoc(doc(db, "tasks", task.id), taskData);
                sendNotification(assignedTo, `Pekerjaan "${title}" telah diperbarui.`);
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
                    createdAt: new Date().toISOString() 
                };
                await addDoc(collection(db, "tasks"), taskData);
                sendNotification(assignedTo, `Anda mendapat pekerjaan baru: "${title}".`);
            }
            
            closeModal();
        } catch (error) {
            console.error("Error saving task: ", error);
            alert("Gagal menyimpan pekerjaan.");
        } finally {
            setLoading(false);
        }
    };
    
    // Simple notification simulation
    const sendNotification = (userId: string, message: string) => {
        const userToNotify = users.find(u => u.uid === userId);
        if (userToNotify) {
            console.log(`MENGIRIM NOTIFIKASI ke ${userToNotify.nama}: ${message}`);
            // In a real app, you would use a proper notification service.
            // alert() is used here for demonstration purposes.
        }
    };

    if (!userData) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-2xl p-8 max-h-[95vh] overflow-y-auto animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-6 text-neutral-800 dark:text-neutral-100">{task?.id ? 'Edit Pekerjaan' : 'Tambah Pekerjaan Baru'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2 text-neutral-700 dark:text-neutral-300">Judul</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2.5 border border-neutral-300 rounded-lg dark:bg-neutral-700 dark:border-neutral-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2 text-neutral-700 dark:text-neutral-300">Deskripsi</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2.5 border border-neutral-300 rounded-lg dark:bg-neutral-700 dark:border-neutral-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" rows={5}></textarea>
                            </div>
                            {['admin', 'pimpinan', 'pegawai'].includes(userData.role) && (
                                <div className="mb-4">
                                    <label className="block text-sm font-bold mb-2 text-neutral-700 dark:text-neutral-300">Tugaskan Kepada</label>
                                    <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="w-full p-2.5 border border-neutral-300 rounded-lg dark:bg-neutral-700 dark:border-neutral-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" required>
                                        <option value="">Pilih Pegawai</option>
                                        {users.filter(u => u.role !== 'admin').map(user => (
                                            <option key={user.uid} value={user.uid}>{user.nama}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2 text-neutral-700 dark:text-neutral-300">Due Date</label>
                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2.5 border border-neutral-300 rounded-lg dark:bg-neutral-700 dark:border-neutral-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2 text-neutral-700 dark:text-neutral-300">Prioritas</label>
                                <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="w-full p-2.5 border border-neutral-300 rounded-lg dark:bg-neutral-700 dark:border-neutral-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                                    <option>Low</option>
                                    <option>Mid</option>
                                    <option>High</option>
                                </select>
                            </div>
                             <div className="mb-4">
                                <label className="block text-sm font-bold mb-2 text-neutral-700 dark:text-neutral-300">Status</label>
                                <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className="w-full p-2.5 border border-neutral-300 rounded-lg dark:bg-neutral-700 dark:border-neutral-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                                    <option>Pending</option>
                                    <option>On Progress</option>
                                    <option>Completed</option>
                                </select>
                            </div>
                            {(['pimpinan', 'pegawai'].includes(userData.role)) && task && (
                                <div className="mb-4">
                                    <label className="block text-sm font-bold mb-2 text-neutral-700 dark:text-neutral-300">Rating (1-5)</label>
                                    <div className="flex space-x-1">
                                        {[...Array(5)].map((_, i) => (
                                            <button type="button" key={i} onClick={() => setRating(i + 1)} className={`text-2xl ${i < rating ? 'text-yellow-400' : 'text-neutral-300 dark:text-neutral-600'}`}>★</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2 text-neutral-700 dark:text-neutral-300">Upload File</label>
                                <input type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                                {task && task.fileUrl && <a href={task.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary-500 text-sm mt-2 block hover:underline">Lihat file saat ini</a>}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end space-x-4 mt-8">
                        <button type="button" onClick={closeModal} className="px-6 py-2 rounded-lg bg-neutral-200 dark:bg-neutral-600 text-neutral-800 dark:text-neutral-100 hover:bg-neutral-300 dark:hover:bg-neutral-500 transition-colors">Batal</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskModal;