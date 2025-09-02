import { AIParsedData, AIInput } from '../types';

/**
 * Analyzes natural language text or an image by sending it to a secure backend function,
 * which then calls the Gemini API. This prevents exposing the API key on the client-side.
 * @param input An object containing either text or image data to analyze.
 * @returns A promise that resolves to the parsed data structure (AIParsedData).
 */
export const analyzeInputForEntry = async (input: AIInput): Promise<AIParsedData> => {
    try {
        // The endpoint for the Netlify serverless function.
        const response = await fetch('/.netlify/functions/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ input, requestType: 'parsing' }),
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
        throw new Error(`Gagal menganalisis input. ${message}`);
    }
};

/**
 * Generates a summary by sending a detailed prompt to a secure backend function.
 * @param prompt The detailed prompt for the AI.
 * @returns A promise that resolves to the generated summary text (string).
 */
export const generateAISummary = async (prompt: string): Promise<string> => {
    try {
        const response = await fetch('/.netlify/functions/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt, requestType: 'summary' }),
        });

        if (!response.ok) {
            let errorMsg = `Server error: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                errorMsg = response.statusText;
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        if (!data.summary || typeof data.summary !== 'string') {
            throw new Error("AI response has an invalid format for summary.");
        }

        return data.summary;

    } catch (error) {
        console.error("Error calling Gemini summary service proxy:", error);
        const message = error instanceof Error ? error.message : "Silakan coba lagi.";
        throw new Error(`Gagal menghasilkan ringkasan. ${message}`);
    }
};