import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, deleteDoc, addDoc, updateDoc, query, orderBy } from '@firebase/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import { db, getFirestoreErrorMessage } from '../../services/firebase';
import { Training, TrainingStatus, ALL_STATUSES } from '../../types';
import { ICONS } from '../../constants';
import LoadingSpinner from '../common/LoadingSpinner';
import { useNotification } from '../../hooks/useNotification';
import { eventBus } from '../../services/eventBus';

// --- Helper Functions ---
const formatDateRange = (start: string, end: string) => {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    const startDate = new Date(start).toLocaleDateString('id-ID', options);
    const endDate = new Date(end).toLocaleDateString('id-ID', options);
    if (startDate === endDate) return startDate;
    return `${startDate} - ${endDate}`;
};

const getStatusStyles = (status: TrainingStatus) => {
    switch (status) {
        case 'Belum Dikonfirmasi':
            return {
                badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
                gradient: 'from-red-400 to-red-600',
            };
        case 'Terkonfirmasi':
            return {
                badge: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
                gradient: 'from-green-400 to-green-600',
            };
        case 'Menunggu Jawaban':
            return {
                badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
                gradient: 'from-yellow-400 to-yellow-600',
            };
        default:
            return {
                badge: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
                gradient: 'from-gray-400 to-gray-600',
            };
    }
};

// --- Sub-components defined in the same file to avoid creating new files ---

// AITrainingModal Component
const AITrainingModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onParseSuccess: (data: Partial<Omit<Training, 'id' | 'status'>>) => void;
}> = ({ isOpen, onClose, onParseSuccess }) => {
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
            const model = 'gemini-2.5-flash';

            const prompt = `You are an intelligent assistant for a project management app. Your task is to extract information about a training event from the provided text or image, which is likely from a messaging app like WhatsApp.

Please identify and extract the following details:
- The name of the training.
- The start date of the training.
- The end date of the training. (If only one date is mentioned, use it for both start and end dates. If a range like '10-12 Juli' is given, determine the full dates.)
- The location of the training (this could be a physical address or a virtual one like 'Online via Zoom').
- The Person in Charge (PIC), including their name and any contact info provided.
- Any additional notes or a brief description of the training.

The current year is ${new Date().getFullYear()}. Please format all dates as YYYY-MM-DD.

Return the extracted information strictly as a JSON object matching the provided schema. If a piece of information cannot be found, return an empty string for that field.`;

            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    nama: { type: Type.STRING },
                    tanggalMulai: { type: Type.STRING },
                    tanggalSelesai: { type: Type.STRING },
                    lokasi: { type: Type.STRING },
                    pic: { type: Type.STRING },
                    catatan: { type: Type.STRING },
                },
            };
            
            const parts = [
                { text: prompt },
            ];

            if (activeTab === 'text') {
                parts.push({ text: `Here is the text to analyze:\n\n${inputText}` });
            } else if (imageFile) {
                const imagePart = await fileToGenerativePart(imageFile);
                parts.push(imagePart as any);
                parts.push({ text: "Analyze the image above." });
            }

            const response = await ai.models.generateContent({
                model,
                contents: { parts },
                config: {
                    responseMimeType: "application/json",
                    responseSchema,
                },
            });

            const parsedJson = JSON.parse(response.text);
            onParseSuccess(parsedJson);
            showNotification('Informasi berhasil diekstrak!', 'success');
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
                    <h2 className="text-2xl font-bold">Tambah Training dengan AI</h2>
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
                                    placeholder="Tempel teks di sini..."
                                ></textarea>
                            </div>
                        )}
                        {activeTab === 'image' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unggah screenshot WhatsApp</label>
                                <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                <label htmlFor="file-upload" className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 dark:border-gray-100/25 px-6 py-10 cursor-pointer hover:border-brand-purple">
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

// TrainingModal Component
const TrainingModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (training: Omit<Training, 'id'>) => Promise<void>;
    trainingToEdit: Partial<Training> | null;
}> = ({ isOpen, onClose, onSave, trainingToEdit }) => {
    const [nama, setNama] = useState('');
    const [tanggalMulai, setTanggalMulai] = useState('');
    const [tanggalSelesai, setTanggalSelesai] = useState('');
    const [lokasi, setLokasi] = useState('');
    const [pic, setPic] = useState('');
    const [catatan, setCatatan] = useState('');
    const [status, setStatus] = useState<TrainingStatus>('Belum Dikonfirmasi');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (trainingToEdit) {
            setNama(trainingToEdit.nama || '');
            setTanggalMulai(trainingToEdit.tanggalMulai || '');
            setTanggalSelesai(trainingToEdit.tanggalSelesai || '');
            setLokasi(trainingToEdit.lokasi || '');
            setPic(trainingToEdit.pic || '');
            setCatatan(trainingToEdit.catatan || '');
            setStatus(trainingToEdit.status || 'Belum Dikonfirmasi');
        } else {
            setNama('');
            const today = new Date().toISOString().split('T')[0];
            setTanggalMulai(today);
            setTanggalSelesai(today);
            setLokasi('');
            setPic('');
            setCatatan('');
            setStatus('Belum Dikonfirmasi');
        }
    }, [trainingToEdit]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onSave({ nama, tanggalMulai, tanggalSelesai, lokasi, pic, catatan, status });
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in-up">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b dark:border-gray-700">
                    <h2 className="text-2xl font-bold">{trainingToEdit?.id ? 'Edit Training' : 'Tambah Training Baru'}</h2>
                </div>
                <form id="training-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-4">
                    <InputField label="Nama Training" value={nama} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNama(e.target.value)} required />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Tanggal Mulai" type="date" value={tanggalMulai} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTanggalMulai(e.target.value)} required />
                        <InputField label="Tanggal Selesai" type="date" value={tanggalSelesai} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTanggalSelesai(e.target.value)} required />
                    </div>
                    <InputField label="Lokasi" value={lokasi} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLokasi(e.target.value)} placeholder="cth: Online via Zoom" required />
                    <InputField label="Detail Kontak (PIC)" value={pic} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPic(e.target.value)} placeholder="cth: Budi - Divisi Sales" required />
                    <TextAreaField label="Catatan" value={catatan} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCatatan(e.target.value)} rows={4} placeholder="Informasi tambahan..."/>
                    <SelectField label="Status" value={status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as TrainingStatus)}>
                        {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </SelectField>
                </form>
                <div className="p-6 border-t dark:border-gray-700 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Batal</button>
                    <button type="submit" form="training-form" disabled={loading} className="px-4 py-2 bg-brand-purple text-white rounded-md hover:bg-opacity-90 disabled:bg-opacity-50">
                        {loading ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const InputField: React.FC<{label: string, value: string, onChange: React.ChangeEventHandler<HTMLInputElement>, [key: string]: any}> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:ring-brand-purple focus:border-brand-purple" {...props} />
    </div>
);
const TextAreaField: React.FC<{label: string, value: string, onChange: React.ChangeEventHandler<HTMLTextAreaElement>, [key: string]: any}> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <textarea className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:ring-brand-purple focus:border-brand-purple" {...props}></textarea>
    </div>
);
const SelectField: React.FC<{label: string, children: React.ReactNode, value: string, onChange: React.ChangeEventHandler<HTMLSelectElement>}> = ({ label, children, ...props }) => (
     <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <select className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:ring-brand-purple focus:border-brand-purple" {...props}>
            {children}
        </select>
    </div>
);


