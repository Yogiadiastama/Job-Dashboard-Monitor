
import React from 'react';
import { Training, TrainingStatus } from '../../types';

interface DashboardTrainingModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    trainings: Training[];
}

const statusClass: { [key in TrainingStatus]: string } = {
    'Belum Dikonfirmasi': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'Terkonfirmasi': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Menunggu Jawaban': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'Selesai': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

const DashboardTrainingModal: React.FC<DashboardTrainingModalProps> = ({ isOpen, onClose, title, trainings }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in-up" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl p-6 sm:p-8 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="overflow-y-auto">
                    {trainings.length > 0 ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b-2 dark:border-gray-700">
                                    <th className="p-3 sm:p-4">Nama Training</th>
                                    <th className="p-3 sm:p-4">Tanggal</th>
                                    <th className="p-3 sm:p-4">Lokasi</th>
                                    <th className="p-3 sm:p-4">PIC</th>
                                    <th className="p-3 sm:p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trainings.map(training => (
                                    <tr key={training.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="p-3 sm:p-4 font-medium">{training.nama}</td>
                                        <td className="p-3 sm:p-4">{new Date(training.tanggalMulai).toLocaleDateString('id-ID')} - {new Date(training.tanggalSelesai).toLocaleDateString('id-ID')}</td>
                                        <td className="p-3 sm:p-4">{training.lokasi}</td>
                                        <td className="p-3 sm:p-4">{training.pic}</td>
                                        <td className="p-3 sm:p-4">
                                            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusClass[training.status] || 'bg-gray-100 text-gray-800'}`}>
                                                {training.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-10">Tidak ada training dalam kategori ini.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardTrainingModal;