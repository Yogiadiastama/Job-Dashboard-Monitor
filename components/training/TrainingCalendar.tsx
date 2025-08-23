
import React, { useState } from 'react';
import { Training } from '../../types';
import { ICONS } from '../../constants';

interface TrainingCalendarProps {
    trainings: Training[];
    onEditTraining: (training: Training) => void;
}

const TrainingCalendar: React.FC<TrainingCalendarProps> = ({ trainings, onEditTraining }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const endDate = new Date(endOfMonth);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const days = [];
    let day = startDate;
    while (day <= endDate) {
        days.push(new Date(day));
        day.setDate(day.getDate() + 1);
    }
    
    const trainingsByDate: { [key: string]: Training[] } = {};
    trainings.forEach(t => {
        const start = new Date(t.tanggalMulai);
        const end = new Date(t.tanggalSelesai);
        for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
            const dateString = d.toISOString().split('T')[0];
            if (!trainingsByDate[dateString]) trainingsByDate[dateString] = [];
            trainingsByDate[dateString].push(t);
        }
    });

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const today = new Date();

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex justify-between items-center mb-4">
                <button onClick={prevMonth} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">&lt;</button>
                <h2 className="text-xl font-bold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                <button onClick={nextMonth} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-sm text-slate-500 dark:text-slate-400 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {days.map((d, i) => {
                    const dateString = d.toISOString().split('T')[0];
                    const isCurrentMonth = d.getMonth() === currentDate.getMonth();
                    const isToday = d.toDateString() === today.toDateString();
                    return (
                        <div key={i} className={`h-32 p-2 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col ${isCurrentMonth ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                           <span className={`self-start text-sm font-semibold ${isToday ? 'bg-primary-600 text-white rounded-full w-7 h-7 flex items-center justify-center' : ''} ${!isCurrentMonth ? 'text-slate-400 dark:text-slate-500' : ''}`}>
                                {d.getDate()}
                           </span>
                           <div className="overflow-y-auto mt-1 space-y-1 text-left">
                                {trainingsByDate[dateString]?.map(t => (
                                    <div 
                                        key={t.id} 
                                        onClick={() => onEditTraining(t)}
                                        className="bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 text-xs p-1 rounded cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-900"
                                    >
                                        {t.nama}
                                    </div>
                                ))}
                           </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TrainingCalendar;
