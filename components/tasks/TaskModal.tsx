import React, { useState } from 'react';
import { db, storage, addDoc, collection, doc, updateDoc, getDownloadURL, ref, uploadBytes } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { Task, TaskPriority, TaskStatus, UserData } from '../../types';

interface TaskModalProps {
    task: Task | null;
    users: UserData[];
    closeModal: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, users, closeModal }) => {
    const [title, setTitle] = useState(task ? task.title : '');
    const [description, setDescription] = useState(task ? task.description : '');
    const [assignedTo, setAssignedTo] = useState(task ? task.assignedTo : '');
    const [dueDate, setDueDate] = useState(task ? task.dueDate : '');
    const [priority, setPriority] = useState<TaskPriority>(task ? task.priority : 'Mid');
    const [status, setStatus] = useState<TaskStatus>(task ? task.status : 'On Progress');
    const [rating, setRating] = useState(task ? task.rating || 0 : 0);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const { userData } = useAuth();
    const { showNotification } = useNotification();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userData) return;
        setLoading(true);

        try {
            let fileUrl = task ? task.fileUrl : '';
            if (file) {
                const storageRef = ref(storage, `task-files/${Date.now()}-${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                fileUrl = await getDownloadURL(snapshot.ref);
            }

            const taskData = { title, description, assignedTo, dueDate, priority, status, fileUrl, rating };
            
            if (task) {
                await updateDoc(doc(db, "tasks", task.id), taskData);
                showNotification(`Pekerjaan "${title}" telah diperbarui.`, 'success');
            } else {
                await addDoc(collection(db, "tasks"), taskData);
                showNotification(`Pekerjaan baru "${title}" telah dibuat.`, 'success');
            }
            
            closeModal();
        } catch (error) {
            console.error("Error saving task: ", error);
            showNotification("Gagal menyimpan pekerjaan.", "error");
        } finally {
            setLoading(false);
        }
    };
    
    if (!userData) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl p-8 max-h-screen overflow-y-auto animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-6">{task ? 'Edit Pekerjaan' : 'Tambah Pekerjaan Baru'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2">Judul</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2">Deskripsi</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" rows={5}></textarea>
                            </div>
                            {['admin', 'pimpinan', 'pegawai'].includes(userData.role) && (
                                <div className="mb-4">
                                    <label className="block text-sm font-bold mb-2">Tugaskan Kepada</label>
                                    <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required>
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
                                <label className="block text-sm font-bold mb-2">Due Date</label>
                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2">Prioritas</label>
                                <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                                    <option>Low</option>
                                    <option>Mid</option>
                                    <option>High</option>
                                </select>
                            </div>
                             <div className="mb-4">
                                <label className="block text-sm font-bold mb-2">Status</label>
                                <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                                    <option>Pending</option>
                                    <option>On Progress</option>
                                    <option>Completed</option>
                                </select>
                            </div>
                            {(['pimpinan', 'pegawai'].includes(userData.role)) && task && (
                                <div className="mb-4">
                                    <label className="block text-sm font-bold mb-2">Rating (1-5)</label>
                                    <div className="flex space-x-1">
                                        {[...Array(5)].map((_, i) => (
                                            <button type="button" key={i} onClick={() => setRating(i + 1)} className={`text-2xl ${i < rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}>★</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2">Upload File</label>
                                <input type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                {task && task.fileUrl && <a href={task.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm mt-2 block">Lihat file saat ini</a>}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end space-x-4 mt-8">
                        <button type="button" onClick={closeModal} className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Batal</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
                            {loading ? 'Menyimpan...' : (task ? 'Simpan Perubahan' : 'Tambah Pekerjaan')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskModal;