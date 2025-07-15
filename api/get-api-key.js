// api/get-api-key.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Automatic secret retrieval following the pattern: st.secrets.get("GEMINI_API_KEY", os.environ.get("GEMINI_API_KEY","fallback"))
    const gemini_api_key = process.env.GEMINI_API_KEY || "AIzaSyDtv0oVGJF10ZYvbXZAWFhpCVeso4UQbOA";
    
    if (!gemini_api_key) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }
    
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
