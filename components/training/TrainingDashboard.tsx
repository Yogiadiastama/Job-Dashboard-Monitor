import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, deleteDoc, addDoc, updateDoc, query, orderBy } from '@firebase/firestore';
import { db, getFirestoreErrorMessage } from '../../services/firebase';
import { Training, TrainingStatus, ALL_STATUSES, Task } from '../../types';
import { ICONS } from '../../constants';
import LoadingSpinner from '../common/LoadingSpinner';
import { useNotification, useConnectivity } from '../../hooks/useNotification';
import TrainingModal from './TrainingModal';
import TrainingCalendar from './TrainingCalendar';

const formatDateRange = (start: string, end: string) => {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    const startDate = new Date(start).toLocaleDateString('id-ID', options);
    const endDate = new Date(end).toLocaleDateString('id-ID', options);
    return startDate === endDate ? startDate : `${startDate} - ${endDate}`;
};

const getStatusStyles = (status: TrainingStatus) => {
    switch (status) {
        case 'Belum Dikonfirmasi': return { badge: 'bg-danger-bg text-danger-text', border: 'border-danger-border' };
        case 'Terkonfirmasi': return { badge: 'bg-success-bg text-success-text', border: 'border-success-border' };
        case 'Menunggu Jawaban': return { badge: 'bg-warning-bg text-warning-text', border: 'border-warning-border' };
        case 'Selesai': return { badge: 'bg-info-bg text-info-text', border: 'border-info-border' };
        default: return { badge: 'bg-slate-200 text-slate-800', border: 'border-slate-300' };
    }
};

const TrainingCard: React.FC<{
    training: Training;
    onStatusChange: (id: string, status: TrainingStatus) => void;
    onEdit: (training: Training) => void;
    onDelete: (id: string) => void;
}> = ({ training, onStatusChange, onEdit, onDelete }) => {
    const { badge, border } = getStatusStyles(training.status);

    const handleWhatsAppExport = () => {
        let message = `*Pelatihan / Training*\n\n` +
            `*Nama:* ${training.nama}\n` +
            `*Tanggal:* ${formatDateRange(training.tanggalMulai, training.tanggalSelesai)}\n` +
            `*Lokasi:* ${training.lokasi}\n` +
            `*PIC:* ${training.pic}\n`;
    
        if (training.catatan) {
            message += `*Catatan:* ${training.catatan}\n`;
        }
        
        message += `*Status:* ${training.status}\n`;
    
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border-l-4 ${border} flex flex-col`}>
            <div className="p-5 flex-grow">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg pr-2 text-slate-800 dark:text-slate-100">{training.nama}</h3>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badge}`}>{training.status.toUpperCase()}</span>
                </div>
                <div className="mt-3 text-sm space-y-2 text-slate-500 dark:text-slate-400">
                    <p className="flex items-center gap-2">{ICONS.calendar} {formatDateRange(training.tanggalMulai, training.tanggalSelesai)}</p>
                    <p className="flex items-center gap-2">{ICONS.locationPin} {training.lokasi}</p>
                    <p className="flex items-center gap-2">{ICONS.person} {training.pic}</p>
                </div>
                {training.catatan && (
                    <>
                        <hr className="my-3 dark:border-slate-600"/>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{training.catatan}</p>
                    </>
                )}
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 p-3 flex justify-between items-center rounded-b-lg">
                <select 
                    value={training.status} 
                    onChange={(e) => onStatusChange(training.id, e.target.value as TrainingStatus)}
                    className="text-sm bg-transparent font-semibold border-none focus:ring-0 text-slate-600 dark:text-slate-300"
                >
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="flex items-center space-x-1 text-slate-500 dark:text-slate-400">
                    <button onClick={handleWhatsAppExport} className="p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-400/20 text-green-600 dark:text-green-400" title="Export to WhatsApp">{ICONS.whatsapp}</button>
                    <button onClick={() => onEdit(training)} className="p-2 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-400/20 text-yellow-600 dark:text-yellow-400" title="Edit">{ICONS.edit}</button>
                    <button onClick={() => onDelete(training.id)} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-400/20 text-red-600 dark:text-red-400" title="Delete">{ICONS.delete}</button>
                </div>
            </div>
        </div>
    );
};

interface TrainingDashboardProps {
    onEditTraining: (training: Training | Partial<Training>) => void;
}

type SortableTrainingKeys = keyof Pick<Training, 'nama' | 'tanggalMulai' | 'lokasi' | 'pic' | 'status'>;

