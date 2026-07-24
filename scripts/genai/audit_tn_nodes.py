#!/usr/bin/env python3
"""
audit_tn_nodes.py — Audit and fill missing/incorrect fields in a text-navigator JSON via Gemini API.

Usage:
    python3 scripts/genai/audit_tn_nodes.py <path-to-text-navigator.json>

Requires:
    pip install google-genai
    export GOOGLE_API_KEY_FREE=<your key>
"""

import os
import sys
import json
from pathlib import Path
from google import genai
from google.genai import types
from config import get_genai_config, parse_high_flag

PROMPT_TEMPLATE = """\
You are an expert English curriculum designer. Audit the following list of nodes from a primary school English textbook mindmap.

For each node:
1. Verify "cn" (Chinese translation). It must translate ONLY the English sentence in "text" exactly. If "cn" is empty, incorrect, or contains extra translation (e.g., from a split sentence), update it.
2. Verify/generate "emoji".
3. Verify/generate "notes" (brief explanation of difficult vocabulary or grammar).
4. Verify/generate "statement" (a simple true/false statement in Chinese about the sentence's grammar or vocabulary).
5. Verify/generate "answer" (boolean true/false for the statement).
6. Verify/generate "explanation" (concise Chinese explanation for the true/false statement).
7. Verify/generate "keywords" (comma-separated string of 2-5 trigger words).

Here are the nodes to audit:
{nodes_json}

Return the audited nodes as a JSON array of objects. Each object must contain:
- "id"
- "cn"
- "emoji"
- "notes"
- "statement"
- "answer"
- "explanation"
- "keywords"

Output ONLY valid JSON, no markdown formatting or wrappers.
"""

def needs_audit(node):
    # Determine if node needs audit/fill
    is_leaf = not node.get("children")
    
    # Always audit split nodes
    if str(node.get("id", "")).startswith("split-"):
        return True
        
    if not node.get("cn"):
        return True
        
    if not node.get("emoji"):
        return True
        
    if is_leaf:
        if not node.get("notes") or not node.get("statement") or not node.get("explanation") or not node.get("keywords"):
            return True
            
    return False

def collect_nodes(node, nodes_to_audit):
    if needs_audit(node):
        audit_node = {
            "id": node.get("id"),
            "text": node.get("text"),
            "cn": node.get("cn", ""),
            "emoji": node.get("emoji", ""),
            "notes": node.get("notes", ""),
            "statement": node.get("statement", ""),
            "answer": node.get("answer", False),
            "explanation": node.get("explanation", ""),
            "keywords": node.get("keywords", "")
        }
        if "speaker" in node:
            audit_node["speaker"] = node["speaker"]
        nodes_to_audit.append(audit_node)
    for child in node.get("children", []):
        collect_nodes(child, nodes_to_audit)

def update_nodes(node, audited_map):
    node_id = node.get("id")
    if node_id in audited_map:
        audit = audited_map[node_id]
        node["cn"] = audit.get("cn", node.get("cn", ""))
        node["emoji"] = audit.get("emoji", node.get("emoji", ""))
        
        # Only set details for leaves (or nodes that don't have children)
        if not node.get("children"):
            node["notes"] = audit.get("notes", node.get("notes", ""))
            node["statement"] = audit.get("statement", node.get("statement", ""))
            node["answer"] = audit.get("answer", node.get("answer", False))
            node["explanation"] = audit.get("explanation", node.get("explanation", ""))
            node["keywords"] = audit.get("keywords", node.get("keywords", ""))
            
    for child in node.get("children", []):
        update_nodes(child, audited_map)

def extract_json(text: str) -> list:
    start = text.find("[")
    if start == -1:
        start = text.find("{")
        if start == -1:
            raise ValueError("No JSON array/object found in response")
    depth = 0
    for i, ch in enumerate(text[start:], start):
        if ch in ["[", "{"]:
            depth += 1
        elif ch in ["]", "}"]:
            depth -= 1
            if depth == 0:
                parsed = json.loads(text[start:i + 1])
                if isinstance(parsed, dict):
                    return [parsed]
                return parsed
    raise ValueError("Unbalanced JSON in response")

def main():
    use_high = parse_high_flag()
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/genai/audit_tn_nodes.py <path-to-json-file>", file=sys.stderr)
        sys.exit(1)
        
    json_path = Path(sys.argv[1])
    if not json_path.exists():
        print(f"Error: File not found at {json_path}", file=sys.stderr)
        sys.exit(1)
        
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    # Collect all nodes needing audit
    nodes_to_audit = []
    
    # The JSON structure can have a sections array, or be a tree root directly
    if "sections" in data:
        for section in data["sections"]:
            if "tree" in section:
                collect_nodes(section["tree"], nodes_to_audit)
    elif "tree" in data:
        collect_nodes(data["tree"], nodes_to_audit)
    else:
        collect_nodes(data, nodes_to_audit)
        
    if not nodes_to_audit:
        print("All nodes look complete! No audit needed.", file=sys.stderr)
        sys.exit(0)
        
    print(f"Found {len(nodes_to_audit)} nodes to audit.", file=sys.stderr)
    
    # Setup client
    api_key, model_name = get_genai_config(use_high)
    client = genai.Client(api_key=api_key)
    
    # Split into batches of 15 to stay within limits and ensure quality
    batch_size = 15
    audited_nodes = []
    
    for i in range(0, len(nodes_to_audit), batch_size):
        batch = nodes_to_audit[i:i + batch_size]
        print(f"Auditing batch {i//batch_size + 1} ({len(batch)} nodes)...", file=sys.stderr)
        
        prompt = PROMPT_TEMPLATE.format(nodes_json=json.dumps(batch, ensure_ascii=False, indent=2))
        
        import time
        response = None
        for attempt in range(5):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        thinking_config=types.ThinkingConfig(thinking_level="low"),
                        temperature=0.2,
                        response_mime_type="application/json"
                    )
                )
                break
            except Exception as e:
                print(f"Error calling Gemini API (attempt {attempt + 1}/5): {e}", file=sys.stderr)
                if attempt == 4:
                    raise e
                time.sleep(2 ** attempt)
                
        batch_audited = extract_json(response.text)
        audited_nodes.extend(batch_audited)
        
    # Map by ID
    audited_map = {n["id"]: n for n in audited_nodes if "id" in n}
    
    # Apply updates
    if "sections" in data:
        for section in data["sections"]:
            if "tree" in section:
                update_nodes(section["tree"], audited_map)
    elif "tree" in data:
        update_nodes(data["tree"], audited_map)
    else:
        update_nodes(data, audited_map)
        
    # Save back
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print(f"Audit complete! Audited and updated {len(audited_map)} nodes in {json_path}", file=sys.stderr)

if __name__ == "__main__":
    main()
