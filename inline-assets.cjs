const fs = require('fs');
const path = require('path');
const { parse } = require('node-html-parser');
const he = require('he');

const distPath = path.resolve(__dirname, 'dist');
const indexPath = path.resolve(distPath, 'index.html');
const assetsPath = path.resolve(distPath, 'assets');

try {
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  const root = parse(indexContent);

  // Find and replace local stylesheet
  const link = root.querySelector('link[rel="stylesheet"][href^="./assets"]');
  if (link) {
    const cssPath = path.join(distPath, link.getAttribute('href'));
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    link.replaceWith(`<style>${cssContent}</style>`);
  }

  // Find and replace module script
  const script = root.querySelector('script[type="module"][src^="./assets"]');
  if (script) {
    const jsPath = path.join(distPath, script.getAttribute('src'));
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    
    // The script's content might have been HTML-encoded by a previous step
    const decodedContent = he.decode(jsContent);
    script.replaceWith(`<script>${decodedContent}</script>`);
    script.removeAttribute('type');
    script.removeAttribute('src');
    script.removeAttribute('crossorigin');
  }
  
  fs.writeFileSync(indexPath, root.toString());
  console.log('Successfully and robustly inlined all local CSS and JS into index.html');

} catch (err) {
  console.error('Error inlining assets:', err);
  process.exit(1);
}
