import React from 'react';
import { Training, TrainingStatus } from '../../types';

interface DashboardTrainingModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    trainings: Training[];
}

const statusClass: { [key in TrainingStatus]: string } = {
    'Belum Dikonfirmasi': 'bg-danger-bg text-danger-text',
    'Terkonfirmasi': 'bg-success-bg text-success-text',
    'Menunggu Jawaban': 'bg-warning-bg text-warning-text',
};

const DashboardTrainingModal: React.FC<DashboardTrainingModalProps> = ({ isOpen, onClose, title, trainings }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in-up" onClick={onClose}>
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-4xl p-6 sm:p-8 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-neutral-800 dark:text-neutral-100">{title}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="overflow-y-auto">
                    {trainings.length > 0 ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700/50">
                                    <th className="p-3 sm:p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">Nama Training</th>
                                    <th className="p-3 sm:p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">Tanggal</th>
                                    <th className="p-3 sm:p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">Lokasi</th>
                                    <th className="p-3 sm:p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">PIC</th>
                                    <th className="p-3 sm:p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trainings.map(training => (
                                    <tr key={training.id} className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors">
                                        <td className="p-3 sm:p-4 font-medium text-neutral-800 dark:text-neutral-100">{training.nama}</td>
                                        <td className="p-3 sm:p-4 text-neutral-600 dark:text-neutral-300">{new Date(training.tanggalMulai).toLocaleDateString('id-ID')} - {new Date(training.tanggalSelesai).toLocaleDateString('id-ID')}</td>
                                        <td className="p-3 sm:p-4 text-neutral-600 dark:text-neutral-300">{training.lokasi}</td>
                                        <td className="p-3 sm:p-4 text-neutral-600 dark:text-neutral-300">{training.pic}</td>
                                        <td className="p-3 sm:p-4">
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusClass[training.status] || 'bg-neutral-200 text-neutral-800'}`}>
                                                {training.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-center text-neutral-500 dark:text-neutral-400 py-10">Tidak ada training dalam kategori ini.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardTrainingModal;