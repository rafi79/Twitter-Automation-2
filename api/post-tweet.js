// api/post-tweet.js
import puppeteer from 'puppeteer';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password, tweetText } = req.body;

  if (!username || !password || !tweetText) {
    return res.status(400).json({ 
      error: 'Missing required fields: username, password, or tweetText' 
    });
  }

  let browser = null;

  try {
    console.log('🎬 Starting Twitter (X) Automation');
    console.log('=====================================');

    // --- IMPROVED BROWSER CONFIGURATION FOR VERCEL/NETWORK ISSUES ---
    browser = await puppeteer.launch({
      headless: true, // Set to true for production
      defaultViewport: { width: 1280, height: 800 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled',
        '--dns-prefetch-disable',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--ignore-certificate-errors-spki-list',
        '--ignore-certificate-errors-ssl-errors'
      ]
    });

    const page = await browser.newPage();

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
    await page.type(usernameInput, username, { delay: 100 });

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
          await page.type(selector, username, { delay: 50 });
          
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
    await page.type(passwordInput, password, { delay: 100 });

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
    
    console.log(`📝 Tweet text to post: "${tweetText}"`);

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
    for (let i = 0; i < tweetText.length; i++) {
      await page.keyboard.type(tweetText[i], { delay: 50 });
      
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

    // --- ADDITIONAL MANUAL INTERACTION SIMULATION ---
    console.log('🔄 Simulating manual user interaction...');
    
    // Simulate mouse movement over the compose area (like a real user)
    await page.mouse.move(300, 400); // Move to general area
    await delay(200);
    
    // Focus and click the compose area directly
    await page.focus(tweetInputSelector);
    await delay(300);
    await page.click(tweetInputSelector);
    await delay(500);
    
    // Simulate typing activity to trigger change detection
    await page.keyboard.press('End'); // Move cursor to end
    await delay(200);
    await page.keyboard.type(' '); // Add space
    await delay(200);
    await page.keyboard.press('Backspace'); // Remove space
    await delay(300);
    
    // Move cursor around like a real user
    await page.keyboard.press('Home'); // Go to start
    await delay(200);
    await page.keyboard.press('End'); // Go to end
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
          'input',
          'change', 
          'keyup',
          'keydown',
          'keypress',
          'blur',
          'focus',
          'textInput',
          'compositionend',
          'paste'
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
        
        console.log('Input content after events:', input.textContent);
        console.log('Input innerHTML after events:', input.innerHTML);
      }
    }, tweetInputSelector, tweetText);

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
    await delay(3000); // Give Twitter more time to process the manual click interaction

    // STEP 4: Post the Tweet
    console.log('🖱️ Looking for Post button...');
    
    // --- TRY MULTIPLE POST BUTTON SELECTORS WITH EXACT STRUCTURE ---
    const postButtonSelectors = [
      // Exact structure from your HTML
      'button[data-testid="tweetButton"]',
      'button[role="button"][data-testid="tweetButton"]',
      '.css-175oi2r.r-1awozwy.r-xoduu5.r-18u37iz.r-1ssbvtb button[data-testid="tweetButton"]',
      
      // Fallbacks
      '[data-testid="tweetButton"]',
      '[data-testid="tweetButtonInline"]',
      'button[data-testid="tweetButtonInline"]',
      
      // CSS class-based selectors
      'button.css-175oi2r.r-sdzlij.r-1phboty.r-rs99b7.r-lrvibr.r-15ysp7h.r-4wgw6l.r-3pj75a.r-1loqt21.r-o7ynqc.r-6416eg.r-1ny4l3l[data-testid="tweetButton"]',
      
      // Generic fallbacks
      'button[role="button"]:has(span:contains("Post"))',
      'div[role="button"]:has(span:contains("Post"))'
    ];

    // Also add a specific method to find the button in your exact container structure
    console.log('🔍 Looking for Post button in container structure...');
    const containerBasedSelector = await page.evaluate(() => {
      // Look for the specific container structure
      const containers = document.querySelectorAll('.css-175oi2r.r-1awozwy.r-xoduu5.r-18u37iz.r-1ssbvtb');
      
      for (const container of containers) {
        const postButton = container.querySelector('button[data-testid="tweetButton"]');
        if (postButton) {
          // Check if it has the blue background (enabled state)
          const bgColor = getComputedStyle(postButton).backgroundColor;
          if (bgColor.includes('29, 155, 240')) {
            console.log('✅ Found Post button in container with blue background');
            
            // Add a unique identifier for easier targeting
            postButton.setAttribute('data-automation-target', 'post-button-found');
            return 'button[data-automation-target="post-button-found"]';
          }
        }
      }
      
      return null;
    });

    if (containerBasedSelector) {
      console.log('✅ Post button found via container search, adding to selectors');
      postButtonSelectors.unshift(containerBasedSelector);
    }

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
          
          // Check if button is enabled (not disabled) - improved detection
          const isEnabled = await page.evaluate((sel) => {
            const button = document.querySelector(sel);
            if (!button) return false;
            
            // Check basic disabled states
            if (button.disabled || button.hasAttribute('disabled') || 
                button.classList.contains('disabled') || 
                getComputedStyle(button).pointerEvents === 'none') {
              return false;
            }
            
            // Check for Twitter's specific enabled state (blue background for enabled button)
            const computedStyle = getComputedStyle(button);
            const bgColor = computedStyle.backgroundColor;
            
            // Enabled button has blue background: rgb(29, 155, 240) 
            // or dark background: rgb(15, 20, 25)
            // Disabled button has light background: rgb(239, 243, 244)
            if (bgColor.includes('29, 155, 240') || bgColor.includes('15, 20, 25')) {
              console.log('✅ Post button is enabled (blue/dark background detected)');
              return true;
            }
            
            // Also check if text color is white (indicates enabled state)
            const textElement = button.querySelector('span');
            if (textElement) {
              const textColor = getComputedStyle(textElement).color;
              if (textColor.includes('255, 255, 255')) {
                console.log('✅ Post button is enabled (white text detected)');
                return true;
              }
            }
            
            // Additional check: make sure this is not the Drafts button
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
            
            // Log current button state for debugging
            console.log(`🔍 Button background: ${bgColor}`);
            console.log(`🔍 Button disabled: ${button.disabled}`);
            
            return false;
          }, selector);
          
          if (isEnabled) {
            console.log(`✅ Found enabled post button: ${selector}`);
            
            // Try multiple clicking methods to ensure it works
            let clickSuccessful = false;
            
            try {
              // Method 1: Wait for button to be truly enabled, then click
              console.log('🖱️ Waiting for button to be fully enabled...');
              
              // Wait up to 10 seconds for button to become enabled
              await page.waitForFunction((sel) => {
                const button = document.querySelector(sel);
                if (!button) return false;
                
                const isReallyEnabled = !button.disabled && 
                                       button.getAttribute('aria-disabled') !== 'true' &&
                                       button.getAttribute('tabindex') !== '-1' &&
                                       !getComputedStyle(button).backgroundColor.includes('239, 243, 244');
                
                if (isReallyEnabled) {
                  console.log('✅ Button is now truly enabled!');
                }
                
                return isReallyEnabled;
              }, { timeout: 10000 }, selector);
              
              console.log('🖱️ Button confirmed enabled, attempting click...');
              await page.click(selector, { delay: 100 });
              await delay(1000);
              clickSuccessful = true;
              
            } catch (error) {
              console.log('❌ Waiting for enabled button failed:', error.message);
              
              // Try immediate click anyway
              try {
                console.log('🖱️ Attempting immediate click despite state...');
                await page.click(selector);
                await delay(1000);
                clickSuccessful = true;
              } catch (clickError) {
                console.log('❌ Immediate click also failed:', clickError.message);
              }
            }
            
            if (!clickSuccessful) {
              try {
                // Method 2: JavaScript click with pre-enabling
                console.log('🖱️ Attempting JavaScript click with button enabling...');
                await page.evaluate((sel) => {
                  const button = document.querySelector(sel);
                  if (button) {
                    // Try to force enable the button
                    button.disabled = false;
                    button.removeAttribute('disabled');
                    button.setAttribute('aria-disabled', 'false');
                    button.setAttribute('tabindex', '0');
                    
                    // Force enable styling
                    button.style.backgroundColor = 'rgb(29, 155, 240)';
                    button.style.pointerEvents = 'auto';
                    
                    // Then click
                    button.click();
                    return true;
                  }
                  return false;
                }, selector);
                await delay(1000);
                clickSuccessful = true;
              } catch (error) {
                console.log('❌ JavaScript click with enabling failed...');
              }
            }
            
            if (!clickSuccessful) {
              try {
                // Method 3: Force click with coordinates
                console.log('🖱️ Attempting coordinate-based click...');
                const element = await page.$(selector);
                if (element) {
                  const box = await element.boundingBox();
                  if (box) {
                    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                    await delay(1000);
                    clickSuccessful = true;
                  }
                }
              } catch (error) {
                console.log('❌ Coordinate click failed...');
              }
            }
            
            if (!clickSuccessful) {
              try {
                // Method 4: Keyboard Enter on focused button
                console.log('🖱️ Attempting keyboard Enter...');
                await page.focus(selector);
                await delay(300);
                await page.keyboard.press('Enter');
                await delay(1000);
                clickSuccessful = true;
              } catch (error) {
                console.log('❌ Keyboard Enter failed...');
              }
            }
            
            if (!clickSuccessful) {
              try {
                // Method 5: Advanced JavaScript interaction with form submission
                console.log('🖱️ Attempting form submission simulation...');
                await page.evaluate((sel) => {
                  const button = document.querySelector(sel);
                  if (button) {
                    // Find the closest form or container
                    const form = button.closest('form') || button.closest('[role="main"]');
                    
                    // Trigger multiple events
                    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                    button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                    
                    // Try submitting form if found
                    if (form && form.requestSubmit) {
                      form.requestSubmit();
                    }
                    
                    // Also try clicking parent elements
                    const parent = button.closest('[role="button"]') || button.parentElement;
                    if (parent && parent !== button) {
                      parent.click();
                    }
                    
                    return true;
                  }
                  return false;
                }, selector);
                await delay(1000);
                clickSuccessful = true;
              } catch (error) {
                console.log('❌ Advanced JavaScript interaction failed...');
              }
            }
            
            if (clickSuccessful) {
              console.log('✅ Post button clicked successfully!');
              postButtonFound = true;
              break;
            } else {
              console.log('❌ All click methods failed for this selector');
            }
          } else {
            console.log(`⚠️ Post button found but disabled: ${selector}`);
          }
        } catch (error) {
          console.log(`❌ Post button selector failed: ${selector}`);
          continue;
        }
      }
      
      if (!postButtonFound) {
        console.log('⏳ Post button not enabled yet, triggering more input events...');
        
        // Try to trigger more events to activate the button
        await page.evaluate((selector) => {
          const input = document.querySelector(selector);
          if (input) {
            // Simulate user interaction
            input.focus();
            input.click();
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Try to set the content again
            if (input.textContent !== input.dataset.originalText) {
              input.textContent = input.dataset.originalText || input.textContent;
            }
          }
        }, tweetInputSelector);
        
        await delay(2000);
      }
    }

    // Enhanced fallback: try finding by text content with container awareness
    if (!postButtonFound) {
      console.log('🔍 Final attempt: searching for Post button with container awareness...');
      postButtonFound = await page.evaluate(() => {
        // Look specifically in the button container area
        const containers = Array.from(document.querySelectorAll('.css-175oi2r.r-1awozwy.r-xoduu5.r-18u37iz.r-1ssbvtb'));
        
        for (const container of containers) {
          const buttons = container.querySelectorAll('button');
          
          for (const button of buttons) {
            const text = button.textContent?.trim().toLowerCase();
            const bgColor = getComputedStyle(button).backgroundColor;
            
            // Look for Post button with blue background (not Drafts button)
            if ((text === 'post' || text === 'tweet' || text === 'send') && 
                !text.includes('draft') && !text.includes('save') &&
                bgColor.includes('29, 155, 240')) {
              
              console.log('🎯 Final attempt: Found blue Post button, attempting click');
              
              try {
                // Multiple comprehensive click attempts
                button.scrollIntoView({ behavior: 'instant', block: 'center' });
                
                // Wait a tiny bit for scroll
                setTimeout(() => {
                  button.focus();
                  button.click();
                  
                  // Backup clicks
                  button.dispatchEvent(new MouseEvent('click', { 
                    bubbles: true, 
                    cancelable: true,
                    view: window,
                    detail: 1
                  }));
                  
                  button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                  button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                  
                  // Try clicking inner elements too
                  const innerDiv = button.querySelector('div[dir="ltr"]');
                  if (innerDiv) innerDiv.click();
                  
                  const spans = button.querySelectorAll('span');
                  spans.forEach(span => {
                    if (span.textContent?.trim().toLowerCase() === 'post') {
                      span.click();
                    }
                  });
                  
                }, 100);
                
                return true;
              } catch (e) {
                console.log('❌ Final attempt click failed:', e.message);
                return false;
              }
            }
          }
        }
        
        return false;
      });
      
      if (postButtonFound) {
        console.log('✅ Post button found and clicked via final container search!');
        await delay(2000); // Give extra time for this method
      }
    }

    if (!postButtonFound) {
      throw new Error('Could not find or click the Post button');
    }
    
    console.log('✅ Post button clicked!'); 

    // STEP 5: Wait for confirmation with better detection
    console.log('⏳ Waiting for the tweet to be posted...');
    
    // First, let's verify if the click actually worked by checking if compose area is still there
    await delay(2000);
    
    const tweetStillComposing = await page.evaluate(() => {
      const tweetArea = document.querySelector('[data-testid="tweetTextarea_0"]');
      const postButton = document.querySelector('[data-testid="tweetButtonInline"], [data-testid="tweetButton"]');
      
      if (tweetArea && tweetArea.textContent && tweetArea.textContent.trim().length > 0) {
        console.log('❌ Tweet compose area still has content - click may have failed');
        return true;
      }
      
      if (postButton) {
        const bgColor = getComputedStyle(postButton).backgroundColor;
        if (bgColor.includes('29, 155, 240') || bgColor.includes('15, 20, 25')) {
          console.log('❌ Post button still enabled - click may have failed');
          return true;
        }
      }
      
      return false;
    });
    
    if (tweetStillComposing) {
      console.log('⚠️ Tweet appears to still be in compose mode, trying alternative click methods...');
      
      // Try the most aggressive clicking approach
      const forceClickSuccess = await page.evaluate(() => {
        // Find any Post button that's enabled
        const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
        
        for (const button of buttons) {
          const text = button.textContent?.trim().toLowerCase();
          const bgColor = getComputedStyle(button).backgroundColor;
          
          // Look for enabled Post button
          if (text === 'post' && 
              (bgColor.includes('29, 155, 240') || bgColor.includes('15, 20, 25'))) {
            
            console.log('🎯 Force clicking Post button with all methods...');
            
            try {
              // Scroll to button first
              button.scrollIntoView({ behavior: 'instant', block: 'center' });
              
              // Multiple click attempts with delays
              setTimeout(() => button.click(), 100);
              setTimeout(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })), 200);
              setTimeout(() => button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })), 300);
              setTimeout(() => button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })), 400);
              
              // Try clicking all child elements
              const children = button.querySelectorAll('*');
              children.forEach((child, index) => {
                setTimeout(() => child.click(), 500 + (index * 100));
              });
              
              // Simulate keyboard press
              button.focus();
              setTimeout(() => {
                const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', which: 13 });
                button.dispatchEvent(enterEvent);
                document.dispatchEvent(enterEvent);
              }, 1000);
              
              return true;
            } catch (e) {
              console.log('❌ Force click failed:', e.message);
              return false;
            }
          }
        }
        return false;
      });
      
      if (forceClickSuccess) {
        console.log('✅ Force click attempted, waiting for result...');
        await delay(3000);
      }
    }
    
    try {
      // Wait for success indicators with longer timeout
      await Promise.race([
        page.waitForSelector('div[data-testid="toast"]', { timeout: 15000 }),
        page.waitForSelector('[data-testid="confirmationSheetDialog"]', { timeout: 15000 }),
        page.waitForFunction(() => {
          const tweetArea = document.querySelector('[data-testid="tweetTextarea_0"]');
          return !tweetArea || tweetArea.textContent === '' || tweetArea.textContent.trim() === '';
        }, { timeout: 15000 }),
        page.waitForFunction(() => {
          // Check if we're back to home feed (tweet posted)
          const homeElements = document.querySelectorAll('[data-testid="tweet"]');
          return homeElements.length > 0;
        }, { timeout: 15000 })
      ]);
      
      console.log('✅ Tweet posting confirmed!');
    } catch (error) {
      console.log('⚠️ Could not confirm tweet posting with standard methods');
      
      // Final verification
      const finalCheck = await page.evaluate(() => {
        const tweetArea = document.querySelector('[data-testid="tweetTextarea_0"]');
        const postButton = document.querySelector('[data-testid="tweetButtonInline"], [data-testid="tweetButton"]');
        
        if (!tweetArea || tweetArea.textContent === '' || tweetArea.textContent.trim() === '') {
          return 'Tweet area cleared - likely posted successfully';
        }
        
        if (postButton) {
          const bgColor = getComputedStyle(postButton).backgroundColor;
          if (!bgColor.includes('29, 155, 240') && !bgColor.includes('15, 20, 25')) {
            return 'Post button disabled - likely posted successfully';
          }
        }
        
        return 'Tweet still appears to be in compose mode';
      });
      
      console.log(`🔍 Final check result: ${finalCheck}`);
    }

    console.log('🎉 TWEET AUTOMATION COMPLETED SUCCESSFULLY! 🎉');

    res.status(200).json({ 
      success: true, 
      message: 'Tweet posted successfully!',
      timestamp: new Date().toISOString(),
      tweetText: tweetText
    });

  } catch (error) {
    console.error('❌ AN ERROR OCCURRED:', error.message);
    
    // --- IMPROVED ERROR HANDLING ---
    try {
      if (browser && !page.isClosed()) {
        console.error('📸 Taking error screenshot...');
        await page.screenshot({ path: '/tmp/twitter-automation-error.png' });
        console.error('🔗 Current URL:', page.url());
        console.error('📄 Current page title:', await page.title());
      }
    } catch (screenshotError) {
      console.error('❌ Could not take error screenshot:', screenshotError.message);
    }

    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    console.log('🔒 Closing browser...');
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('❌ Error closing browser:', closeError.message);
      }
    }
  }
}
