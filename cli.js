#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { SMSDatParser, SMSDecoder } from './sms-parser.js';

const args   = process.argv.slice(2);
const debug  = args.includes('--debug');
const target = args.find(a => !a.startsWith('-'));

if (!target) {
    console.error('Usage: node cli.js <file|directory> [--debug]');
    process.exit(1);
}


function formatOutput(decoded) {
    let output = '';
    output += `Format: ${decoded.format}\n`;
    output += `Type: ${decoded.type}\n`;
    output += `Segments: ${decoded.segmentsStored}/${decoded.segmentsTotal}\n`;
    if (decoded.timestamp !== undefined) output += `Date: ${decoded.timestamp}\n`;
    output += `SMS Center: ${decoded.smsCenterNumber}\n`;
    if (decoded.recipient !== undefined) output += `Recipient: ${decoded.recipient}\n`;
    if (decoded.sender !== undefined) output += `Sender: ${decoded.sender}\n`;
    output += `Encoding: ${decoded.encoding}\n`;
    output += `Ref: ${decoded.messageRef}\n`;
    output += `Length: ${decoded.length}\n`;
    output += `Text: ${decoded.text}\n`;

    return output;
}

async function processFile(file) {
    const raw = await fs.readFile(file);
    try {
        if (file.endsWith('.dat'))  {
            const messages = new SMSDatParser().decode(raw);
            for (let i=0;i<messages.length;i++) {
                console.log("*Message #" + (i+1) + "*");
                console.log(formatOutput(messages[i]));
            }
        } else {
            const decoded = new SMSDecoder().decode(raw);
            console.log(formatOutput(decoded));
        }
    } catch (e) {
        console.error(`ERROR: ${e.message}${debug ? `\n${e.stack}` : ''}`);
    }
}

async function walk(p) {
    const stat = await fs.stat(p);
    if (stat.isDirectory()) {
        for (const f of await fs.readdir(p)) await walk(join(p, f));
    } else if (stat.isFile()) {
        console.log(`--- ${p} ---`);
        if (stat.size > 128 * 1024) {
            console.error(`ERROR: File too large: ${p}`);
            return;
        }
        await processFile(p);
    }
}


walk(resolve(target)).catch(err => {
    console.error(debug ? err : `ERROR: ${err.message}`);
    process.exit(1);
});
