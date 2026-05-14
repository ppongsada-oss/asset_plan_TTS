const fs = require('fs');
const file = 'node_modules/drizzle-kit/bin.cjs';
let data = fs.readFileSync(file, 'utf8');
// Fix all .endsWith('.json') to also exclude macos hidden files
data = data.replace(/(\w+)\.endsWith\((['"])\.json\2\)/g, '$1.endsWith(".json") && !$1.startsWith(".") && !$1.includes("._")');
fs.writeFileSync(file, data);
console.log("Patched drizzle-kit/bin.cjs successfully.");