const TrainingDashboard: React.FC<TrainingDashboardProps> = ({ onEditTraining }) => {
    const [trainings, setTrainings] = useState<Training[]>([]);
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();
    const { setOffline } = useConnectivity();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Semua Status');
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [sortConfig, setSortConfig] = useState<{ key: SortableTrainingKeys; direction: 'ascending' | 'descending' }>({ key: 'tanggalMulai', direction: 'ascending' });

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
                if (firebaseError.code === 'unavailable') setOffline(true, true);
                else showNotification(getFirestoreErrorMessage(firebaseError), "warning");
                setLoading(false);
            }
        );
        return () => unsub();
    }, [showNotification, setOffline]);

    const filteredAndSortedTrainings = useMemo(() => {
        let sorted = [...trainings]
            .filter(t => 
                (t.nama.toLowerCase().includes(searchTerm.toLowerCase()) || t.pic.toLowerCase().includes(searchTerm.toLowerCase())) &&
                (statusFilter === 'Semua Status' || t.status === statusFilter)
            );

        sorted.sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;
            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        
        return sorted;
    }, [trainings, searchTerm, statusFilter, sortConfig]);
    
    const handleStatusChange = async (id: string, status: TrainingStatus) => {
        try {
            await updateDoc(doc(db, 'trainings', id), { status });
        } catch (error) { showNotification('Gagal memperbarui status.', 'error'); }
    };
    
    const handleDelete = async (id: string) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus training ini?')) {
            try {
                await deleteDoc(doc(db, 'trainings', id));
                showNotification('Training berhasil dihapus.', 'success');
            } catch (error) { showNotification('Gagal menghapus training.', 'error'); }
        }
    };

    const requestSort = (key: SortableTrainingKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableTrainingKeys) => {
        if (sortConfig.key !== key) return ' ▲▼';
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    return (
        <div className="space-y-6 animate-fade-in-down">
             <div className="p-4 rounded-lg shadow-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <input 
                        type="text" placeholder="Cari Nama Training atau PIC..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="md:col-span-2 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-primary-500 focus:border-primary-500">
                        <option>Semua Status</option>
                        {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                     <div className="md:col-span-3 flex justify-end">
                        <div className="flex items-center p-1 bg-slate-200 dark:bg-slate-700 rounded-lg">
                            <button onClick={() => setViewMode('list')} className={`px-4 py-1 rounded-md text-sm font-semibold ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 shadow' : 'text-slate-600 dark:text-slate-300'}`}>List</button>
                            <button onClick={() => setViewMode('calendar')} className={`px-4 py-1 rounded-md text-sm font-semibold ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-800 shadow' : 'text-slate-600 dark:text-slate-300'}`}>Calendar</button>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? <div className="text-center p-10"><LoadingSpinner text="Memuat data training..." /></div> : (
                filteredAndSortedTrainings.length > 0 ? (
                    viewMode === 'list' ? (
                         <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                                        <tr>
                                            <th className="p-4"><button className="font-semibold flex items-center gap-1" onClick={() => requestSort('nama')}>Nama Training<span className="text-slate-400">{getSortIndicator('nama')}</span></button></th>
                                            <th className="p-4"><button className="font-semibold flex items-center gap-1" onClick={() => requestSort('tanggalMulai')}>Tanggal<span className="text-slate-400">{getSortIndicator('tanggalMulai')}</span></button></th>
                                            <th className="p-4"><button className="font-semibold flex items-center gap-1" onClick={() => requestSort('lokasi')}>Lokasi<span className="text-slate-400">{getSortIndicator('lokasi')}</span></button></th>
                                            <th className="p-4"><button className="font-semibold flex items-center gap-1" onClick={() => requestSort('pic')}>PIC<span className="text-slate-400">{getSortIndicator('pic')}</span></button></th>
                                            <th className="p-4"><button className="font-semibold flex items-center gap-1" onClick={() => requestSort('status')}>Status<span className="text-slate-400">{getSortIndicator('status')}</span></button></th>
                                            <th className="p-4 font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {filteredAndSortedTrainings.map(training => {
                                            const { badge } = getStatusStyles(training.status);
                                            return (
                                                <tr key={training.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                    <td className="p-4 font-medium text-slate-900 dark:text-slate-50">{training.nama}</td>
                                                    <td className="p-4">{formatDateRange(training.tanggalMulai, training.tanggalSelesai)}</td>
                                                    <td className="p-4">{training.lokasi}</td>
                                                    <td className="p-4">{training.pic}</td>
                                                    <td className="p-4"><span className={`px-3 py-1 text-xs font-semibold rounded-full ${badge}`}>{training.status}</span></td>
                                                    <td className="p-4">
                                                        <div className="flex items-center space-x-1 text-slate-500">
                                                            <button onClick={() => {
                                                                let message = `*Pelatihan / Training*\n\n` +
                                                                    `*Nama:* ${training.nama}\n` +
                                                                    `*Tanggal:* ${formatDateRange(training.tanggalMulai, training.tanggalSelesai)}\n` +
                                                                    `*Lokasi:* ${training.lokasi}\n` +
                                                                    `*PIC:* ${training.pic}\n` +
                                                                    `*Status:* ${training.status}\n`;
                                                                const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
                                                                window.open(whatsappUrl, '_blank');
                                                            }} className="p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-400/20 text-green-600 dark:text-green-400" title="Export to WhatsApp">{ICONS.whatsapp}</button>
                                                            <button onClick={() => onEditTraining(training)} className="p-2 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-400/20 text-yellow-600 dark:text-yellow-400" title="Edit">{ICONS.edit}</button>
                                                            <button onClick={() => handleDelete(training.id)} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-400/20 text-red-600 dark:text-red-400" title="Delete">{ICONS.delete}</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <TrainingCalendar trainings={filteredAndSortedTrainings} onEditTraining={onEditTraining} />
                    )
                ) : (
                    <div className="text-center py-16 rounded-lg bg-white dark:bg-slate-800">
                        <h3 className="text-xl font-semibold">Tidak Ada Training</h3>
                        <p className="mt-2 text-slate-500 dark:text-slate-400">Belum ada data training yang cocok dengan filter Anda.</p>
                    </div>
                )
            )}
        </div>
    );
};

export default TrainingDashboard;