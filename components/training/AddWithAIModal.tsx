import React, { useState } from 'react';

interface AIInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProcess: (text: string) => Promise<void>;
    title: string;
    prompt: string;
}

const AIInputModal: React.FC<AIInputModalProps> = ({ isOpen, onClose, onProcess, title, prompt }) => {
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleProcessClick = async () => {
        if (!inputText.trim()) {
            alert("Silakan masukkan teks untuk dianalisis.");
            return;
        }
        setLoading(true);
        setError(''); // Clear previous error
        try {
            await onProcess(inputText);
            // On success, the parent component is expected to close the modal.
        } catch (e) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError("Terjadi kesalahan yang tidak diketahui.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in-up">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-6 border-b dark:border-gray-700">
                    <h2 className="text-2xl font-bold">{title}</h2>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">{prompt}</p>
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
                            {error}
                        </div>
                    )}
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="w-full h-40 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Contoh: Tugas baru untuk Budi, siapkan laporan penjualan Juli, deadline besok. Prioritas tinggi."
                    />
                </div>
                <div className="p-6 border-t dark:border-gray-700 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleProcessClick}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-opacity-50"
                    >
                        {loading ? 'Memproses...' : 'Proses Teks'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIInputModal;