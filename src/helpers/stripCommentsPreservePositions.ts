export function stripCommentsPreservePositions(input: string): string {
    const chars = input.split('');
    const len = input.length;
    let i = 0;
    let inString: string | null = null; // "'" or '"'
    while (i < len) {
        const c = input[i];
        const next2 = input.substr(i, 2);
        // toggle strings (respecting simple backslash escape)
        if (inString) {
            if (c === inString) {
                // count backslashes immediately before to see if escaped
                let k = i - 1;
                let backslashes = 0;
                while (k >= 0 && input[k] === '\\') { backslashes++; k--; }
                if (backslashes % 2 === 0) { // not escaped
                    inString = null;
                }
            }
            i++;
            continue;
        } else {
            if (c === '"' || c === "'") {
                inString = c;
                i++;
                continue;
            }
        }

        // View php comment {{-- ... --}} 
        if (input.startsWith('{{--', i)) {
            const end = input.indexOf('--}}', i + 4);
            const stop = end === -1 ? len : end + 4;
            for (let j = i; j < stop; j++) {
                if (chars[j] !== '\n') {
                    chars[j] = ' ';
                }
            }
            i = stop;
            continue;
        }

        // HTML comment <!-- ... -->
        if (input.startsWith('<!--', i)) {
            const end = input.indexOf('-->', i + 4);
            const stop = end === -1 ? len : end + 3;
            for (let j = i; j < stop; j++) {
                if (chars[j] !== '\n') {
                    chars[j] = ' ';
                }
            }
            i = stop;
            continue;
        }

        // C-style block comment /* ... */
        if (next2 === '/*') {
            const end = input.indexOf('*/', i + 2);
            const stop = end === -1 ? len : end + 2;
            for (let j = i; j < stop; j++) {
                if (chars[j] !== '\n') {
                    chars[j] = ' ';
                }
            }
            i = stop;
            continue;
        }

        // Line comment // ...  (until newline)
        if (next2 === '//') {
            let stop = input.indexOf('\n', i + 2);
            if (stop === -1) {
                stop = len;
            }
            for (let j = i; j < stop; j++) {
                if (chars[j] !== '\n') {
                    chars[j] = ' ';
                }
            }
            i = stop;
            continue;
        }

        // Hash-style line comment #
        if (c === '#') {
            // Ensure '#' is start-of-line or preceded by whitespace
            const prev = i - 1;
            if (prev < 0 || /\s/.test(input[prev])) {
                let stop = input.indexOf('\n', i + 1);
                if (stop === -1) {
                    stop = len;
                }
                for (let j = i; j < stop; j++) {
                    if (chars[j] !== '\n') {
                        chars[j] = ' ';
                    }
                }
                i = stop;
                continue;
            }
        }

        i++;
    }
    return chars.join('');
}