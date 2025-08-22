import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Training } from '../types';

// This is a hard requirement from the user prompt.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    // This provides a clear error in the console if the API key is missing.
    console.error("Gemini API key is not configured in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const trainingSchema = {
    type: Type.OBJECT,
    properties: {
        nama: { type: Type.STRING, description: 'Nama atau judul training.' },
        tanggalMulai: { type: Type.STRING, description: 'Tanggal mulai dalam format YYYY-MM-DD. Jika hanya ada satu tanggal, gunakan tanggal tersebut.' },
        tanggalSelesai: { type: Type.STRING, description: 'Tanggal selesai dalam format YYYY-MM-DD. Jika tidak ada, gunakan tanggal mulai.' },
        lokasi: { type: Type.STRING, description: 'Lokasi training (Online, nama kota, atau alamat).' },
        pic: { type: Type.STRING, description: 'Person in Charge (PIC) atau kontak detail.' },
        catatan: { type: Type.STRING, description: 'Informasi tambahan, catatan, atau peserta.' },
    },
    required: ['nama', 'tanggalMulai', 'tanggalSelesai', 'lokasi', 'pic'],
};

const parseAndCleanResponse = (response: GenerateContentResponse): Partial<Training> => {
    try {
        const text = response.text.trim();
        // The API might return the JSON wrapped in markdown ```json ... ```, so we need to strip it.
        const jsonStr = text.startsWith('```json') ? text.substring(7, text.length - 3).trim() : text;
        const parsed = JSON.parse(jsonStr);
        
        // Ensure dates are valid or reset them to avoid invalid date errors later.
        if (parsed.tanggalMulai && isNaN(new Date(parsed.tanggalMulai).getTime())) {
            parsed.tanggalMulai = '';
        }
         if (parsed.tanggalSelesai && isNaN(new Date(parsed.tanggalSelesai).getTime())) {
            parsed.tanggalSelesai = '';
        }

        return parsed;

    } catch (e) {
        console.error("Failed to parse Gemini response:", e);
        throw new Error("Gagal memahami format respons dari AI. Coba lagi dengan teks atau gambar yang lebih jelas.");
    }
};

export const parseTrainingFromText = async (text: string): Promise<Partial<Training>> => {
    if (!API_KEY) throw new Error("API Key Gemini belum diatur.");
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Ekstrak detail training dari teks berikut dan format sebagai JSON. Pastikan tanggal dalam format YYYY-MM-DD. Jika hanya ada satu tanggal, gunakan itu untuk tanggalMulai dan tanggalSelesai.\n\n---\n\n${text}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: trainingSchema,
        },
    });

    return parseAndCleanResponse(response);
};

export const parseTrainingFromImage = async (base64Image: string, mimeType: string): Promise<Partial<Training>> => {
    if (!API_KEY) throw new Error("API Key Gemini belum diatur.");
    
    const imagePart = {
        inlineData: {
            data: base64Image,
            mimeType,
        },
    };

    const textPart = {
        text: "Ekstrak detail training dari gambar ini dan format sebagai JSON. Pastikan tanggal dalam format YYYY-MM-DD. Jika hanya ada satu tanggal, gunakan itu untuk tanggalMulai dan tanggalSelesai.",
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, imagePart] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: trainingSchema,
        },
    });

    return parseAndCleanResponse(response);
};
