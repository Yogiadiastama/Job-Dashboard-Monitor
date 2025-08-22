import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Training } from '../types';
import { firebaseConfig } from './firebase'; // Impor konfigurasi Firebase

// Inisialisasi Klien AI secara "lazy" untuk mencegah crash saat aplikasi dimuat.
let ai: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
    // Jika klien sudah diinisialisasi, gunakan kembali.
    if (ai) {
        return ai;
    }

    // Gunakan API key dari konfigurasi Firebase yang sudah ada.
    const apiKey = firebaseConfig.apiKey;
    if (!apiKey || apiKey.startsWith('YOUR_')) {
        // Jika key tidak ada, lempar error yang akan ditangkap oleh UI.
        console.error("Gemini API key is not configured in firebaseConfig.");
        throw new Error("Kunci API untuk layanan AI tidak dikonfigurasi. Hubungi administrator.");
    }
    
    // Buat dan simpan instance klien untuk penggunaan di masa mendatang.
    ai = new GoogleGenAI({ apiKey });
    return ai;
}


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
        // API mungkin mengembalikan JSON dalam format markdown ```json ... ```, jadi kita perlu membersihkannya.
        const jsonStr = text.startsWith('```json') ? text.substring(7, text.length - 3).trim() : text;
        const parsed = JSON.parse(jsonStr);
        
        // Pastikan tanggal valid atau reset untuk menghindari error tanggal yang tidak valid nanti.
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
    const aiClient = getAiClient();
    
    const response = await aiClient.models.generateContent({
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
    const aiClient = getAiClient();
    
    const imagePart = {
        inlineData: {
            data: base64Image,
            mimeType,
        },
    };

    const textPart = {
        text: "Ekstrak detail training dari gambar ini dan format sebagai JSON. Pastikan tanggal dalam format YYYY-MM-DD. Jika hanya ada satu tanggal, gunakan itu untuk tanggalMulai dan tanggalSelesai.",
    };

    const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, imagePart] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: trainingSchema,
        },
    });

    return parseAndCleanResponse(response);
};