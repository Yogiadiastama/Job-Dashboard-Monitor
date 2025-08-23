// Define types inline to avoid a dependency on @netlify/functions
interface HandlerEvent {
  httpMethod: string;
  body: string | null;
}
interface HandlerContext {}
interface HandlerResponse {
  statusCode: number;
  body: string;
  headers?: { [key: string]: string };
}
type Handler = (event: HandlerEvent, context: HandlerContext) => Promise<HandlerResponse>;

// Schema definition for the REST API (enums replaced with strings)
const responseSchema = {
    type: 'OBJECT',
    properties: {
        entryType: {
            type: 'STRING',
            description: "The type of entry. Must be 'task', 'training', or 'unknown'.",
        },
        taskDetails: {
            type: 'OBJECT',
            description: "Details for the task. Only present if entryType is 'task'.",
            properties: {
                title: { type: 'STRING', description: "A concise title for the task." },
                description: { type: 'STRING', description: "A detailed description of the task." },
                assignedTo: { type: 'STRING', description: "The full name of the person assigned to the task." },
                dueDate: { type: 'STRING', description: "The due date in YYYY-MM-DD format." },
                priority: { type: 'STRING', description: "Priority of the task: 'Low', 'Mid', or 'High'." }
            },
        },
        trainingDetails: {
            type: 'OBJECT',
            description: "Details for the training. Only present if entryType is 'training'.",
            properties: {
                nama: { type: 'STRING', description: "The name of the training session." },
                tanggalMulai: { type: 'STRING', description: "The start date in YYYY-MM-DD format." },
                tanggalSelesai: { type: 'STRING', description: "The end date in YYYY-MM-DD format. If only one date is mentioned, use the same as tanggalMulai." },
                lokasi: { type: 'STRING', description: "The location of the training." },
                pic: { type: 'STRING', description: "The full name of the Person In Charge." }
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

const handler: Handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            body: JSON.stringify({ error: 'Method Not Allowed' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("API_KEY environment variable not set in Netlify.");
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: "Konfigurasi Layanan AI Gagal: 'API_KEY' tidak ditemukan. Harap atur variabel lingkungan 'API_KEY' di pengaturan proyek Anda." }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    try {
        const { text } = JSON.parse(event.body || '{}');
        if (!text) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ error: 'Input teks tidak boleh kosong.' }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const requestBody = {
          contents: [{ parts: [{ text }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
          }
        };

        const geminiResponse = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        const geminiData = await geminiResponse.json();

        if (!geminiResponse.ok) {
            console.error('Gemini API Error:', geminiData);
            const errorMessage = geminiData?.error?.message || 'Gagal mendapat respons dari layanan AI.';
            return { 
                statusCode: geminiResponse.status, 
                body: JSON.stringify({ error: errorMessage }),
                headers: { 'Content-Type': 'application/json' },
            };
        }
        
        // Extract the text part which contains the JSON string
        const jsonString = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!jsonString) {
          throw new Error("Invalid response structure from Gemini API. No text part found.");
        }

        // The response from Gemini is a JSON string. We return it directly.
        // The client will parse this string.
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: jsonString,
        };

    } catch (error) {
        console.error('Proxy function error:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: `Terjadi kesalahan internal pada server: ${message}` }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};

export { handler };
