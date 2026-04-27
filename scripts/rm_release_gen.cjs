const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Recall Map Release Generator
 * Converts recall map JSON data into a formatted interactive HTML mindmap.
 * Uses templates/rm-shell-master.html as the base structure.
 * 
 * Usage: node scripts/rm_release_gen.cjs [input_json_path] [output_html_path]
 */

const BASE_DIR = path.resolve(__dirname, '..');
const TEMPLATE_PATH = path.join(BASE_DIR, 'templates/rm-shell-master.html');

function resolvePath(p) {
    return path.isAbsolute(p) ? p : path.resolve(BASE_DIR, p);
}

function generateHtml(data, indexPath = "index.html") {
    if (!fs.existsSync(TEMPLATE_PATH)) {
        throw new Error(`Template not found at ${TEMPLATE_PATH}`);
    }

    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    const level = data.level || "";
    const part = data.part || "";
    const treeData = data.tree || {};

    // Sort main branches: stories -> grammar -> vocab
    if (treeData.children) {
        const orderMap = {
            'stories': 1,
            'grammar': 2,
            'vocab': 3
        };
        treeData.children.sort((a, b) => {
            const orderA = orderMap[a.id] || 99;
            const orderB = orderMap[b.id] || 99;
            return orderA - orderB;
        });
    }

    // Preprocess tree to ensure all nodes have IDs and state: "hidden" except root
    let nodeCounter = 0;
    function preprocess(node, isRoot = false) {
        if (!node) return;
        
        // Ensure every node has an ID for tracking/collapsing
        if (!node.id) {
            node.id = `node_${++nodeCounter}`;
        }

        if (!isRoot) {
            node.state = 'hidden';
        } else if (!node.state) {
            node.state = 'full';
        }
        if (node.children) {
            node.children.forEach(child => preprocess(child, false));
        }
    }
    preprocess(treeData, true);

    return template
        .replace(/{{PART}}/g, part)
        .replace(/{{LEVEL}}/g, level)
        .replace(/{{TREE_DATA}}/g, JSON.stringify(treeData, null, 2))
        .replace(/{{INDEX_PATH}}/g, indexPath);
}

async function generate(jsonPath, outputPath) {
    try {
        const absoluteInputPath = resolvePath(jsonPath);
        const absoluteOutputPath = resolvePath(outputPath);

        if (!fs.existsSync(absoluteInputPath)) {
            console.error(`❌ Input file not found: ${absoluteInputPath}`);
            return;
        }

        console.log(`Processing ${jsonPath}...`);
        const jsonData = JSON.parse(fs.readFileSync(absoluteInputPath, 'utf8'));

        // Calculate indexPath
        const bookFolder = path.basename(path.dirname(path.dirname(absoluteInputPath)));
        const bookRoot = path.join(BASE_DIR, bookFolder);
        const indexPath = path.join(path.relative(path.dirname(absoluteOutputPath), bookRoot), 'index.html');

        const htmlContent = generateHtml(jsonData, indexPath);

        const outputDir = path.dirname(absoluteOutputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(absoluteOutputPath, htmlContent, 'utf8');
        console.log(`✅ Successfully generated: ${absoluteOutputPath}`);
    } catch (error) {
        console.error(`❌ Error processing ${jsonPath}:`, error.message);
    }
}

async function checkboxSelector(message, options, defaultSelected = false) {
    return new Promise((resolve) => {
        const choices = options.map(o => ({ name: o, selected: defaultSelected }));
        let cursor = 0;
        const render = () => {
            process.stdout.write('\x1B[?25l\x1B[H\x1B[J');
            console.log(`\n${message}\n (Use space to toggle, "a" to select all, enter to confirm)\n`);
            choices.forEach((choice, i) => console.log(`${i === cursor ? '> ' : '  '}${choice.selected ? '[x]' : '[ ]'} ${choice.name}`));
        };
        const onKeyPress = (str, key) => {
            if (key.name === 'up') cursor = (cursor - 1 + choices.length) % choices.length;
            else if (key.name === 'down') cursor = (cursor + 1) % choices.length;
            else if (key.name === 'space') choices[cursor].selected = !choices[cursor].selected;
            else if (key.name === 'a') { const all = choices.every(c => c.selected); choices.forEach(c => c.selected = !all); }
            else if (key.name === 'return') { cleanup(); resolve(choices.filter(c => c.selected).map(c => c.name)); }
            else if (key.ctrl && key.name === 'c') { cleanup(); process.exit(); }
            render();
        };
        const cleanup = () => { 
            process.stdin.removeListener('keypress', onKeyPress); 
            if (process.stdin.isTTY) process.stdin.setRawMode(false); 
            process.stdin.pause(); 
            process.stdout.write('\x1B[?25h\n'); 
        };
        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('keypress', onKeyPress);
        render();
    });
}

async function interactive() {
    const dataDir = resolvePath('data');
    if (!fs.existsSync(dataDir)) {
        console.error("❌ Data directory not found.");
        return;
    }

    const folders = fs.readdirSync(dataDir).filter(f => fs.statSync(path.join(dataDir, f)).isDirectory());
    const selectedFolders = await checkboxSelector('Select folders to process:', folders);
    if (selectedFolders.length === 0) return;

    let filesToProcess = [];

    const getFilesFromFolder = (folderName) => {
        const folderPath = path.join(dataDir, folderName);
        const results = [];
        const entries = fs.readdirSync(folderPath);
        
        entries.forEach(entry => {
            const fullPath = path.join(folderPath, entry);
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                const subFiles = fs.readdirSync(fullPath).filter(f => f.endsWith('-recall-map.json'));
                subFiles.forEach(subFile => {
                    results.push(path.join(entry, subFile));
                });
            } else if (entry.endsWith('-recall-map.json')) {
                results.push(entry);
            }
        });
        return results;
    };

    if (selectedFolders.length === 1) {
        const folder = selectedFolders[0];
        const allFiles = getFilesFromFolder(folder);
        if (allFiles.length === 0) {
            console.log(`No recall-map.json files found in ${folder}.`);
            process.exit(0);
        }
        const selectedFiles = await checkboxSelector(`Select files in ${folder}:`, allFiles, true);
        filesToProcess = selectedFiles.map(f => ({ folder, file: f }));
    } else {
        selectedFolders.forEach(folder => {
            const files = getFilesFromFolder(folder);
            filesToProcess.push(...files.map(f => ({ folder, file: f })));
        });
    }

    if (filesToProcess.length === 0) {
        console.log("No JSON files found to process.");
        process.exit(0);
    }

    for (const task of filesToProcess) {
        const inputJson = path.join('data', task.folder, task.file);
        const outputHtml = path.join(task.folder, task.file.replace(".json", ".html"));
        await generate(inputJson, outputHtml);
    }
    
    console.log("\n✨ All tasks completed.");
    process.exit(0);
}

const args = process.argv.slice(2);
if (args.length === 0) {
    interactive();
} else if (args.length >= 2) {
    generate(args[0], args[1]);
} else {
    console.error('❌ Usage: node scripts/rm_release_gen.cjs [input_json_path] [output_html_path]');
    process.exit(1);
}
