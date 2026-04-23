import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

function replaceClass(baseClass: string, darkClass: string) {
  const regex = new RegExp(`(?<!dark:)([a-z-]*:)?${baseClass}(?!\\s+dark:\\1${darkClass})`, 'g');
  code = code.replace(regex, (match, prefix) => {
    prefix = prefix || '';
    return `${match} dark:${prefix}${darkClass}`;
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

// Fix accidental duals
code = code.replace(/text-slate-800 dark:text-slate-200 dark:text-slate-300/g, 'text-slate-800 dark:text-slate-300');
code = code.replace(/text-slate-700 dark:text-slate-300 dark:text-slate-300/g, 'text-slate-700 dark:text-slate-300');
code = code.replace(/dark:dark:/g, 'dark:');

// Special cases from recent edits that got messed up if any
fs.writeFileSync('src/App.tsx', code);
console.log('Patched App.tsx');
