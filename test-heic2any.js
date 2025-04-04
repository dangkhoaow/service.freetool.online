// Test script for HEIC conversion using heic2any
const fs = require('fs');
const path = require('path');
const heic2any = require('heic2any');

async function main() {
  try {
    console.log('Testing HEIC conversion with heic2any...');
    
    // Load the specific HEIC file
    const inputPath = '/Users/ktran/Documents/Code/NewCode/freetool/service.freetool.online/uploads/temp/0a8054bf-c387-418f-883b-dcfe5f444e88-IMG_7389.HEIC';
    console.log(`Reading file from ${inputPath}`);
    
    // Check if file exists
    if (!fs.existsSync(inputPath)) {
      console.error('File does not exist!');
      return;
    }
    
    const inputBuffer = fs.readFileSync(inputPath);
    console.log(`Input buffer size: ${inputBuffer.length} bytes`);
    
    // Create output directory
    const outputDir = path.join(__dirname, 'uploads/converted/test-heic2any');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Test conversion using heic2any
    console.log('Converting with heic2any...');
    
    // Note: heic2any expects a Blob in browser, but in Node.js we use Buffer
    // We need to wrap the buffer to make it work with heic2any
    class BufferBlob {
      constructor(buffer) {
        this.buffer = buffer;
        this.size = buffer.length;
        this.type = 'image/heic';
      }
      
      arrayBuffer() {
        return Promise.resolve(this.buffer.buffer.slice(
          this.buffer.byteOffset,
          this.buffer.byteOffset + this.buffer.byteLength
        ));
      }
    }
    
    const blob = new BufferBlob(inputBuffer);
    const result = await heic2any({
      blob,
      toType: 'image/jpeg',
      quality: 0.8
    });
    
    if (Array.isArray(result)) {
      console.log(`Conversion produced ${result.length} images`);
      
      // Save each image
      for (let i = 0; i < result.length; i++) {
        const outputPath = path.join(outputDir, `output-${i+1}.jpg`);
        const buffer = Buffer.from(await result[i].arrayBuffer());
        fs.writeFileSync(outputPath, buffer);
        console.log(`Saved image ${i+1} to ${outputPath}, size: ${buffer.length} bytes`);
      }
    } else {
      const outputPath = path.join(outputDir, 'output.jpg');
      const buffer = Buffer.from(await result.arrayBuffer());
      fs.writeFileSync(outputPath, buffer);
      console.log(`Saved image to ${outputPath}, size: ${buffer.length} bytes`);
    }
    
    console.log('\nTest completed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

main();
