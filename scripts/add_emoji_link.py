import os
import re

def find_sentence_builder_files():
    """
    Find all HTML files matching the pattern '*-*-*-Sentence-Builder.html'
    in subdirectories (excluding root and scripts folder).
    """
    sentence_builder_files = []
    for root, dirs, files in os.walk('.'):
        # Skip .git and scripts directories
        if '.git' in dirs:
            dirs.remove('.git')
        if 'scripts' in dirs:
            dirs.remove('scripts')
        
        for file in files:
            # Match pattern like A5A-U1-Sentence-Builder.html or A6B-M1-Sentence-Builder.html
            if re.match(r'.+-[UM]\d+-Sentence-Builder\.html$', file) or \
               re.match(r'.+-[UM][A-Z]+-Sentence-Builder\.html$', file) or \
               re.match(r'.+-[A-Z]+\d+-Sentence-Builder\.html$', file):
                path = os.path.join(root, file)
                sentence_builder_files.append(path)
    
    return sentence_builder_files

def has_emoji_link(content):
    """
    Check if the HTML file already has the emoji link to index.html.
    """
    # Look for the home emoji link pattern
    pattern = r'href="index\.html".*?🏠|🏠.*?href="index\.html"'
    return bool(re.search(pattern, content))

def add_emoji_link_to_file(file_path):
    """
    Add the emoji link to the header section of the HTML file.
    Returns True if changes were made, False otherwise.
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if emoji link already exists
    if has_emoji_link(content):
        print(f"  Skipping {file_path} - emoji link already exists")
        return False
    
    # Check for older style header without inline styles (most common pattern)
    # Pattern: <div id="home-screen" class="screen active">\n        <header>\n            <h1>...</h1>\n            <h2>...</h2>\n        </header>
    older_pattern = r'(<div id="home-screen" class="screen active">\n        <header>)\n(            <h1>.*?</h1>)\n(            <h2>.*?</h2>)\n(        </header>)'
    
    if re.search(older_pattern, content, re.DOTALL):
        new_content = re.sub(
            older_pattern,
            r'''\1
            <div style="display: flex; align-items: center; justify-content: center; position: relative;">
                <a href="index.html" style="position: absolute; left: 0; font-size: 1.5rem; text-decoration: none;">🏠</a>
\2
            </div>
\3
\4''',
            content,
            flags=re.DOTALL
        )
    else:
        print(f"  Could not find header pattern in {file_path}")
        return False
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"  Added emoji link to {file_path}")
    return True

def add_mobile_media_query(file_path):
    """
    Add mobile media query for h1 if it doesn't exist.
    Returns True if changes were made, False otherwise.
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if mobile media query already exists
    if '@media (max-width: 480px)' in content and 'h1' in content[content.find('@media (max-width: 480px)'):content.find('@media (max-width: 480px)')+200]:
        print(f"  Mobile media query already exists in {file_path}")
        return False
    
    # Find the h1 CSS rule and add media query after it
    # Look for the h1 rule in the style section
    h1_pattern = r'(h1\s*\{[^}]*font-size:\s*[\d.]+rem;[^}]*\})'
    
    match = re.search(h1_pattern, content)
    if match:
        # Insert media query after the h1 rule
        insert_pos = match.end()
        media_query = '''

        @media (max-width: 480px) {
            h1 { font-size: 1.4rem; }
        }'''
        new_content = content[:insert_pos] + media_query + content[insert_pos:]
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"  Added mobile media query to {file_path}")
        return True
    else:
        print(f"  Could not find h1 CSS rule in {file_path}")
        return False

def main():
    print("Finding Sentence-Builder HTML files...")
    files = find_sentence_builder_files()
    
    if not files:
        print("No Sentence-Builder HTML files found.")
        return
    
    print(f"Found {len(files)} Sentence-Builder HTML file(s):")
    for f in files:
        print(f"  - {f}")
    
    print("\nProcessing files...")
    modified_count = 0
    
    for file_path in files:
        emoji_added = add_emoji_link_to_file(file_path)
        media_added = add_mobile_media_query(file_path)
        
        if emoji_added or media_added:
            modified_count += 1
    
    print(f"\nDone! Modified {modified_count} file(s).")

if __name__ == "__main__":
    main()
