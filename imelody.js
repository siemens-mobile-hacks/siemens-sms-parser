/*
Takes an iMelody string (including BEGIN … END).
Parses header and MELODY field.
Expands repeats, interprets rests, dotted / double-dotted / ⅔ notes, styles and volume changes.
Schedules audio with the Web Audio API.
*/
export async function playIMelody(imelodyString) {
    // ----------- helper constants --------------------------------------------------------
    const semitoneOffsetFromA = {
        c: -9, d: -7, e: -5, f: -4, g: -2, a: 0, b: 2,
        '#c': -8, '#d': -6, '#f': -3, '#g': -1, '#a': 1,
        '&d': -8, '&e': -6, '&g': -3, '&a': -1, '&b': 1
    };
    const durationDivisor = [ /* index matches duration value 0-5 */
        1 / 4, // full note = 4 quarter notes
        1 / 2, // half
        1,     // quarter
        2,     // eighth
        4,     // 16th
        8      // 32nd
    ];
    const dottedMultiplier = { '': 1, '.': 1.5, ':': 1.75, ';': 2 / 3 };
    const styleRestRatio = { S0: 1 / 20, S1: 0, S2: 1 };      // ratio = rest / note
    const linearVolume = v => Math.max(0, Math.min(15, v)) / 15; // V0=0 … V15=1

    // ----------- header parsing ----------------------------------------------------------
    const header = Object.fromEntries(
        imelodyString.trim().split(/\r?\n/).map(l => l.split(/:(.*)/s).map((x, i) => i ? x.trim() : x.toUpperCase()))
    );
    if (header['FORMAT']?.toUpperCase() !== 'CLASS1.0') throw new Error('Only FORMAT:CLASS1.0 supported, got ' + header['FORMAT']);
    const beatsPerMinute = Number(header['BEAT']) || 120;
    const styleCode = (header['STYLE']?.toUpperCase() || 'S0').replace(/^S?/, 'S');
    const startingVolume = /^V?\d+$/.test(header['VOLUME']||'') ? Number((header['VOLUME']).replace(/^V/,''))
        : 7;
    const quarterNoteSeconds = 60 / beatsPerMinute;

    // ----------- melody tokenisation -----------------------------------------------------
    const melodyRaw = (header['MELODY'] ?? '').trim();
    const TOKEN = /^(?:\(\)|\(|\)|@|#?[cdefgab]|&[degab]|r|V\+|V-|V\d+|\*\d|[0-5]|[.:;]|led(?:on|off)|vibe(?:on|off)|back(?:on|off))/i;
    const tokens = [];
    for (let i = 0; i < melodyRaw.length;) {
        const slice = melodyRaw.slice(i);
        const m = TOKEN.exec(slice);
        if (!m) throw new Error(`Cannot parse melody at “…${slice.slice(0,10)}”`);
        tokens.push(m[0]);
        i += m[0].length;
    }


    // ----------- expand repeats & build event list ---------------------------------------
    let currentVolume = startingVolume, currentOctave = 4; // *4 default
    const events = [];
    const pushNoteOrRest = (type, frequencyHz, durationSec) =>
        events.push({ type, frequencyHz, durationSec, volume: currentVolume });

    function processSequence(tokenIndexLimit) {
        while (pos < tokenIndexLimit) {
            const tk = tokens[pos++];
            if (tk === '(') {
                const bodyStart = pos;
                let depth = 1;
                while (depth && pos < tokens.length) {
                    if (tokens[pos] === '(') depth++;
                    else if (tokens[pos] === ')') depth--;
                    pos++;
                }
                if (depth) throw new Error('Unmatched "(" in repeat block');
                const bodyEnd = pos - 1;          // index of ')'
                if (tokens[pos] !== '@') throw new Error('"@" missing after repeat body');
                const repeatCount = Number(tokens[++pos] || 1);
                pos++; // move past repeat count
                if (tokens[pos] && /^V[+-]$/.test(tokens[pos])) {
                    currentVolume += tokens[pos++] === 'V+' ? 1 : -1;
                }
                const savedVolume = currentVolume;
                for (let r = 0; repeatCount === 0 || r < repeatCount; r++) {
                    const savedOctave = currentOctave;
                    currentVolume = savedVolume;
                    let bodyPos = bodyStart;
                    while (bodyPos < bodyEnd) {
                        pos = bodyPos;
                        processSequence(bodyEnd);
                        bodyPos = pos;
                    }
                    currentOctave = savedOctave;
                    if (repeatCount === 0) break; // prevent infinite loop
                }
            } else if (tk.startsWith('V') && tk.length > 1) {
                if (tk === 'V+' || tk === 'V-') currentVolume += tk === 'V+' ? 1 : -1;
                else currentVolume = Number(tk.slice(1));
            } else if (tk.startsWith('*')) {
                currentOctave = Number(tk.slice(1));
            } else if (tk.toLowerCase() === 'r') {
                const durToken = tokens[pos++]; if (!/^[0-5]$/.test(durToken)) throw new Error('Rest missing duration');
                const duration = quarterNoteSeconds / durationDivisor[Number(durToken)];
                const spec = tokens[pos] && /[.:;]/.test(tokens[pos]) ? tokens[pos++] : '';
                pushNoteOrRest('rest', 0, duration * dottedMultiplier[spec]);
            } else if (/^#?.|^&./.test(tk)) { // note head
                const noteToken = tk.toLowerCase();
                const durToken = tokens[pos++]; if (!/^[0-5]$/.test(durToken)) throw new Error('Note missing duration');
                const durationBase = quarterNoteSeconds / durationDivisor[Number(durToken)];
                const spec = tokens[pos] && /[.:;]/.test(tokens[pos]) ? tokens[pos++] : '';
                const durationSeconds = durationBase * dottedMultiplier[spec];
                const semitoneOffset = semitoneOffsetFromA[noteToken];
                const frequency = 55 * (2 ** currentOctave) * (2 ** (semitoneOffset / 12));
                pushNoteOrRest('note', frequency, durationSeconds);
                const restSeconds = durationSeconds * styleRestRatio[styleCode];
                if (restSeconds) pushNoteOrRest('rest', 0, restSeconds);
            } // led / vibe / backlight tokens are ignored
        }
    }
    let pos = 0;
    processSequence(tokens.length);

    // ----------- schedule audio -----------------------------------------------------------
    const audioCtx = playIMelody._sharedAudioCtx || (playIMelody._sharedAudioCtx = new (window.AudioContext||window.webkitAudioContext)());
    const gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
    let startTime = audioCtx.currentTime + 0.05; // slight delay for clean start

    for (const { type, frequencyHz, durationSec, volume } of events) {
        if (!durationSec) continue;
        if (type === 'note') {
            const oscillator = audioCtx.createOscillator();
            oscillator.frequency.value = frequencyHz;
            oscillator.type = 'square';
            oscillator.connect(gainNode);
            gainNode.gain.setValueAtTime(linearVolume(volume), startTime);
            oscillator.start(startTime);
            oscillator.stop(startTime + durationSec);
        }
        startTime += durationSec;
    }
    return new Promise(resolve => setTimeout(resolve, (startTime - audioCtx.currentTime) * 1000));
}
