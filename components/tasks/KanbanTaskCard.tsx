
import React, { useRef } from 'react';
import { useDrag } from 'react-dnd';
import { Task, UserData } from '../../types';
import { ICONS } from '../../constants';

const ItemTypes = { TASK: 'task' };

interface KanbanTaskCardProps {
    task: Task;
    user?: UserData;
    onEditTask: (task: Task) => void;
}

const KanbanTaskCard: React.FC<KanbanTaskCardProps> = ({ task, user, onEditTask }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.TASK,
        item: { id: task.id, from: task.status },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));

    drag(ref);

    const priorityClasses = {
        High: 'bg-red-500',
        Mid: 'bg-yellow-500',
        Low: 'bg-green-500',
    };

    const isLate = new Date(task.dueDate) < new Date() && task.status !== 'Completed';

    return (
        <div 
            ref={ref}
            className={`bg-white dark:bg-slate-900 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : 'opacity-100'}`}
        >
            <div className="flex justify-between items-start">
                <p className="font-semibold text-slate-800 dark:text-slate-100 pr-2">{task.title}</p>
                <button onClick={() => onEditTask(task)} className="p-1 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400">
                    {ICONS.edit}
                </button>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 mt-3">
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${isLate ? 'text-red-800 bg-red-100 dark:text-red-200 dark:bg-red-900/50' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span>{new Date(task.dueDate).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}</span>
                </div>
                <div className="flex items-center space-x-2">
                     <span title={task.priority} className={`w-3 h-3 rounded-full ${priorityClasses[task.priority]}`}></span>
                     {user?.photoURL ? (
                        <img src={user.photoURL} alt={user.nama} className="w-6 h-6 rounded-full object-cover" title={user.nama}/>
                    ) : (
                         <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500" title={user?.nama || 'Unassigned'}>
                            {user?.nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KanbanTaskCard;
