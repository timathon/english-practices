# Scripts Operational Guide

This document records specific operational patterns and commands for the scripts in this folder.

## Recall Map Generation (`rm_release_gen.cjs`)

Unlike some interactive scripts in this directory, `rm_release_gen.cjs` requires explicit input and output arguments.

### Usage Pattern
```bash
node scripts/rm_release_gen.cjs [input_json_path] [output_html_path]
```

### Example Execution
To generate a Recall Map HTML from a JSON file:
```bash
node scripts/rm_release_gen.cjs data/B-Think1/b-think1-u11/b-think1-u11-p106-p109-recall-map.json B-Think1/b-think1-u11/b-think1-u11-p106-p109-recall-map.html
```

## Vocabulary Guide Generation (`vg_release_gen-3.cjs`)

This script handles HTML generation and automated TTS processing.

### Usage Pattern
```bash
node scripts/vg_release_gen-3.cjs [input_json_path] [output_html_path] [flags]
```

### Audio Flags
- `--regenerate`: Force regenerate all audio items (overwrites existing R2 files).
- `--skip-audio`: Generate HTML only, skipping all audio processing.
- (Default): Check R2 and only generate missing audio items.

### Example Execution
```bash
node scripts/vg_release_gen-3.cjs data/B-Think1/b-think1-u11/b-think1-u11-p106-p109-vocab-guide.json B-Think1/b-think1-u11/b-think1-u11-p106-p109-vocab-guide.html --regenerate
```

## Vocab Master Generation (`vm_release_gen-3.cjs`)

This script generates vocabulary challenges with progress tracking.

### Usage Pattern
```bash
node scripts/vm_release_gen-3.cjs [input_json_path] [type] [output_html_path] [flags]
```

### Arguments
- `type`: Either `post` (default) or `builtin`.

### Audio Flags
- `--regenerate`: Force regenerate all audio items.
- `--skip-audio`: Generate HTML only.
- (Default): Check R2 and generate only missing audio items.

### Example Execution
```bash
node scripts/vm_release_gen-3.cjs data/B-Think1/b-think1-u11/b-think1-u11-p106-p109-vocab-master.json post B-Think1/b-think1-u11/b-think1-u11-p106-p109-vocab-master.html
```

## Spelling Hero Generation (`sh_release_gen-3.cjs`)

This script creates interactive spelling challenges.

### Usage Pattern
```bash
node scripts/sh_release_gen-3.cjs [input_json_path] [type] [output_html_path] [flags]
```

### Arguments
- `type`: Either `post` (default) or `builtin`.

### Audio Flags
- `--regenerate`: Force regenerate all audio items.
- `--skip-audio`: Generate HTML only.
- (Default): Check R2 and generate only missing audio items.

### Example Execution
```bash
node scripts/sh_release_gen-3.cjs data/B-Think1/b-think1-u11/b-think1-u11-p106-p109-spelling-hero.json post B-Think1/b-think1-u11/b-think1-u11-p106-p109-spelling-hero.html --regenerate
# Or with builtin type:
node scripts/sh_release_gen-3.cjs data/B-Think1/b-think1-u11/b-think1-u11-p106-p109-spelling-hero.json builtin B-Think1/b-think1-u11/b-think1-u11-p106-p109-spelling-hero.html
```

## Sentence Architect Generation (`sa_release_gen-3.cjs`)

This script generates sentence-building exercises with XOR encryption.

### Usage Pattern
```bash
node scripts/sa_release_gen-3.cjs [input_json_path] [type] [output_html_path] [flags]
```

### Arguments
- `type`: Either `post` (default) or `builtin`.

### Audio Flags
- `--regenerate`: Force regenerate all audio items.
- `--skip-audio`: Generate HTML only.
- (Default): Check R2 and generate only missing audio items.

### Example Execution
```bash
node scripts/sa_release_gen-3.cjs data/B-Think1/b-think1-u11/b-think1-u11-p106-p109-sentence-architect.json post B-Think1/b-think1-u11/b-think1-u11-p106-p109-sentence-architect.html
```

## Writing Map / Text Navigator Generation (`wm_release_gen-3.cjs`)

This script handles hierarchical mindmap trees, including Writing Maps, Recall Maps (alternative), and Text Navigators.

### Usage Pattern
```bash
node scripts/wm_release_gen-3.cjs [input_json_path] [output_html_path] [flags]
```

### Audio Flags
- `--regenerate`: Force regenerate all audio items.
- `--skip-audio`: Generate HTML only.
- (Default): Check R2 and generate only missing audio items.

### Example Execution
```bash
node scripts/wm_release_gen-3.cjs data/B-Think1/b-think1-u11/b-think1-u11-p106-p109-text-navigator-reading.json B-Think1/b-think1-u11/b-think1-u11-p106-p109-text-navigator-reading.html --regenerate
```

## Maintenance & Finalization

### Update Indexes
After running any release generators, you **must** update the textbook and exercise indexes to ensure the new content is visible in the browser.

```bash
node scripts/update_index.cjs
```
