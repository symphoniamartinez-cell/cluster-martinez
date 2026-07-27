const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="128" fill="#0284c7"/>
  <path d="M256 120L112 232V400H208V304H304V400H400V232L256 120Z" fill="white"/>
</svg>`;

fs.writeFileSync(path.join(dir, 'icon-512.png'), svgContent);
fs.writeFileSync(path.join(dir, 'icon-192.png'), svgContent);
fs.writeFileSync(path.join(dir, 'icon-512.svg'), svgContent);
console.log('Icons created successfully!');
