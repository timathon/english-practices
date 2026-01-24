import os
import datetime
import subprocess

def clean_redundant_pdfs():
    """
    Scans for HTML files and removes corresponding PDF files if they exist.
    Also removes them from git staging to ensure they aren't committed.
    """
    for root, dirs, files in os.walk('.'):
        if '.git' in dirs:
            dirs.remove('.git')
        
        for file in files:
            if file.endswith('.html'):
                base_name = os.path.splitext(file)[0]
                pdf_name = base_name + '.pdf'
                pdf_path = os.path.join(root, pdf_name)
                
                if os.path.exists(pdf_path):
                    print(f"Removing redundant PDF: {pdf_path}")
                    try:
                        os.remove(pdf_path)
                        # Attempt to remove from git index just in case it was staged
                        subprocess.run(['git', 'rm', '--cached', pdf_path], 
                                     stdout=subprocess.DEVNULL, 
                                     stderr=subprocess.DEVNULL)
                    except OSError as e:
                        print(f"Error removing {pdf_path}: {e}")

def get_html_files():
    html_files = []
    for root, dirs, files in os.walk('.'):
        if '.git' in dirs:
            dirs.remove('.git')
        if 'scripts' in dirs:
            dirs.remove('scripts')
        for file in files:
            if file.endswith('.html') and file != 'index.html':
                path = os.path.join(root, file)
                rel_path = os.path.relpath(path, '.')
                mtime = os.path.getmtime(path)
                html_files.append({
                    'path': rel_path,
                    'name': file,
                    'mtime': mtime
                })
    return html_files

def generate_latest_section(files):
    sorted_files = sorted(files, key=lambda x: x['mtime'], reverse=True)[:10]
    lines = ['    <div class="section">', '        <h2>Latest Practices</h2>', '        <ul id="latest-list">']
    for f in sorted_files:
        lines.append(f'            <li><a href="{f["path"]}">{f["name"]}</a></li>')
    lines.extend(['        </ul>', '    </div>'])
    return '\n'.join(lines)

def build_tree(files):
    tree = {}
    for f in files:
        parts = f['path'].split(os.sep)
        current = tree
        for part in parts[:-1]:
            current = current.setdefault(part, {})
        current.setdefault('__files__', []).append(f)
    return tree

def render_tree(tree):
    lines = ['<ul>']
    
    # Render folders
    for name, subtree in sorted(tree.items()):
        if name == '__files__':
            continue
        lines.append(f'    <li><span class="folder">{name}</span>')
        lines.append(render_tree(subtree))
        lines.append('    </li>')
    
    # Render files in this folder
    if '__files__' in tree:
        for f in sorted(tree['__files__'], key=lambda x: x['name']):
            lines.append(f'    <li><a href="{f["path"]}">{f["name"]}</a></li>')
            
    lines.append('</ul>')
    return '\n'.join(lines)

def generate_tree_section(files):
    tree = build_tree(files)
    tree_content = render_tree(tree)
    lines = [
        '    <div class="section">',
        '        <h2>All Practices (Tree View)</h2>',
        '        <div class="tree">',
        tree_content,
        '        </div>',
        '    </div>'
    ]
    return '\n'.join(lines)

def main():
    clean_redundant_pdfs()
    files = get_html_files()
    latest_html = generate_latest_section(files)
    tree_html = generate_tree_section(files)
    
    template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>English Practices Index</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }}
        h1, h2 {{
            color: #2c3e50;
        }}
        .section {{
            margin-bottom: 40px;
            background: #f9f9f9;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #eee;
        }}
        ul {{
            list-style-type: none;
            padding-left: 0;
        }}
        li {{
            margin-bottom: 8px;
        }}
        a {{
            text-decoration: none;
            color: #0366d6;
        }}
        a:hover {{
            text-decoration: underline;
        }}
        /* Tree styles */
        .tree ul {{
            padding-left: 20px;
        }}
        .tree li {{
            position: relative;
        }}
        .folder {{
            font-weight: bold;
            color: #444;
        }}
    </style>
</head>
<body>
    <h1>English Practices</h1>

{latest_html}

{tree_html}
</body>
</html>
"""
    with open('index.html', 'w') as f:
        f.write(template)

if __name__ == "__main__":
    main()
