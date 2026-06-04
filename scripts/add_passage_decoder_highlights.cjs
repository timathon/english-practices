const fs = require('fs');
const path = require('path');

const irregularVerbs = {
    'meet': ['met', 'meets', 'meeting'],
    'lose': ['lost', 'loses', 'losing'],
    'take': ['took', 'taken', 'takes', 'taking'],
    'give': ['gave', 'given', 'gives', 'giving'],
    'get': ['got', 'gotten', 'gets', 'getting'],
    'teach': ['taught', 'teaches', 'teaching'],
    'think': ['thought', 'thinks', 'thinking'],
    'go': ['went', 'gone', 'goes', 'going'],
    'write': ['wrote', 'written', 'writes', 'writing'],
    'see': ['saw', 'seen', 'sees', 'seeing'],
    'find': ['found', 'finds', 'finding'],
    'make': ['made', 'makes', 'making'],
    'tell': ['told', 'tells', 'telling'],
    'run': ['ran', 'runs', 'running'],
    'eat': ['ate', 'eaten', 'eats', 'eating'],
    'swim': ['swam', 'swum', 'swims', 'swimming'],
    'feel': ['felt', 'feels', 'feeling'],
    'sing': ['sang', 'sung', 'sings', 'singing'],
    'spend': ['spent', 'spends', 'spending'],
    'grow': ['grew', 'grown', 'grows', 'growing'],
    'wake': ['woke', 'woken', 'wakes', 'waking'],
    'ride': ['rode', 'ridden', 'rides', 'riding'],
    'win': ['won', 'wins', 'winning'],
    'do': ['did', 'done', 'does', 'doing'],
    'have': ['had', 'has', 'having'],
    'say': ['said', 'says', 'saying'],
    'read': ['read', 'reads', 'reading'],
    'hear': ['heard', 'hears', 'hearing'],
    'come': ['came', 'comes', 'coming'],
    'keep': ['kept', 'keeps', 'keeping'],
    'buy': ['bought', 'buys', 'buying'],
    'bring': ['brought', 'brings', 'bringing'],
    'cut': ['cut', 'cuts', 'cutting'],
    'put': ['put', 'puts', 'putting'],
    'fly': ['flew', 'flown', 'flies', 'flying'],
    'leave': ['left', 'leaves', 'leaving'],
    'fall': ['fell', 'fallen', 'falls', 'falling'],
    'know': ['knew', 'known', 'knows', 'knowing'],
    'speak': ['spoke', 'spoken', 'speaks', 'speaking'],
    'draw': ['drew', 'drawn', 'draws', 'drawing'],
    'wear': ['wore', 'worn', 'wears', 'wearing'],
    'begin': ['began', 'begun', 'begins', 'beginning'],
    'drink': ['drank', 'drunk', 'drinks', 'drinking'],
    'drive': ['drove', 'driven', 'drives', 'driving'],
    'sleep': ['slept', 'sleeps', 'sleeping'],
    'send': ['sent', 'sends', 'sending'],
    'build': ['built', 'builds', 'building'],
    'catch': ['caught', 'catches', 'catching'],
    'forget': ['forgot', 'forgotten', 'forgets', 'forgetting'],
    'fight': ['fought', 'fights', 'fighting'],
    'sell': ['sold', 'sells', 'selling'],
    'hold': ['held', 'holds', 'holding'],
    'shake': ['shook', 'shaken', 'shakes', 'shaking'],
    'choose': ['chose', 'chosen', 'chooses', 'choosing'],
    'sit': ['sat', 'sits', 'sitting'],
    'stand': ['stood', 'stands', 'standing'],
    'understand': ['understood', 'understands', 'understanding'],
    'throw': ['threw', 'thrown', 'throws', 'throwing'],
    'ring': ['rang', 'rung', 'rings', 'ringing'],
    'hide': ['hid', 'hidden', 'hides', 'hiding'],
    'rise': ['rose', 'risen', 'rises', 'rising'],
    'feed': ['fed', 'feeds', 'feeding'],
    'lead': ['led', 'leads', 'leading'],
    'bite': ['bit', 'bitten', 'bites', 'biting'],
    'blow': ['blew', 'blown', 'blows', 'blowing']
};

function getSingleWordInflections(singleWord) {
    const inflections = new Set([singleWord]);
    
    // Irregular verb base form
    if (irregularVerbs[singleWord]) {
        for (const vf of irregularVerbs[singleWord]) {
            inflections.add(vf);
        }
    }

    // Irregular nouns
    const irregularNouns = {
        'leaf': ['leaves'],
        'child': ['children'],
        'person': ['people'],
        'man': ['men'],
        'woman': ['women']
    };
    if (irregularNouns[singleWord]) {
        for (const pl of irregularNouns[singleWord]) {
            inflections.add(pl);
        }
    }

    // Regular pluralization rules
    if (singleWord.endsWith('y') && !['ay','ey','oy','uy'].some(suffix => singleWord.endsWith(suffix))) {
        inflections.add(singleWord.slice(0, -1) + 'ies');
        inflections.add(singleWord.slice(0, -1) + 'ied');
    } else if (singleWord.endsWith('s') || singleWord.endsWith('ch') || singleWord.endsWith('sh') || singleWord.endsWith('x') || singleWord.endsWith('z')) {
        inflections.add(singleWord + 'es');
    } else {
        inflections.add(singleWord + 's');
    }

    // Regular verb rules
    if (singleWord.endsWith('e')) {
        inflections.add(singleWord + 'd');
        inflections.add(singleWord + 's');
        inflections.add(singleWord.slice(0, -1) + 'ing');
    } else {
        inflections.add(singleWord + 'ed');
        inflections.add(singleWord + 'ing');
        // Double consonant for short vowels
        if (/^[a-z]*[aeiou][bdfgklmnprstvz]$/.test(singleWord)) {
            const lastChar = singleWord[singleWord.length - 1];
            inflections.add(singleWord + lastChar + 'ed');
            inflections.add(singleWord + lastChar + 'ing');
        }
    }
    
    return Array.from(inflections);
}

