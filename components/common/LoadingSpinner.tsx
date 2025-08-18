
import React from 'react';

const LoadingSpinner: React.FC<{ text?: string }> = ({ text = "Memuat..." }) => {
    return (
        <div className="flex flex-col items-center justify-center space-y-2">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-lg text-gray-600 dark:text-gray-300">{text}</p>
        </div>
    );
};

export default LoadingSpinner;
