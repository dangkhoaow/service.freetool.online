// Test script for HEIC conversion using child_process to call command line tools
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

async function main() {
  try {
    console.log('Testing HEIC conversion with system tools...');
    
    // Load the specific HEIC file
    const inputPath = '/Users/ktran/Documents/Code/NewCode/freetool/service.freetool.online/uploads/temp/0a8054bf-c387-418f-883b-dcfe5f444e88-IMG_7389.HEIC';
    console.log(`Reading file from ${inputPath}`);
    
    // Check if file exists
    if (!fs.existsSync(inputPath)) {
      console.error('File does not exist!');
      return;
    }
    
    // Create output directory
    const outputDir = path.join(__dirname, 'uploads/converted/test-cli');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Output path for the converted image
    const outputPath = path.join(outputDir, 'output.jpg');
    
    // Try different conversion methods
    
    // Method 1: Using sips (macOS built-in)
    try {
      console.log('\nTrying conversion with sips (macOS)...');
      execSync(`sips -s format jpeg "${inputPath}" --out "${outputPath}"`);
      
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        console.log(`Sips conversion succeeded! Output size: ${stats.size} bytes`);
      }
    } catch (error) {
      console.error('Sips conversion failed:', error.message);
    }
    
    // Method 2: Using ImageMagick's convert command
    try {
      console.log('\nTrying conversion with ImageMagick convert...');
      const outputPath2 = path.join(outputDir, 'output-imagemagick.jpg');
      execSync(`convert "${inputPath}" "${outputPath2}"`);
      
      if (fs.existsSync(outputPath2)) {
        const stats = fs.statSync(outputPath2);
        console.log(`ImageMagick conversion succeeded! Output size: ${stats.size} bytes`);
      }
    } catch (error) {
      console.error('ImageMagick conversion failed:', error.message);
    }
    
    // Method 3: Using tifig (if available)
    try {
      console.log('\nTrying conversion with tifig...');
      const outputPath3 = path.join(outputDir, 'output-tifig.jpg');
      execSync(`tifig -p "${inputPath}" "${outputPath3}"`);
      
      if (fs.existsSync(outputPath3)) {
        const stats = fs.statSync(outputPath3);
        console.log(`Tifig conversion succeeded! Output size: ${stats.size} bytes`);
      }
    } catch (error) {
      console.error('Tifig conversion failed:', error.message);
    }
    
    console.log('\nTest completed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

main();
