#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Extract the file path from command line arguments
const fileArg = process.argv[2];
if (!fileArg) {
    console.error('\x1b[31m%s\x1b[0m', 'Error: Please provide a JSON file path.');
    console.log('Usage: node scripts/tn.cjs <path-to-json-file>');
    process.exit(1);
}

const filePath = path.resolve(process.cwd(), fileArg);

// Ensure the file exists
if (!fs.existsSync(filePath)) {
    console.error('\x1b[31m%s\x1b[0m', `Error: File not found at ${filePath}`);
    process.exit(1);
}

const server = http.createServer((req, res) => {
    // Serve the main HTML application
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(htmlContent);
    } 
    // API: Get JSON data
    else if (req.method === 'GET' && req.url === '/api/data') {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) { 
                res.writeHead(500); 
                return res.end(JSON.stringify({ error: 'Failed to read file.' })); 
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
        });
    } 
    // API: Save JSON data
    else if (req.method === 'POST' && req.url === '/api/data') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            fs.writeFile(filePath, body, 'utf8', err => {
                if (err) { 
                    res.writeHead(500); 
                    return res.end(JSON.stringify({ error: 'Failed to write file.' })); 
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            });
        });
    } 
    // API: Run Gemini audit on JSON data
    else if (req.method === 'POST' && req.url === '/api/audit') {
        const auditScript = path.join(__dirname, 'genai', 'audit_tn_nodes.py');
        console.log(`Running audit script on ${filePath}...`);
        exec(`python3 "${auditScript}" "${filePath}"`, (err, stdout, stderr) => {
            if (err) {
                console.error('Audit script error:', stderr || err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: stderr || err.message }));
            }
            console.log('Audit completed successfully.');
            // Read updated file and return it
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(500);
                    return res.end(JSON.stringify({ error: 'Failed to read audited file.' }));
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data);
            });
        });
    }
    // Fallback 404
    else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('\x1b[32m%s\x1b[0m', `🚀 Mind Map Editor running at http://localhost:${PORT}/`);
    console.log(`Editing file: ${filePath}`);
    console.log('Press Ctrl+C to stop the server.');
});

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Text Navigator - Mind Map Editor</title>
    <style>
        :root {
            --bg-color: #f8fafc;
            --surface-color: #ffffff;
            --text-main: #0f172a;
            --text-muted: #64748b;
            --primary: #3b82f6;
            --primary-hover: #2563eb;
            --border: #e2e8f0;
            --danger: #ef4444;
            --success: #10b981;
            --tree-line: #cbd5e1;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --bg-color: #0f172a;
                --surface-color: #1e293b;
                --text-main: #f8fafc;
                --text-muted: #94a3b8;
                --border: #334155;
                --tree-line: #475569;
            }
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            line-height: 1.5;
            padding-top: 60px; /* Space for fixed toolbar */
        }

        #toolbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 60px;
            background-color: var(--surface-color);
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            padding: 0 20px;
            z-index: 1000;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            gap: 12px;
        }

        .title { font-weight: 600; font-size: 1.1rem; margin-right: auto; }
        
        button {
            background-color: var(--surface-color);
            border: 1px solid var(--border);
            color: var(--text-main);
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s;
        }
        button:hover:not(:disabled) { background-color: var(--border); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        button.primary { background-color: var(--primary); color: white; border-color: var(--primary); }
        button.primary:hover:not(:disabled) { background-color: var(--primary-hover); }

        #status { font-size: 0.85rem; color: var(--text-muted); margin-left: 15px; }

        #app { padding: 30px; max-width: 1200px; margin: 0 auto; }

        .section-container { margin-bottom: 40px; }
        .section-title { font-size: 1.5rem; margin-bottom: 15px; color: var(--primary); border-bottom: 2px solid var(--border); padding-bottom: 5px; }

        .node-container { margin-left: 25px; position: relative; }
        
        .node-container::before {
            content: "";
            position: absolute;
            top: 0;
            left: -15px;
            bottom: 0;
            width: 2px;
            background-color: var(--tree-line);
        }
        .node-container > .node-content::before {
            content: "";
            position: absolute;
            top: 20px;
            left: -15px;
            width: 15px;
            height: 2px;
            background-color: var(--tree-line);
        }
        .node-container:last-child::before { bottom: auto; height: 20px; }

        .node-content {
            display: flex;
            align-items: flex-start;
            background-color: var(--surface-color);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 10px 15px;
            margin-bottom: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.02);
            transition: border-color 0.2s, box-shadow 0.2s, border-width 0.1s;
            position: relative;
        }
        
        .node-content:hover { border-color: var(--primary); box-shadow: 0 2px 5px rgba(59, 130, 246, 0.1); }

        .node-content.drag-before {
            border-top: 4px solid var(--primary) !important;
            background-color: rgba(59, 130, 246, 0.05);
        }
        .node-content.drag-after {
            border-bottom: 4px solid var(--primary) !important;
            background-color: rgba(59, 130, 246, 0.05);
        }
        .node-content.drag-child {
            border: 2px dashed var(--primary) !important;
            background-color: rgba(59, 130, 246, 0.1);
        }

        .drag-handle { cursor: grab; color: var(--text-muted); margin: 2px 10px 0 5px; font-size: 1.1rem; user-select: none; }
        .drag-handle:active { cursor: grabbing; }

        .node-cb { margin-top: 6px; cursor: pointer; width: 16px; height: 16px; }

        .node-body { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .node-text-wrapper { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .node-emoji { font-size: 1.2rem; }
        .node-text { font-size: 1rem; color: var(--text-main); word-break: break-word; }
        .node-cn { font-size: 0.85rem; color: var(--text-muted); }

        .node-actions { display: flex; gap: 6px; opacity: 0; transition: opacity 0.2s; margin-left: 10px; flex-wrap: wrap; }
        .node-content:hover .node-actions { opacity: 1; }
        .node-actions button { padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; }

        .btn-move-up, .btn-move-down {
            background-color: var(--bg-color);
            border-color: var(--tree-line);
        }
        .btn-move-up:hover, .btn-move-down:hover {
            color: var(--primary);
            border-color: var(--primary);
        }

        .node-children { margin-top: 4px; }
        .hidden { display: none !important; }

        .modal-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex; align-items: center; justify-content: center;
            z-index: 2000;
        }
        .modal-content {
            background: var(--surface-color); padding: 24px;
            border-radius: 8px; width: 450px; max-width: 90%;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            border: 1px solid var(--border);
        }
        .modal-content h3 { margin-bottom: 12px; font-size: 1.25rem; }
        .modal-content p { margin-bottom: 20px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 0.9rem; }
        .form-group textarea, .form-group input {
            width: 100%; padding: 10px; border: 1px solid var(--border);
            border-radius: 6px; background: var(--bg-color); color: var(--text-main);
            font-family: inherit; resize: vertical;
        }
        .form-group textarea:focus, .form-group input:focus {
            outline: none; border-color: var(--primary);
        }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }

        .sentence-box {
            background-color: var(--bg-color);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 10px 12px;
            font-size: 0.85rem;
            position: relative;
            user-select: none;
            transition: all 0.2s;
        }
        .sentence-box.drag-sentence {
            cursor: grab;
            border-left: 3px solid var(--primary);
        }
        .sentence-box.drag-sentence:hover {
            box-shadow: 0 2px 4px rgba(0,0,0,0.08);
            background-color: var(--surface-color);
        }
        .sentence-box.drag-sentence:active {
            cursor: grabbing;
        }
        
        .group-card {
            background-color: var(--surface-color);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            transition: all 0.2s;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .group-card.drag-over {
            border: 2px dashed var(--primary) !important;
            background-color: rgba(59, 130, 246, 0.05);
        }
        
        #split-sentences-list {
            transition: border-color 0.2s;
        }
    </style>
