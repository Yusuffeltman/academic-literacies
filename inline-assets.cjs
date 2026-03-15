const fs = require('fs');
const path = require('path');

const distPath = path.resolve(__dirname, 'dist');
const indexPath = path.resolve(distPath, 'index.html');

try {
  let indexContent = fs.readFileSync(indexPath, 'utf8');

  // 1. Inline all local stylesheets
  // Find <link rel="stylesheet" ... href="./assets/...">
  const styleRegex = /<link [^>]*rel="stylesheet"[^>]*href="(\.\/assets\/[^"]+)"[^>]*>/g;
  indexContent = indexContent.replace(styleRegex, (match, href) => {
    const cssPath = path.join(distPath, href);
    if (fs.existsSync(cssPath)) {
      console.log(`Inlining CSS: ${href}`);
      const cssContent = fs.readFileSync(cssPath, 'utf8');
      return `<style>${cssContent}</style>`;
    }
    return match;
  });

  // 2. Inline all local module scripts
  // We use Base64 encoding to prevent Moodle from mangling characters like &&
  const scriptRegex = /<script [^>]*src="(\.\/assets\/[^"]+)"[^>]*><\/script>/g;
  indexContent = indexContent.replace(scriptRegex, (match, src) => {
    const jsPath = path.join(distPath, src);
    if (fs.existsSync(jsPath)) {
      console.log(`Inlining JS (as Base64): ${src}`);
      let jsContent = fs.readFileSync(jsPath, 'utf8');

      // Remove Vite's module preload polyfill (it's the first thing that fails in Moodle)
      // It usually looks like (function(){const e=document.createElement("link").relList;...})()
      jsContent = jsContent.replace(/^\(function\(\)\{const e=document\.createElement\("link"\)\.relList;[\s\S]+?\}\)\(\);/, '');

      const b64 = Buffer.from(jsContent).toString('base64');

      // Extract original attributes to preserve them (excluding src and crossorigin)
      let attrsMatch = match.match(/<script ([^>]*)src=/);
      let attrs = attrsMatch ? attrsMatch[1].trim() : '';
      attrs = attrs.replace(/crossorigin/g, '').trim();
      const attrStr = attrs ? ` ${attrs}` : '';

      // The loader script decodes the Base64 and injects it as a new script tag
      // Use a blob or textContent to execute the decoded string as a module
      return `
<script${attrStr}>
(function(){
  try {
    var b64 = "${b64}";
    var js = decodeURIComponent(escape(atob(b64)));
    var s = document.createElement('script');
    s.type = 'module';
    s.textContent = js;
    document.head.appendChild(s);
  } catch(e) {
    console.error('LMS Loader Error:', e);
    // Fallback for non-UTF8 safe environments
    try {
      var s2 = document.createElement('script');
      s2.type = 'module';
      s2.textContent = atob("${b64}");
      document.head.appendChild(s2);
    } catch(e2) {
      console.error('LMS Loader Fatal:', e2);
    }
  }
})();
</script>`.trim();
    }
    return match;
  });

  // 3. Clean up modulepreloads
  indexContent = indexContent.replace(/<link [^>]*rel="modulepreload"[^>]*>/g, '');

  // 4. Clean up other unused asset references
  indexContent = indexContent.replace(/<link [^>]*href="\.\/assets\/[^"]+"[^>]*>/g, (match) => {
    if (match.includes('rel="stylesheet"')) return match; // Already handled
    console.log(`Removing unused asset reference: ${match}`);
    return '';
  });

  fs.writeFileSync(indexPath, indexContent);
  console.log('Successfully inlined local assets using string replacement (safe from HTML encoding).');

} catch (err) {
  console.error('Error inlining assets:', err);
  process.exit(1);
}
