import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { collection, onSnapshot, doc, deleteDoc, addDoc, updateDoc, query, orderBy } from '@firebase/firestore';
import { db, getFirestoreErrorMessage } from '../../services/firebase';
import { Training, TrainingStatus, ALL_STATUSES } from '../../types';
import { ICONS } from '../../constants';
import LoadingSpinner from '../common/LoadingSpinner';
import { useNotification, useConnectivity } from '../../hooks/useNotification';
import AIInputModal from '../training/AddWithAIModal';
import { analyzeTextForEntry } from '../../services/geminiService';

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
                badge: 'bg-danger-bg text-danger-text border border-danger-border',
                border: 'border-danger-border',
            };
        case 'Terkonfirmasi':
            return {
                badge: 'bg-success-bg text-success-text border border-success-border',
                border: 'border-success-border',
            };
        case 'Menunggu Jawaban':
            return {
                badge: 'bg-warning-bg text-warning-text border border-warning-border',
                border: 'border-warning-border',
            };
        default:
            return {
                badge: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600',
                border: 'border-slate-300 dark:border-slate-600',
            };
    }
};


// --- Sub-components defined in the same file to avoid creating new files ---
// Header Actions Component (for Portal)
const HeaderActions: React.FC<{ onAddManually: () => void; onAddWithAI: () => void }> = ({ onAddManually, onAddWithAI }) => {
    const targetNode = document.getElementById('header-actions');
    if (!targetNode) return null;

    return ReactDOM.createPortal(
        <>
            <button onClick={onAddWithAI} className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 shadow-sm hover:shadow-md transform hover:-translate-y-0.5">
                {ICONS.magic}
                <span className="hidden sm:inline">Add with AI</span>
            </button>
            <button onClick={onAddManually} className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-sm hover:shadow-md transform hover:-translate-y-0.5">
                {ICONS.add}
                <span className="hidden sm:inline">Add Manually</span>
            </button>
        </>,
        targetNode
    );
};

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
    
    const inputStyle = "appearance-none border border-slate-300 dark:border-slate-600 rounded-lg w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200";
    const labelStyle = "block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300";


    return (
         <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in-down">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold">{trainingToEdit && 'id' in trainingToEdit ? 'Edit Training' : 'Add New Training'}</h2>
                </div>
                <form id="training-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-4">
                     <div>
                        <label className={labelStyle}>Training Name</label>
                        <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} className={inputStyle} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelStyle}>Start Date</label>
                            <input type="date" value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)} className={inputStyle} required />
                        </div>
                        <div>
                             <label className={labelStyle}>End Date</label>
                            <input type="date" value={tanggalSelesai} onChange={(e) => setTanggalSelesai(e.target.value)} className={inputStyle} required />
                        </div>
                    </div>
                    <div>
                        <label className={labelStyle}>Location</label>
                        <input type="text" value={lokasi} onChange={(e) => setLokasi(e.target.value)} className={inputStyle} placeholder="e.g., Online via Zoom" required />
                    </div>
                     <div>
                        <label className={labelStyle}>Contact Person (PIC)</label>
                        <input type="text" value={pic} onChange={(e) => setPic(e.target.value)} className={inputStyle} placeholder="e.g., Budi - Sales Division" required />
                    </div>
                    <div>
                         <label className={labelStyle}>Notes</label>
                        <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={4} className={`${inputStyle} min-h-[100px]`} placeholder="Additional information..."></textarea>
                    </div>
                     <div>
                        <label className={labelStyle}>Status</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value as TrainingStatus)} className={inputStyle}>
                            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </form>
                 <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button type="submit" form="training-form" disabled={loading} className="px-6 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50">
                        {loading ? 'Saving...' : 'Save Training'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// TrainingCard Component
const TrainingCard: React.FC<{
    training: Training;
    onStatusChange: (id: string, status: TrainingStatus) => void;
    onEdit: (training: Training) => void;
    onDelete: (id: string) => void;
}> = ({ training, onStatusChange, onEdit, onDelete }) => {
    const { badge, border } = getStatusStyles(training.status);

    return (
        <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 border-l-4 ${border} flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}>
            <div className="p-5 flex-grow">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg pr-2 text-slate-800 dark:text-slate-100">{training.nama}</h3>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badge}`}>{training.status}</span>
                </div>
                <div className="mt-3 text-sm space-y-2 text-slate-500 dark:text-slate-400">
                    <p className="flex items-center gap-2">{ICONS.calendar} {formatDateRange(training.tanggalMulai, training.tanggalSelesai)}</p>
                    <p className="flex items-center gap-2">{ICONS.locationPin} {training.lokasi}</p>
                </div>
                <hr className="my-3 dark:border-slate-600"/>
                <div>
                    <h4 className="font-semibold text-xs uppercase text-slate-400 dark:text-slate-500">Contact Person</h4>
                    <p className="flex items-center text-sm mt-1 text-slate-700 dark:text-slate-300 gap-2">{ICONS.person} {training.pic}</p>
                </div>
                {training.catatan && (
                    <div className="mt-3">
                        <h4 className="font-semibold text-xs uppercase text-slate-400 dark:text-slate-500">Notes</h4>
                        <p className="text-sm mt-1 text-slate-700 dark:text-slate-300">{training.catatan}</p>
                    </div>
                )}
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 p-3 flex justify-between items-center rounded-b-lg">
                <select 
                    value={training.status} 
                    onChange={(e) => onStatusChange(training.id, e.target.value as TrainingStatus)}
                    className="text-sm bg-transparent font-semibold border-none focus:ring-0 text-slate-700 dark:text-slate-300"
                >
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                 <div className="flex items-center space-x-1 text-slate-500">
                    <button onClick={() => onEdit(training)} className="p-2 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-400/20 text-yellow-600 dark:text-yellow-400" title="Edit">{ICONS.edit}</button>
                    <button onClick={() => onDelete(training.id)} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-400/20 text-red-600 dark:text-red-400" title="Delete">{ICONS.delete}</button>
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
                showNotification('Training updated successfully.', 'success');
            } else {
                await addDoc(collection(db, 'trainings'), trainingData);
                showNotification('New training added successfully.', 'success');
            }
        } catch (error) {
            showNotification('Failed to save training.', 'error');
            console.error(error);
        }
    };
    
    const handleStatusChange = async (id: string, status: TrainingStatus) => {
        try {
            await updateDoc(doc(db, 'trainings', id), { status });
        } catch (error) {
            showNotification('Failed to update status.', 'error');
        }
    };
    
    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this training?')) {
            try {
                await deleteDoc(doc(db, 'trainings', id));
                showNotification('Training deleted successfully.', 'success');
            } catch (error) {
                showNotification('Failed to delete training.', 'error');
            }
        }
    };

    const handleProcessAIText = async (text: string) => {
        try {
            const result = await analyzeTextForEntry(text);
            if (result.entryType !== 'training' || !result.trainingDetails) {
                throw new Error("The text you entered does not seem to be a training request. Please try again.");
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
                catatan: `Created from text via AI.`,
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
            <HeaderActions 
                onAddManually={() => handleOpenModal()} 
                onAddWithAI={() => setIsAIModalOpen(true)}
            />

            <div className="p-4 rounded-xl shadow-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input 
                        type="text" 
                        placeholder="Search Training Name..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:ring-primary-500 focus:border-primary-500">
                        <option>Semua Status</option>
                        {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                     <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:ring-primary-500 focus:border-primary-500">
                        <option value="Terdekat">Sort by: Nearest</option>
                        <option value="Terjauh">Sort by: Furthest</option>
                    </select>
                </div>
            </div>

            {loading ? <div className="text-center p-10"><LoadingSpinner text="Loading training data..." /></div> : (
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
                    <div className="text-center py-16 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">No Trainings Found</h3>
                        <p className="mt-2 text-slate-500 dark:text-slate-400">There is no training data that matches your filters.</p>
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
                title="Add Training from Text (AI)"
                prompt="Paste text from WhatsApp or your notes here to automatically create a new training."
            />
        </div>
    );
};

export default TrainingDashboard;