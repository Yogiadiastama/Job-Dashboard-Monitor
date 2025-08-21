import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, deleteDoc, doc, addDoc } from '@firebase/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import { ref, deleteObject } from '@firebase/storage';
import { db, storage, getFirestoreErrorMessage } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { Task, UserData, TrainingStatus, TaskPriority, TaskStatus } from '../../types';
import { ICONS } from '../../constants';
import TaskModal from './TaskModal';
import LoadingSpinner from '../common/LoadingSpinner';

type SortableTaskKeys = keyof Pick<Task, 'title' | 'dueDate' | 'priority' | 'status' | 'createdAt'>;

// AITaskModal Component
const AITaskModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onParseSuccess: (data: Partial<Omit<Task, 'id' | 'status' | 'priority' | 'description'>>) => void;
    users: UserData[];
}> = ({ isOpen, onClose, onParseSuccess, users }) => {
    const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
    const [inputText, setInputText] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { showNotification } = useNotification();

    const resetState = () => {
        setInputText('');
        setImageFile(null);
        setImagePreview(null);
        setLoading(false);
        setError('');
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };
    
    const fileToGenerativePart = async (file: File) => {
        const base64EncodedDataPromise = new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(file);
        });
        return {
            inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
        };
    };

    const handleAnalyze = async () => {
        if (activeTab === 'text' && !inputText.trim()) {
            setError('Silakan masukkan teks untuk dianalisis.');
            return;
        }
        if (activeTab === 'image' && !imageFile) {
            setError('Silakan unggah gambar untuk dianalisis.');
            return;
        }
        
        setLoading(true);
        setError('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const userListForPrompt = users.map(u => ({ uid: u.uid, nama: u.nama }));

            const prompt = `You are an intelligent assistant for a project management app. Your task is to extract information about a new task from the provided text or image, which is likely from a messaging app like WhatsApp.

The current year is ${new Date().getFullYear()}.
A list of available users is: ${JSON.stringify(userListForPrompt)}.

Please identify and extract the following details:
- The title of the task.
- The user this task is assigned to. Match the name from the text to a user in the provided list and return their 'uid'.
- The due date for the task.

Please format all dates as YYYY-MM-DD.

Return the extracted information strictly as a JSON object matching the provided schema. If a piece of information cannot be found, return an empty string for that field.`;

            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "The title of the task." },
                    assignedTo: { type: Type.STRING, description: "The UID of the assigned user from the provided list." },
                    dueDate: { type: Type.STRING, description: "The due date in YYYY-MM-DD format." },
                },
            };
            
            const parts = [{ text: prompt }];

            if (activeTab === 'text') {
                parts.push({ text: `Here is the text to analyze:\n\n${inputText}` });
            } else if (imageFile) {
                const imagePart = await fileToGenerativePart(imageFile);
                parts.push(imagePart as any);
                parts.push({ text: "Analyze the image above to extract task details." });
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts },
                config: {
                    responseMimeType: "application/json",
                    responseSchema,
                },
            });

            const parsedJson = JSON.parse(response.text);
            onParseSuccess(parsedJson);
            showNotification('Informasi pekerjaan berhasil diekstrak!', 'success');
            handleClose();

        } catch (err) {
            console.error('AI analysis failed:', err);
            setError('Gagal menganalisis. Pastikan format input benar dan coba lagi.');
        } finally {
            setLoading(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in-up">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Tambah Pekerjaan dengan AI</h2>
                     <button onClick={handleClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">&times;</button>
                </div>
                <div className="flex-grow overflow-y-auto p-6">
                    <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <button onClick={() => setActiveTab('text')} className={`${activeTab === 'text' ? 'border-brand-purple text-brand-purple' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                                Dari Teks
                            </button>
                             <button onClick={() => setActiveTab('image')} className={`${activeTab === 'image' ? 'border-brand-purple text-brand-purple' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                                Dari Screenshot
                            </button>
                        </nav>
                    </div>
                    {loading ? (
                         <div className="flex flex-col items-center justify-center h-64">
                            <LoadingSpinner text="AI sedang menganalisis..." />
                         </div>
                    ) : (
                        <div>
                        {activeTab === 'text' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salin & tempel teks dari WhatsApp</label>
                                <textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    rows={10}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                                    placeholder="Contoh: Tolong buatkan laporan audit untuk Budi, deadline besok."
                                ></textarea>
                            </div>
                        )}
                        {activeTab === 'image' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unggah screenshot WhatsApp</label>
                                <input id="file-upload-task" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                <label htmlFor="file-upload-task" className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 dark:border-gray-100/25 px-6 py-10 cursor-pointer hover:border-brand-purple">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="max-h-48 rounded-md"/>
                                    ) : (
                                        <div className="text-center">
                                            <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-gray-400">
                                                <p className="pl-1">Klik untuk mengunggah atau seret dan lepas</p>
                                            </div>
                                            <p className="text-xs leading-5 text-gray-600 dark:text-gray-400">PNG, JPG, GIF hingga 10MB</p>
                                        </div>
                                    )}
                                </label>
                            </div>
                        )}
                        {error && <p className="mt-4 text-center text-red-500">{error}</p>}
                    </div>
                    )}
                </div>
                <div className="p-6 border-t dark:border-gray-700 flex justify-end space-x-3">
                    <button type="button" onClick={handleClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Batal</button>
                    <button type="button" onClick={handleAnalyze} disabled={loading} className="flex items-center space-x-2 px-4 py-2 bg-brand-ai text-white rounded-md hover:bg-opacity-90 disabled:bg-opacity-50">
                        {ICONS.magicWand}
                        <span>{loading ? 'Menganalisis...' : 'Analisis dengan AI'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const TaskManagement: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
    const { userData } = useAuth();
    const { showNotification } = useNotification();
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
                const valA = a[sortConfig.key as keyof Task];
                const valB = b[sortConfig.key as keyof Task];

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
    
    const openModal = (task: Partial<Task> | null = null) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTask(null);
    };

    const handleAIParseSuccess = (data: Partial<Omit<Task, 'id' | 'status'>>) => {
        openModal(data);
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

    if (!userData) return <LoadingSpinner />;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg animate-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h3 className="text-2xl font-bold">Daftar Pekerjaan</h3>
                {['admin', 'pimpinan', 'pegawai'].includes(userData.role) && (
                     <div className="flex items-center space-x-3">
                        <button 
                            onClick={() => setIsAIModalOpen(true)} 
                            className="flex items-center space-x-2 bg-brand-ai text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-ai"
                            title="Tambah dengan AI"
                        >
                            {ICONS.magicWand}
                            <span className="hidden sm:inline">Tambah dengan AI</span>
                        </button>
                        <button 
                            onClick={() => openModal()} 
                            className="flex items-center space-x-2 bg-brand-purple text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple"
                            title="Tambah Pekerjaan Baru"
                        >
                            {ICONS.add}
                            <span className="hidden sm:inline">Tambah Manual</span>
                        </button>
                    </div>
                )}
            </div>
            
            {loading ? <LoadingSpinner text="Memuat pekerjaan..."/> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[720px]">
                        <thead>
                            <tr className="border-b-2 dark:border-gray-700">
                                <th className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => requestSort('title')}>Judul{getSortIndicator('title')}</th>
                                <th className="p-4">Ditugaskan Kepada</th>
                                <th className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => requestSort('dueDate')}>Due Date{getSortIndicator('dueDate')}</th>
                                <th className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => requestSort('createdAt')}>Tgl. Dibuat{getSortIndicator('createdAt')}</th>
                                <th className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => requestSort('priority')}>Prioritas{getSortIndicator('priority')}</th>
                                <th className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => requestSort('status')}>Status{getSortIndicator('status')}</th>
                                <th className="p-4">Rating</th>
                                <th className="p-4">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTasks.map(task => (
                                <tr key={task.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <td className="p-4 font-medium">{task.title}</td>
                                    <td className="p-4">{getUserName(task.assignedTo)}</td>
                                    <td className="p-4">{new Date(task.dueDate).toLocaleDateString('id-ID')}</td>
                                    <td className="p-4">{task.createdAt ? new Date(task.createdAt).toLocaleDateString('id-ID') : '-'}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${priorityClass[task.priority]}`}>{task.priority}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusClass[task.status]}`}>{task.status}</span>
                                    </td>
                                    <td className="p-4">
                                       <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i} className={i < (task.rating || 0) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}>{ICONS.star}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-4 flex items-center space-x-2">
                                        <button onClick={() => openModal(task)} className="p-2 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800 text-yellow-600 dark:text-yellow-300 transition-colors" title="Edit Pekerjaan">{ICONS.edit}</button>
                                        <button onClick={() => handleWhatsAppExport(task)} className="p-2 rounded-full hover:bg-green-200 dark:hover:bg-green-800 text-green-600 dark:text-green-300 transition-colors" title="Export Detail ke WhatsApp">{ICONS.whatsapp}</button>
                                        <button onClick={() => handleExportToTraining(task)} className="p-2 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-600 dark:text-purple-300 transition-colors" title="Export ke Training">{ICONS.graduationCap}</button>
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
            <AITaskModal 
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                onParseSuccess={handleAIParseSuccess}
                users={users}
            />
        </div>
    );
};

export default TaskManagement;