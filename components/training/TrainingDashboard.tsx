

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, deleteDoc, addDoc, updateDoc, query, orderBy } from '@firebase/firestore';
import { db, getFirestoreErrorMessage } from '../../services/firebase';
import { Training, TrainingStatus, ALL_STATUSES } from '../../types';
import { ICONS } from '../../constants';
import LoadingSpinner from '../common/LoadingSpinner';
import { useNotification, useConnectivity } from '../../hooks/useNotification';
import AIInputModal from '../training/AddWithAIModal';
import { analyzeTextForEntry } from '../../services/geminiService';
import EditableText from '../common/EditableText';
import { defaultTextContent } from '../../hooks/useCustomization';

// --- Helper Functions ---
const formatDateRange = (start: string, end: string) => {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    const startDate = new Date(start).toLocaleDateString('id-ID', options);
    const endDate = new Date(end).toLocaleDateString('id-ID', options);
    return `${startDate} - ${endDate}`;
};

const getStatusStyles = (status: TrainingStatus) => {
    switch (status) {
        case 'Belum Dikonfirmasi':
            return {
                badge: 'bg-status-red-bg text-status-red-text',
                border: 'border-status-red',
            };
        case 'Terkonfirmasi':
            return {
                badge: 'bg-status-green-bg text-status-green-text',
                border: 'border-status-green',
            };
        case 'Menunggu Jawaban':
            return {
                badge: 'bg-status-yellow-bg text-status-yellow-text',
                border: 'border-status-yellow',
            };
        default:
            return {
                badge: 'bg-gray-200 text-gray-800',
                border: 'border-gray-300',
            };
    }
};

// --- Sub-components defined in the same file to avoid creating new files ---

