// Test script for HEIC conversion using heic-decode
const fs = require('fs');
const path = require('path');
const decode = require('heic-decode');
const sharp = require('sharp');

async function main() {
  try {
    console.log('Testing HEIC conversion with heic-decode...');
    
    // Load the specific HEIC file
    const inputPath = '/Users/ktran/Documents/Code/NewCode/freetool/service.freetool.online/uploads/temp/0a8054bf-c387-418f-883b-dcfe5f444e88-IMG_7389.HEIC';
    console.log(`Reading file from ${inputPath}`);
    
    // Check if file exists
    if (!fs.existsSync(inputPath)) {
      console.error('File does not exist!');
      return;
    }
    
    // Create output directory
    const outputDir = path.join(__dirname, 'uploads/converted/test-heic-decode');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Read the HEIC file
    const buffer = fs.readFileSync(inputPath);
    console.log(`Input buffer size: ${buffer.length} bytes`);
    
    // Decode the HEIC image
    console.log('Decoding HEIC image...');
    const { width, height, data } = await decode({ buffer });
    
    console.log(`Decoded image: ${width}x${height}, raw data length: ${data.length} bytes`);
    
    // Convert the raw pixels to a JPEG using Sharp
    console.log('Converting raw pixels to JPEG...');
    const outputPath = path.join(outputDir, 'output.jpg');
    
    await sharp(data, {
      raw: {
        width,
        height,
        channels: 4 // RGBA
      }
    })
    .jpeg({ quality: 90 })
    .toFile(outputPath);
    
    // Check the output file
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`Conversion successful! Output size: ${stats.size} bytes`);
      
      if (stats.size > 500000) {
        console.log('Output file is larger than 500KB - conversion likely successful!');
      } else {
        console.log('Output file is smaller than 500KB - might be incomplete or low quality');
      }
    } else {
      console.error('Failed to create output file');
    }
    
    console.log('\nTest completed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

main();
