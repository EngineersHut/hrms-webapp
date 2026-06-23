const fs = require('fs');
const path = require('path');

const srcPng = "C:\\Users\\EH\\.gemini\\antigravity\\brain\\16bfb315-5e38-41fa-b6e4-c05abd8e0a7f\\hrms_app_logo_1782196923593.png";
const assetsDir = path.join(__dirname, '..', 'assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

try {
  // 1. Read PNG
  const pngBuffer = fs.readFileSync(srcPng);
  console.log(`Source PNG loaded. Size: ${pngBuffer.length} bytes`);

  // 2. Save icon.png
  fs.writeFileSync(path.join(assetsDir, 'icon.png'), pngBuffer);
  console.log('Saved assets/icon.png');

  // 3. Create icon.ico (single image PNG wrapper)
  // ICONDIR Header
  const iconDir = Buffer.alloc(6);
  iconDir.writeUInt16LE(0, 0); // Reserved
  iconDir.writeUInt16LE(1, 2); // Type 1 = Icon
  iconDir.writeUInt16LE(1, 4); // Number of images = 1

  // ICONDIRENTRY Directory
  const iconDirEntry = Buffer.alloc(16);
  iconDirEntry.writeUInt8(0, 0); // Width: 0 means 256px (or larger)
  iconDirEntry.writeUInt8(0, 1); // Height: 0 means 256px (or larger)
  iconDirEntry.writeUInt8(0, 2); // Color count: 0 (no palette)
  iconDirEntry.writeUInt8(0, 3); // Reserved
  iconDirEntry.writeUInt16LE(1, 4); // Color planes: 1
  iconDirEntry.writeUInt16LE(32, 6); // Bits per pixel: 32
  iconDirEntry.writeUInt32LE(pngBuffer.length, 8); // Size of image data
  iconDirEntry.writeUInt32LE(22, 12); // Offset of image data (6 + 16 = 22)

  const icoBuffer = Buffer.concat([iconDir, iconDirEntry, pngBuffer]);
  fs.writeFileSync(path.join(assetsDir, 'icon.ico'), icoBuffer);
  console.log('Generated assets/icon.ico');

  // 4. Create icon.icns (Apple Icon Image Container)
  // Total size = 8 (icns header) + 8 (block header) + PNG data length
  const totalSize = 8 + 8 + pngBuffer.length;

  const icnsHeader = Buffer.alloc(8);
  icnsHeader.write('icns', 0, 'ascii');
  icnsHeader.writeUInt32BE(totalSize, 4); // Big Endian total size

  const blockHeader = Buffer.alloc(8);
  // Using 'ic09' block type for 512x512 PNG representation
  blockHeader.write('ic09', 0, 'ascii');
  blockHeader.writeUInt32BE(8 + pngBuffer.length, 4); // Big Endian block size

  const icnsBuffer = Buffer.concat([icnsHeader, blockHeader, pngBuffer]);
  fs.writeFileSync(path.join(assetsDir, 'icon.icns'), icnsBuffer);
  console.log('Generated assets/icon.icns');

  console.log('Asset generation completed successfully.');
} catch (err) {
  console.error('Failed to generate assets:', err);
  process.exit(1);
}
