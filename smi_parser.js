#!/usr/bin/env node

import {promises as fs} from 'node:fs';
import {join, resolve} from 'node:path';

/* ────────── GENERIC HELPERS ─────────────────────────────────────────── */

const HEX = '0123456789ABCDEF';
const toHex = n => HEX[(n >> 4) & 0x0F] + HEX[n & 0x0F];
const hexToInt = h => parseInt(h, 16);
const _asStr = v => Buffer.isBuffer(v) ? v.toString('hex') : String(v);
const swapSemi = hex => _asStr(hex).replace(/../g, p => p[1] + p[0]);

const phoneMap = c => /[0-9]/.test(c) ? c : ({'*': 'A', '#': 'B', 'A': 'C', 'B': 'D', 'C': 'E'})[c] ?? 'F';
const semiPhone = hex => {
    const s = swapSemi(hex).split('').map(phoneMap).join('');
    return s.endsWith('F') ? s.slice(0, -1) : s;
};

function tzDecode(tzHex = '') {
    if (tzHex.length < 2) return '+00:00';
    let tz = hexToInt(tzHex[0]);
    const sign = (tz & 8) ? '-' : '+';
    tz = (tz & 7) * 10 + parseInt(tzHex[1], 10);
    const h = String(Math.floor(tz / 4)).padStart(2, '0');
    const m = String((tz % 4) * 15).padStart(2, '0');
    return `${sign}${h}:${m}`;
}

/* ────────── 7-bit ALPHABET TABLES ───────────────────────────────────── */

const DEF = [
    '@', '£', '$', '¥', 'è', 'é', 'ù', 'ì', 'ò', 'Ç', '\n', 'Ø', 'ø', '\r', 'Å', 'å',
    '\u0081', '_', '\u0082', '\u0083', '\u0084', '\u0085', '\u0086', '\u0087',
    '\u0088', '\u0089', '\u008a', '\u001b', 'Æ', 'æ', 'ß', 'É',
    ' ', '!', '"', '#', '¤', '%', '&', "'", '(', ')', '*', '+',
    ',', '-', '.', '/', '0', '1', '2', '3', '4', '5', '6', '7',
    '8', '9', ':', ';', '<', '=', '>', '?', '¡', 'A', 'B', 'C', 'D',
    'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
    'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Ä', 'Ö',
    'Ñ', 'Ü', '§', '¿', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h',
    'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
    'u', 'v', 'w', 'x', 'y', 'z', 'ä'
];
const EXT = new Map([
    [0x0A, '\f'], [0x14, '^'], [0x28, '{'], [0x29, '}'],
    [0x2F, '\\'], [0x3C, '['], [0x3D, '~'], [0x3E, ']'],
    [0x40, '|'], [0x65, '€']
]);

/* ────────── DECODER CLASS ───────────────────────────────────────────── */

class SMSDecoder {
    #hex = '';
    #idx = 0;

    decode(bufOrHex) {
        this.#hex = _asStr(bufOrHex).replace(/ff+$/i, '');
        this.#idx = 0;
        const smscLen = this.#takeInt(1), smscInfo = this.#takeHex(smscLen);
        const smscToa = smscInfo.slice(0, 2), smscNum = smscLen ? semiPhone(smscInfo.slice(2)) : '';
        const fo = this.#takeInt(1), mt = fo & 3, udhi = !!(fo & 0x40);
        if (mt === 2) return this.#statusReport({smscNum, smscToa});
        return this.#deliverOrSubmit({smscNum, smscToa, fo, mt, udhi});
    }