</head>
<body>
    <div id="toolbar">
        <div class="title">Text Navigator Editor</div>
        <button id="btn-undo" title="Undo last change" disabled>↩ Undo</button>
        <button id="btn-group" title="Create a new parent node for selected items">📁 Group Selected</button>
        <button id="btn-merge" title="Merge selected sibling nodes into one">🔗 Merge Selected</button>
        <button id="btn-delete-selected" style="color: var(--danger); border-color: var(--danger);">🗑 Delete Selected</button>
        <button class="primary" id="btn-save">💾 Save to Disk</button>
        <button id="btn-audit" style="background: var(--success); color: white; border-color: var(--success); font-weight: bold;">🤖 Audit with Gemini</button>
        <span id="status">Loading...</span>
    </div>

    <div id="app"></div>

    <!-- Modals -->
    <div id="msg-modal" class="modal-overlay hidden">
        <div class="modal-content">
            <h3 id="msg-title">Notification</h3>
            <p id="msg-text"></p>
            <div class="modal-actions">
                <button id="msg-btn-ok" class="primary">OK</button>
            </div>
        </div>
    </div>

    <div id="confirm-modal" class="modal-overlay hidden">
        <div class="modal-content">
            <h3>Confirm</h3>
            <p id="confirm-text"></p>
            <div class="modal-actions">
                <button id="confirm-btn-cancel">Cancel</button>
                <button id="confirm-btn-yes" class="primary" style="background: var(--danger); border-color: var(--danger);">Yes, Delete</button>
            </div>
        </div>
    </div>

    <div id="edit-modal" class="modal-overlay hidden">
        <div class="modal-content">
            <h3>Edit Node</h3>
            <div class="form-group">
                <label>Text</label>
                <textarea id="edit-node-text" rows="3"></textarea>
            </div>
            <div class="form-group">
                <label>Translation (CN)</label>
                <textarea id="edit-node-cn" rows="2"></textarea>
            </div>
            <div class="form-group">
                <label>Emoji</label>
                <input type="text" id="edit-node-emoji">
            </div>
            <div class="modal-actions">
                <button id="edit-btn-cancel">Cancel</button>
                <button id="edit-btn-save" class="primary">Save Changes</button>
            </div>
        </div>
    </div>

    <div id="split-modal" class="modal-overlay hidden">
        <div class="modal-content" style="width: 900px; max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column;">
            <h3 style="margin-bottom: 4px;">Split & Drag Sentence Groups</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
                Drag sentences from the left deck or existing cards and drop them into custom Group blocks to arrange phrases. Move groups left/right to structure nesting!
            </p>
            
            <div style="display: grid; grid-template-columns: 320px 1fr; gap: 20px; flex: 1; overflow-y: auto; min-height: 350px; max-height: 60vh; padding: 4px;">
                <div style="border-right: 1px solid var(--border); padding-right: 15px; display: flex; flex-direction: column;">
                    <h4 style="font-size: 0.95rem; margin-bottom: 10px; color: var(--primary); font-weight: 600;">1. Sentence Deck</h4>
                    <div id="split-sentences-list" style="flex: 1; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; padding: 8px; min-height: 100px; border-radius: 6px;">
                        <!-- Sentences loaded dynamically -->
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; overflow-y: auto; padding-right: 4px;">
                    <div id="split-groups-preview" style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- Dynamic Groups layout loaded here -->
                    </div>
                </div>
            </div>

            <div class="modal-actions" style="margin-top: 15px; border-top: 1px solid var(--border); padding-top: 12px; display: flex; justify-content: flex-end; gap: 10px;">
                <button id="split-btn-cancel">Cancel</button>
                <button id="split-btn-apply" class="primary">Apply Split & Group</button>
            </div>
        </div>
    </div>

    <script>
        let appData = null;
        let draggedIds = [];
        let editingNodeId = null;
        let confirmCallback = null;
        
        // Undo configuration
        let undoStack = [];
        const MAX_UNDO_DEPTH = 50;
        
        let splitState = {
            nodeId: null,
            originalNode: null,
            parent: null,
            sentences: [],
            assignments: [], 
            groups: []       
        };

        const appContainer = document.getElementById('app');
        const statusEl = document.getElementById('status');
        const btnSave = document.getElementById('btn-save');
        const btnAudit = document.getElementById('btn-audit');
        const btnUndo = document.getElementById('btn-undo');
        const btnGroup = document.getElementById('btn-group');
        const btnMerge = document.getElementById('btn-merge');
        const btnDeleteSelected = document.getElementById('btn-delete-selected');

        function pushUndoState() {
            if (!appData) return;
            if (undoStack.length >= MAX_UNDO_DEPTH) {
                undoStack.shift();
            }
            undoStack.push(JSON.parse(JSON.stringify(appData)));
            updateUndoButton();
        }

        function updateUndoButton() {
            btnUndo.disabled = (undoStack.length === 0);
        }

        btnUndo.addEventListener('click', () => {
            if (undoStack.length === 0) return;
            appData = undoStack.pop();
            updateUndoButton();
            render();
            autoSave();
        });

        function showMsg(text) {
            document.getElementById('msg-text').textContent = text;
            document.getElementById('msg-modal').classList.remove('hidden');
        }
        document.getElementById('msg-btn-ok').addEventListener('click', () => {
            document.getElementById('msg-modal').classList.add('hidden');
        });

        function showConfirm(text, callback) {
            document.getElementById('confirm-text').textContent = text;
            confirmCallback = callback;
            document.getElementById('confirm-modal').classList.remove('hidden');
        }
        document.getElementById('confirm-btn-cancel').addEventListener('click', () => {
            document.getElementById('confirm-modal').classList.add('hidden');
            confirmCallback = null;
        });
        document.getElementById('confirm-btn-yes').addEventListener('click', () => {
            document.getElementById('confirm-modal').classList.add('hidden');
            if (confirmCallback) confirmCallback();
            confirmCallback = null;
        });

        const editModal = document.getElementById('edit-modal');
        const editInputText = document.getElementById('edit-node-text');
        const editInputCn = document.getElementById('edit-node-cn');
        const editInputEmoji = document.getElementById('edit-node-emoji');

        document.getElementById('edit-btn-cancel').addEventListener('click', () => {
            editModal.classList.add('hidden');
            editingNodeId = null;
        });
        
        document.getElementById('edit-btn-save').addEventListener('click', () => {
            if (!editingNodeId) return;
            const info = getGlobalNodeInfo(editingNodeId);
            if (info) {
                pushUndoState();
                info.node.text = editInputText.value.trim();
                info.node.cn = editInputCn.value.trim();
                info.node.emoji = editInputEmoji.value.trim();
                render();
                autoSave();
            }
            editModal.classList.add('hidden');
            editingNodeId = null;
        });

        async function loadData() {
            try {
                statusEl.textContent = 'Fetching data...';
                const response = await fetch('/api/data');
                if (!response.ok) throw new Error('Failed to load data');
                appData = await response.json();
                statusEl.textContent = 'Data loaded. Ready.';
                render();
            } catch (err) {
                statusEl.textContent = 'Error: ' + err.message;
                statusEl.style.color = 'var(--danger)';
            }
        }

        function render() {
            appContainer.innerHTML = '';
            
            if (!appData || !appData.sections) {
                appContainer.innerHTML = '<div>No valid section data found in JSON.</div>';
                return;
            }

            appData.sections.forEach((section, index) => {
                const sectionEl = document.createElement('div');
                sectionEl.className = 'section-container';
                
                const titleEl = document.createElement('div');
                titleEl.className = 'section-title';
                titleEl.textContent = section.section || ('Section ' + (index + 1));
                sectionEl.appendChild(titleEl);

                if (section.tree) {
                    const treeEl = buildNodeElement(section.tree, null, index);
                    sectionEl.appendChild(treeEl);
                }

                appContainer.appendChild(sectionEl);
            });
            updateUndoButton();
        }

        function buildNodeElement(node, parentNode, sectionIndex) {
            const container = document.createElement('div');
            container.className = 'node-container';
            container.id = 'node-' + node.id;

            const sentences = extractSentences(node.text || '');
            const canSplit = sentences.length > 1;

            const content = document.createElement('div');
            content.className = 'node-content';
            content.draggable = true;
            
            content.addEventListener('dragstart', (e) => onDragStart(e, node.id));
            content.addEventListener('dragover', onDragOver);
            content.addEventListener('dragleave', onDragLeave);
            content.addEventListener('drop', (e) => onDrop(e, node.id));

            let html = '<input type="checkbox" class="node-cb" value="' + node.id + '" id="cb-' + node.id + '">';
            html += '<span class="drag-handle" title="Drag to move">⋮⋮</span>';
            
            html += '<div class="node-body">';
            html += '<div class="node-text-wrapper">';
            if (node.emoji) html += '<span class="node-emoji">' + node.emoji + '</span>';
            html += '<span class="node-text">' + escapeHtml(node.text || 'Empty Node') + '</span>';
            html += '</div>';
            
            if (node.cn) html += '<span class="node-cn">' + escapeHtml(node.cn) + '</span>';
            html += '</div>';

            html += '<div class="node-actions">';
            if (parentNode) {
                html += '<button type="button" class="btn-move-up" data-id="' + node.id + '" title="Move Up Sibling">▲</button>';
                html += '<button type="button" class="btn-move-down" data-id="' + node.id + '" title="Move Down Sibling">▼</button>';
            }
            if (canSplit) {
                html += '<button type="button" class="btn-split" data-id="' + node.id + '">✂️ Split & Group (' + sentences.length + ')</button>';
            }
            html += '<button type="button" class="btn-add" data-id="' + node.id + '">➕ Child</button>';
            html += '<button type="button" class="btn-edit" data-id="' + node.id + '">✏️ Edit</button>';
            html += '</div>';

            content.innerHTML = html;
            container.appendChild(content);

            if (parentNode) {
                const btnMoveUp = content.querySelector('.btn-move-up');
                if (btnMoveUp) btnMoveUp.addEventListener('click', () => handleMoveSibling(node.id, -1));

                const btnMoveDown = content.querySelector('.btn-move-down');
                if (btnMoveDown) btnMoveDown.addEventListener('click', () => handleMoveSibling(node.id, 1));
            }

            const btnSplit = content.querySelector('.btn-split');
            if (btnSplit) btnSplit.addEventListener('click', () => handleSplit(node.id));
            
            const btnAdd = content.querySelector('.btn-add');
            btnAdd.addEventListener('click', () => handleAddChild(node.id));

            const btnEdit = content.querySelector('.btn-edit');
            btnEdit.addEventListener('click', () => handleEdit(node.id));

            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'node-children';
            
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => {
                    childrenContainer.appendChild(buildNodeElement(child, node, sectionIndex));
                });
            }
            container.appendChild(childrenContainer);

            return container;
        }

        function extractSentences(text) {
            if (!text) return [];
            
            // Normalize spaces and convert line breaks into single space literal
            const normalizedText = text.replace(/\\r?\\n/g, ' ').replace(/\\s+/g, ' ').trim();
            
            let sentences = [];
            let current = "";
            let inQuotes = false;
            
            for (let i = 0; i < normalizedText.length; i++) {
                const char = normalizedText[i];
                current += char;
                
                if ((char === '"' || char === '“' || char === '”' || char === '「' || char === '」') && (i === 0 || normalizedText[i-1] !== '\\\\')) {
                    inQuotes = !inQuotes;
                }
                
                const canSplit = !inQuotes || /[!?]["'”’“»]?$/.test(current);
                if (canSplit) {
                    if (/[.!?]["'”’“»]?$/.test(current)) {
                        const remaining = normalizedText.substring(i + 1);
                        const match = remaining.match(/^\\s+(?=[A-Z0-9"'“"「（]|\\w+:)/);
                        if (match) {
                            sentences.push(current.trim());
                            current = "";
                            i += match[0].length - 1;
                        }
                    }
                }
            }
            
            if (current.trim()) {
                sentences.push(current.trim());
            }
            
            return sentences.filter(s => s.length > 0);
        }

        function handleMoveSibling(id, direction) {
            const info = getGlobalNodeInfo(id);
            if (!info || !info.parent) return;

            const siblings = info.parent.children;
            const index = info.index;
            const newIndex = index + direction;

            if (newIndex >= 0 && newIndex < siblings.length) {
                pushUndoState();
                const temp = siblings[index];
                siblings[index] = siblings[newIndex];
                siblings[newIndex] = temp;
                render();
                autoSave();
            }
        }

        const splitModal = document.getElementById('split-modal');
        const splitSentencesList = document.getElementById('split-sentences-list');
        const splitGroupsPreview = document.getElementById('split-groups-preview');
        
        document.getElementById('split-btn-cancel').addEventListener('click', () => {
            splitModal.classList.add('hidden');
        });

        document.getElementById('split-btn-apply').addEventListener('click', () => {
            applySplitAndGroup();
        });

        splitSentencesList.addEventListener('dragover', (e) => {
            e.preventDefault();
            splitSentencesList.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
            splitSentencesList.style.border = '2px dashed var(--primary)';
        });

        splitSentencesList.addEventListener('dragleave', () => {
            splitSentencesList.style.backgroundColor = 'transparent';
            splitSentencesList.style.border = 'none';
        });

        splitSentencesList.addEventListener('drop', (e) => {
            e.preventDefault();
            splitSentencesList.style.backgroundColor = 'transparent';
            splitSentencesList.style.border = 'none';
            
            const sentenceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
            if (!isNaN(sentenceIndex)) {
                splitState.assignments[sentenceIndex] = null; 
                renderSplitBuilder();
            }
        });

        function handleSplit(id) {
            const info = getGlobalNodeInfo(id);
            if (!info || !info.parent) {
                showMsg('Cannot split root nodes.');
                return;
            }

            const sentences = extractSentences(info.node.text || '');
            if (sentences.length <= 1) {
                showMsg('Node text contains only one sentence and cannot be split.');
                return;
            }

            splitState.nodeId = id;
            splitState.originalNode = info.node;
            splitState.parent = info.parent;
            splitState.sentences = sentences;
            
            const initialGroupId = 'group-init-' + Date.now().toString(36);
            splitState.groups = [{
                id: initialGroupId,
                level: 0,
                cn: info.node.cn || '',
                emoji: info.node.emoji || ''
            }];

            splitState.assignments = new Array(sentences.length).fill(initialGroupId);

            renderSplitBuilder();
            splitModal.classList.remove('hidden');
        }

        function renderSplitBuilder() {
            splitSentencesList.innerHTML = '';
            
            let unassignedCount = 0;
            splitState.sentences.forEach((sentence, idx) => {
                if (splitState.assignments[idx] === null) {
                    unassignedCount++;
                    const sBox = document.createElement('div');
                    sBox.className = 'sentence-box drag-sentence';
                    sBox.draggable = true;
                    sBox.innerHTML = '<strong style="color: var(--primary); font-size: 0.75rem; display: block; margin-bottom: 2px;">Sentence ' + (idx + 1) + '</strong>' + escapeHtml(sentence);
                    
                    sBox.addEventListener('dragstart', (e) => {
                        e.dataTransfer.setData('text/plain', idx.toString());
                    });

                    splitSentencesList.appendChild(sBox);
                }
            });

            if (unassignedCount === 0) {
                splitSentencesList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 20px; text-align: center; border: 1px dashed var(--border); border-radius: 6px;">All sentences assigned! Drag sentences back here to split groups further.</div>';
            }

            splitGroupsPreview.innerHTML = '';

            const toolbar = document.createElement('div');
            toolbar.style.display = 'flex';
            toolbar.style.justifyContent = 'space-between';
            toolbar.style.alignItems = 'center';
            toolbar.style.marginBottom = '8px';
            
            const countLabel = document.createElement('span');
            countLabel.style.fontWeight = '600';
            countLabel.style.fontSize = '0.95rem';
            countLabel.style.color = 'var(--primary)';
            countLabel.textContent = '2. Groups & Hierarchy';
            toolbar.appendChild(countLabel);

            const btnNewGroup = document.createElement('button');
            btnNewGroup.textContent = '➕ Add New Group';
            btnNewGroup.className = 'primary';
            btnNewGroup.style.fontSize = '0.8rem';
            btnNewGroup.style.padding = '4px 10px';
            btnNewGroup.addEventListener('click', addSplitGroup);
            toolbar.appendChild(btnNewGroup);

            splitGroupsPreview.appendChild(toolbar);

            splitState.groups.forEach((group, idx) => {
                const gCard = document.createElement('div');
                gCard.className = 'group-card';
                gCard.style.marginLeft = (group.level * 20) + 'px';
                gCard.style.borderLeft = '3px solid ' + (group.level > 0 ? 'var(--primary)' : 'var(--border)');

                gCard.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    gCard.classList.add('drag-over');
                });
                gCard.addEventListener('dragleave', () => {
                    gCard.classList.remove('drag-over');
                });
                gCard.addEventListener('drop', (e) => {
                    e.preventDefault();
                    gCard.classList.remove('drag-over');
                    const sentenceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                    if (!isNaN(sentenceIndex)) {
                        splitState.assignments[sentenceIndex] = group.id; 
                        renderSplitBuilder();
                    }
                });

                const header = document.createElement('div');
                header.style.display = 'flex';
                header.style.justifyContent = 'space-between';
                header.style.alignItems = 'center';
                
                const title = document.createElement('strong');
                title.style.fontSize = '0.85rem';
                title.style.color = 'var(--text-muted)';
                title.textContent = 'Group ' + (idx + 1) + ' (Level ' + group.level + ')';
                header.appendChild(title);

                const controlButtons = document.createElement('div');
                controlButtons.style.display = 'flex';
                controlButtons.style.gap = '4px';

                const btnOutdent = document.createElement('button');
                btnOutdent.textContent = '⬅';
                btnOutdent.title = 'Outdent';
                btnOutdent.style.padding = '2px 6px';
                btnOutdent.disabled = (group.level === 0);
                btnOutdent.addEventListener('click', (e) => {
                    e.stopPropagation();
                    group.level = Math.max(0, group.level - 1);
                    renderSplitBuilder();
                });
                controlButtons.appendChild(btnOutdent);

                const btnIndent = document.createElement('button');
                btnIndent.textContent = '➔';
                btnIndent.title = 'Indent';
                btnIndent.style.padding = '2px 6px';
                const maxLevel = idx > 0 ? (splitState.groups[idx - 1].level + 1) : 0;
                btnIndent.disabled = (idx === 0 || group.level >= maxLevel);
                btnIndent.addEventListener('click', (e) => {
                    e.stopPropagation();
                    group.level = Math.min(maxLevel, group.level + 1);
                    renderSplitBuilder();
                });
                controlButtons.appendChild(btnIndent);

                const btnDelete = document.createElement('button');
                btnDelete.innerHTML = '🗑';
                btnDelete.title = 'Delete Group';
                btnDelete.style.padding = '2px 6px';
                btnDelete.style.color = 'var(--danger)';
                btnDelete.style.borderColor = 'var(--danger)';
                btnDelete.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteSplitGroup(group.id);
                });
                controlButtons.appendChild(btnDelete);

                header.appendChild(controlButtons);
                gCard.appendChild(header);

                const sentencesContainer = document.createElement('div');
                sentencesContainer.style.display = 'flex';
                sentencesContainer.style.flexDirection = 'column';
                sentencesContainer.style.gap = '6px';
                sentencesContainer.style.padding = '8px';
                sentencesContainer.style.background = 'var(--bg-color)';
                sentencesContainer.style.borderRadius = '6px';
                sentencesContainer.style.border = '1px dashed var(--border)';
                sentencesContainer.style.minHeight = '60px';

                let groupSentenceCount = 0;
                splitState.sentences.forEach((sentence, sIdx) => {
                    if (splitState.assignments[sIdx] === group.id) {
                        groupSentenceCount++;
                        const sEl = document.createElement('div');
                        sEl.className = 'sentence-box drag-sentence';
                        sEl.draggable = true;
                        sEl.innerHTML = '<strong style="color: var(--primary); font-size: 0.75rem; display: block; margin-bottom: 2px;">Sentence ' + (sIdx + 1) + '</strong>' + escapeHtml(sentence);
                        
                        sEl.addEventListener('dragstart', (e) => {
                            e.dataTransfer.setData('text/plain', sIdx.toString());
                        });

                        sentencesContainer.appendChild(sEl);
                    }
                });

                if (groupSentenceCount === 0) {
                    sentencesContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem; text-align: center; margin: auto;">Drop sentences here</div>';
                }

                gCard.appendChild(sentencesContainer);

                const metaRow = document.createElement('div');
                metaRow.style.display = 'grid';
                metaRow.style.gridTemplateColumns = '1fr 60px';
                metaRow.style.gap = '8px';

                const cnInput = document.createElement('input');
                cnInput.type = 'text';
                cnInput.placeholder = 'Translation (CN)';
                cnInput.value = group.cn || '';
                cnInput.style.padding = '4px 8px';
                cnInput.style.fontSize = '0.8rem';
                cnInput.style.borderRadius = '4px';
                cnInput.style.border = '1px solid var(--border)';
                cnInput.style.background = 'var(--bg-color)';
                cnInput.style.color = 'var(--text-main)';
                cnInput.addEventListener('input', (e) => {
                    group.cn = e.target.value.trim();
                });
                metaRow.appendChild(cnInput);

                const emoInput = document.createElement('input');
                emoInput.type = 'text';
                emoInput.placeholder = 'Emoji';
                emoInput.value = group.emoji || '';
                emoInput.style.padding = '4px 8px';
                emoInput.style.fontSize = '0.8rem';
                emoInput.style.borderRadius = '4px';
                emoInput.style.border = '1px solid var(--border)';
                emoInput.style.background = 'var(--bg-color)';
                emoInput.style.color = 'var(--text-main)';
                emoInput.style.textAlign = 'center';
                emoInput.addEventListener('input', (e) => {
                    group.emoji = e.target.value.trim();
                });
                metaRow.appendChild(emoInput);

                gCard.appendChild(metaRow);
                splitGroupsPreview.appendChild(gCard);
            });
        }

        function addSplitGroup() {
            const newGroupId = 'group-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
            splitState.groups.push({
                id: newGroupId,
                level: 0,
                cn: '',
                emoji: ''
            });
            renderSplitBuilder();
        }

        function deleteSplitGroup(groupId) {
            if (splitState.groups.length <= 1) {
                showMsg('You must have at least one active group.');
                return;
            }

            splitState.assignments = splitState.assignments.map(gId => gId === groupId ? null : gId);
            splitState.groups = splitState.groups.filter(g => g.id !== groupId);
            renderSplitBuilder();
        }

        function applySplitAndGroup() {
            const unassignedExists = splitState.assignments.some(id => id === null);
            if (unassignedExists) {
                showMsg('Please drag all sentences into groups before saving.');
                return;
            }

            const processedGroupItems = [];
            
            splitState.groups.forEach(group => {
                const groupSentences = [];
                splitState.sentences.forEach((sentence, sIdx) => {
                    if (splitState.assignments[sIdx] === group.id) {
                        groupSentences.push(sentence);
                    }
                });

                if (groupSentences.length > 0) {
                    processedGroupItems.push({
                        text: groupSentences.join(' '),
                        level: group.level,
                        cn: group.cn || '',
                        emoji: group.emoji || ''
                    });
                }
            });

            if (processedGroupItems.length === 0) return;

            const newNodes = buildTreeFromLevels(processedGroupItems);
            if (newNodes.length === 0) return;

            pushUndoState();

            if (splitState.originalNode.children && splitState.originalNode.children.length > 0) {
                newNodes[0].children = newNodes[0].children.concat(splitState.originalNode.children);
            }

            const info = getGlobalNodeInfo(splitState.nodeId);
            if (info && info.parent) {
                info.parent.children.splice(info.index, 1, ...newNodes);
                render();
                autoSave();
            }

            splitModal.classList.add('hidden');
        }

        function buildTreeFromLevels(items) {
            if (items.length === 0) return [];
            
            const roots = [];
            const stack = []; 

            items.forEach((item, index) => {
                const node = {
                    id: 'split-' + Date.now().toString(36) + '-' + index + '-' + Math.random().toString(36).substring(2, 6),
                    text: item.text,
                    cn: item.cn || '',
                    emoji: item.emoji || '',
                    children: []
                };

                let level = item.level || 0;
                if (level < 0) level = 0;

                if (index > 0) {
                    const prevLevel = items[index - 1].level;
                    if (level > prevLevel + 1) {
                        level = prevLevel + 1;
                    }
                } else {
                    level = 0; 
                }
                item.level = level;

                while (stack.length > level) {
                    stack.pop();
                }

                if (level === 0) {
                    roots.push(node);
                } else {
                    const parent = stack[stack.length - 1];
                    if (parent) {
                        parent.children.push(node);
                    } else {
                        roots.push(node);
                    }
                }

                stack[level] = node;
            });

            return roots;
        }

        function handleAddChild(id) {
            const info = getGlobalNodeInfo(id);
            if (!info) return;

            pushUndoState();

            info.node.children = info.node.children || [];
            info.node.children.push({
                id: 'new-' + Date.now().toString(36),
                text: 'New Node',
                children: []
            });

            render();
            autoSave();
        }

        function handleEdit(id) {
            const info = getGlobalNodeInfo(id);
            if (!info) return;

            editingNodeId = id;
            document.getElementById('edit-node-text').value = info.node.text || '';
            document.getElementById('edit-node-cn').value = info.node.cn || '';
            document.getElementById('edit-node-emoji').value = info.node.emoji || '';
            
            document.getElementById('edit-modal').classList.remove('hidden');
        }

        function onDragStart(e, id) {
            const cb = document.getElementById('cb-' + id);
            
            if (cb && cb.checked) {
                const checkedEls = document.querySelectorAll('.node-cb:checked');
                draggedIds = Array.from(checkedEls).map(el => el.value);
            } else {
                draggedIds = [id];
            }
            
            e.dataTransfer.setData('text/plain', JSON.stringify(draggedIds));
            e.dataTransfer.effectAllowed = 'move';
            e.stopPropagation();
        }

        function onDragOver(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const currentTarget = e.currentTarget;
            const rect = currentTarget.getBoundingClientRect();
            const relativeY = e.clientY - rect.top;
            const threshold = rect.height * 0.3;

            currentTarget.classList.remove('drag-before', 'drag-after', 'drag-child');

            if (relativeY < threshold) {
                currentTarget.classList.add('drag-before');
            } else if (relativeY > rect.height - threshold) {
                currentTarget.classList.add('drag-after');
            } else {
                currentTarget.classList.add('drag-child');
            }
            e.stopPropagation();
        }

        function onDragLeave(e) {
            e.currentTarget.classList.remove('drag-before', 'drag-after', 'drag-child');
            e.stopPropagation();
        }

        function onDrop(e, targetId) {
            e.preventDefault();
            const currentTarget = e.currentTarget;
            const rect = currentTarget.getBoundingClientRect();
            const relativeY = e.clientY - rect.top;
            const threshold = rect.height * 0.3;

            let dropPosition = 'child'; 
            if (relativeY < threshold) {
                dropPosition = 'before';
            } else if (relativeY > rect.height - threshold) {
                dropPosition = 'after';
            }

            currentTarget.classList.remove('drag-before', 'drag-after', 'drag-child');
            e.stopPropagation();

            try {
                const ids = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (!Array.isArray(ids)) return;
                
                if (ids.includes(targetId)) return; 
                
                for (let draggedId of ids) {
                    if (isDescendant(draggedId, targetId)) {
                        showMsg('Cannot move a node into its own descendant.');
                        return;
                    }
                }

                const sources = [];
                for (let id of ids) {
                    const srcInfo = getGlobalNodeInfo(id);
                    if (srcInfo) sources.push(srcInfo);
                }

                if (sources.length === 0) return;

                pushUndoState();

                sources.forEach(src => {
                    if (src.parent) {
                        src.parent.children = src.parent.children.filter(c => c.id !== src.node.id);
                    }
                });

                const updatedTargetInfo = getGlobalNodeInfo(targetId);
                if (!updatedTargetInfo) {
                    render();
                    return;
                }

                if (dropPosition === 'child') {
                    updatedTargetInfo.node.children = updatedTargetInfo.node.children || [];
                    sources.forEach(src => {
                        updatedTargetInfo.node.children.push(src.node);
                    });
                } else {
                    if (!updatedTargetInfo.parent) {
                        updatedTargetInfo.node.children = updatedTargetInfo.node.children || [];
                        sources.forEach(src => {
                            updatedTargetInfo.node.children.push(src.node);
                        });
                    } else {
                        const insertIndex = dropPosition === 'before' ? updatedTargetInfo.index : updatedTargetInfo.index + 1;
                        updatedTargetInfo.parent.children.splice(insertIndex, 0, ...sources.map(src => src.node));
                    }
                }

                render();
                autoSave();

            } catch (err) {
                console.error('Drop error:', err);
            }
        }

        btnGroup.addEventListener('click', () => {
            const checkedEls = document.querySelectorAll('.node-cb:checked');
            if (checkedEls.length === 0) return showMsg('Select items to group first.');

            const ids = Array.from(checkedEls).map(el => el.value);
            const firstInfo = getGlobalNodeInfo(ids[0]);
            if (!firstInfo || !firstInfo.parent) {
                showMsg('Cannot group root nodes.');
                return;
            }

            pushUndoState();

            const newGroupNode = {
                id: 'group-' + Date.now().toString(36),
                text: 'New Group',
                emoji: '📁',
                children: []
            };

            firstInfo.parent.children.splice(firstInfo.index, 0, newGroupNode);

            ids.forEach(id => {
                const info = getGlobalNodeInfo(id);
                if (info && info.parent) {
                    const currentIndex = info.parent.children.findIndex(c => c.id === id);
                    if (currentIndex > -1) {
                        info.parent.children.splice(currentIndex, 1);
                        newGroupNode.children.push(info.node);
                    }
                }
            });

            render();
            autoSave();
        });

        btnMerge.addEventListener('click', () => {
            const checkedEls = document.querySelectorAll('.node-cb:checked');
            if (checkedEls.length < 2) return showMsg('Please select at least two sibling nodes to merge.');

            const ids = Array.from(checkedEls).map(el => el.value);
            const infos = ids.map(id => getGlobalNodeInfo(id)).filter(Boolean);
            if (infos.length < 2) return;

            // Integrity Checks: Nodes cannot be Section roots and must share same immediate parent
            const hasNullParent = infos.some(info => !info.parent);
            if (hasNullParent) {
                return showMsg('Cannot merge section root nodes.');
            }

            const targetParentId = infos[0].parent.id;
            const allSiblings = infos.every(info => info.parent.id === targetParentId);
            if (!allSiblings) {
                return showMsg('All selected nodes must share the exact same parent node.');
            }

            showConfirm('Are you sure you want to merge these ' + infos.length + ' nodes into a single consolidated node?', () => {
                pushUndoState();

                // Sort sibling nodes by original indices to maintain natural reading flow
                infos.sort((a, b) => a.index - b.index);

                const baseInfo = infos[0];
                const baseNode = baseInfo.node;

                // Concatenate strings sequentially
                const mergedText = infos.map(info => info.node.text || '').join(' ').trim();
                const mergedCn = infos.map(info => info.node.cn || '').filter(Boolean).join(' ').trim();

                // Consolidate and join all internal child arrays
                let mergedChildren = [];
                infos.forEach(info => {
                    if (info.node.children && info.node.children.length > 0) {
                        mergedChildren = mergedChildren.concat(info.node.children);
                    }
                });

                baseNode.text = mergedText;
                baseNode.cn = mergedCn;
                baseNode.children = mergedChildren;

                // Strip out alternative redundant merged IDs
                const idsToRemove = ids.filter(id => id !== baseNode.id);
                const parent = baseInfo.parent;
                parent.children = parent.children.filter(child => !idsToRemove.includes(child.id));

                render();
                autoSave();
            });
        });

        btnDeleteSelected.addEventListener('click', () => {
            const checkedEls = document.querySelectorAll('.node-cb:checked');
            if (checkedEls.length === 0) return;
            
            showConfirm('Are you sure you want to delete selected nodes?', () => {
                pushUndoState();
                const ids = Array.from(checkedEls).map(el => el.value);
                ids.forEach(id => {
                    const info = getGlobalNodeInfo(id);
                    if (info && info.parent) {
                        info.parent.children.splice(info.index, 1);
                    }
                });

                render();
                autoSave();
            });
        });

        function getGlobalNodeInfo(id) {
            for (let i = 0; i < appData.sections.length; i++) {
                const res = findNodeInfo(appData.sections[i].tree, id);
                if (res) return { ...res, sectionIndex: i };
            }
            return null;
        }

        function findNodeInfo(tree, id, parent = null, index = -1) {
            if (tree.id === id) return { node: tree, parent, index };
            if (tree.children) {
                for (let i = 0; i < tree.children.length; i++) {
                    const res = findNodeInfo(tree.children[i], id, tree, i);
                    if (res) return res;
                }
            }
            return null;
        }

        function isDescendant(parentId, childId) {
            if (parentId === childId) return true;
            const parentInfo = getGlobalNodeInfo(parentId);
            if (!parentInfo || !parentInfo.node.children) return false;
            
            for (let child of parentInfo.node.children) {
                if (isDescendant(child.id, childId)) return true;
            }
            return false;
        }

        function escapeHtml(unsafe) {
            return (unsafe || '').toString()
                 .replace(/&/g, "&amp;")
                 .replace(/</g, "&lt;")
                 .replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;")
                 .replace(/'/g, "&#039;");
        }

        async function saveData() {
            try {
                statusEl.textContent = 'Saving...';
                const response = await fetch('/api/data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(appData, null, 2)
                });
                if (!response.ok) throw new Error('Save failed');
                statusEl.textContent = 'All changes saved ✅';
                setTimeout(() => { if (statusEl.textContent.includes('saved')) statusEl.textContent = 'Ready.'; }, 3000);
            } catch (err) {
                statusEl.textContent = 'Save Error: ' + err.message;
                statusEl.style.color = 'var(--danger)';
            }
        }

        let saveTimeout;
        function autoSave() {
            clearTimeout(saveTimeout);
            statusEl.textContent = 'Pending changes...';
            saveTimeout = setTimeout(saveData, 1000); 
        }

        btnSave.addEventListener('click', saveData);

        async function runAudit() {
            try {
                await saveData();
                statusEl.textContent = 'Running Gemini Audit... 🤖';
                btnAudit.disabled = true;
                const response = await fetch('/api/audit', {
                    method: 'POST'
                });
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error || 'Audit failed');
                }
                const auditedData = await response.json();
                appData = auditedData;
                undoStack = [];
                render();
                statusEl.textContent = 'Gemini Audit Completed! 🤖✅';
                setTimeout(() => { statusEl.textContent = 'Ready.'; }, 3000);
            } catch (err) {
                statusEl.textContent = 'Audit Error: ' + err.message;
                statusEl.style.color = 'var(--danger)';
            } finally {
                btnAudit.disabled = false;
            }
        }

        btnAudit.addEventListener('click', runAudit);

        loadData();
    </script>
</body>
</html>
`;