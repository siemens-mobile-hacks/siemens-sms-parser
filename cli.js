#!/usr/bin/env node

import {promises as fs} from 'node:fs';
import {join, resolve} from 'node:path';
import { SMSDecoder } from './smi_parser.js';
function formatOutput(decoded) {
    let output = '';
    output += `Format: ${decoded.format}\n`;
    output += `Type: ${decoded.type}\n`;
    output += `Segments: ${decoded.smsPartsStored}/${decoded.smsPartsTotal}\n`;
    if (decoded.timestamp !== undefined) output += `Date: ${decoded.timestamp}\n`;
    output += `SMS Center: ${decoded.smsCenterNumber}\n`;
    if (decoded.recipient !== undefined) output += `Recipient: ${decoded.recipient}\n`;
    if (decoded.sender !== undefined) output += `Sender: ${decoded.sender}\n`;
    output += `Encoding: ${decoded.encoding}\n`;
    output += `Length: ${decoded.length}\n`;
    output += `Text: ${decoded.text}\n`;

    return output;
}

/* ────────── CLI WALKER (skips 18-byte SMO header) ────────────────────── */

async function processFile(file) {
    const raw = await fs.readFile(file);
    try {
        const decoded = new SMSDecoder().decode(raw);
        console.log(formatOutput(decoded));
    } catch (e) {
        console.error(`ERROR: ${e.message}`);
    }
}

async function walk(p) {
    const stat = await fs.stat(p);
    if (stat.isDirectory()) {
        for (const f of await fs.readdir(p)) await walk(join(p, f));
    } else if (stat.isFile()) {
        console.log(`--- ${p} ---`);
        if (stat.size > 128*1024) {
            console.error(`ERROR: File too large: ${p}`);
            return;
        }
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