function getInflections(word) {
    const cleaned = word.toLowerCase().trim();
    const inflections = new Set([cleaned]);

    if (cleaned.includes('...')) {
        return [cleaned];
    }

    const words = cleaned.split(/\s+/);
    if (words.length > 1) {
        // Find if any word in the phrase is an irregular verb, and generate phrase inflections
        const verbIndex = words.findIndex(w => irregularVerbs[w]);
        if (verbIndex !== -1) {
            const verb = words[verbIndex];
            const verbForms = irregularVerbs[verb];
            for (const vf of verbForms) {
                const clonedWords = [...words];
                clonedWords[verbIndex] = vf;
                inflections.add(clonedWords.join(' '));
            }
        }
        
        // General inflections for the last word of phrase
        const lastWord = words[words.length - 1];
        const lastWordInflections = getSingleWordInflections(lastWord);
        for (const lwi of lastWordInflections) {
            inflections.add([...words.slice(0, -1), lwi].join(' '));
        }
        
        return Array.from(inflections);
    }

    return getSingleWordInflections(cleaned);
}

function findMatches(sentenceText, vocabWords) {
    const matches = [];
    const cleanSentenceText = sentenceText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, " ").replace(/\s+/g, " ");

    for (const vocabWord of vocabWords) {
        if (vocabWord.includes('...')) {
            const parts = vocabWord.split('...').map(p => p.trim());
            const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = parts.map(p => `\\b${escapeRegExp(p)}\\b`).join('.*?');
            const regex = new RegExp(`(${pattern})`, 'i');
            const match = sentenceText.match(regex);
            if (match) {
                matches.push({
                    word: vocabWord,
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0]
                });
            }
        } else {
            const inflections = getInflections(vocabWord);
            inflections.sort((a, b) => b.length - a.length);
            
            for (const inf of inflections) {
                const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b(${escapeRegExp(inf)})\\b`, 'i');
                const match = sentenceText.match(regex);
                if (match) {
                    matches.push({
                        word: vocabWord,
                        start: match.index,
                        end: match.index + match[0].length,
                        text: match[0]
                    });
                    break;
                }
            }
        }
    }

    // Resolve overlaps (longer matches win)
    matches.sort((a, b) => b.text.length - a.text.length);
    const selectedMatches = [];
    
    for (const match of matches) {
        let overlaps = false;
        for (const selected of selectedMatches) {
            if (Math.max(match.start, selected.start) < Math.min(match.end, selected.end)) {
                overlaps = true;
                break;
            }
        }
        if (!overlaps) {
            selectedMatches.push(match);
        }
    }
    
    selectedMatches.sort((a, b) => a.start - b.start);
    return selectedMatches.map(m => m.text);
}

function processFile(vocabGuidePath, passageDecoderPath) {
    if (!fs.existsSync(vocabGuidePath)) {
        console.warn(`Vocab guide not found: ${vocabGuidePath}`);
        return;
    }
    if (!fs.existsSync(passageDecoderPath)) {
        console.warn(`Passage decoder not found: ${passageDecoderPath}`);
        return;
    }

    const vocabData = JSON.parse(fs.readFileSync(vocabGuidePath, 'utf8'));
    const decoderData = JSON.parse(fs.readFileSync(passageDecoderPath, 'utf8'));

    const vocabList = (vocabData.unit_vocabulary || []).map(v => v.word);
    let updatedCount = 0;

    if (decoderData.sections && Array.isArray(decoderData.sections)) {
        for (const section of decoderData.sections) {
            if (section.sentences && Array.isArray(section.sentences)) {
                for (const sentence of section.sentences) {
                    if (sentence.en) {
                        const matched = findMatches(sentence.en, vocabList);
                        if (matched.length > 0) {
                            sentence.highlight = matched.join(', ');
                            updatedCount++;
                        } else {
                            delete sentence.highlight;
                        }
                    }
                }
            }
        }
    }

    fs.writeFileSync(passageDecoderPath, JSON.stringify(decoderData, null, 2) + '\n', 'utf8');
    console.log(`Processed ${passageDecoderPath}. Added highlights for ${updatedCount} sentences.`);
}

// If run from command line
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log("Usage: node add_passage_decoder_highlights.cjs <vocab_guide_path> <passage_decoder_path>");
        process.exit(1);
    }
    processFile(args[0], args[1]);
}

module.exports = { processFile, getInflections, findMatches };
