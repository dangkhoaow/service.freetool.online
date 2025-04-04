// Test script for HEIC conversion using Sharp with libheif support
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  try {
    console.log('Testing HEIC conversion with Sharp...');
    
    // Enable libheif support in Sharp
    console.log('Sharp version:', sharp.versions.sharp);
    console.log('Sharp libheif support:', sharp.format.heif ? 'Yes' : 'No');
    
    // Load the specific HEIC file
    const inputPath = '/Users/ktran/Documents/Code/NewCode/freetool/service.freetool.online/uploads/temp/0a8054bf-c387-418f-883b-dcfe5f444e88-IMG_7389.HEIC';
    console.log(`Reading file from ${inputPath}`);
    
    // Check if file exists
    if (!fs.existsSync(inputPath)) {
      console.error('File does not exist!');
      return;
    }
    
    // Create output directory
    const outputDir = path.join(__dirname, 'uploads/converted/test-sharp');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Test conversion with different approaches
    
    // Approach 1: Basic Sharp conversion
    try {
      console.log('\nApproach 1: Basic Sharp conversion');
      const outputPath1 = path.join(outputDir, 'output-basic.jpg');
      
      await sharp(inputPath)
        .jpeg({ quality: 90 })
        .toFile(outputPath1);
      
      if (fs.existsSync(outputPath1)) {
        const stats = fs.statSync(outputPath1);
        console.log(`Basic Sharp conversion succeeded! Output size: ${stats.size} bytes`);
      }
    } catch (error) {
      console.error('Basic Sharp conversion failed:', error.message);
    }
    
    // Approach 2: Using Sharp with raw buffer
    try {
      console.log('\nApproach 2: Sharp with raw buffer');
      const buffer = fs.readFileSync(inputPath);
      const outputPath2 = path.join(outputDir, 'output-buffer.jpg');
      
      await sharp(buffer)
        .jpeg({ quality: 90 })
        .toFile(outputPath2);
      
      if (fs.existsSync(outputPath2)) {
        const stats = fs.statSync(outputPath2);
        console.log(`Sharp with buffer succeeded! Output size: ${stats.size} bytes`);
      }
    } catch (error) {
      console.error('Sharp with buffer failed:', error.message);
    }
    
    // Approach 3: Using Sharp with specific input options
    try {
      console.log('\nApproach 3: Sharp with input options');
      const outputPath3 = path.join(outputDir, 'output-options.jpg');
      
      await sharp(inputPath, { animated: false, pages: 1 })
        .jpeg({ quality: 90 })
        .toFile(outputPath3);
      
      if (fs.existsSync(outputPath3)) {
        const stats = fs.statSync(outputPath3);
        console.log(`Sharp with options succeeded! Output size: ${stats.size} bytes`);
      }
    } catch (error) {
      console.error('Sharp with options failed:', error.message);
    }
    
    // Approach 4: Node stdlib fs stream approach
    try {
      console.log('\nApproach 4: Node stream approach');
      const outputPath4 = path.join(outputDir, 'output-streamed.jpg');
      
      const transformer = sharp()
        .jpeg({ quality: 90 });
      
      const readStream = fs.createReadStream(inputPath);
      const writeStream = fs.createWriteStream(outputPath4);
      
      readStream.pipe(transformer).pipe(writeStream);
      
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      if (fs.existsSync(outputPath4)) {
        const stats = fs.statSync(outputPath4);
        console.log(`Stream approach succeeded! Output size: ${stats.size} bytes`);
      }
    } catch (error) {
      console.error('Stream approach failed:', error.message);
    }
    
    console.log('\nTest completed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

main();
