
import React, { useState } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { CalendarEvent } from '../../types';
import { ICONS } from '../../constants';

interface EventModalProps {
    event: CalendarEvent | null;
    closeModal: () => void;
    handleDelete: (eventId: string) => void;
}

const EventModal: React.FC<EventModalProps> = ({ event, closeModal, handleDelete }) => {
    const [title, setTitle] = useState(event ? event.title : '');
    const [date, setDate] = useState(event ? event.date : new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState(event ? event.description : '');
    const [loading, setLoading] = useState(false);
    const { userData } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userData) {
            alert('Anda harus login untuk melakukan aksi ini.');
            return;
        }
        setLoading(true);

        const eventData = {
            title,
            date,
            description,
            createdBy: event ? event.createdBy : userData.uid,
        };

        try {
            if (event) {
                await updateDoc(doc(db, 'events', event.id), eventData);
            } else {
                await addDoc(collection(db, 'events'), eventData);
            }
            closeModal();
        } catch (error) {
            console.error("Error saving event: ", error);
            alert("Gagal menyimpan event.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{event ? 'Edit Event' : 'Tambah Event Baru'}</h2>
                    {event && (
                        <button onClick={() => handleDelete(event.id)} className="p-2 rounded-full hover:bg-red-200 dark:hover:bg-red-800 text-red-600 dark:text-red-300 transition-colors" title="Hapus Event">
                            {ICONS.delete}
                        </button>
                    )}
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Judul Event</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Tanggal</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Deskripsi</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" rows={4}></textarea>
                    </div>
                    <div className="flex justify-end space-x-4 mt-8">
                        <button type="button" onClick={closeModal} className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Batal</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                            {loading ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EventModal;
