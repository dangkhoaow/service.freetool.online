// Test script for HEIC conversion
const fs = require('fs').promises;
const path = require('path');
const heicConvert = require('heic-convert');
const sharp = require('sharp');

async function main() {
  try {
    console.log('Testing HEIC conversion...');
    
    // Load a sample HEIC file
    const inputPath = path.join(__dirname, 'sample-heic/sample1.heic');
    console.log(`Reading file from ${inputPath}`);
    const inputBuffer = await fs.readFile(inputPath);
    console.log(`Input buffer size: ${inputBuffer.length} bytes`);
    
    // Create output directory
    const outputDir = path.join(__dirname, 'uploads/converted/test');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Test direct conversion using heic-convert
    console.log('Converting with heic-convert...');
    try {
      const { width, height, data } = await heicConvert({
        buffer: inputBuffer,
        format: 'JPEG',
        quality: 80
      });
      
      console.log(`Conversion successful! Image dimensions: ${width}x${height}`);
      console.log(`Converted data size: ${data.length} bytes`);
      
      // Save the converted image
      const outputPathHeic = path.join(outputDir, 'heic-convert-output.jpg');
      await fs.writeFile(outputPathHeic, data);
      console.log(`Saved to ${outputPathHeic}`);
    } catch (error) {
      console.error('heic-convert failed:', error);
    }
    
    // Test conversion using Sharp
    console.log('\nConverting with Sharp...');
    try {
      const outputPathSharp = path.join(outputDir, 'sharp-output.jpg');
      await sharp(inputBuffer)
        .toFormat('jpeg', { quality: 80 })
        .toFile(outputPathSharp);
      console.log(`Saved to ${outputPathSharp}`);
    } catch (error) {
      console.error('Sharp conversion failed:', error);
    }
    
    // Test the fallback colored image generation
    console.log('\nGenerating fallback colored image...');
    try {
      const outputPathFallback = path.join(outputDir, 'fallback-output.jpg');
      await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 100, g: 100, b: 200 }
        }
      })
      .toFormat('jpeg', { quality: 80 })
      .toFile(outputPathFallback);
      console.log(`Saved to ${outputPathFallback}`);
    } catch (error) {
      console.error('Fallback image generation failed:', error);
    }
    
    console.log('\nTest completed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

main();
