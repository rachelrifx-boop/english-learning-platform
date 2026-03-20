const fs = require('fs');
const path = require('path');

// Read PNG file
const imgPath = 'C:\\Users\\DanDan\\22.png';
const buffer = fs.readFileSync(imgPath);

// PNG signature check
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const isPng = buffer.slice(0, 8).equals(pngSignature);

console.log('File size:', buffer.length, 'bytes');
console.log('Is valid PNG:', isPng);

// Get IHDR chunk info (width, height)
if (isPng) {
  // IHDR starts at byte 8
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  console.log('Width:', width);
  console.log('Height:', height);
}
