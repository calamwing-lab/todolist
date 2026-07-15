const fs = require('fs');
const path = require('path');

const filePaths = [
  'src/app/student/page.tsx',
  'src/app/admin/page.tsx',
  'src/app/login/page.tsx'
];

const replacements = [
  // Backgrounds
  { from: /bg-slate-950\/80/g, to: 'bg-white/80' },
  { from: /bg-slate-950\/95/g, to: 'bg-white/95' },
  { from: /bg-slate-900\/20/g, to: 'bg-white/60' },
  { from: /bg-slate-900\/10/g, to: 'bg-white/40' },
  { from: /bg-slate-900\/30/g, to: 'bg-white/50' },
  { from: /bg-slate-900\/40/g, to: 'bg-white/70' },
  { from: /bg-slate-950/g, to: 'bg-slate-50' },
  { from: /bg-slate-900/g, to: 'bg-white' },
  { from: /bg-slate-800\/80/g, to: 'bg-slate-100' },
  { from: /bg-slate-800/g, to: 'bg-slate-100' },
  
  // Gradients
  { from: /from-cyan-900\/20/g, to: 'from-blue-100' },
  { from: /via-slate-950/g, to: 'via-slate-50' },
  { from: /to-slate-950/g, to: 'to-slate-50' },
  { from: /from-slate-900\/80/g, to: 'from-white' },
  { from: /to-slate-900\/40/g, to: 'to-slate-50' },
  
  // Blue/Cyan components
  { from: /bg-blue-950\/30/g, to: 'bg-blue-50' },
  { from: /border-blue-900\/50/g, to: 'border-blue-200' },
  { from: /bg-cyan-950/g, to: 'bg-blue-50' },
  { from: /border-cyan-900/g, to: 'border-blue-200' },
  
  // Text Colors (Be careful with text-white on buttons)
  // We'll replace text-white only on headings/paragraphs, not globally.
  // Actually, replacing text-white globally is risky. Let's just replace text-slate-*
  { from: /text-slate-100/g, to: 'text-slate-900' },
  { from: /text-slate-200/g, to: 'text-slate-800' },
  { from: /text-slate-300/g, to: 'text-slate-700' },
  { from: /text-slate-400/g, to: 'text-slate-600' },
  // Let's replace 'text-white' when it's part of a background that became white.
  // We can just rely on the slate text replacements for the bulk of it.
  
  // Borders
  { from: /border-slate-900/g, to: 'border-slate-200' },
  { from: /border-slate-800/g, to: 'border-slate-300' },
  { from: /border-slate-700/g, to: 'border-slate-400' }
];

filePaths.forEach(fp => {
  const fullPath = path.join(__dirname, fp);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Manual text-white replacement where it's safe (e.g. h1, h2, h3, div text)
    // Avoid replacing it inside button tags.
    const parts = content.split(/(<button[^>]*>[\s\S]*?<\/button>)/i);
    for (let i = 0; i < parts.length; i++) {
      if (!parts[i].toLowerCase().startsWith('<button')) {
        parts[i] = parts[i].replace(/text-white/g, 'text-slate-900');
      }
    }
    content = parts.join('');

    replacements.forEach(r => {
      content = content.replace(r.from, r.to);
    });
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated ${fp}`);
  } else {
    console.log(`Not found: ${fp}`);
  }
});
