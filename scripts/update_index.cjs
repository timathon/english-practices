const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Natural sort key generator.
 * Splitting strings into parts of digits and non-digits.
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
                        // Attempt to remove from git index just in case it was staged
                        try {
                            execSync(`git rm --cached "${pdfPath}"`, { stdio: 'ignore' });
                        } catch (e) {
                            // Ignore git errors
                        }
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
 * Gets all HTML files recursively, excluding certain directories.
 */
function getHtmlFiles(baseDir = '.') {
    const htmlFiles = [];
    const exclude = ['.git', 'scripts', 'data', 'templates', 'release', 'temp', 'node_modules'];

    const walk = (dir) => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            if (exclude.includes(item)) continue;
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                walk(fullPath);
            } else if (item.endsWith('.html') && item !== 'index.html') {
                const relPath = path.relative(baseDir, fullPath);
                htmlFiles.push({
                    path: relPath,
                    name: item,
                    mtime: stat.mtimeMs
                });
            }
        }
    };
    walk(baseDir);
    return htmlFiles;
}

/**
 * Gets HTML files in a specific directory (non-recursive).
 */
function getHtmlFilesInDirectory(directory) {
    const htmlFiles = [];
    if (!fs.existsSync(directory)) return htmlFiles;
    const items = fs.readdirSync(directory);
    for (const item of items) {
        const fullPath = path.join(directory, item);
        const stat = fs.statSync(fullPath);
        if (!stat.isDirectory() && item.endsWith('.html') && item !== 'index.html') {
            htmlFiles.push({
                path: item,
                name: item,
                mtime: stat.mtimeMs
            });
        }
    }
    return htmlFiles;
}

function generateLatestSection(files) {
    const sortedFiles = [...files].sort((a, b) => b.mtime - a.mtime).slice(0, 10);
    let html = '    <div class="section">\n';
    html += '        <h2>Latest Practices</h2>\n';
    html += '        <ul id="latest-list">\n';
    for (const f of sortedFiles) {
        html += `            <li><a href="${f.path}">${f.name}</a></li>\n`;
    }
    html += '        </ul>\n';
    html += '    </div>';
    return html;
}

function buildTree(files) {
    const tree = {};
    for (const f of files) {
        const parts = f.path.split(path.sep);
        let current = tree;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) current[part] = {};
            current = current[part];
        }
        if (!current.__files__) current.__files__ = [];
        current.__files__.push(f);
    }
    return tree;
}

function renderTree(tree) {
    let lines = [];
    const keys = Object.keys(tree).filter(k => k !== '__files__').sort();

    for (const name of keys) {
        lines.push(`    <li><span class="folder folder-toggle">${name}</span> <span class="file-count"></span>`);
        lines.push('<ul class="collapsed">');
        lines = lines.concat(renderTree(tree[name]));
        lines.push('</ul>');
        lines.push('    </li>');
    }

    if (tree.__files__) {
        const sortedFiles = [...tree.__files__].sort(naturalCompare);
        for (const f of sortedFiles) {
            lines.push(`    <li><a href="${f.path}">${f.name}</a></li>`);
        }
    }
    return lines;
}

function generateTreeSection(files) {
    const tree = buildTree(files);
    const treeContent = renderTree(tree);
    let html = '    <div class="section">\n';
    html += '        <h2>All Practices (Tree View)</h2>\n';
    html += '        <div class="tree">\n';
    html += '<ul>\n';
    html += treeContent.join('\n');
    html += '\n</ul>\n';
    html += '        </div>\n';
    html += '    </div>';
    return html;
}