    #takeHex = n => {
        const s = this.#hex.slice(this.#idx * 2, this.#idx * 2 + n * 2);
        this.#idx += n;
        return s;
    }
    #takeInt = n => hexToInt(this.#takeHex(n));

    #readTS() {
        const r = this.#takeHex(7), p = swapSemi(r).match(/../g);
        return p ? `20${p[0]}-${p[1]}-${p[2]} ${p[3]}:${p[4]}:${p[5]} ${tzDecode(p[6])}` : 'invalid-ts';
    }

    #statusReport(meta) {
        const mr = this.#takeInt(1), raLen = this.#takeInt(1);
        this.#takeInt(1);
        const ra = semiPhone(this.#takeHex(Math.ceil(raLen / 2)));
        const ts = this.#readTS(), dts = this.#readTS(), st = this.#takeInt(1);
        return {
            smscNum: meta.smscNum,
            smscToa: toHex(hexToInt(meta.smscToa)),
            type: 'STATUS_REPORT',
            messageRef: mr,
            recipient: ra,
            timestamp: ts,
            dischargeTs: dts,
            status: st
        };
    }

    #deliverOrSubmit(meta) {
        let mr = null;                                   // ▼ SUBMIT MR
        if (meta.mt === 1) mr = this.#takeInt(1);            // message-reference only in SUBMIT

        const addrLen = this.#takeInt(1);
        const toa = this.#takeInt(1);
        const addrRaw = this.#takeHex(Math.ceil(addrLen / 2));
        const isAlpha = (toa & 0x70) === 0x50;
        const phone = isAlpha ? this.#seven(addrRaw, 0, addrLen) : semiPhone(addrRaw);

        const pid = this.#takeInt(1), dcs = this.#takeInt(1);

        let timestamp = '';
        if (meta.mt === 0) timestamp = this.#readTS();
        else {
            const vpFmt = meta.fo & 0x18;
            if (vpFmt === 0x10) this.#takeInt(1); else if (vpFmt === 0x08 || vpFmt === 0x18) this.#takeHex(7);
        }

        const udl = this.#takeInt(1), udStart = this.#idx;
        let skipOct = 0, skipChr = 0, udh = '';
        if (meta.udhi) {
            const udhl = this.#takeInt(1);
            udh = this.#hex.slice(udStart * 2, (udStart + udhl + 1) * 2);
            skipOct = udhl + 1;
            const bits = this.#alphaBits(dcs);
            skipChr = bits === 16 ? skipOct / 2 : bits === 8 ? skipOct : Math.ceil(skipOct * 8 / 7);
        }
        const bits = this.#alphaBits(dcs), bodyHx = this.#hex.slice(udStart * 2);
        const text = bits === 16 ? this.#ucs2(bodyHx, skipOct, udl) : bits === 8 ? this.#octet(bodyHx, skipOct, udl) : this.#seven(bodyHx, skipChr, udl);

        const common = {
            smscNum: meta.smscNum,
            smscToa: toHex(hexToInt(meta.smscToa)),
            firstOctet: meta.fo,
            hasUdh: meta.udhi,
            pid,
            dcs,
            classDesc: (dcs & 0x10) ? `class ${dcs & 3}` : '',
            udh,
            length: bits === 16 ? udl / 2 : udl,
            text
        };

        return meta.mt === 0
            ? {...common, type: 'DELIVER', sender: phone, timestamp}
            : {...common, type: 'SUBMIT', recipient: phone, messageRef: mr, timestamp}; // timestamp may be ''
    }

    #alphaBits = d => ((d & 0xC0) === 0 ? ((d & 0x0C) === 8 ? 16 : (d & 0x0C) === 4 ? 8 : 7) : ((d & 0xC0) === 0xC0 ? ((d & 0x30) === 0x20 ? 16 : (d & 0x30) === 0x30 ? 8 : 7) : 7));

    /* payload decoders -------------------------------------------------- */
    #seven(hex, skip, septets) {
        let out = '', esc = false, bitPos = 0;
        for (let i = 0; i < septets; i++) {
            const b1 = hexToInt(hex.substr(Math.floor(bitPos / 8) * 2, 2) || '00');
            const b2 = hexToInt(hex.substr(Math.floor(bitPos / 8) * 2 + 2, 2) || '00');
            const v = ((b1 >> (bitPos % 8)) | (b2 << (8 - (bitPos % 8)))) & 0x7F;
            bitPos += 7;
            if (i < skip) continue;
            if (esc) {
                out += EXT.get(v) || '�';
                esc = false;
            } else if (v === 27) esc = true;
            else out += DEF[v] ?? '�';
        }
        return out;
    }

    #ucs2(hex, skipOct, udl) {
        const slice = hex.slice(skipOct * 2, skipOct * 2 + udl * 2);
        return new TextDecoder('utf-16be').decode(Buffer.from(slice, 'hex'));
    }

    #octet(hex, skipOct, udl) {
        const buf = Buffer.from(hex.slice(skipOct * 2, skipOct * 2 + udl * 2), 'hex');
        return [...buf].map(c => String.fromCharCode(c)).join('');
    }
}

function formatOutput(decoded) {
    let output = '';
    output += `SMS Center: ${decoded.smscNum}\n`;
    output += `Type: ${decoded.type}\n`;
    output += `Recipient: ${decoded.recipient}\n`;
    output += `Length: ${decoded.length}\n`;
    output += `Text: ${decoded.text}\n`;

    return output;
}

/* ────────── CLI WALKER (skips 18-byte SMO header) ────────────────────── */

async function processFile(file) {
    const raw = await fs.readFile(file);
    const data = raw.length > 18 ? raw.subarray(18) : raw;   // Siemens .smo header
    try {
        const decoded = new SMSDecoder().decode(data);
        console.log(`--- ${file} ---`);
        console.log(formatOutput(decoded));
    } catch (e) {
        console.error(`\nERR  ${file}\n`, e);
    }
}

async function walk(p) {
    const st = await fs.stat(p);
    if (st.isDirectory()) {
        for (const f of await fs.readdir(p)) await walk(join(p, f));
    } else if (st.isFile()) {
        await processFile(p);
    }
}

/* ────────── ENTRY POINT ──────────────────────────────────────────────── */

const target = process.argv[2];
if (!target) {
    console.error('Usage: node cli.js <file|directory>');
    process.exit(1);
}
walk(resolve(target)).catch(err => {
    console.error(err);
    process.exit(1);
});
