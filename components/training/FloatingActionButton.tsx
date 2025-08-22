import React, { useState } from 'react';
import { ICONS } from '../../constants';

interface Action {
    label: string;
    icon: JSX.Element;
    onClick: () => void;
}

const FloatingActionButton: React.FC<{ actions: Action[] }> = ({ actions }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-10 right-10 z-40">
            <div className={`flex flex-col items-center space-y-3 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
                {actions.map((action, index) => (
                    <div key={index} className="flex items-center space-x-3 group">
                         <span className="bg-white dark:bg-gray-700 text-sm font-semibold px-3 py-1 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {action.label}
                        </span>
                        <button
                            onClick={() => {
                                action.onClick();
                                setIsOpen(false);
                            }}
                            className="flex items-center justify-center w-12 h-12 bg-white dark:bg-gray-700 text-brand-purple rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-lg"
                            title={action.label}
                        >
                            {action.icon}
                        </button>
                    </div>
                ))}
            </div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-center w-16 h-16 bg-brand-purple text-white rounded-full hover:bg-opacity-90 transition-transform transform hover:scale-110 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 mt-4 ${isOpen ? 'rotate-45' : ''}`}
                title="Tambah Training"
            >
                {ICONS.addLarge}
            </button>
        </div>
    );
};

export default FloatingActionButton;
