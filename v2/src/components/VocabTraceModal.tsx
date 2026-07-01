import { useState, useEffect, useRef } from 'react';
import './VocabTraceModal.css';

// SVG paths for letters A-Z, a-z, and 0-9 in primary penmanship style.
// Coordinate grid:
// Top line: y = 25 (solid red/coral)
// Mid line: y = 50 (dashed blue)
// Baseline: y = 75 (solid blue)
// Bottom line: y = 95 (dashed grey)
const STROKE_DB: Record<string, string[]> = {
    // Lowercase
    'a': [
        'M 61 62.5 C 61 56.4, 56.4 51.5, 50 51.5 C 43.6 51.5, 39 56.4, 39 62.5 C 39 68.6, 43.6 73.5, 50 73.5 C 56.4 73.5, 61 68.6, 61 62.5', // Perfect round circle
        'M 61 50 L 61 75' // Stem
    ],
    'b': [
        'M 40 25 L 40 75', // Stem
        'M 40 62.5 C 40 50, 60 50, 60 62.5 C 60 75, 40 75, 40 62.5' // Loop
    ],
    'c': [
        'M 60 55 C 57 50, 40 50, 40 62.5 C 40 75, 57 75, 60 70' // Curve
    ],
    'd': [
        'M 61 62.5 C 61 56.4, 56.4 51.5, 50 51.5 C 43.6 51.5, 39 56.4, 39 62.5 C 39 68.6, 43.6 73.5, 50 73.5 C 56.4 73.5, 61 68.6, 61 62.5', // Circle
        'M 61 25 L 61 75' // Stem
    ],
    'e': [
        'M 40 62.5 L 60 62.5 C 60 50, 40 50, 40 62.5 C 40 75, 58 75, 60 70' // Loop & curve
    ],
    'f': [
        'M 55 30 C 52 25, 45 25, 45 35 L 45 75', // Hook & stem
        'M 38 50 L 54 50' // Crossbar
    ],
    'g': [
        'M 61 62.5 C 61 56.4, 56.4 51.5, 50 51.5 C 43.6 51.5, 39 56.4, 39 62.5 C 39 68.6, 43.6 73.5, 50 73.5 C 56.4 73.5, 61 68.6, 61 62.5', // Circle
        'M 61 50 L 61 85 C 61 95, 43 95, 39 90' // Hook down
    ],
    'h': [
        'M 40 25 L 40 75', // Stem
        'M 40 60 C 40 50, 60 50, 60 62 L 60 75' // Arch
    ],
    'i': [
        'M 50 50 L 50 75', // Stem
        'M 50 38 L 50.1 38' // Dot
    ],
    'j': [
        'M 55 50 L 55 85 C 55 95, 42 95, 40 90', // Hook
        'M 55 38 L 55.1 38' // Dot
    ],
    'k': [
        'M 40 25 L 40 75', // Stem
        'M 58 50 L 41 62.5', // Top branch
        'M 41 62.5 L 58 75' // Bottom branch
    ],
    'l': [
        'M 50 25 L 50 67 C 50 74, 57 75, 60 75' // Stem with bottom curve/hook
    ],
    'm': [
        'M 36 50 L 36 75', // Stem
        'M 36 60 C 36 50, 51 50, 51 62 L 51 75', // Arch 1
        'M 51 60 C 51 50, 66 50, 66 62 L 66 75' // Arch 2
    ],
    'n': [
        'M 40 50 L 40 75', // Stem
        'M 40 60 C 40 50, 60 50, 60 62 L 60 75' // Arch
    ],
    'o': [
        'M 50 51.5 C 43.6 51.5, 39 56.4, 39 62.5 C 39 68.6, 43.6 73.5, 50 73.5 C 56.4 73.5, 61 68.6, 61 62.5 C 61 56.4, 56.4 51.5, 50 51.5' // Perfect round circle
    ],
    'p': [
        'M 40 50 L 40 95', // Stem down
        'M 40 62.5 C 40 50, 60 50, 60 62.5 C 60 75, 40 75, 40 62.5' // Loop
    ],
    'q': [
        'M 61 62.5 C 61 56.4, 56.4 51.5, 50 51.5 C 43.6 51.5, 39 56.4, 39 62.5 C 39 68.6, 43.6 73.5, 50 73.5 C 56.4 73.5, 61 68.6, 61 62.5', // Circle
        'M 61 50 L 61 95' // Stem down
    ],
    'r': [
        'M 42 50 L 42 75', // Stem
        'M 42 60 C 44 52, 56 50, 60 52' // Hook
    ],
    's': [
        'M 58 56 C 58 51.5, 42 50, 42 58 C 42 64, 58 61, 58 67 C 58 73, 42 74.5, 42 70' // Smooth snake curve
    ],
    't': [
        'M 50 30 L 50 67 C 50 74, 57 75, 60 75', // Stem with bottom hook
        'M 42 45 L 58 45' // Crossbar
    ],
    'u': [
        'M 40 50 L 40 68 C 40 75, 60 75, 60 68 L 60 50', // Cup
        'M 60 50 L 60 75' // Stem
    ],
    'v': [
        'M 40 50 L 50 75', // Slant down
        'M 50 75 L 60 50' // Slant up
    ],
    'w': [
        'M 32 50 L 41 75 L 50 55 L 59 75 L 68 50' // Single continuous stroke
    ],
    'x': [
        'M 40 50 L 60 75', // Diagonal 1
        'M 60 50 L 40 75' // Diagonal 2
    ],
    'y': [
        'M 40 50 L 50 67.5', // Short slant
        'M 60 50 L 42 92.5' // Long descender slant
    ],
    'z': [
        'M 40 50 L 60 50', // Top bar
        'M 60 50 L 40 75', // Diagonal
        'M 40 75 L 60 75' // Bottom bar
    ],

    // Uppercase
    'A': [
        'M 50 25 L 32 75',
        'M 50 25 L 68 75',
        'M 38 58 L 62 58'
    ],
    'B': [
        'M 35 25 L 35 75',
        'M 35 25 C 58 25, 58 48, 35 48',
        'M 35 48 C 62 48, 62 75, 35 75'
    ],
    'C': [
        'M 62 35 C 58 25, 38 25, 38 50 C 38 75, 58 75, 62 65'
    ],
    'D': [
        'M 35 25 L 35 75',
        'M 35 25 C 68 25, 68 75, 35 75'
    ],
    'E': [
        'M 35 25 L 35 75',
        'M 35 25 L 60 25',
        'M 35 50 L 52 50',
        'M 35 75 L 60 75'
    ],
    'F': [
        'M 35 25 L 35 75',
        'M 35 25 L 60 25',
        'M 35 50 L 52 50'
    ],
    'G': [
        'M 62 35 C 58 25, 38 25, 38 50 C 38 75, 58 75, 62 65',
        'M 62 65 L 62 52 L 50 52'
    ],
    'H': [
        'M 35 25 L 35 75',
        'M 65 25 L 65 75',
        'M 35 50 L 65 50'
    ],
    'I': [
        'M 50 25 L 50 75',
        'M 38 25 L 62 25',
        'M 38 75 L 62 75'
    ],
    'J': [
        'M 60 25 L 60 65 C 60 75, 42 75, 38 65',
        'M 48 25 L 72 25'
    ],
    'K': [
        'M 35 25 L 35 75',
        'M 60 25 L 36 48',
        'M 36 48 L 60 75'
    ],
    'L': [
        'M 38 25 L 38 75',
        'M 38 75 L 62 75'
    ],
    'M': [
        'M 28 75 L 28 25',
        'M 28 25 L 50 55',
        'M 50 55 L 72 25',
        'M 72 25 L 72 75'
    ],
    'N': [
        'M 32 75 L 32 25',
        'M 32 25 L 68 75',
        'M 68 75 L 68 25'
    ],
    'O': [
        'M 50 25 C 37.3 25, 27 35.3, 27 48 C 27 60.7, 37.3 71, 50 71 C 62.7 71, 73 60.7, 73 48 C 73 35.3, 62.7 25, 50 25' // Perfect round circle
    ],
    'P': [
        'M 35 25 L 35 75',
        'M 35 25 C 60 25, 60 48, 35 48'
    ],
    'Q': [
        'M 50 25 C 37.3 25, 27 35.3, 27 48 C 27 60.7, 37.3 71, 50 71 C 62.7 71, 73 60.7, 73 48 C 73 35.3, 62.7 25, 50 25', // Perfect round circle
        'M 58 58 L 70 72'
    ],
    'R': [
        'M 35 25 L 35 75',
        'M 35 25 C 60 25, 60 48, 35 48',
        'M 35 48 L 60 75'
    ],
    'S': [
        'M 62 36 C 62 27.5, 38 25, 38 38 C 38 49, 62 46, 62 59 C 62 71.5, 38 74, 38 66' // Smooth snake curve
    ],
    'T': [
        'M 50 25 L 50 75',
        'M 32 25 L 68 25'
    ],
    'U': [
        'M 35 25 L 35 60 C 35 75, 65 75, 65 60 L 65 25'
    ],
    'V': [
        'M 32 25 L 50 75',
        'M 50 75 L 68 25'
    ],
    'W': [
        'M 24 25 L 37 75 L 50 42 L 63 75 L 76 25' // Single continuous stroke
    ],
    'X': [
        'M 35 25 L 65 75',
        'M 65 25 L 35 75'
    ],
    'Y': [
        'M 32 25 L 50 48',
        'M 68 25 L 50 48',
        'M 50 48 L 50 75'
    ],
    'Z': [
        'M 35 25 L 65 25',
        'M 65 25 L 35 75',
        'M 35 75 L 65 75'
    ],

    // Numbers
    '0': [
        'M 50 25 C 40 25, 32 35.3, 32 48 C 32 60.7, 40 71, 50 71 C 60 71, 68 60.7, 68 48 C 68 35.3, 60 25, 50 25' // Perfect oval zero
    ],
    '1': [
        'M 40 35 L 50 25 L 50 75',
        'M 38 75 L 62 75'
    ],
    '2': [
        'M 35 35 C 35 25, 65 25, 65 45 L 35 75 L 65 75'
    ],
    '3': [
        'M 35 25 L 65 25 L 48 48 C 62 48, 65 56, 65 62.5 C 65 72.5, 35 72.5, 35 62.5'
    ],
    '4': [
        'M 52 25 L 32 52 L 64 52',
        'M 52 25 L 52 75'
    ],
    '5': [
        'M 60 25 L 38 25 L 38 48 C 45 44, 62 44, 62 58.5 C 62 72.5, 38 72.5, 38 62.5'
    ],
    '6': [
        'M 58 25 C 35 35, 35 75, 50 75 C 62 75, 62 52, 50 52 C 38 52, 38 75, 50 75'
    ],
    '7': [
        'M 35 25 L 65 25 L 45 75'
    ],
    '8': [
        'M 50 50 C 62 50, 62 25, 50 25 C 38 25, 38 50, 50 50 C 62 50, 62 75, 50 75 C 38 75, 38 50, 50 50'
    ],
    '9': [
        'M 50 50 C 62 50, 62 25, 50 25 C 38 25, 38 50, 50 50 L 50 75'
    ]
};

