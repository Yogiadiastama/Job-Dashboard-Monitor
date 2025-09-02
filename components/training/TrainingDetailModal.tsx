import React from 'react';
import { Training, TrainingStatus } from '../../types';
import { ICONS } from '../../constants';

const formatDateRange = (start: string, end:string) => {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    const startDate = new Date(start).toLocaleDateString('id-ID', options);
    const endDate = new Date(end).toLocaleDateString('id-ID', options);
    return startDate === endDate ? startDate : `${startDate} - ${endDate}`;
};

const getStatusStyles = (status: TrainingStatus) => {
    switch (status) {
        case 'Belum Dikonfirmasi': return { badge: 'bg-danger-bg text-danger-text' };
        case 'Terkonfirmasi': return { badge: 'bg-success-bg text-success-text' };
        case 'Menunggu Jawaban': return { badge: 'bg-warning-bg text-warning-text' };
        case 'Selesai': return { badge: 'bg-info-bg text-info-text' };
        default: return { badge: 'bg-slate-200 text-slate-800' };
    }
};

interface TrainingDetailModalProps {
    training: Training;
    onClose: () => void;
}

const TrainingDetailModal: React.FC<TrainingDetailModalProps> = ({ training, onClose }) => {
    const { badge } = getStatusStyles(training.status);

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 animate-fade-in-up overflow-y-auto modal-backdrop" 
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white pr-4">{training.nama}</h2>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badge} flex-shrink-0`}>{training.status.toUpperCase()}</span>
                    </div>
                    <div className="text-sm space-y-3 text-slate-600 dark:text-slate-300">
                        <p className="flex items-center gap-3">{ICONS.calendar} <strong>Tanggal:</strong> {formatDateRange(training.tanggalMulai, training.tanggalSelesai)}</p>
                        <p className="flex items-center gap-3">{ICONS.locationPin} <strong>Lokasi:</strong> {training.lokasi}</p>
                        <p className="flex items-center gap-3">{ICONS.person} <strong>PIC:</strong> {training.pic}</p>
                    </div>
                    {training.catatan && (
                        <>
                            <hr className="my-4 dark:border-slate-600"/>
                            <div>
                                <h4 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Catatan:</h4>
                                <div className="max-h-64 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md border dark:border-slate-200 dark:border-slate-600">
                                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{training.catatan}</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                 <div className="p-4 bg-slate-50 dark:bg-slate-700/50 flex justify-end rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TrainingDetailModal;