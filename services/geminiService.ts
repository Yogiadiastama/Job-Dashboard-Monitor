import { GoogleGenAI, Type } from "@google/genai";
import { AIParsedData } from '../types';

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        entryType: {
            type: Type.STRING,
            description: "The type of entry. Must be 'task', 'training', or 'unknown'.",
        },
        taskDetails: {
            type: Type.OBJECT,
            description: "Details for the task. Only present if entryType is 'task'.",
            properties: {
                title: { type: Type.STRING, description: "A concise title for the task." },
                description: { type: Type.STRING, description: "A detailed description of the task." },
                assignedTo: { type: Type.STRING, description: "The full name of the person assigned to the task." },
                dueDate: { type: Type.STRING, description: "The due date in YYYY-MM-DD format." },
                priority: { type: Type.STRING, description: "Priority of the task: 'Low', 'Mid', or 'High'." }
            },
        },
        trainingDetails: {
            type: Type.OBJECT,
            description: "Details for the training. Only present if entryType is 'training'.",
            properties: {
                nama: { type: Type.STRING, description: "The name of the training session." },
                tanggalMulai: { type: Type.STRING, description: "The start date in YYYY-MM-DD format." },
                tanggalSelesai: { type: Type.STRING, description: "The end date in YYYY-MM-DD format. If only one date is mentioned, use the same as tanggalMulai." },
                lokasi: { type: Type.STRING, description: "The location of the training." },
                pic: { type: Type.STRING, description: "The full name of the Person In Charge." },
                catatan: { type: Type.STRING, description: "Any additional notes about the training." }
            },
        }
    }
};

const systemInstruction = `You are an intelligent assistant for a project management app. Your task is to analyze natural language text and extract structured data for creating either a new 'task' or a new 'training' entry.
- Today's date is ${new Date().toLocaleDateString('en-CA')}. Use this to resolve relative dates like 'tomorrow', 'next week', 'akhir bulan', etc.
- For tasks, if a priority isn't mentioned, default to 'Mid'. The priority must be one of 'Low', 'Mid', or 'High'.
- For trainings, if only one date is mentioned, use it for both 'tanggalMulai' and 'tanggalSelesai'.
- If the text is ambiguous or doesn't seem to be a task or training, set entryType to 'unknown'.
- All dates must be in YYYY-MM-DD format.
- Names of people ('assignedTo' for tasks, 'pic' for training) should be extracted as full names if possible.
- The output must be a valid JSON object matching the provided schema.`;


export const analyzeTextForEntry = async (text: string): Promise<AIParsedData> => {
    if (!process.env.API_KEY) {
        console.error("Gemini API key is not configured in environment variables.");
        throw new Error("Konfigurasi Layanan AI Gagal: 'API_KEY' tidak ditemukan. Harap atur variabel lingkungan 'API_KEY' di pengaturan proyek Anda.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: text,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                systemInstruction: systemInstruction,
            },
        });
        
        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);

        // Basic validation
        if (!parsedJson.entryType || !['task', 'training', 'unknown'].includes(parsedJson.entryType)) {
             throw new Error("AI response is missing or has an invalid 'entryType'.");
        }

        return parsedJson as AIParsedData;

    } catch (error) {
        console.error("Error analyzing text with Gemini:", error);
        throw new Error("Gagal menganalisis teks. Pastikan format teks Anda jelas atau coba lagi.");
    }
};