// Custom widths for kerning (squeezing thin letters together and giving wide letters breathing room)
const CHAR_WIDTHS: Record<string, number> = {
    'i': 24, 'l': 22, 'j': 24, '1': 24,
    'm': 44, 'w': 44, 'M': 46, 'W': 48,
};

// Extractor helper to parse the first point of an SVG path
const getStartPoint = (pathStr: string): { x: number; y: number } | null => {
    const match = pathStr.match(/^[M]\s*([\d.]+)\s+([\d.]+)/i);
    if (match) {
        return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
    }
    return null;
};

interface VocabTraceModalProps {
    vocabList: any[];
    startIndex: number;
    onClose: () => void;
}

interface FlattenedStroke {
    char: string;
    charIndex: number;
    strokeIndex: number;
    path: string;
}

interface VocabTraceBoardProps {
    word: string;
    onPrev?: () => void;
    onNext?: () => void;
}

function VocabTraceBoard({ word, onPrev, onNext }: VocabTraceBoardProps) {
    const [isPlaying, setIsPlaying] = useState(true);
    const [speed, setSpeed] = useState(1);
    
    // Combined animation state to ensure atomic renders
    const [animState, setAnimState] = useState({ completed: 0, offset: 200 });
    const completedStrokes = animState.completed;
    const animatingStrokeOffset = animState.offset;

    const timerRef = useRef<any>(null);

    const letters = word.split('').map((char: string) => {
        return {
            char,
            strokes: STROKE_DB[char] || null
        };
    });

    const flattenedStrokes: FlattenedStroke[] = [];
    letters.forEach((item: any, charIndex: number) => {
        if (item.strokes) {
            item.strokes.forEach((path: string, strokeIndex: number) => {
                flattenedStrokes.push({
                    char: item.char,
                    charIndex,
                    strokeIndex,
                    path
                });
            });
        }
    });

    const totalStrokes = flattenedStrokes.length;

    // Handle stroke-by-stroke animation logic
    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (!isPlaying || totalStrokes === 0) return;

        if (completedStrokes >= totalStrokes) {
            const restartTimeout = setTimeout(() => {
                setAnimState({ completed: 0, offset: 200 });
            }, 1300);
            return () => clearTimeout(restartTimeout);
        }

        const baseDuration = 600; // ms per stroke at 1x speed
        const duration = baseDuration / speed;
        const steps = 30; // 30 frames per stroke
        const stepInterval = duration / steps;
        
        let currentStep = 0;

        const delay = completedStrokes === 0 ? 200 : 0;

        const startInterval = () => {
            timerRef.current = setInterval(() => {
                currentStep++;
                const progress = currentStep / steps;
                const newOffset = 200 * (1 - progress);

                if (currentStep >= steps) {
                    clearInterval(timerRef.current);
                    setAnimState(prev => ({ completed: prev.completed + 1, offset: 200 }));
                } else {
                    setAnimState(prev => ({ ...prev, offset: newOffset }));
                }
            }, stepInterval);
        };

        let delayTimeout: any = null;
        if (delay > 0) {
            delayTimeout = setTimeout(startInterval, delay);
        } else {
            startInterval();
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (delayTimeout) clearTimeout(delayTimeout);
        };
    }, [isPlaying, completedStrokes, totalStrokes, speed]);



    const handlePlayPause = () => {
        if (completedStrokes >= totalStrokes) {
            setAnimState({ completed: 0, offset: 200 });
            setIsPlaying(true);
        } else {
            setIsPlaying(!isPlaying);
        }
    };

    const paddingX = 40;
    
    // Calculate dynamic offsets for each letter to handle proper kerning (e.g. thin l/i vs normal/wide m/w)
    let currentX = paddingX;
    const rawOffsets = letters.map((item, idx) => {
        const x = currentX;
        const charWidth = CHAR_WIDTHS[item.char] || 32;
        const nextChar = letters[idx + 1];
        const nextCharWidth = nextChar ? (CHAR_WIDTHS[nextChar.char] || 32) : 32;
        currentX += (charWidth + nextCharWidth) / 2;
        return x;
    });

    const svgWidth = Math.max(320, currentX + paddingX);
    const svgHeight = 120;

    // Center the entire word in the SVG
    const wordCenter = ((rawOffsets[0] || 0) + (rawOffsets[rawOffsets.length - 1] || 0)) / 2 + 50;
    const shift = (svgWidth / 2) - wordCenter;
    const letterOffsets = rawOffsets.map(x => x + shift);

    return (
        <>
            <div className="vt-board-outer" style={{ position: 'relative' }}>
                <div className="vt-board-speed-container" style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 10 }}>
                    <span style={{ fontSize: '0.8rem', color: '#57606f', fontWeight: 600 }}>Speed:</span>
                    <select
                        className="vt-speed-select"
                        value={speed}
                        onChange={e => setSpeed(parseFloat(e.target.value))}
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                    >
                        <option value="0.5">0.5x</option>
                        <option value="1">1.0x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2">2.0x</option>
                    </select>
                </div>
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width={svgWidth} height={svgHeight} className="vt-board-svg">
                    {/* Lined paper guidelines */}
                    <line x1={0} y1={25} x2={svgWidth} y2={25} className="vt-line-top" />
                    <line x1={0} y1={50} x2={svgWidth} y2={50} className="vt-line-mid" />
                    <line x1={0} y1={75} x2={svgWidth} y2={75} className="vt-line-base" />
                    <line x1={0} y1={95} x2={svgWidth} y2={95} className="vt-line-bottom" />

                    {letters.map((item: { char: string; strokes: string[] | null }, charIdx: number) => {
                        const xOffset = letterOffsets[charIdx];
                        
                        if (item.char === ' ') return null;

                        if (!item.strokes) {
                            return (
                                <text
                                    key={charIdx}
                                    x={xOffset + 50}
                                    y={75}
                                    textAnchor="middle"
                                    style={{
                                        fontFamily: 'Inter, system-ui, sans-serif',
                                        fontSize: '50px',
                                        fill: '#bdc3c7',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {item.char}
                                </text>
                            );
                        }

                        return (
                            <g key={charIdx} transform={`translate(${xOffset}, 0)`}>
                                {item.strokes.map((pathStr: string, strokeIdx: number) => {
                                    const globalIdx = flattenedStrokes.findIndex(
                                        s => s.charIndex === charIdx && s.strokeIndex === strokeIdx
                                    );

                                    const isAnimating = globalIdx === completedStrokes;
                                    const isNotStarted = globalIdx > completedStrokes || (completedStrokes === 0 && animatingStrokeOffset === 200);
                                    const startPt = getStartPoint(pathStr);

                                    return (
                                        <g key={strokeIdx}>
                                            <path
                                                d={pathStr}
                                                className={`vt-letter-stroke-bg ${strokeIdx > 0 ? 'secondary-stroke' : ''}`}
                                                strokeWidth={4.5}
                                            />
                                            {!isNotStarted && (
                                                <path
                                                    d={pathStr}
                                                    className={`vt-letter-stroke ${strokeIdx > 0 ? 'secondary-stroke' : ''}`}
                                                    strokeWidth={4.5}
                                                    style={{
                                                        strokeDasharray: '200',
                                                        strokeDashoffset: isAnimating ? animatingStrokeOffset : 0
                                                    }}
                                                />
                                            )}
                                            {isAnimating && !isNotStarted && startPt && (
                                                <circle
                                                    cx={startPt.x}
                                                    cy={startPt.y}
                                                    r={3.5}
                                                    className="vt-start-dot"
                                                />
                                            )}
                                        </g>
                                    );
                                })}
                            </g>
                        );
                    })}
                </svg>
            </div>

             <div className="vt-controls" style={{ justifyContent: 'center' }}>
                <div className="vt-btn-group">
                    <button className="vt-btn" onClick={onPrev} disabled={!onPrev} title="Prev Word">
                        ⏮️
                    </button>
                    <button className="vt-btn primary" onClick={handlePlayPause} title={isPlaying ? 'Pause' : 'Play'}>
                        {isPlaying ? '⏸️' : '▶️'}
                    </button>
                    <button className="vt-btn" onClick={onNext} disabled={!onNext} title="Next Word">
                        ⏭️
                    </button>
                </div>
            </div>
        </>
    );
}

