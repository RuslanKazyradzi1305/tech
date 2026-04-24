import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(/dark:[a-zA-Z0-9\-\/]+/g, '');
content = content.replace(/const \[darkMode, setDarkMode\] = useState\(false\);/g, '');
content = content.replace(/const isDark = localStorage\.getItem\('darkMode'\) === 'true';/g, '');
content = content.replace(/if \(isDark\) \{\s*document\.documentElement\.classList\.add\('dark'\);\s*setDarkMode\(true\);\s*\}/g, '');
content = content.replace(/const toggleDarkMode = \(\) => \{[\s\S]*?\};\n/g, '');
content = content.replace(/<button\s*onClick=\{toggleDarkMode\}[\s\S]*?<\/button>\s*/g, '');
content = content.replace(/<AnimatePresence mode="wait">/g, ''); // Fix any leftover broken tags
content = content.replace(/className="\s+/g, 'className="'); // Cleanup extra spaces

fs.writeFileSync('src/App.tsx', content);

let cssContent = fs.readFileSync('src/index.css', 'utf-8');
cssContent = cssContent.replace(/\.dark \..*?\{[\s\S]*?\}/g, '');
cssContent = cssContent.replace(/\.dark .*?\{[\s\S]*?\}/g, '');
fs.writeFileSync('src/index.css', cssContent);

console.log("Dark mode removed successfully.");
