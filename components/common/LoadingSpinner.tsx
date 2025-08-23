import React from 'react';

const LoadingSpinner: React.FC<{ text?: string }> = ({ text = "Loading..." }) => {
    return (
        <div className="flex flex-col items-center justify-center space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
            <p className="text-slate-500 dark:text-slate-400">{text}</p>
        </div>
    );
};

export default LoadingSpinner;
