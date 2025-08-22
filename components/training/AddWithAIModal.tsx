import React, { useState, useRef, useCallback, useEffect } from 'react';
import { parseTrainingFromText, parseTrainingFromImage } from '../../services/geminiService';
import { Training } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import { ICONS } from '../../constants';

// Helper function to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

interface AddWithAIModalProps {
    isOpen: boolean;
    onClose: () => void;
    onParseComplete: (parsedData: Partial<Training>) => void;
}

const AddWithAIModal: React.FC<AddWithAIModalProps> = ({ isOpen, onClose, onParseComplete }) => {
    const [activeTab, setActiveTab] = useState<'text' | 'image'>('image');
    const [textInput, setTextInput] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const cleanup = useCallback(() => {
        // Stop camera stream
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraOn(false);
        setImageFile(null);
        setImagePreview(null);
        setTextInput('');
        setError(null);
        setLoading(false);
    }, []);

    const handleClose = () => {
        cleanup();
        onClose();
    };

    const processFile = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setIsCameraOn(false); // Turn off camera if a file is selected
            setActiveTab('image'); // Switch to image tab
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
           processFile(file);
        }
    };

    // Effect to handle paste events
    useEffect(() => {
        if (!isOpen) return;

        const handlePaste = (event: ClipboardEvent) => {
            const items = event.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if(file){
                       processFile(file);
                    }
                    event.preventDefault(); // Prevent the default paste action
                    return;
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, [isOpen]);


    const handleProcess = async () => {
        setLoading(true);
        setError(null);
        try {
            let parsedData: Partial<Training>;
            if (activeTab === 'text') {
                if (!textInput.trim()) throw new Error("Teks tidak boleh kosong.");
                parsedData = await parseTrainingFromText(textInput);
            } else {
                if (!imageFile) throw new Error("Silakan pilih, ambil, atau tempel gambar.");
                const base64Image = await fileToBase64(imageFile);
                parsedData = await parseTrainingFromImage(base64Image, imageFile.type);
            }
            onParseComplete(parsedData);
            handleClose();
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "Terjadi kesalahan yang tidak diketahui.";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setIsCameraOn(true);
            setImageFile(null);
            setImagePreview(null);
        } catch (err) {
            setError("Gagal mengakses kamera. Pastikan Anda telah memberikan izin.");
        }
    };
    
    const takeSnapshot = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            canvas.toBlob(blob => {
                if (blob) {
                    const file = new File([blob], `capture-${Date.now()}.png`, { type: 'image/png' });
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                }
            }, 'image/png');
            cleanup(); // Turns off camera stream
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in-up">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b dark:border-gray-700">
                    <h2 className="text-2xl font-bold">Tambah Training dengan AI</h2>
                    <p className="text-sm text-gray-500">Tempel teks atau unggah gambar untuk mengisi detail secara otomatis.</p>
                </div>

                <div className="p-6 flex-grow overflow-y-auto">
                    {/* Tabs */}
                    <div className="flex border-b dark:border-gray-600 mb-4">
                        <button onClick={() => setActiveTab('text')} className={`px-4 py-2 font-semibold ${activeTab === 'text' ? 'border-b-2 border-brand-purple text-brand-purple' : 'text-gray-500'}`}>
                            Tempel Teks
                        </button>
                        <button onClick={() => setActiveTab('image')} className={`px-4 py-2 font-semibold ${activeTab === 'image' ? 'border-b-2 border-brand-purple text-brand-purple' : 'text-gray-500'}`}>
                            Unggah Gambar
                        </button>
                    </div>

                    {/* Content */}
                    {activeTab === 'text' ? (
                        <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="Tempel detail training di sini..."
                            className="w-full h-64 p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-brand-purple"
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="h-full w-full object-contain rounded-lg" />
                                    ) : isCameraOn ? (
                                        <video ref={videoRef} autoPlay className="h-full w-full object-contain rounded-lg"/>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            {ICONS.upload}
                                            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Klik, seret, atau tempel (Ctrl+V) gambar</span></p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, atau WEBP</p>
                                        </div>
                                    )}
                                    <input ref={fileInputRef} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
                                </label>
                            </div>
                            <div className="flex justify-center space-x-4">
                               <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300">Pilih File</button>
                               <button type="button" onClick={startCamera} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300">Buka Kamera</button>
                               {isCameraOn && <button type="button" onClick={takeSnapshot} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Ambil Gambar</button>}
                            </div>
                            <canvas ref={canvasRef} className="hidden"></canvas>
                        </div>
                    )}
                    
                    {error && <p className="mt-4 text-center text-red-500">{error}</p>}
                </div>

                <div className="p-6 border-t dark:border-gray-700 flex justify-end space-x-3">
                    <button type="button" onClick={handleClose} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Batal</button>
                    <button type="button" onClick={handleProcess} disabled={loading} className="px-6 py-2 bg-brand-purple text-white rounded-md hover:bg-opacity-90 disabled:bg-opacity-50 min-w-[150px]">
                        {loading ? <LoadingSpinner text="Memproses..."/> : 'Proses dengan AI'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddWithAIModal;
