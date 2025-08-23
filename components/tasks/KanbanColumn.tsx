
import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import { doc, updateDoc } from '@firebase/firestore';
import { db } from '../../services/firebase';
import { Task, UserData, TaskStatus, Training } from '../../types';
import KanbanTaskCard from './KanbanTaskCard';

const ItemTypes = { TASK: 'task' };

interface KanbanColumnProps {
    status: TaskStatus;
    tasks: Task[];
    users: UserData[];
    onEditTask: (task: Task) => void;
    onEditTraining: (training: Partial<Training>) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, tasks, users, onEditTask, onEditTraining }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [{ isOver }, drop] = useDrop(() => ({
        accept: ItemTypes.TASK,
        drop: async (item: { id: string, from: TaskStatus }) => {
            if (item.from !== status) {
                const taskRef = doc(db, 'tasks', item.id);
                await updateDoc(taskRef, { 
                    status: status,
                    updatedAt: new Date().toISOString()
                });
            }
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    }));

    drop(ref);

    const statusColors = {
        'Pending': 'border-slate-500',
        'On Progress': 'border-blue-500',
        'Completed': 'border-green-500',
    };

    return (
        <div 
            ref={ref} 
            className={`w-80 flex-shrink-0 bg-slate-100 dark:bg-slate-800 rounded-xl p-3 transition-colors ${isOver ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
        >
            <div className={`flex items-center justify-between px-2 pb-2 mb-3 border-b-2 ${statusColors[status]}`}>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{status}</h3>
                <span className="text-sm font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full">{tasks.length}</span>
            </div>
            <div className="space-y-3 overflow-y-auto h-[calc(100vh-20rem)] pr-1">
                {tasks.map(task => (
                    <KanbanTaskCard 
                        key={task.id} 
                        task={task} 
                        user={users.find(u => u.uid === task.assignedTo)}
                        onEditTask={onEditTask}
                        onEditTraining={onEditTraining}
                    />
                ))}
            </div>
        </div>
    );
};

export default KanbanColumn;