// TrainingCard Component
const TrainingCard: React.FC<{
    training: Training;
    onStatusChange: (id: string, status: TrainingStatus) => void;
    onEdit: (training: Training) => void;
    onDelete: (id: string) => void;
}> = ({ training, onStatusChange, onEdit, onDelete }) => {
    const { badge, gradient } = getStatusStyles(training.status);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col relative overflow-hidden animate-fade-in-up">
            <div className={`absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b ${gradient}`}></div>
            <div className="pl-6 p-5 flex-grow">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 pr-2">{training.nama}</h3>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badge} whitespace-nowrap`}>{training.status}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <p className="flex items-center">{ICONS.calendar} {formatDateRange(training.tanggalMulai, training.tanggalSelesai)}</p>
                    <p className="flex items-center">{ICONS.locationPin} {training.lokasi}</p>
                    <p className="flex items-center">{ICONS.person} {training.pic}</p>
                </div>
                {training.catatan && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Catatan:</p>
                        <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">{training.catatan}</p>
                    </div>
                )}
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-between items-center">
                <select 
                    value={training.status} 
                    onChange={(e) => onStatusChange(training.id, e.target.value as TrainingStatus)}
                    className="text-sm bg-transparent font-semibold border-none focus:ring-0 p-1 -ml-1"
                >
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                    <button onClick={() => onEdit(training)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Edit">{ICONS.edit}</button>
                    <button onClick={() => onDelete(training.id)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Hapus">{ICONS.delete}</button>
                </div>
            </div>
        </div>
    );
};


