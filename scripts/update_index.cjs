const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Natural sort key generator.
 */
function naturalSortKey(s) {
    if (typeof s === 'object' && s !== null && s.name) {
        s = s.name;
    }
    return s.split(/(\d+)/).map(text => {
        const num = parseInt(text, 10);
        return isNaN(num) ? text.toLowerCase() : num;
    });
}

/**
 * Compare function for natural sorting.
 */
function naturalCompare(a, b) {
    const keyA = naturalSortKey(a);
    const keyB = naturalSortKey(b);
    for (let i = 0; i < Math.min(keyA.length, keyB.length); i++) {
        if (keyA[i] < keyB[i]) return -1;
        if (keyA[i] > keyB[i]) return 1;
    }
    return keyA.length - keyB.length;
}

/**
 * Scans for HTML files and removes corresponding PDF files if they exist.
 */
function cleanRedundantPdfs() {
    const walk = (dir) => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                if (item === '.git') continue;
                walk(fullPath);
            } else if (item.endsWith('.html')) {
                const pdfPath = fullPath.replace(/\.html$/, '.pdf');
                if (fs.existsSync(pdfPath)) {
                    console.log(`Removing redundant PDF: ${pdfPath}`);
                    try {
                        fs.unlinkSync(pdfPath);
                        try {
                            execSync(`git rm --cached "${pdfPath}"`, { stdio: 'ignore' });
                        } catch (e) {}
                    } catch (e) {
                        console.error(`Error removing ${pdfPath}: ${e.message}`);
                    }
                }
            }
        }
    };
    walk('.');
}

/**
 * Removes index.html files that are deeper than level 1 (textbook folder).
 */
function cleanRedundantIndices() {
    const exclude = ['.git', 'node_modules', 'temp', 'v2', 'api', 'data', 'scripts'];
    const walk = (dir, depth = 0) => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                if (exclude.includes(item)) continue;
                walk(fullPath, depth + 1);
            } else if (item === 'index.html') {
                if (depth > 1) {
                    console.log(`Removing redundant index: ${fullPath}`);
                    fs.unlinkSync(fullPath);
                }
            }
        }
    };
    walk('.');
}

/**
 * Gets HTML files in a specific directory recursively.
 */
function getHtmlFilesInDirectory(directory, excludeDirs = []) {
    const htmlFiles = [];
    if (!fs.existsSync(directory)) return htmlFiles;
    
    const scanDir = (dir, relPathPrefix = '') => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            if (excludeDirs.includes(item)) continue;
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            const relPath = path.join(relPathPrefix, item);
            
            if (stat.isDirectory()) {
                scanDir(fullPath, relPath);
            } else if (item.endsWith('.html') && item !== 'index.html') {
                htmlFiles.push({
                    path: relPath,
                    name: item,
                    mtime: stat.mtimeMs
                });
            }
        }
    };

    scanDir(directory);
    return htmlFiles;
}

