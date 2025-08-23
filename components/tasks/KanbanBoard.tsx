
import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Task, UserData, ALL_TASK_STATUSES, Training } from '../../types';
import KanbanColumn from './KanbanColumn';

interface KanbanBoardProps {
    tasks: Task[];
    users: UserData[];
    onEditTask: (task: Task) => void;
    onEditTraining: (training: Partial<Training>) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, users, onEditTask, onEditTraining }) => {
    return (
        <DndProvider backend={HTML5Backend}>
            <div className="flex gap-6 overflow-x-auto p-2">
                {ALL_TASK_STATUSES.map(status => (
                    <KanbanColumn
                        key={status}
                        status={status}
                        tasks={tasks.filter(t => t.status === status)}
                        users={users}
                        onEditTask={onEditTask}
                        onEditTraining={onEditTraining}
                    />
                ))}
            </div>
        </DndProvider>
    );
};

export default KanbanBoard;