const fs = require('fs');
const path = require('path');

// Read PNG file
const imgPath = 'C:\\Users\\DanDan\\22.png';
const buffer = fs.readFileSync(imgPath);
const base64 = buffer.toString('base64');

// Output as data URI
console.log('data:image/png;base64,' + base64);
