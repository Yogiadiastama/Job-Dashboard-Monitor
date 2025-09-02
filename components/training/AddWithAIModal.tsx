import React, { useState } from 'react';
import { AIInput } from '../../types';

interface AIInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProcess: (data: AIInput) => Promise<void>;
    title: string;
    prompt: string;
}

const AIInputModal: React.FC<AIInputModalProps> = ({ isOpen, onClose, onProcess, title, prompt }) => {
    const [inputText, setInputText] = useState('');
    const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const processImageFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            setImagePreview(dataUrl);
            const base64 = dataUrl.split(',')[1];
            const mimeType = dataUrl.split(',')[0].split(':')[1].split(';')[0];
            setImageData({ base64, mimeType });
            setInputText(''); // Clear text input when an image is added
            setError(''); // Clear any previous errors
        };
        reader.onerror = () => {
            setError("Gagal membaca file gambar.");
        };
        reader.readAsDataURL(file);
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
        event.preventDefault(); // Prevent default paste behavior always
        let isImage = false;
        const items = event.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                const file = items[i].getAsFile();
                if (file) {
                    processImageFile(file);
                    isImage = true;
                    break;
                }
            }
        }

        if (!isImage) {
            const text = event.clipboardData.getData('text/plain');
            setInputText(text);
            setImageData(null);
            setImagePreview(null);
            setError('');
        }
    };

    const handleRemoveImage = () => {
        setImageData(null);
        setImagePreview(null);
    };

    const handleProcessClick = async () => {
        if (!inputText.trim() && !imageData) {
            setError("Silakan masukkan teks atau tempel screenshot untuk dianalisis.");
            return;
        }
        setLoading(true);
        setError('');
        try {
            if (imageData) {
                await onProcess({ image: imageData });
            } else {
                await onProcess({ text: inputText });
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Terjadi kesalahan yang tidak diketahui.");
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
                    <div
                        onPaste={handlePaste}
                        className="w-full h-48 p-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md bg-slate-50 dark:bg-gray-700/50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 flex items-center justify-center text-center text-gray-500 dark:text-gray-400 transition-colors"
                        tabIndex={0} // Make it focusable to receive paste events
                    >
                        {imagePreview ? (
                            <div className="relative w-full h-full p-1">
                                <img src={imagePreview} alt="Pasted screenshot" className="max-w-full max-h-full object-contain mx-auto" />
                                <button
                                    onClick={handleRemoveImage}
                                    className="absolute top-0 right-0 m-1 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-lg font-bold leading-none hover:bg-red-700"
                                    aria-label="Remove image"
                                >
                                    &times;
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center w-full h-full p-2">
                                {inputText ? 
                                    <p className="whitespace-pre-wrap text-left w-full text-gray-800 dark:text-gray-200 overflow-y-auto max-h-full">{inputText}</p>
                                    :
                                    <span className="text-gray-500 dark:text-gray-400">Tempel teks atau screenshot di sini...</span>
                                }
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-6 border-t dark:border-gray-700 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleProcessClick}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Memproses...' : 'Proses'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIInputModal;