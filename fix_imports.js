const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace dynamic imports with direct usage
content = content.replace(
  /import\('@\/lib\/ttsEstimator'\)\.then\(\({ estimateTTSParameters }\) => {\s*const params = estimateTTSParameters\((.*?)\);\s*setTtsEstimate\(params\);\s*}\);/gs,
  'const params = estimateTTSParameters($1);\nsetTtsEstimate(params);'
);

// Write the file back
fs.writeFileSync(filePath, content);

console.log('Fixed dynamic imports in page.tsx');
