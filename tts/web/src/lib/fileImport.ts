import { extractTextsFromParsedJson } from './parser';

export function detectBookKeyFromPath(pathOrName: string): string {
  const clean = pathOrName.trim().replace(/\\/g, '/');
  const segments = clean.split('/').filter(Boolean);

  for (const seg of segments) {
    // 1. Check folder name like "A6A" or "a6a-u3" -> extract "a6a"
    const unitMatch = seg.match(/^([a-zA-Z0-9]+)-u\d+/i);
    if (unitMatch && unitMatch[1]) {
      return unitMatch[1].toLowerCase();
    }

    // 2. Check compound book keys like "raz-b" from "raz-b-u1" or "raz-b"
    const razMatch = seg.match(/^(raz-[a-zA-Z0-9]+)/i);
    if (razMatch && razMatch[1]) {
      return razMatch[1].toLowerCase();
    }

    // 3. Check standalone textbook folder names like "A6A", "SA1", "A3B", "PU1"
    if (/^[a-zA-Z]{1,3}\d{1,2}[a-zA-Z]?$/i.test(seg)) {
      return seg.toLowerCase();
    }
  }

  // 4. Check filename prefix (e.g. "a6a-u3-vocab-guide.json" -> "a6a", "sa1-u0-sentence-architect.json" -> "sa1")
  const filename = segments[segments.length - 1] || clean;
  const fileUnitMatch = filename.match(/^([a-zA-Z0-9]+)(?:-[a-zA-Z0-9]+)?-u\d+/i);
  if (fileUnitMatch && fileUnitMatch[1]) {
    return fileUnitMatch[1].toLowerCase();
  }

  const generalPrefix = filename.match(/^([a-zA-Z0-9]+)-/);
  if (generalPrefix && generalPrefix[1]) {
    return generalPrefix[1].toLowerCase();
  }

  return '';
}

export async function extractTextsFromFiles(
  files: FileList | File[],
  onLog?: (msg: string) => void
): Promise<{ detectedBook: string; sentences: string[]; validFileCount: number }> {
  const fileList = Array.from(files);

  const validFiles = fileList.filter(f => {
    const name = f.name.toLowerCase();
    if (name.includes('-recall-map') || name.includes('-grammar-wizard') || name.endsWith('tongjia.cjs')) {
      return false;
    }
    return name.endsWith('.json') || name.endsWith('.txt') || name.endsWith('.md');
  });

  if (validFiles.length === 0) {
    return { detectedBook: '', sentences: [], validFileCount: 0 };
  }

  let detectedBook = '';
  const extractedTextsSet = new Set<string>();

  for (const file of validFiles) {
    try {
      const text = await file.text();

      if (!detectedBook) {
        const pathToCheck = (file as any).webkitRelativePath || file.name;
        const inferred = detectBookKeyFromPath(pathToCheck);
        if (inferred) {
          detectedBook = inferred;
        }
      }

      if (file.name.endsWith('.json')) {
        try {
          const parsedJson = JSON.parse(text);
          const items = extractTextsFromParsedJson(parsedJson, file.name);
          items.forEach(t => {
            if (t.trim()) extractedTextsSet.add(t.trim());
          });
        } catch {
          text.split('\n').forEach(line => {
            const clean = line.trim();
            if (clean && !clean.startsWith('{') && !clean.startsWith('}')) {
              extractedTextsSet.add(clean);
            }
          });
        }
      } else {
        text.split('\n').forEach(line => {
          const clean = line.trim();
          if (clean && !clean.startsWith('#') && !clean.startsWith('---')) {
            extractedTextsSet.add(clean);
          }
        });
      }
    } catch (err: any) {
      if (onLog) onLog(`❌ Failed to read ${file.name}: ${err.message}`);
    }
  }

  return {
    detectedBook,
    sentences: Array.from(extractedTextsSet),
    validFileCount: validFiles.length
  };
}
