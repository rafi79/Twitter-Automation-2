// api/get-api-key.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get API key from environment variables (secure method)
    const gemini_api_key = process.env.GEMINI_API_KEY || "AIzaSyDtv0oVGJF10ZYvbXZAWFhpCVeso4UQbOA";
    
    res.status(200).json({ 
      apiKey: gemini_api_key,
      success: true 
    });
  } catch (error) {
    console.error('Error retrieving API key:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve API key',
      success: false 
    });
  }
}
