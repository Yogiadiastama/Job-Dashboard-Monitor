import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { collection, getDocs } from '@firebase/firestore';
import { db } from '../../services/firebase';
import { eventBus } from '../../services/eventBus';
import { UserData } from '../../types';
import { ICONS } from '../../constants';
import LoadingSpinner from './LoadingSpinner';

const VoiceCommandButton: React.FC = () => {
    const [isListening, setIsListening] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [statusMessage, setStatusMessage] = useState('Sebutkan perintah Anda...');
    const [isProcessing, setIsProcessing] = useState(false);
    const recognitionRef = useRef<any>(null);

    // Check for browser support
    const isSpeechRecognitionSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

    useEffect(() => {
        if (!isSpeechRecognitionSupported) return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'id-ID';
        recognition.interimResults = true;

        recognition.onstart = () => {
            setIsListening(true);
            setStatusMessage('Mendengarkan...');
            setTranscript('');
        };

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    const finalTranscript = event.results[i][0].transcript;
                    setTranscript(prev => prev + finalTranscript);
                    processCommand(finalTranscript);
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setTranscript(prev => prev + interimTranscript);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setStatusMessage(`Error: ${event.error}. Coba lagi.`);
            setIsListening(false);
            setIsProcessing(false);
        };

        recognition.onend = () => {
            setIsListening(false);
            if (!isProcessing) { // Only close if not processing
                 setTimeout(() => setIsModalOpen(false), 2000);
            }
        };

        recognitionRef.current = recognition;
    }, [isSpeechRecognitionSupported, isProcessing]);
    
    const startListening = () => {
        if (!isSpeechRecognitionSupported) {
            alert("Maaf, browser Anda tidak mendukung pengenalan suara.");
            return;
        }
        setIsModalOpen(true);
        setIsProcessing(false);
        setTranscript('');
        setTimeout(() => recognitionRef.current.start(), 100);
    };

    const processCommand = async (command: string) => {
        if (!command.trim()) return;
        setIsProcessing(true);
        setStatusMessage('Memproses perintah Anda...');

        try {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const users = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData));
            const userListForPrompt = users.map(u => ({ uid: u.uid, nama: u.nama }));

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

            if (command.toLowerCase().includes('pekerjaan')) {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Parse this voice command to create a new task: "${command}". Users available: ${JSON.stringify(userListForPrompt)}. Current date is ${new Date().toISOString().split('T')[0]}. Respond with JSON.`,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                assignedTo: { type: Type.STRING, description: "The UID of the user" },
                                dueDate: { type: Type.STRING, description: "Format: YYYY-MM-DD" },
                            },
                        },
                    },
                });
                const taskData = JSON.parse(response.text);
                eventBus.dispatch('openTaskModal', { initialData: taskData });
                setStatusMessage('Modal pekerjaan dibuka!');
            } else if (command.toLowerCase().includes('training')) {
                 const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Parse this voice command to create a new training: "${command}". Current date is ${new Date().toISOString().split('T')[0]}. Respond with JSON.`,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                nama: { type: Type.STRING },
                                tanggalMulai: { type: Type.STRING, description: "Format: YYYY-MM-DD" },
                                tanggalSelesai: { type: Type.STRING, description: "Format: YYYY-MM-DD. Use start date if not specified." },
                                lokasi: { type: Type.STRING },
                                pic: { type: Type.STRING },
                            },
                        },
                    },
                });
                const trainingData = JSON.parse(response.text);
                eventBus.dispatch('openTrainingModal', { initialData: trainingData });
                setStatusMessage('Modal training dibuka!');
            } else {
                setStatusMessage('Perintah tidak dikenali. Coba "tambah pekerjaan" atau "tambah training".');
            }
             setTimeout(() => setIsModalOpen(false), 2000);
        } catch (error) {
            console.error("Error processing command with AI: ", error);
            setStatusMessage('Gagal memproses perintah. Silakan coba lagi.');
        } finally {
            setIsProcessing(false);
        }
    };
    
    return (
        <>
            <button
                onClick={startListening}
                className="fixed bottom-6 right-6 bg-brand-purple text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:bg-opacity-90 transform hover:scale-110 transition-all duration-300 z-40"
                title="Gunakan Perintah Suara"
                disabled={!isSpeechRecognitionSupported}
            >
                {ICONS.microphone}
            </button>

            {isModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl p-8 text-center animate-fade-in-up">
                        <h2 className="text-2xl font-bold mb-4">{statusMessage}</h2>
                        
                        {(isListening || isProcessing) && !transcript && (
                             <div className="flex justify-center items-center my-6">
                                <div className="relative h-24 w-24">
                                    <div className="absolute inset-0 rounded-full bg-blue-500 opacity-75 animate-ping"></div>
                                    <div className="relative flex items-center justify-center h-24 w-24 bg-blue-500 rounded-full text-white">
                                        {ICONS.microphone}
                                    </div>
                                </div>
                            </div>
                        )}

                        {isProcessing && transcript && <LoadingSpinner text="Menganalisis..." />}

                        <p className="text-lg min-h-[6rem] p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">{transcript || '...'}</p>
                        
                        <button 
                            onClick={() => { recognitionRef.current.stop(); setIsModalOpen(false); }} 
                            className="mt-6 px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                        >
                            Batal
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default VoiceCommandButton;