// TrainingModal Component
const TrainingModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (training: Omit<Training, 'id'>) => Promise<void>;
    trainingToEdit: Training | Partial<Training> | null;
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
        const today = new Date().toISOString().split('T')[0];
        if (trainingToEdit) {
            setNama(trainingToEdit.nama || '');
            setTanggalMulai(trainingToEdit.tanggalMulai || today);
            setTanggalSelesai(trainingToEdit.tanggalSelesai || today);
            setLokasi(trainingToEdit.lokasi || '');
            setPic(trainingToEdit.pic || '');
            setCatatan(trainingToEdit.catatan || '');
            setStatus(trainingToEdit.status || 'Belum Dikonfirmasi');
        } else {
            setNama('');
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
                    <h2 className="text-2xl font-bold">{trainingToEdit && 'id' in trainingToEdit ? 'Edit Training' : 'Tambah Training Baru'}</h2>
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
                    <button type="submit" form="training-form" disabled={loading} className="px-6 py-2 bg-brand-purple text-white rounded-md hover:bg-opacity-90 disabled:bg-opacity-50">
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
    const { badge, border } = getStatusStyles(training.status);

    return (
        <div className={`rounded-lg shadow-md border-l-4 ${border} flex flex-col animate-fade-in-up`} style={{backgroundColor: 'var(--card-bg)'}}>
            <div className="p-5 flex-grow">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg pr-2" style={{color: 'var(--text-primary)'}}>{training.nama}</h3>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badge}`}>{training.status.toUpperCase()}</span>
                </div>
                <div className="mt-3 text-sm space-y-2" style={{color: 'var(--text-secondary)'}}>
                    <p className="flex items-center">{ICONS.calendar} {formatDateRange(training.tanggalMulai, training.tanggalSelesai)}</p>
                    <p className="flex items-center">{ICONS.locationPin} {training.lokasi}</p>
                </div>
                <hr className="my-3 dark:border-gray-600"/>
                <div>
                    <h4 className="font-semibold text-xs uppercase" style={{color: 'var(--text-secondary)'}}>Detail Kontak</h4>
                    <p className="flex items-center text-sm mt-1" style={{color: 'var(--text-primary)'}}>{ICONS.person} {training.pic}</p>
                </div>
                <div className="mt-3">
                    <h4 className="font-semibold text-xs uppercase" style={{color: 'var(--text-secondary)'}}>Catatan</h4>
                    <p className="text-sm mt-1" style={{color: 'var(--text-primary)'}}>{training.catatan || '-'}</p>
                </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 flex justify-between items-center rounded-b-lg">
                <select 
                    value={training.status} 
                    onChange={(e) => onStatusChange(training.id, e.target.value as TrainingStatus)}
                    className="text-sm bg-transparent font-semibold border-none focus:ring-0"
                    style={{color: 'var(--text-primary)'}}
                >
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                    <button className="p-1 hover:text-gray-800 dark:hover:text-white" title="Notifikasi (segera hadir)" disabled>{ICONS.bell}</button>
                    <button onClick={() => onEdit(training)} className="p-1 hover:text-blue-600 dark:hover:text-blue-400" title="Edit">{ICONS.edit}</button>
                    <button onClick={() => onDelete(training.id)} className="p-1 hover:text-red-600 dark:hover:text-red-400" title="Hapus">{ICONS.delete}</button>
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
    const { setOffline } = useConnectivity();
    
    // Filter and Sort State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Semua Status');
    const [sortOrder, setSortOrder] = useState('Terdekat');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTraining, setEditingTraining] = useState<Training | Partial<Training> | null>(null);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'trainings'), orderBy('tanggalMulai', 'asc'));
        const unsub = onSnapshot(q, 
            (snapshot) => {
                const trainingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Training));
                setTrainings(trainingsData);
                setLoading(false);
            },
            (error) => {
                console.error("TrainingDashboard: Error fetching trainings:", error);
                const firebaseError = error as { code?: string };
                if (firebaseError.code === 'unavailable') {
                    setOffline(true, true);
                } else {
                    showNotification(getFirestoreErrorMessage(firebaseError), "warning");
                }
                setLoading(false);
            }
        );
        return () => unsub();
    }, [showNotification, setOffline]);

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

    const handleOpenModal = (training: Training | Partial<Training> | null = null) => {
        setEditingTraining(training);
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

    const handleProcessAIText = async (text: string) => {
        try {
            const result = await analyzeTextForEntry(text);
            if (result.entryType !== 'training' || !result.trainingDetails) {
                throw new Error("Teks yang Anda masukkan sepertinya bukan permintaan training. Coba lagi.");
            }

            const { nama, tanggalMulai, tanggalSelesai, lokasi, pic } = result.trainingDetails;
            const today = new Date().toISOString().split('T')[0];

            const partialTraining: Partial<Training> = {
                nama: nama || '',
                tanggalMulai: tanggalMulai || today,
                tanggalSelesai: tanggalSelesai || tanggalMulai || today,
                lokasi: lokasi || '',
                pic: pic || '',
                status: 'Belum Dikonfirmasi',
                catatan: `Dibuat dari teks via AI.`,
            };
            
            setIsAIModalOpen(false);
            handleOpenModal(partialTraining);

        } catch (error) {
            console.error("AI Text Processing Error:", error);
            throw error; // Re-throw for the modal to catch and display.
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-start">
                <div>
                    <EditableText 
                        as="h1"
                        contentKey="training.title"
                        defaultText={defaultTextContent['training.title']}
                        className="text-3xl font-bold"
                    />
                    <EditableText 
                        as="p"
                        contentKey="training.description"
                        defaultText={defaultTextContent['training.description']}
                        style={{color: 'var(--text-secondary)'}}
                    />
                </div>
                 <div className="flex space-x-2 flex-shrink-0">
                    <button onClick={() => setIsAIModalOpen(true)} className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                        {ICONS.magic}
                        <span>Tambah AI</span>
                    </button>
                    <button onClick={() => handleOpenModal()} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        {ICONS.add}
                        <span>Tambah Manual</span>
                    </button>
                </div>
            </header>

            <div className="p-4 rounded-lg shadow-md" style={{backgroundColor: 'var(--card-bg)'}}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input 
                        type="text" 
                        placeholder="Cari Nama Training..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                        style={{backgroundColor: 'var(--app-bg)', color: 'var(--text-primary)'}}
                    />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md" style={{backgroundColor: 'var(--app-bg)', color: 'var(--text-primary)'}}>
                        <option>Semua Status</option>
                        {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                     <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md" style={{backgroundColor: 'var(--app-bg)', color: 'var(--text-primary)'}}>
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
                                onEdit={() => handleOpenModal(training)}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 rounded-lg shadow-md" style={{backgroundColor: 'var(--card-bg)'}}>
                        <h3 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>Tidak Ada Training</h3>
                        <p className="mt-2" style={{color: 'var(--text-secondary)'}}>Belum ada data training yang cocok dengan filter Anda.</p>
                    </div>
                )
            )}
            
            <TrainingModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTraining}
                trainingToEdit={editingTraining}
            />

            <AIInputModal 
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                onProcess={handleProcessAIText}
                title="Tambah Training dari Teks (AI)"
                prompt="Tempelkan teks dari WhatsApp atau catatan Anda di sini untuk membuat training baru secara otomatis."
            />
        </div>
    );
};

export default TrainingDashboard;