function generateRecursiveIndex(folderPath, title, isRoot = false) {
    const exclude = ['.git', 'scripts', 'data', 'templates', 'release', 'temp', 'node_modules', 'v2', 'api'];
    const files = getHtmlFilesInDirectory(folderPath, isRoot ? exclude : []);
    const sortedFiles = [...files].sort(naturalCompare);
    
    // Build Tree
    const root = { folders: {}, files: [] };
    for (const f of sortedFiles) {
        const parts = f.path.split(path.sep);
        let current = root;
        for (let i = 0; i < parts.length - 1; i++) {
            const folderName = parts[i];
            if (!current.folders[folderName]) {
                current.folders[folderName] = { folders: {}, files: [] };
            }
            current = current.folders[folderName];
        }
        current.files.push(f);
    }

    function renderNode(node, name, depth = 0) {
        let html = '';
        const folderNames = Object.keys(node.folders).sort(naturalCompare);
        const nodeFiles = [...node.files].sort(naturalCompare);
        
        if (depth === 0) {
            for (const folderName of folderNames) {
                html += renderNode(node.folders[folderName], folderName, depth + 1);
            }
            for (const f of nodeFiles) {
                html += `            <li><a href="${f.path}">${f.name}</a></li>\n`;
            }
        } else {
            const folderID = name.toUpperCase().replace(/\s+/g, '-');
            html += `            <li><span class="folder folder-toggle" data-unit="${folderID}">${name}</span> <span class="file-count"></span>\n`;
            html += '                <ul class="collapsed">\n';
            
            for (const folderName of folderNames) {
                html += renderNode(node.folders[folderName], folderName, depth + 1);
            }
            for (const f of nodeFiles) {
                html += `                    <li><a href="${f.path}" onclick="saveLastUnit('${folderID}')">${f.name}</a></li>\n`;
            }
            
            html += '                </ul>\n';
            html += '            </li>\n';
        }
        return html;
    }

    const listHtml = '<div class="tree"><ul>\n' + renderNode(root, '', 0) + '        </ul></div>';
    const backLink = isRoot ? "" : '<p><a href="../index.html">← Back to Parent Index</a></p>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} Index</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1, h2 {
            color: #2c3e50;
        }
        .section {
            margin-bottom: 40px;
            background: #f9f9f9;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #eee;
        }
        ul {
            list-style-type: none;
            padding-left: 0;
        }
        li {
            margin-bottom: 8px;
        }
        a {
            text-decoration: none;
            color: #0366d6;
            font-weight: bold;
        }
        a:hover {
            text-decoration: underline;
        }
        /* Tree styles */
        .tree ul {
            padding-left: 20px;
        }
        .tree li {
            position: relative;
        }
        .folder {
            font-weight: bold;
            color: #444;
            cursor: pointer;
        }
        .folder-toggle {
            cursor: pointer;
        }
        .file-count {
            font-weight: normal;
            font-style: italic;
            color: #888;
        }
        .collapsed {
            display: none;
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${backLink}
    <div class="section">
        <h2>Files and Folders</h2>
        ${listHtml}
    </div>

    <script>
        function saveLastUnit(unit) {
            localStorage.setItem('last-unit-' + window.location.pathname, unit);
        }

        document.addEventListener('DOMContentLoaded', function () {
            const folders = document.querySelectorAll('.folder-toggle');
            const lastUnit = localStorage.getItem('last-unit-' + window.location.pathname);

            folders.forEach(folder => {
                const sublist = folder.nextElementSibling.nextElementSibling;
                if (sublist && sublist.tagName === 'UL') {
                    const fileCount = Array.from(sublist.children).reduce((acc, child) => {
                        if (child.querySelector('a')) return acc + 1;
                        if (child.querySelector('.folder-toggle')) return acc + 1;
                        return acc;
                    }, 0);
                    
                    const fileCountSpan = folder.nextElementSibling;
                    fileCountSpan.textContent = \`(\${fileCount} items)\`;

                    const unit = folder.getAttribute('data-unit');
                    if (unit === lastUnit) {
                        sublist.classList.remove('collapsed');
                        let parent = sublist.parentElement;
                        while (parent && parent.tagName !== 'BODY') {
                            if (parent.tagName === 'UL') parent.classList.remove('collapsed');
                            parent = parent.parentElement;
                        }
                    }

                    folder.addEventListener('click', () => {
                        sublist.classList.toggle('collapsed');
                        if (!sublist.classList.contains('collapsed')) {
                            saveLastUnit(unit);
                        } else if (localStorage.getItem('last-unit-' + window.location.pathname) === unit) {
                            localStorage.removeItem('last-unit-' + window.location.pathname);
                        }
                    });
                }
            });
        });
    </script>
</body>
</html>`;
    fs.writeFileSync(path.join(folderPath, 'index.html'), html);
}

function main() {
    cleanRedundantPdfs();
    cleanRedundantIndices();

    // Generate main root index.html using the recursive tree view
    generateRecursiveIndex('.', 'English Practices', true);

    // Generate index.html for each textbook folder
    const excludeFolders = ['.git', 'scripts', 'release', 'data', 'templates', 'temp', 'node_modules', 'v2', 'api'];
    const items = fs.readdirSync('.').filter(d => {
        const stat = fs.statSync(d);
        return stat.isDirectory() && !d.startsWith('.') && !excludeFolders.includes(d);
    });

    for (const folder of items) {
        const htmlFiles = getHtmlFilesInDirectory(folder);
        if (htmlFiles.length > 0) {
            generateRecursiveIndex(folder, `${folder} Practices`);
        }
    }

    // Export textbook list for V2 app
    const textbooksPath = path.join('v2', 'public', 'textbooks.json');
    if (fs.existsSync('v2/public')) {
        fs.writeFileSync(textbooksPath, JSON.stringify(items, null, 2));
        console.log(`Generated dynamic dataset list: ${textbooksPath}`);
    }
}

main();
