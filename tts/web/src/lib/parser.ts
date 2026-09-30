// MD5 hashing in pure JavaScript for Browser
export function md5(string: string): string {
  function RotateLeft(lValue: number, iShiftBits: number) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function AddUnsigned(lX: number, lY: number) {
    const lX4 = lX & 0x40000000;
    const lY4 = lY & 0x40000000;
    const lX8 = lX & 0x80000000;
    const lY8 = lY & 0x80000000;
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      else return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    } else {
      return lResult ^ lX8 ^ lY8;
    }
  }
  function F(x: number, y: number, z: number) { return (x & y) | (~x & z); }
  function G(x: number, y: number, z: number) { return (x & z) | (y & ~z); }
  function H(x: number, y: number, z: number) { return x ^ y ^ z; }
  function I(x: number, y: number, z: number) { return y ^ (x | ~z); }

  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }

  function ConvertToWordArray(string: string) {
    let lWordCount;
    const lMessageLength = string.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    const lWordArray = Array(lNumberOfWords - 1);
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }

  function WordToHex(lValue: number) {
    let WordToHexValue = '', WordToHexValue_temp = '', lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValue_temp = '0' + lByte.toString(16);
      WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
    }
    return WordToHexValue;
  }

  function Utf8Encode(string: string) {
    string = string.replace(/\r\n/g, '\n');
    let utftext = '';
    for (let n = 0; n < string.length; n++) {
      const c = string.charCodeAt(n);
      if (c < 128) {
        utftext += String.fromCharCode(c);
      } else if (c > 127 && c < 2048) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      } else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }
    }
    return utftext;
  }

  let x = Array();
  let k, AA, BB, CC, DD, a, b, c, d;
  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

  string = Utf8Encode(string);
  x = ConvertToWordArray(string);
  a = 0x67452301; b = 0xefcdab89; c = 0x98badcfe; d = 0x10325476;

  for (k = 0; k < x.length; k += 16) {
    AA = a; BB = b; CC = c; DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xd76aa478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070db);
    b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
    a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a);
    c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
    c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821);

    a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa);
    a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d);
    d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed);
    a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);

    a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c);
    a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
    c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x4881d05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665);

    a = II(a, b, c, d, x[k + 0], S41, 0xf4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432aff97);
    c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7);
    b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
    c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
    d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
    c = II(c, d, a, b, x[k + 6], S43, 0xa3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
    a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82);
    d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
    b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391);

    a = AddUnsigned(a, AA);
    b = AddUnsigned(b, BB);
    c = AddUnsigned(c, CC);
    d = AddUnsigned(d, DD);
  }

  return (WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d)).toLowerCase();
}

export interface TaskItem {
  text: string;
  hash: string;
  book: string;
  status: 'pending' | 'generating' | 'cutting' | 'uploading' | 'done' | 'error';
  selected?: boolean;
  audioBlob?: Blob;
  audioUrl?: string;
  startTime?: number;
  endTime?: number;
  ttsOverrideText?: string;
  error?: string;
}