// Main TrainingDashboard Component
const TrainingDashboard: React.FC = () => {
    const [trainings, setTrainings] = useState<Training[]>([]);
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();
    
    // Filter and Sort State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Semua Status');
    const [sortOrder, setSortOrder] = useState('Terdekat');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [editingTraining, setEditingTraining] = useState<Partial<Training> | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'trainings'), orderBy('tanggalMulai', 'asc'));
        const unsub = onSnapshot(q, 
            (snapshot) => {
                const trainingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Training));
                setTrainings(trainingsData);
                setLoading(false);
            },
            (error) => {
                const firebaseError = error as { code?: string };
                showNotification(getFirestoreErrorMessage(firebaseError), "warning");
                setLoading(false);
            }
        );

        const handleOpenModalEvent = (data: { initialData: Partial<Training> }) => {
            handleOpenModal(data.initialData);
        };
        eventBus.on('openTrainingModal', handleOpenModalEvent);

        return () => {
            unsub();
            eventBus.remove('openTrainingModal', handleOpenModalEvent);
        };
    }, [showNotification]);

    const filteredAndSortedTrainings = useMemo(() => {
        return trainings
            .filter(t => 
                (t.nama.toLowerCase().includes(searchTerm.toLowerCase())) &&
                (statusFilter === 'Semua Status' || t.status === statusFilter)
            )
            .sort((a, b) => {
                const dateA = new Date(a.tanggalMulai).getTime();
                const dateB = new Date(b.tanggalMulai).getTime();
                return sortOrder === 'Terdekat' ? dateA - dateB : dateB - dateA;
            });
    }, [trainings, searchTerm, statusFilter, sortOrder]);

    const handleOpenModal = (training: Partial<Training> | null = null) => {
        setEditingTraining(training);
        setIsModalOpen(true);
    };

    const handleAIParseSuccess = (data: Partial<Omit<Training, 'id' | 'status'>>) => {
        setEditingTraining(data); // Pre-fill with AI data
        setIsModalOpen(true);
    };

    const handleSaveTraining = async (trainingData: Omit<Training, 'id'>) => {
        try {
            if (editingTraining && 'id' in editingTraining && editingTraining.id) {
                await updateDoc(doc(db, 'trainings', editingTraining.id), trainingData);
                showNotification('Training berhasil diperbarui.', 'success');
            } else {
                await addDoc(collection(db, 'trainings'), trainingData);
                showNotification('Training baru berhasil ditambahkan.', 'success');
            }
        } catch (error) {
            showNotification('Gagal menyimpan training.', 'error');
            console.error(error);
        }
    };
    
    const handleStatusChange = async (id: string, status: TrainingStatus) => {
        try {
            await updateDoc(doc(db, 'trainings', id), { status });
        } catch (error) {
            showNotification('Gagal memperbarui status.', 'error');
        }
    };
    
    const handleDelete = async (id: string) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus training ini?')) {
            try {
                await deleteDoc(doc(db, 'trainings', id));
                showNotification('Training berhasil dihapus.', 'success');
            } catch (error) {
                showNotification('Gagal menghapus training.', 'error');
            }
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard Training</h1>
                    <p className="text-gray-500 dark:text-gray-400">Pantau semua jadwal dan status konfirmasi training.</p>
                </div>
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
                        onClick={() => handleOpenModal()} 
                        className="flex items-center space-x-2 bg-brand-purple text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple"
                        title="Tambah Training Baru"
                    >
                        {ICONS.add}
                        <span className="hidden sm:inline">Tambah Manual</span>
                    </button>
                </div>
            </header>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input 
                        type="text" 
                        placeholder="Cari Nama Training..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                    />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
                        <option>Semua Status</option>
                        {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                     <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
                        <option value="Terdekat">Urutkan: Terdekat</option>
                        <option value="Terjauh">Urutkan: Terjauh</option>
                    </select>
                </div>
            </div>

            {loading ? <div className="text-center p-10"><LoadingSpinner text="Memuat data training..." /></div> : (
                filteredAndSortedTrainings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredAndSortedTrainings.map(training => (
                            <TrainingCard 
                                key={training.id} 
                                training={training}
                                onStatusChange={handleStatusChange}
                                onEdit={handleOpenModal}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Tidak Ada Training</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">Belum ada data training yang cocok dengan filter Anda.</p>
                    </div>
                )
            )}
            
            <TrainingModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTraining}
                trainingToEdit={editingTraining}
            />
            <AITrainingModal 
                isOpen={isAIModalOpen} 
                onClose={() => setIsAIModalOpen(false)}
                onParseSuccess={handleAIParseSuccess}
            />
        </div>
    );
};

export default TrainingDashboard;