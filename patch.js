const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

function replaceClass(baseClass, darkClass) {
  // Regex to match baseClass with optional hover:, focus:, etc. prefix.
  // We want to replace `prefix:baseClass` with `prefix:baseClass dark:prefix:darkClass`
  // But ONLY if it's not already followed by dark:prefix:darkClass
  
  const regex = new RegExp(`(?<!dark:)([a-z-]*:)?${baseClass}(?!\\s+dark:\\1${darkClass})`, 'g');
  code = code.replace(regex, (match, prefix) => {
    prefix = prefix || '';
    return `${prefix}${baseClass} dark:${prefix}${darkClass}`;
  });
}

replaceClass('text-slate-900', 'text-slate-100');
replaceClass('text-slate-800', 'text-slate-200');
replaceClass('text-slate-700', 'text-slate-300');
replaceClass('text-slate-600', 'text-slate-400');
replaceClass('text-slate-500', 'text-slate-400');
replaceClass('text-gray-900', 'text-slate-100');
replaceClass('text-gray-800', 'text-slate-200');
replaceClass('text-gray-700', 'text-slate-300');
replaceClass('text-gray-600', 'text-slate-400');
replaceClass('text-gray-500', 'text-slate-400');

replaceClass('text-blue-800', 'text-blue-300');
replaceClass('text-blue-700', 'text-blue-400');
replaceClass('text-blue-600', 'text-blue-400');

replaceClass('bg-blue-100', 'bg-blue-900\\/30');
replaceClass('border-blue-200', 'border-blue-800\\/50');
replaceClass('bg-slate-50', 'bg-slate-900');
replaceClass('bg-slate-100', 'bg-slate-800');
replaceClass('bg-slate-200', 'bg-slate-800');
replaceClass('bg-blue-50', 'bg-blue-900\\/20');
replaceClass('bg-white', 'bg-slate-800'); // Be careful with bg-white! Let's restrict it later if needed, but App.tsx has some bg-white/40 which becomes bg-white/40 dark:bg-slate-800/40.
replaceClass('bg-white\\/[0-9]+', 'bg-slate-800\\/40'); // Wait, replacing bg-white is tricky

// Let's manually replace some white contexts:
code = code.replace(/bg-white\b(?!.*dark:bg-)/g, 'bg-white dark:bg-slate-800');
// Remove duplicates cleanly if they crept in:
code = code.replace(/dark:dark:/g, 'dark:');

fs.writeFileSync('src/App.tsx', code);
console.log('Patched App.tsx');
