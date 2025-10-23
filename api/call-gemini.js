// Vercel Serverless Function: /api/call-gemini.js
// Proxies requests to the Google Generative AI API, using an environment variable for the key.

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Get API key from Vercel environment variables
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY; 
    const { prompt, modelName = "gemini-2.5-flash-preview-09-2025" } = req.body; // Allow model override if needed

    // --- Validation ---
    if (!apiKey) {
        console.error('GOOGLE_GENERATIVE_AI_API_KEY environment variable not set.');
        return res.status(500).json({ error: 'API key is not configured on the server.' });
    }
    
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
    }
    
    // Construct the secure API URL
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    try {
        // Prepare the payload for the Google API
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            // Include tools if needed, assuming the analyzer prompt requires it
            tools: [{ "google_search": {} }], 
            // Removed responseMimeType based on previous fixes
        };

        // Make the call to the Google API
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        // Forward the response status and body from Google API
        const responseBody = await apiResponse.text(); // Read as text first to handle potential errors
        
        if (!apiResponse.ok) {
            console.error('Gemini API Error:', apiResponse.status, responseBody);
            // Try to parse the error body, default if not JSON
            let errorJson = { error: `Gemini API call failed: Status ${apiResponse.status}` };
             try {
                errorJson = JSON.parse(responseBody);
             } catch (e) {
                 // Keep the default error message
             }
            return res.status(apiResponse.status).json(errorJson);
        }

        // If successful, parse the JSON and forward it
        const result = JSON.parse(responseBody); 
        
        // --- Optional: Check for safety blocks ---
        const candidate = result.candidates?.[0];
        if (candidate && candidate.finishReason === 'SAFETY') {
             console.warn('Gemini response blocked for safety reasons.');
             return res.status(200).json({ text: "<p>The request was blocked for safety reasons. Please try a different URL or query.</p>"}); // Return a structured text error
        }
        if (result.promptFeedback && result.promptFeedback.blockReason) {
             console.warn(`Gemini prompt blocked: ${result.promptFeedback.blockReason}`);
             return res.status(200).json({ text: `<p>The request was blocked: ${result.promptFeedback.blockReason}. Please try a different URL.</p>`}); // Return structured text error
        }
        // --- End Safety Checks ---

        res.status(200).json(result); // Forward the successful Google API response

    } catch (error) {
        console.error('Serverless function execution error:', error);
        res.status(500).json({ error: 'An internal server error occurred while contacting the Gemini API.' });
    }
}
