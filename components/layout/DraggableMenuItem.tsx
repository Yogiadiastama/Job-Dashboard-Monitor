import React, { useRef, FC, ReactNode } from 'react';
import { useDrag, useDrop, DropTargetMonitor } from 'react-dnd';
import { ICONS } from '../../constants';

const ItemTypes = {
    MENU_ITEM: 'menu_item',
};

interface DraggableMenuItemProps {
    id: any;
    index: number;
    isActive: boolean;
    onClick: () => void;
    moveMenuItem: (dragIndex: number, hoverIndex: number) => void;
    children: ReactNode;
}

const DraggableMenuItem: FC<DraggableMenuItemProps> = ({ id, index, isActive, onClick, moveMenuItem, children }) => {
    const ref = useRef<HTMLLIElement>(null);

    const [, drop] = useDrop({
        accept: ItemTypes.MENU_ITEM,
        hover(item: { id: any; index: number }, monitor: DropTargetMonitor) {
            if (!ref.current) {
                return;
            }
            const dragIndex = item.index;
            const hoverIndex = index;

            if (dragIndex === hoverIndex) {
                return;
            }

            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
                return;
            }
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
                return;
            }

            moveMenuItem(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag, preview] = useDrag({
        type: ItemTypes.MENU_ITEM,
        item: () => ({ id, index }),
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    // Attach drop and preview connectors to the main list item element
    drop(ref);
    preview(ref);
    
    // The drag connector is for the handle.
    // Create a new ref for the handle and connect the drag source to it.
    const dragHandleRef = useRef<HTMLDivElement>(null);
    drag(dragHandleRef);


    return (
        <li
            ref={ref}
            style={{ opacity: isDragging ? 0.4 : 1 }}
            className={`group relative flex items-center justify-between p-3 rounded-lg transition-colors ${isActive ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-semibold' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
            <a
                href="#"
                onClick={(e) => {
                    e.preventDefault();
                    onClick();
                }}
                className="flex items-center space-x-3 flex-grow"
            >
                {children}
            </a>
            <div ref={dragHandleRef} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 dark:text-gray-500 cursor-grab active:cursor-grabbing">
                {ICONS.dragHandle}
            </div>
        </li>
    );
};

export default DraggableMenuItem;
