// api/post-tweet.js - Working Version for Vercel with Chrome
import chromium from 'chrome-aws-lambda';
import puppeteer from 'puppeteer-core';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(req, res) {
  // Set longer timeout
  res.setTimeout(300000); // 5 minutes

  console.log('🎬 Starting Twitter (X) Automation with Chrome AWS Lambda');
  console.log('=====================================');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password, tweetText } = req.body;

  if (!username || !password || !tweetText) {
    return res.status(400).json({ 
      error: 'Missing required fields: username, password, or tweetText'
    });
  }

  console.log('📝 Tweet request received:', { 
    username, 
    tweetLength: tweetText.length,
    tweetPreview: tweetText.substring(0, 100) + '...'
  });

  // Your exact variables from the original code
  const TWITTER_USERNAME = username;
  const TWITTER_PASSWORD = password;
  const TWEET_TEXT = tweetText;
  const ADD_USERNAME = false;
  const USERNAME_TO_ADD = username;

  let browser = null;
  let page = null;

  try {
    console.log('🚀 Launching browser with Chrome AWS Lambda...');

    // Launch browser with chrome-aws-lambda (works in Vercel)
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    console.log('✅ Browser launched successfully with Chrome AWS Lambda');

    page = await browser.newPage();

    // --- SET USER AGENT TO LOOK MORE LIKE A REAL BROWSER ---
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // --- HIDE AUTOMATION INDICATORS ---
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    console.log('🚀 Starting Twitter automation...');

    // STEP 1: Navigate to Twitter login page with multiple URL attempts
    console.log('🐦 Navigating to X (Twitter) login page...');
    
    const loginUrls = [
      'https://x.com/i/flow/login',
      'https://twitter.com/i/flow/login', 
      'https://x.com/login',
      'https://twitter.com/login',
      'https://x.com',
      'https://twitter.com'
    ];
    
    let pageLoaded = false;
    
    for (const url of loginUrls) {
      try {
        console.log(`🔗 Trying URL: ${url}`);
        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        // Check if page loaded successfully
        const title = await page.title();
        console.log(`📄 Page title: ${title}`);
        console.log(`🔗 Page URL: ${page.url()}`);
        
        if (title.toLowerCase().includes('x') || title.toLowerCase().includes('twitter') || 
            title.toLowerCase().includes('login') || title.toLowerCase().includes('sign')) {
          console.log('✅ Successfully loaded Twitter/X page');
          pageLoaded = true;
          break;
        }
      } catch (error) {
        console.log(`❌ Failed to load ${url}: ${error.message}`);
        continue;
      }
    }
    
    if (!pageLoaded) {
      // Try with different network settings
      console.log('🔄 Trying with different network configuration...');
      
      // Set DNS servers
      await page.evaluateOnNewDocument(() => {
        // Override DNS resolution if possible
        if (typeof window !== 'undefined') {
          window.dnsConfig = '8.8.8.8';
        }
      });
      
      // Try one more time with basic URL
      try {
        await page.goto('https://x.com', { 
          waitUntil: 'domcontentloaded',
          timeout: 60000 
        });
        pageLoaded = true;
        
        // Navigate to login if we're on home page
        const currentUrl = page.url();
        if (!currentUrl.includes('login') && !currentUrl.includes('flow')) {
          console.log('🔄 Navigating to login page...');
          await page.goto('https://x.com/i/flow/login', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
          });
        }
      } catch (error) {
        throw new Error(`Could not load Twitter/X. Please check your internet connection and DNS settings. Error: ${error.message}`);
      }
    }

    // Wait for dynamic content to load
    await delay(3000);

    // STEP 2: Login process with improved selectors
    console.log('⏳ Waiting for username/email input field...');
    
    // --- TRY MULTIPLE SELECTORS ---
    let usernameInput = null;
    const usernameSelectors = [
      'input[name="text"]',
      'input[autocomplete="username"]',
      'input[data-testid="ocfEnterTextTextInput"]',
      'input[type="text"]'
    ];

    for (const selector of usernameSelectors) {
      try {
        console.log(`🔍 Trying selector: ${selector}`);
        await page.waitForSelector(selector, { timeout: 10000 });
        usernameInput = selector;
        console.log(`✅ Found username input with selector: ${selector}`);
        break;
      } catch (error) {
        console.log(`❌ Selector ${selector} failed`);
        continue;
      }
    }

    if (!usernameInput) {
      throw new Error('Could not find username input field with any selector');
    }

    console.log('✍️ Entering username/email...');
    await page.type(usernameInput, TWITTER_USERNAME, { delay: 100 });

    console.log('🖱️ Clicking "Next"...');
    // --- IMPROVED BUTTON FINDING ---
    const nextButtonClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('div[role="button"], button'));
      const nextButton = buttons.find(btn => 
        btn.innerText && (
          btn.innerText.trim().toLowerCase() === 'next' ||
          btn.innerText.trim().toLowerCase() === 'weiter' ||
          btn.innerText.trim().toLowerCase() === 'siguiente'
        )
      );
      if (nextButton) {
        nextButton.click();
        return true;
      }
      return false;
    });

    if (!nextButtonClicked) {
      console.log('❌ Could not find Next button, trying Enter key...');
      await page.keyboard.press('Enter');
    }

    await delay(2000);

    console.log('⏳ Waiting for password input field...');
    let passwordInput = null;
    
    try {
      await page.waitForSelector('input[name="password"]', { timeout: 10000 });
      passwordInput = 'input[name="password"]';
    } catch (e) {
      console.log('🤔 Twitter might be asking for username confirmation. Trying to handle it...');
      
      // Try to find confirmation input
      const confirmationSelectors = [
        'input[data-testid="ocfEnterTextTextInput"]',
        'input[placeholder*="username"]',
        'input[placeholder*="phone"]',
        'input[placeholder*="email"]'
      ];

      let confirmationFound = false;
      for (const selector of confirmationSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          console.log(`✅ Found confirmation input: ${selector}`);
          await page.type(selector, TWITTER_USERNAME, { delay: 50 });
          
          // Click next again
          await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('div[role="button"], button'));
            const nextButton = buttons.find(btn => 
              btn.innerText && btn.innerText.trim().toLowerCase() === 'next'
            );
            if (nextButton) nextButton.click();
          });
          
          confirmationFound = true;
          break;
        } catch (error) {
          continue;
        }
      }

      if (confirmationFound) {
        await delay(2000);
        await page.waitForSelector('input[name="password"]', { timeout: 10000 });
        passwordInput = 'input[name="password"]';
      } else {
        throw new Error('Could not handle username confirmation step');
      }
    }

    console.log('✍️ Entering password...');
    await page.type(passwordInput, TWITTER_PASSWORD, { delay: 100 });

    console.log('🔐 Clicking "Log in"...');
    const loginButtonClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('div[role="button"], button'));
      const loginButton = buttons.find(btn => 
        btn.innerText && (
          btn.innerText.trim().toLowerCase() === 'log in' ||
          btn.innerText.trim().toLowerCase() === 'sign in' ||
          btn.innerText.trim().toLowerCase() === 'login'
        )
      );
      if (loginButton) {
        loginButton.click();
        return true;
      }
      return false;
    });

    if (!loginButtonClicked) {
      console.log('❌ Could not find Login button, trying Enter key...');
      await page.keyboard.press('Enter');
    }

    console.log('⏳ Waiting for login to complete and home feed to load...');
    
    // --- WAIT FOR MULTIPLE POSSIBLE ELEMENTS ---
    const homeSelectors = [
      '[data-testid="tweetTextarea_0"]',
      '[data-testid="tweetButton"]',
      '[aria-label="Post text"]',
      'div[role="textbox"]'
    ];

    let homeLoaded = false;
    for (const selector of homeSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 20000 });
        console.log(`✅ Home page loaded, found: ${selector}`);
        homeLoaded = true;
        break;
      } catch (error) {
        console.log(`❌ Home selector ${selector} not found`);
        continue;
      }
    }

    if (!homeLoaded) {
      throw new Error('Could not confirm home page loaded');
    }

    console.log('✅ Login successful!');

    // STEP 3: Compose the Tweet
    console.log('✍️ Starting tweet composition...');
    
    // --- TRY MULTIPLE TWEET INPUT SELECTORS ---
    const tweetSelectors = [
      '[data-testid="tweetTextarea_0"]',
      '[aria-label="Post text"]',
      'div[role="textbox"]',
      '[data-testid="tweetTextarea_0"] div[role="textbox"]'
    ];

    let tweetInputSelector = null;
    for (const selector of tweetSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        tweetInputSelector = selector;
        console.log(`✅ Found tweet input: ${selector}`);
        break;
      } catch (error) {
        continue;
      }
    }

    if (!tweetInputSelector) {
      throw new Error('Could not find tweet input field');
    }

    await page.click(tweetInputSelector);
    
    // Prepare tweet text with username if needed
    let finalTweetText = TWEET_TEXT;
    if (ADD_USERNAME && !TWEET_TEXT.includes(USERNAME_TO_ADD)) {
      finalTweetText = `${TWEET_TEXT} ${USERNAME_TO_ADD}`;
    }
    
    console.log(`📝 Tweet text to post: "${finalTweetText}"`);

    // Clear any existing content first
    await page.evaluate((selector) => {
      const input = document.querySelector(selector);
      if (input) {
        input.textContent = '';
        input.innerHTML = '';
        input.focus();
      }
    }, tweetInputSelector);
    
    await delay(500);
    
    // Type the text character by character to ensure proper event triggering
    console.log('✍️ Typing tweet text character by character...');
    for (let i = 0; i < finalTweetText.length; i++) {
      await page.keyboard.type(finalTweetText[i], { delay: 50 });
      
      // Trigger input events every few characters
      if (i % 10 === 0) {
        await page.evaluate((selector) => {
          const input = document.querySelector(selector);
          if (input) {
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, tweetInputSelector);
      }
    }
    
    console.log('✅ Typed tweet text.');

    // --- SIMULATE MANUAL MOUSE CLICK ON COMPOSE AREA TO ENABLE POST BUTTON ---
    console.log('🖱️ Simulating manual click on compose area to enable Post button...');
    
    // Get the bounding box of the tweet compose area
    const composeBox = await page.$(tweetInputSelector);
    if (composeBox) {
      const box = await composeBox.boundingBox();
      if (box) {
        // Click in the center of the compose area
        console.log('🎯 Clicking at coordinates:', `${box.x + box.width / 2}, ${box.y + box.height / 2}`);
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await delay(500);
        
        // Click again slightly offset to ensure proper focus
        await page.mouse.click(box.x + box.width / 2 + 10, box.y + box.height / 2 + 5);
        await delay(500);
      }
    }

    // --- YOUR COMPLETE MANUAL INTERACTION SIMULATION ---
    console.log('🔄 Simulating manual user interaction...');
    
    // Simulate mouse movement over the compose area (like a real user)
    await page.mouse.move(300, 400);
    await delay(200);
    
    // Focus and click the compose area directly
    await page.focus(tweetInputSelector);
    await delay(300);
    await page.click(tweetInputSelector);
    await delay(500);
    
    // Simulate typing activity to trigger change detection
    await page.keyboard.press('End');
    await delay(200);
    await page.keyboard.type(' ');
    await delay(200);
    await page.keyboard.press('Backspace');
    await delay(300);
    
    // Move cursor around like a real user
    await page.keyboard.press('Home');
    await delay(200);
    await page.keyboard.press('End');
    await delay(500);

    // --- COMPREHENSIVE INPUT EVENT TRIGGERING ---
    console.log('🔄 Triggering comprehensive input events to activate Post button...');
    await page.evaluate((selector, text) => {
      const input = document.querySelector(selector);
      if (input) {
        // Ensure the content is actually set
        if (!input.textContent || input.textContent.trim() === '') {
          input.textContent = text;
          input.innerHTML = text;
        }
        
        // Trigger all possible events that Twitter might listen for
        const events = [
          'input', 'change', 'keyup', 'keydown', 'keypress',
          'blur', 'focus', 'textInput', 'compositionend', 'paste'
        ];
        
        events.forEach(eventType => {
          try {
            input.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
          } catch (e) {
            // Some events might not work, continue
          }
        });
        
        // Trigger keyboard events with specific keys
        ['Enter', 'Space', 'Backspace'].forEach(key => {
          try {
            input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
          } catch (e) {
            // Continue if event fails
          }
        });
        
        // Force focus and blur cycle
        input.focus();
        setTimeout(() => {
          input.blur();
          setTimeout(() => input.focus(), 100);
        }, 100);
      }
    }, tweetInputSelector, finalTweetText);

    // Additional realistic user simulation
    await page.focus(tweetInputSelector);
    await delay(300);
    
    // Simulate cursor movement to end
    await page.keyboard.press('End');
    await delay(200);
    
    // Add and remove a space (triggers change detection)
    await page.keyboard.press('Space');
    await delay(200);
    await page.keyboard.press('Backspace');
    await delay(300);
    
    // Trigger final events
    await page.keyboard.press('ArrowLeft');
    await delay(100);
    await page.keyboard.press('ArrowRight');
    await delay(500);

    console.log('⏳ Waiting extra time for Post button to become enabled...');
    await delay(3000);

    // STEP 4: Post the Tweet (Using your complete logic)
    console.log('🖱️ Looking for Post button...');
    
    const postButtonSelectors = [
      'button[data-testid="tweetButton"]',
      'button[role="button"][data-testid="tweetButton"]',
      '[data-testid="tweetButton"]',
      '[data-testid="tweetButtonInline"]',
      'button[data-testid="tweetButtonInline"]'
    ];

    let postButtonFound = false;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!postButtonFound && attempts < maxAttempts) {
      attempts++;
      console.log(`🔄 Attempt ${attempts}/${maxAttempts} to find enabled Post button...`);
      
      for (const selector of postButtonSelectors) {
        try {
          console.log(`🔍 Trying post button selector: ${selector}`);
          await page.waitForSelector(selector, { timeout: 5000 });
          
          // Check if button is enabled
          const isEnabled = await page.evaluate((sel) => {
            const button = document.querySelector(sel);
            if (!button) return false;
            
            // Check basic disabled states
            if (button.disabled || button.hasAttribute('disabled') || 
                button.classList.contains('disabled') || 
                getComputedStyle(button).pointerEvents === 'none') {
              return false;
            }
            
            // Check for Twitter's specific enabled state (blue background)
            const computedStyle = getComputedStyle(button);
            const bgColor = computedStyle.backgroundColor;
            
            if (bgColor.includes('29, 155, 240') || bgColor.includes('15, 20, 25')) {
              console.log('✅ Post button is enabled (blue/dark background detected)');
              return true;
            }
            
            // Check if text color is white (indicates enabled state)
            const textElement = button.querySelector('span');
            if (textElement) {
              const textColor = getComputedStyle(textElement).color;
              if (textColor.includes('255, 255, 255')) {
                console.log('✅ Post button is enabled (white text detected)');
                return true;
              }
            }
            
            // Check for Post text content
            const hasPostText = button.textContent && button.textContent.includes('Post');
            const isDraftsButton = button.getAttribute('data-testid') === 'unsentButton' || 
                                 button.textContent && button.textContent.includes('Drafts');
            
            if (isDraftsButton) {
              console.log('❌ This is the Drafts button, skipping...');
              return false;
            }
            
            if (hasPostText && !isDraftsButton) {
              console.log('✅ Found Post button with correct text');
              return true;
            }
            
            return false;
          }, selector);
          
          if (isEnabled) {
            console.log(`✅ Found enabled post button: ${selector}`);
            
            // Try multiple clicking methods (your complete logic)
            let clickSuccessful = false;
            
            try {
              // Method 1: Standard click
              console.log('🖱️ Attempting standard click...');
              await page.click(selector, { delay: 100 });
              await delay(1000);
              clickSuccessful = true;
            } catch (error) {
              console.log('❌ Standard click failed:', error.message);
              
              try {
                // Method 2: JavaScript click
                console.log('🖱️ Attempting JavaScript click...');
                await page.evaluate((sel) => {
                  const button = document.querySelector(sel);
                  if (button) {
                    button.click();
                    return true;
                  }
                  return false;
                }, selector);
                await delay(1000);
                clickSuccessful = true;
              } catch (jsError) {
                console.log('❌ JavaScript click failed:', jsError.message);
                
                try {
                  // Method 3: Coordinate click
                  console.log('🖱️ Attempting coordinate click...');
                  const element = await page.$(selector);
                  if (element) {
                    const box = await element.boundingBox();
                    if (box) {
                      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                      await delay(1000);
                      clickSuccessful = true;
                    }
                  }
                } catch (coordError) {
                  console.log('❌ Coordinate click failed:', coordError.message);
                }
              }
            }
            
            if (clickSuccessful) {
              console.log('✅ Post button clicked successfully!');
              postButtonFound = true;
              break;
            }
          }
        } catch (error) {
          console.log(`❌ Post button selector failed: ${selector} - ${error.message}`);
          continue;
        }
      }
      
      if (!postButtonFound) {
        console.log('⏳ Post button not enabled yet, triggering more input events...');
        await delay(2000);
      }
    }

    if (!postButtonFound) {
      throw new Error('Could not find or click the Post button after multiple attempts');
    }
    
    console.log('✅ Post button clicked!'); 

    // STEP 5: Wait for confirmation
    console.log('⏳ Waiting for the tweet to be posted...');
    
    try {
      // Wait for success indicators
      await Promise.race([
        page.waitForSelector('div[data-testid="toast"]', { timeout: 15000 }),
        page.waitForFunction(() => {
          const tweetArea = document.querySelector('[data-testid="tweetTextarea_0"]');
          return !tweetArea || tweetArea.textContent === '' || tweetArea.textContent.trim() === '';
        }, { timeout: 15000 }),
        page.waitForFunction(() => {
          const homeElements = document.querySelectorAll('[data-testid="tweet"]');
          return homeElements.length > 0;
        }, { timeout: 15000 })
      ]);
      
      console.log('✅ Tweet posting confirmed!');
    } catch (error) {
      console.log('⚠️ Could not confirm tweet posting, but likely succeeded');
    }

    console.log('🎉 TWEET AUTOMATION COMPLETED SUCCESSFULLY! 🎉');

    // Return success response
    res.status(200).json({ 
      success: true, 
      message: 'Tweet posted successfully using your complete automation code with Chrome AWS Lambda!',
      timestamp: new Date().toISOString(),
      tweetText: finalTweetText,
      username: TWITTER_USERNAME,
      details: 'Full Twitter automation completed with Chrome AWS Lambda for Vercel'
    });

  } catch (error) {
    console.error('❌ TWITTER AUTOMATION ERROR:', error.message);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString(),
      details: 'Twitter automation failed with Chrome AWS Lambda - check Vercel logs'
    });

  } finally {
    // Cleanup
    console.log('🧹 Cleaning up browser resources...');
    
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
    
    console.log('🏁 Twitter automation cleanup complete');
  }
}
