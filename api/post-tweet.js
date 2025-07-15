// api/post-tweet.js - Debug Version with Better Error Handling
export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('🚀 Twitter API endpoint called');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password, tweetText } = req.body;

  if (!username || !password || !tweetText) {
    return res.status(400).json({ 
      error: 'Missing required fields: username, password, or tweetText',
      received: { 
        username: !!username, 
        password: !!password, 
        tweetText: !!tweetText,
        usernameValue: username,
        tweetTextValue: tweetText?.substring(0, 50)
      }
    });
  }

  console.log('📝 Tweet request received:', { 
    username, 
    tweetLength: tweetText.length,
    tweetPreview: tweetText.substring(0, 100) + '...'
  });

  // First, let's test if we can even import Puppeteer
  let puppeteer;
  try {
    console.log('📦 Attempting to import Puppeteer...');
    puppeteer = await import('puppeteer');
    console.log('✅ Puppeteer imported successfully');
  } catch (error) {
    console.error('❌ Failed to import Puppeteer:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Puppeteer import failed: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }

  let browser = null;
  let page = null;

  try {
    console.log('🚀 Attempting to launch browser...');
    
    // Test browser launch with minimal config first
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--single-process',
        '--no-first-run'
      ]
    });

    console.log('✅ Browser launched successfully');

    page = await browser.newPage();
    console.log('✅ New page created');

    // Test basic navigation
    console.log('🌐 Testing basic navigation...');
    await page.goto('https://www.google.com', { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
    
    const title = await page.title();
    console.log('✅ Successfully navigated to Google, title:', title);

    // Now try Twitter
    console.log('🐦 Attempting to navigate to Twitter...');
    await page.goto('https://x.com', { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });

    const twitterTitle = await page.title();
    console.log('✅ Successfully navigated to Twitter, title:', twitterTitle);

    // For now, return success with debug info
    res.status(200).json({ 
      success: true, 
      message: 'Browser test successful - Twitter automation ready for implementation',
      timestamp: new Date().toISOString(),
      debug: {
        puppeteerImported: true,
        browserLaunched: true,
        pageCreated: true,
        googleNavigation: true,
        twitterNavigation: true,
        googleTitle: title,
        twitterTitle: twitterTitle
      },
      tweetText: tweetText,
      username: username
    });

  } catch (error) {
    console.error('❌ Error during browser operations:', error);
    console.error('Error stack:', error.stack);
    
    // Detailed error analysis
    let errorType = 'Unknown';
    let suggestion = 'Check Vercel logs for more details';
    
    if (error.message.includes('spawn')) {
      errorType = 'Browser Launch Failure';
      suggestion = 'Chrome/Chromium not available in Vercel environment';
    } else if (error.message.includes('timeout')) {
      errorType = 'Timeout Error';
      suggestion = 'Network connectivity or page loading issues';
    } else if (error.message.includes('Protocol error')) {
      errorType = 'Browser Communication Error';
      suggestion = 'Browser crashed or connection lost';
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      errorType: errorType,
      suggestion: suggestion,
      timestamp: new Date().toISOString(),
      stack: error.stack?.split('\n').slice(0, 5) // First 5 lines of stack trace
    });

  } finally {
    // Cleanup
    console.log('🧹 Cleaning up...');
    
    if (page) {
      try {
        await page.close();
        console.log('✅ Page closed');
      } catch (closeError) {
        console.error('❌ Error closing page:', closeError.message);
      }
    }
    
    if (browser) {
      try {
        await browser.close();
        console.log('✅ Browser closed');
      } catch (closeError) {
        console.error('❌ Error closing browser:', closeError.message);
      }
    }
  }
}