function generateFolderIndex(folderPath, title) {
    const files = getHtmlFilesInDirectory(folderPath);
    const sortedFiles = [...files].sort(naturalCompare);
    
    const groups = {};
    for (const f of sortedFiles) {
        // Group by unit/module prefix like A7B-U1 or a6b-m1
        const match = f.name.match(/^([a-zA-Z0-9]+-[uUmM]\d+)/i);
        const unit = match ? match[1].toUpperCase() : 'General';
        if (!groups[unit]) groups[unit] = [];
        groups[unit].push(f);
    }

    const groupKeys = Object.keys(groups).sort(naturalCompare);
    
    let listHtml = '<div class="tree"><ul>\n';
    for (const unit of groupKeys) {
        const unitFiles = groups[unit];
        if (unit === 'General' && groupKeys.length === 1) {
            // If only general, render flat list
            for (const f of unitFiles) {
                listHtml += `            <li><a href="${f.path}">${f.name}</a></li>\n`;
            }
        } else {
            listHtml += `            <li><span class="folder folder-toggle" data-unit="${unit}">${unit}</span> <span class="file-count"></span>\n`;
            listHtml += '                <ul class="collapsed">\n';
            for (const f of unitFiles) {
                listHtml += `                    <li><a href="${f.path}" onclick="saveLastUnit('${unit}')">${f.name}</a></li>\n`;
            }
            listHtml += '                </ul>\n';
            listHtml += '            </li>\n';
        }
    }
    listHtml += '        </ul></div>';

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
    <p><a href="../index.html">Back to Main Index</a></p>
    <div class="section">
        <h2>Files in this folder</h2>
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
                    const fileCount = sublist.children.length;
                    const fileCountSpan = folder.nextElementSibling;
                    fileCountSpan.textContent = \`(\${fileCount} files)\`;

                    const unit = folder.getAttribute('data-unit');
                    if (unit === lastUnit) {
                        sublist.classList.remove('collapsed');
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

function generateFullIndex(filePath, files, title, backLink = null) {
    const latestHtml = generateLatestSection(files);
    const treeHtml = generateTreeSection(files);
    const backHtml = backLink ? `<p><a href="${backLink}">Back to Main Site</a></p>` : "";

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
    ${backHtml}

${latestHtml}

${treeHtml}

    <script>
        function saveLastFolder(path) {
            localStorage.setItem('last-folder-' + window.location.pathname, path);
        }

        document.addEventListener('DOMContentLoaded', function () {
            const folders = document.querySelectorAll('.folder-toggle');
            const lastFolder = localStorage.getItem('last-folder-' + window.location.pathname);

            folders.forEach(folder => {
                const sublist = folder.nextElementSibling.nextElementSibling;
                if (sublist && sublist.tagName === 'UL') {
                    const fileCount = sublist.children.length;
                    const fileCountSpan = folder.nextElementSibling;
                    fileCountSpan.textContent = \`(\${fileCount} files)\`;

                    // Simple way to get the folder "path" or name
                    const folderName = folder.textContent;
                    if (folderName === lastFolder) {
                        sublist.classList.remove('collapsed');
                        // Expand parents too if it was nested (though here tree is shallow)
                    }

                    folder.addEventListener('click', () => {
                        sublist.classList.toggle('collapsed');
                        if (!sublist.classList.contains('collapsed')) {
                            saveLastFolder(folderName);
                        } else if (localStorage.getItem('last-folder-' + window.location.pathname) === folderName) {
                            localStorage.removeItem('last-folder-' + window.location.pathname);
                        }
                    });
                }
            });

            // Also handle links in Latest section if possible, though they are flat
        });
    </script>
</body>
</html>`;
    fs.writeFileSync(filePath, html);
}

function main() {
    cleanRedundantPdfs();

    // Generate main index.html
    const files = getHtmlFiles('.');
    generateFullIndex('index.html', files, 'English Practices');

    // Generate index.html for root subfolders
    const excludeFolders = ['.git', 'scripts', 'release', 'data', 'templates', 'temp', 'node_modules'];
    const subfolders = fs.readdirSync('.').filter(d => {
        const stat = fs.statSync(d);
        return stat.isDirectory() && !d.startsWith('.') && !excludeFolders.includes(d);
    });

    for (const folder of subfolders) {
        generateFolderIndex(folder, `${folder} Practices`);
    }
}

main();
