import 'dotenv/config';
import { getBrowserSandbox, closeSandbox } from '../e2b/sandbox-manager';
import * as fs from 'fs';
import * as path from 'path';

async function testScreenshot() {
  console.log('--- Starting Screenshot Test ---');

  if (!process.env.E2B_API_KEY) {
    console.error('Error: E2B_API_KEY environment variable is not set.');
    process.exit(1);
  }

  let sandbox;

  try {
    sandbox = await getBrowserSandbox();
    const targetUrl = 'https://youtube.com';

    console.log(`Navigating to ${targetUrl}...`);
    await sandbox.executeAction({
      id: Date.now().toString(),
      type: 'navigate',
      url: targetUrl,
      timestamp: Date.now()
    });

    console.log('Waiting 5 seconds for page load...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Taking screenshot...');
    const base64Image = await sandbox.getScreenshot();

    if (base64Image && base64Image.length > 0) {
      console.log(`Received screenshot data (length: ${base64Image.length})`);

      const outputPath = path.join(__dirname, 'screenshot.png');
      const buffer = Buffer.from(base64Image, 'base64');
      fs.writeFileSync(outputPath, buffer);

      console.log(`SUCCESS: Screenshot saved to ${outputPath}`);
    } else {
      console.error('FAILURE: Screenshot data was empty or null.');
    }

  } catch (error) {
    console.error('FAILURE: Error taking screenshot:', error);
  } finally {
    if (sandbox) {
      await closeSandbox();
    }
    console.log('--- Test Complete ---');
  }
}

testScreenshot();