export function extractTextsFromParsedJson(content: any, filename = ''): string[] {
  const texts: string[] = [];
  const add = (txt: any) => {
    if (typeof txt === 'string') {
      const clean = txt.trim();
      if (clean) texts.push(clean);
    }
  };

  function extractTreeText(node: any) {
    if (!node) return;
    if (node.text) add(node.text);
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(extractTreeText);
    }
  }

  if (!content || typeof content !== 'object') return texts;

  // 1. Array of JSON files/items
  if (Array.isArray(content)) {
    content.forEach(item => {
      texts.push(...extractTextsFromParsedJson(item, filename));
    });
    return texts;
  }

  // 2. Vocab Guide (extract context_sentence and word)
  if (content.unit_vocabulary && Array.isArray(content.unit_vocabulary)) {
    content.unit_vocabulary.forEach((item: any) => {
      if (item.context_sentence) add(item.context_sentence);
      if (item.word) add(item.word);
    });
  }

  // 3. Vocab Master (extract context_sentence)
  if (content.challenges && Array.isArray(content.challenges)) {
    content.challenges.forEach((challenge: any) => {
      if (challenge.questions && Array.isArray(challenge.questions)) {
        challenge.questions.forEach((q: any) => {
          if (q.context_sentence) add(q.context_sentence);
        });
      }
      // 4. Sentence Architect (extract sentences.en or data.en)
      const sentences = challenge.sentences || challenge.data || [];
      if (Array.isArray(sentences)) {
        sentences.forEach((item: any) => {
          if (item.en) add(item.en);
          if (item.text) add(item.text);
        });
      }
    });
  }

  // 5. Spelling Hero (extract word)
  if (content.spelling_words && Array.isArray(content.spelling_words)) {
    content.spelling_words.forEach((w: any) => {
      if (w.word) add(w.word);
    });
  }

  // 6. Text Navigator / Writing Map (tree structure)
  if (content.sections && Array.isArray(content.sections)) {
    content.sections.forEach((sec: any) => {
      if (sec.tree) extractTreeText(sec.tree);
      if (sec.sentences && Array.isArray(sec.sentences)) {
        sec.sentences.forEach((s: any) => {
          if (s.en) add(s.en);
          if (s.text) add(s.text);
        });
      }
      if (sec.audio && sec.audio.text) add(sec.audio.text);
      if (sec.questions && Array.isArray(sec.questions)) {
        sec.questions.forEach((q: any) => {
          if (q.audio && q.audio.text) add(q.audio.text);
        });
      }
    });
  }
  if (content.tree) {
    extractTreeText(content.tree);
  }

  // 7. Irregular verbs / verb expressions
  if (content.verbs && Array.isArray(content.verbs)) {
    content.verbs.forEach((v: any) => {
      if (v.base) add(v.base);
      if (v.examples && Array.isArray(v.examples)) {
        v.examples.forEach((ex: any) => {
          if (ex.sentence) add(ex.sentence);
        });
      }
    });
  }
  if (content.expressions && Array.isArray(content.expressions)) {
    content.expressions.forEach((e: any) => {
      if (e.examples && Array.isArray(e.examples)) {
        e.examples.forEach((ex: any) => {
          if (ex.sentence) add(ex.sentence);
        });
      }
    });
  }

  return texts;
}

export function parseInputToTasks(rawInput: string, bookName: string): TaskItem[] {
  const tasks: TaskItem[] = [];
  const trimmed = rawInput.trim();
  if (!trimmed) return tasks;

  const seen = new Set<string>();
  const addSentence = (txt: string) => {
    const t = txt.trim();
    if (!t) return;
    // Strip accidental quotes if full line was enclosed
    const clean = t.replace(/^["']|["']$/g, '').trim();
    // Skip JSON syntax fragments if any slipped through
    if (!clean || clean === '{' || clean === '}' || clean === '[' || clean === ']' || clean.startsWith('"level"') || clean.startsWith('"source_file"')) {
      return;
    }
    if (!seen.has(clean)) {
      seen.add(clean);
      tasks.push({
        text: clean,
        hash: md5(clean),
        book: bookName,
        status: 'pending',
        selected: true
      });
    }
  };

  // 1. Try parsing JSON block(s)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    // Check if multiple JSON objects are concatenated together
    const jsonChunks: any[] = [];
    try {
      jsonChunks.push(JSON.parse(trimmed));
    } catch {
      // Split by object boundaries or parse line by line
      const lines = trimmed.split('\n');
      let currentObjStr = '';
      let braceCount = 0;
      for (const line of lines) {
        currentObjStr += line + '\n';
        for (const ch of line) {
          if (ch === '{') braceCount++;
          else if (ch === '}') braceCount--;
        }
        if (braceCount === 0 && currentObjStr.trim().startsWith('{') && currentObjStr.trim().endsWith('}')) {
          try {
            jsonChunks.push(JSON.parse(currentObjStr.trim()));
            currentObjStr = '';
          } catch {}
        }
      }
    }

    if (jsonChunks.length > 0) {
      for (const chunk of jsonChunks) {
        const extracted = extractTextsFromParsedJson(chunk);
        extracted.forEach(addSentence);
      }
      if (tasks.length > 0) return tasks;
    }
  }

  // 2. Treat as plain text line-by-line (or fallback)
  const lines = trimmed.split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (t) {
      // Skip raw JSON punctuation lines
      if (t === '{' || t === '}' || t === '[' || t === ']' || t.startsWith('"level":') || t.startsWith('"source_file":')) {
        continue;
      }
      addSentence(t);
    }
  }
  return tasks;
}
