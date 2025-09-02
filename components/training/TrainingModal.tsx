

import React, { useState, useEffect } from 'react';
import { addDoc, collection, doc, updateDoc } from '@firebase/firestore';
import { db } from '../../services/firebase';
import { Training, TrainingStatus, ALL_STATUSES } from '../../types';
import { useNotification } from '../../hooks/useNotification';

interface TrainingModalProps {
    training: Training | Partial<Training> | null;
    closeModal: () => void;
}

const TrainingModal: React.FC<TrainingModalProps> = ({ training, closeModal }) => {
    const [nama, setNama] = useState(training?.nama || '');
    const [tanggalMulai, setTanggalMulai] = useState(training?.tanggalMulai || new Date().toISOString().split('T')[0]);
    const [tanggalSelesai, setTanggalSelesai] = useState(training?.tanggalSelesai || new Date().toISOString().split('T')[0]);
    const [lokasi, setLokasi] = useState(training?.lokasi || '');
    const [pic, setPic] = useState(training?.pic || '');
    const [catatan, setCatatan] = useState(training?.catatan || '');
    const [status, setStatus] = useState<TrainingStatus>(training?.status || 'Belum Dikonfirmasi');
    const [loading, setLoading] = useState(false);
    const { showNotification } = useNotification();
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const trainingData = { nama, tanggalMulai, tanggalSelesai, lokasi, pic, catatan, status };
        try {
            if (training && 'id' in training && training.id) {
                await updateDoc(doc(db, 'trainings', training.id), trainingData);
                showNotification('Training updated successfully.', 'success');
            } else {
                await addDoc(collection(db, 'trainings'), trainingData);
                showNotification('New training added successfully.', 'success');
            }
            closeModal();
        } catch (error) {
            console.error("Error saving training: ", error);
            showNotification('Failed to save training.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = "appearance-none border border-slate-300 dark:border-slate-600 rounded-lg w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200";
    const labelStyle = "block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300";

    return (
         <div className="fixed inset-0 flex items-start justify-center z-50 p-4 modal-backdrop pt-16" onClick={closeModal}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold">{training && 'id' in training ? 'Edit Training' : 'Add New Training'}</h2>
                </div>
                <form id="training-modal-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-4">
                     <div>
                        <label className={labelStyle}>Training Name</label>
                        <input type="text" value={nama} onChange={e => setNama(e.target.value)} className={inputStyle} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelStyle}>Start Date</label>
                            <input type="date" value={tanggalMulai} onChange={e => setTanggalMulai(e.target.value)} className={inputStyle} required />
                        </div>
                        <div>
                            <label className={labelStyle}>End Date</label>
                            <input type="date" value={tanggalSelesai} onChange={e => setTanggalSelesai(e.target.value)} className={inputStyle} required />
                        </div>
                    </div>
                    <div>
                        <label className={labelStyle}>Location</label>
                        <input type="text" value={lokasi} onChange={e => setLokasi(e.target.value)} placeholder="e.g., Online via Zoom" className={inputStyle} required />
                    </div>
                     <div>
                        <label className={labelStyle}>Person In Charge (PIC)</label>
                        <input type="text" value={pic} onChange={e => setPic(e.target.value)} placeholder="e.g., Budi - Sales Dept." className={inputStyle} required />
                    </div>
                    <div>
                        <label className={labelStyle}>Notes</label>
                        <textarea value={catatan} onChange={e => setCatatan(e.target.value)} rows={3} className={inputStyle}></textarea>
                    </div>
                    <div>
                        <label className={labelStyle}>Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value as TrainingStatus)} className={inputStyle}>
                            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </form>
                <div className="flex justify-end space-x-4 p-6 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={closeModal} className="px-6 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button type="submit" form="training-modal-form" disabled={loading} className="px-6 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50">
                        {loading ? 'Saving...' : 'Save Training'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TrainingModal;