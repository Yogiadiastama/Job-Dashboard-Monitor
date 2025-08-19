
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { CalendarEvent } from '../../types';
import { ICONS } from '../../constants';
import LoadingSpinner from '../common/LoadingSpinner';
import EventModal from './EventModal';

const Calendar: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    useEffect(() => {
        setLoading(true);
        const unsub = onSnapshot(collection(db, 'events'), (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent));
            setEvents(eventsData);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const openModal = (event: CalendarEvent | null = null) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedEvent(null);
    };

    const handleDelete = async (eventId: string) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus event ini?')) {
            try {
                await deleteDoc(doc(db, 'events', eventId));
                closeModal();
            } catch (error) {
                console.error("Error deleting event: ", error);
                alert("Gagal menghapus event.");
            }
        }
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const { month, year, daysInMonth, firstDayOfMonth } = useMemo(() => {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        return { month, year, daysInMonth, firstDayOfMonth };
    }, [currentDate]);
    
    const weekdays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const blanks = Array.from({ length: firstDayOfMonth });
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const getEventsForDay = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.filter(event => event.date === dateStr);
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg animate-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div className="flex items-center space-x-4">
                    <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">‹</button>
                    <h3 className="text-2xl font-bold text-center w-48">{currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h3>
                    <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">›</button>
                </div>
                <button onClick={() => openModal()} className="flex items-center justify-center sm:justify-start space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors transform hover:-translate-y-1 shadow-lg w-full sm:w-auto">
                    {ICONS.add}
                    <span>Tambah Event</span>
                </button>
            </div>
            
            {loading ? <LoadingSpinner text="Memuat kalender..." /> : (
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {weekdays.map(day => (
                        <div key={day} className="text-center font-bold text-sm text-gray-500 dark:text-gray-400 py-2">{day}</div>
                    ))}
                    {blanks.map((_, i) => <div key={`blank-${i}`} className="border rounded-lg dark:border-gray-700"></div>)}
                    {days.map(day => {
                        const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                        const dayEvents = getEventsForDay(day);

                        return (
                            <div key={day} className="border rounded-lg p-2 h-24 sm:h-32 flex flex-col dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <div className={`font-bold text-sm ${isToday ? 'bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>{day}</div>
                                <div className="mt-1 space-y-1 overflow-y-auto text-xs">
                                    {dayEvents.map(event => (
                                        <div key={event.id} onClick={() => openModal(event)} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 p-1 rounded cursor-pointer truncate">
                                            {event.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {isModalOpen && <EventModal event={selectedEvent} closeModal={closeModal} handleDelete={handleDelete} />}
        </div>
    );
};

export default Calendar;
