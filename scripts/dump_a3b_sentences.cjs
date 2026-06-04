const fs = require('fs');
const path = require('path');

function traverse(node, list) {
    if (!node.children || node.children.length === 0) {
        list.push({ id: node.id, text: node.text, cn: node.cn, emoji: node.emoji });
        return;
    }
    for (const child of node.children) {
        traverse(child, list);
    }
}

let output = '';
for (let u = 1; u <= 6; u++) {
    const dir = path.join(__dirname, '..', 'data', 'A3B', `a3b-u${u}`);
    if (!fs.existsSync(dir)) continue;
    output += `=== Unit ${u} ===\n`;
    const files = fs.readdirSync(dir).filter(f => f.includes('text-navigator') && f.endsWith('.json')).sort();
    for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
        const list = [];
        traverse(data.tree, list);
        output += `  File: ${file} (${list.length} sentences)\n`;
        list.forEach(s => {
            output += `    - ID: ${s.id} | ${s.text} (${s.cn})\n`;
        });
    }
}

fs.writeFileSync(path.join(__dirname, 'sentences_output.txt'), output, 'utf8');
console.log("Done writing to sentences_output.txt");