export function VocabTraceModal({ vocabList, startIndex, onClose }: VocabTraceModalProps) {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    
    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < vocabList.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const currentWordItem = vocabList[currentIndex];

    return (
        <div className="vt-modal-overlay" onClick={onClose}>
            <div className="vt-modal-container" onClick={e => e.stopPropagation()}>
                <div className="vt-header">
                    <div>
                        <h3>Handwriting Trace</h3>
                        <div className="vt-word-info">
                            Word {currentIndex + 1} of {vocabList.length}: <strong>{currentWordItem?.meaning}</strong>
                        </div>
                    </div>
                    <button className="vt-close-btn" onClick={onClose}>✖</button>
                </div>

                {currentWordItem && (
                    <VocabTraceBoard
                        key={currentIndex}
                        word={currentWordItem.word}
                        onPrev={currentIndex > 0 ? handlePrev : undefined}
                        onNext={currentIndex < vocabList.length - 1 ? handleNext : undefined}
                    />
                )}
            </div>
        </div>
    );
}

export function AnimatedWordSVG({ word }: { word: string }) {
    // Combined animation state to ensure atomic renders
    const [animState, setAnimState] = useState({ completed: 0, offset: 200 });
    const completedStrokes = animState.completed;
    const animatingStrokeOffset = animState.offset;

    const timerRef = useRef<any>(null);

    const letters = word.split('').map((char: string) => {
        return {
            char,
            strokes: STROKE_DB[char] || null
        };
    });

    const flattenedStrokes: FlattenedStroke[] = [];
    letters.forEach((item: any, charIndex: number) => {
        if (item.strokes) {
            item.strokes.forEach((path: string, strokeIndex: number) => {
                flattenedStrokes.push({
                    char: item.char,
                    charIndex,
                    strokeIndex,
                    path
                });
            });
        }
    });

    const totalStrokes = flattenedStrokes.length;

    useEffect(() => {
        setAnimState({ completed: 0, offset: 200 });
    }, [word]);

    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (totalStrokes === 0) return;

        if (completedStrokes >= totalStrokes) {
            const restartTimeout = setTimeout(() => {
                setAnimState({ completed: 0, offset: 200 });
            }, 1300);
            return () => clearTimeout(restartTimeout);
        }

        const duration = 600;
        const steps = 30;
        const stepInterval = duration / steps;
        
        let currentStep = 0;

        const delay = completedStrokes === 0 ? 200 : 0;

        const startInterval = () => {
            timerRef.current = setInterval(() => {
                currentStep++;
                const progress = currentStep / steps;
                const newOffset = 200 * (1 - progress);

                if (currentStep >= steps) {
                    clearInterval(timerRef.current);
                    setAnimState(prev => ({ completed: prev.completed + 1, offset: 200 }));
                } else {
                    setAnimState(prev => ({ ...prev, offset: newOffset }));
                }
            }, stepInterval);
        };

        let delayTimeout: any = null;
        if (delay > 0) {
            delayTimeout = setTimeout(startInterval, delay);
        } else {
            startInterval();
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (delayTimeout) clearTimeout(delayTimeout);
        };
    }, [completedStrokes, totalStrokes]);

    const paddingX = 45;
    let currentX = paddingX;
    const rawOffsets = letters.map((item, idx) => {
        const x = currentX;
        const charWidth = CHAR_WIDTHS[item.char] || 32;
        const nextChar = letters[idx + 1];
        const nextCharWidth = nextChar ? (CHAR_WIDTHS[nextChar.char] || 32) : 32;
        currentX += (charWidth + nextCharWidth) / 2;
        return x;
    });

    const svgWidth = Math.max(320, currentX + paddingX);
    const svgHeight = 120;

    // Center the entire word in the SVG
    const wordCenter = ((rawOffsets[0] || 0) + (rawOffsets[rawOffsets.length - 1] || 0)) / 2 + 50;
    const shift = (svgWidth / 2) - wordCenter;
    const letterOffsets = rawOffsets.map(x => x + shift);

    return (
        <div className="vt-board-outer" style={{ border: 'none', background: 'transparent', padding: '10px 0', width: '100%', boxShadow: 'none', overflow: 'hidden' }}>
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" style={{ maxHeight: '120px' }} className="vt-board-svg">
                {/* Lined paper guidelines */}
                <line x1={0} y1={25} x2={svgWidth} y2={25} className="vt-line-top" />
                <line x1={0} y1={50} x2={svgWidth} y2={50} className="vt-line-mid" />
                <line x1={0} y1={75} x2={svgWidth} y2={75} className="vt-line-base" />
                <line x1={0} y1={95} x2={svgWidth} y2={95} className="vt-line-bottom" />

                {letters.map((item: { char: string; strokes: string[] | null }, charIdx: number) => {
                    const xOffset = letterOffsets[charIdx];
                    
                    if (item.char === ' ') return null;

                    if (!item.strokes) {
                        return (
                            <text
                                key={charIdx}
                                x={xOffset + 50}
                                y={75}
                                textAnchor="middle"
                                style={{
                                    fontFamily: 'Inter, system-ui, sans-serif',
                                    fontSize: '50px',
                                    fill: '#bdc3c7',
                                    fontWeight: 'bold'
                                }}
                            >
                                {item.char}
                            </text>
                        );
                    }

                    return (
                        <g key={charIdx} transform={`translate(${xOffset}, 0)`}>
                            {item.strokes.map((pathStr: string, strokeIdx: number) => {
                                const globalIdx = flattenedStrokes.findIndex(
                                    s => s.charIndex === charIdx && s.strokeIndex === strokeIdx
                                );

                                const isAnimating = globalIdx === completedStrokes;
                                const isNotStarted = globalIdx > completedStrokes || (completedStrokes === 0 && animatingStrokeOffset === 200);
                                const startPt = getStartPoint(pathStr);

                                return (
                                    <g key={strokeIdx}>
                                        <path
                                            d={pathStr}
                                            className={`vt-letter-stroke-bg ${strokeIdx > 0 ? 'secondary-stroke' : ''}`}
                                            strokeWidth={4.5}
                                        />
                                        {!isNotStarted && (
                                            <path
                                                d={pathStr}
                                                className={`vt-letter-stroke ${strokeIdx > 0 ? 'secondary-stroke' : ''}`}
                                                strokeWidth={4.5}
                                                style={{
                                                    strokeDasharray: '200',
                                                    strokeDashoffset: isAnimating ? animatingStrokeOffset : 0
                                                }}
                                            />
                                        )}
                                        {isAnimating && !isNotStarted && startPt && (
                                            <circle
                                                cx={startPt.x}
                                                cy={startPt.y}
                                                r={3.5}
                                                className="vt-start-dot"
                                            />
                                        )}
                                    </g>
                                );
                            })}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
