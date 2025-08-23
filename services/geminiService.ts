import { AIParsedData } from '../types';

/**
 * Analyzes natural language text by sending it to a secure backend function,
 * which then calls the Gemini API. This prevents exposing the API key on the client-side.
 * @param text The natural language text to analyze.
 * @returns A promise that resolves to the parsed data structure (AIParsedData).
 */
export const analyzeTextForEntry = async (text: string): Promise<AIParsedData> => {
    try {
        // The endpoint for the Netlify serverless function.
        const response = await fetch('/.netlify/functions/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            let errorMsg = `Server error: ${response.status}`;
            try {
                // Try to get a more specific error message from the function's response
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                // Could not parse error JSON, fall back to status text.
                errorMsg = response.statusText;
            }
            throw new Error(errorMsg);
        }

        const parsedJson = await response.json();

        // Basic validation on the client side as well.
        if (!parsedJson.entryType || !['task', 'training', 'unknown'].includes(parsedJson.entryType)) {
             throw new Error("AI response has an invalid format.");
        }

        return parsedJson as AIParsedData;

    } catch (error) {
        console.error("Error calling Gemini service proxy:", error);
        // Provide a user-friendly message that wraps the specific error.
        const message = error instanceof Error ? error.message : "Silakan coba lagi.";
        throw new Error(`Gagal menganalisis teks. ${message}`);
    }
};
