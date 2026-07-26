const fs = require('fs');
const path = require('path');

const dir = '/home/timathon/codes/smartedu/english-practices/data/A7B/a7b-workbooks/a7b-re-old';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

let output = '';

files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const q4 = data.questions.find(q => q.type === 'sentence-ordering' || q.number === 44 || q.blocks);
  if (q4 && q4.blocks) {
    const correctBlocks = q4.blocks.filter(b => b.isCorrect);
    output += `File: ${file}\n`;
    output += `Prompt: ${q4.prompt}\n`;
    correctBlocks.forEach(b => {
      output += `- ${b.role}: ${b.text}\n`;
    });
    output += '\n';
  }
});

fs.writeFileSync('/home/timathon/codes/smartedu/english-practices/data/A7B/a7b-workbooks/a7b-re-old/extract.txt', output);
console.log('Done');
