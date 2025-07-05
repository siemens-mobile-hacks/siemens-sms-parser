/* ────────── GENERIC HELPERS ─────────────────────────────────────────── */

const HEX = '0123456789ABCDEF';
const toHex = n => HEX[(n >> 4) & 0x0F] + HEX[n & 0x0F];
const hexToInt = h => parseInt(h, 16);
const intToOctets = (integer) => {
    const bytes = [];
    for (let i = 0; i < 4; i++) {
        // Right shift the integer to get the next byte
        // 0xff (255) is used as a mask to get the last 8 bits (octet)
        bytes.push((integer >> (i * 8)) & 0xff);
    }
    return new Uint8Array(bytes);
};
const bytesToHex = bytes => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');

function byteToBooleansLSBFirst(byte) {
    if (byte < 0 || byte > 255) throw new RangeError("Input must be a 1-byte integer (0–255)");
    const bits = [];
    for (let i = 0; i < 8; i++) {
        bits.push(Boolean((byte >> i) & 1));
    }
    return bits;
}


const alphaBits = d => ((d & 0xC0) === 0 ? ((d & 0x0C) === 8 ? 16 : (d & 0x0C) === 4 ? 8 : 7) : ((d & 0xC0) === 0xC0 ? ((d & 0x30) === 0x20 ? 16 : (d & 0x30) === 0x30 ? 8 : 7) : 7));
const hexToBytes = hex => Uint8Array.from(hex.match(/../g).map(h => parseInt(h, 16)));
const _asStr = v => v instanceof Uint8Array ? bytesToHex(v) : String(v);
const swapSemi = hex => _asStr(hex).replace(/../g, p => p[1] + p[0]);

const phoneMap = c => /[0-9]/.test(c) ? c : ({'*': 'A', '#': 'B', 'A': 'C', 'B': 'D', 'C': 'E'})[c] ?? 'F';
const semiPhone = hex => {
    const s = swapSemi(hex).split('').map(phoneMap).join('');
    return s.endsWith('F') ? s.slice(0, -1) : s;
};
const decodeTimestamp = ts => {
    if (ts === '00000000000000') return undefined;
    let parts = swapSemi(ts).match(/../g);
    return parts ? `20${parts[0]}-${parts[1]}-${parts[2]} ${parts[3]}:${parts[4]}:${parts[5]} ${tzDecode(parts[6])}` : 'invalid-ts';
}

function tzDecode(tzHex = '') {
    if (tzHex.length < 2) return '+00:00';
    let tz = hexToInt(tzHex[0]);
    const sign = (tz & 8) ? '-' : '+';
    tz = (tz & 7) * 10 + parseInt(tzHex[1], 10);
    const h = String(Math.floor(tz / 4)).padStart(2, '0');
    const m = String((tz % 4) * 15).padStart(2, '0');
    return `${sign}${h}:${m}`;
}

function sevenBitDecode(hex, skip, septets) {
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

function ucs2Decode(hex, skipOct) {
    const sliceBytes = hexToBytes(hex.slice(skipOct * 2, hex.length));
    return new TextDecoder('utf-16be').decode(sliceBytes);
}

function octetDecode(hex, skipOct) {
    const bytes = hexToBytes(hex.slice(skipOct * 2, hex.length));
    return [...bytes].map(c => String.fromCharCode(c)).join('');
}

function trimTrailingFFs(hex) {
    const s = _asStr(hex);
    // Remove pairs of 'ff' from the end, leaving any unpaired 'f'.
    return s.replace(/(?:ff)+$/gi, '');
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
const FileFormats = Object.freeze({
    //per https://sisms.sourceforge.net/docs/SMISMOStruct.html
    'SL4x': { //Version 0
        signature: '0b0b000000',
        segmentStatusOffset: 5,
        smsCOffset: 5 + 1,
    },
    'X55_ME45': { //Version 1
        signature: '0b0b010100',
        smsPartsOffset: 5,
        smsTypeOffset: 5 + 2,
        smsStatusOffset: 5 + 2 + 1,
        timestampOffset: 5 + 2 + 1 + 1,
        segmentStatusOffset: 5 + 2 + 1 + 1 + 7,
        smsCOffset: 5 + 2 + 1 + 1 + 7 + 1,
    },
    'X55_X65_X75': { //Version 2
        signature: '0b0b020c00',
        smsPartsOffset: 5,
        smsTypeOffset: 5 + 2,
        smsStatusOffset: 5 + 2 + 1,
        timestampOffset: 5 + 2 + 1 + 1,
        segmentStatusOffset: 5 + 2 + 1 + 1 + 1 + 7,
        smsCOffset: 5 + 2 + 1 + 1 + 1 + 7 + 1,
    },
});
const SmsTypes = Object.freeze({
    DELIVER: 0,
    SUBMIT: 3,
})
const SegmentStatuses = Object.freeze({
    INCOMING_READ: 1,
    INCOMING_UNREAD: 3,
    OUTGOING_SENT: 5,
    OUTGOING_UNSENT: 7,
});
const SmsStatuses = Object.freeze({
    DELIVERED: 0,
    UNDELIVERED: 1,
})

export class PDUDecoder {
    #dataAsHex;
    #idx;
    #takeHex = n => {
        const s = this.#peekHex(n);
        this.#idx += n;
        return s;
    }
    #peekHex = n => {
        return this.#dataAsHex.slice(this.#idx * 2, this.#idx * 2 + n * 2);
    }
    #takeInt = n => hexToInt(this.#takeHex(n));

    #statusReport(meta) {
        const mr = this.#takeInt(1), recipientLength = this.#takeInt(1);
        this.#takeInt(1);
        const recipient = semiPhone(this.#takeHex(Math.ceil(recipientLength / 2)));
        const timestamp = decodeTimestamp(this.#takeHex(7));
        const dischargeTimestamp = decodeTimestamp(this.#takeHex(7));
        const status = this.#takeInt(1);
        return {
            type: 'STATUS_REPORT',
            messageRef: mr,
            recipient: recipient,
            timestamp: timestamp,
            dischargeTs: dischargeTimestamp,
            status: status
        };
    }

    decode(hex) {
        this.#dataAsHex = trimTrailingFFs(hex);
        if (this.#dataAsHex.length < 6) return undefined;
        this.#idx = 0;
        const smsCLength = this.#takeInt(1);
        const smsCenterType = this.#takeInt(1);
        let smsCenterNumber;
        if (smsCLength > 1) {
            if (this.#dataAsHex.length < (this.#idx + smsCLength * 2)) throw new Error(`Entry aborted before SMS Center could be read in full`);
            const smsCAddressHex = this.#takeHex(smsCLength - 1);
            smsCenterNumber = semiPhone(smsCAddressHex);
        } else {
            smsCenterNumber = '';
        }
        const firstOctet = hexToInt(this.#peekHex(1));
        const messageType = firstOctet & 3;
        if (messageType === 2) return this.#statusReport();
        const dataAfterFirstOctet = this.#decodePduFromFirstOctet()

        return {
            ...dataAfterFirstOctet,
            smsCenterType,
            smsCenterNumber,
            format: "SMS.dat"
        }
    }

    decodeSmsDat(hex) {
        const folder = hex.slice(0, 2) //01 = inbox read, 03 = inbox unread, 05 = outbox sent, 07 = outbox unsent

        return this.decode(hex.slice(2, hex.length));
    }

    #decodePduFromFirstOctet() {
        const firstOctetHex = this.#takeHex(1);
        const firstOctet = hexToInt(firstOctetHex);
        const firstOctetBits = byteToBooleansLSBFirst(firstOctet);
        const isSubmit = firstOctetBits[0];
        const isCommandOrStatusReport = firstOctetBits[1];
        const rejectDuplicatesOrMoreMessagesToSend = firstOctetBits[2];
        const loopPrevention = firstOctetBits[3];
        const validityPeriodFormat = firstOctetBits[3];
        const validityPeriodFollowsInSubmit = firstOctetBits[4];
        const statusReportStatus = firstOctetBits[5];
        const udhiPresent = firstOctetBits[6];
        const replyPath = firstOctetBits[7];

        /**
         * The Message Reference field (TP-MR) is used in all messages on the submission side with exception of
         * the SMS-SUBMIT-REPORT (that is in SMS-SUBMIT, SMS-COMMAND and SMS-STATUS-REPORT).
         * It is a single-octet value which is incremented each time a new message is submitted or a new SMS-COMMAND is sent.
         * If the message submission fails, the mobile phone should repeat the submission with the same TP-MR value and
         * with the TP-RD bit set to 1.
         */
        let messageRef;

        if (isSubmit && !isCommandOrStatusReport) {
            messageRef = this.#takeInt(1);
        }
        const addrLen = this.#takeInt(1);
        const toa = this.#takeInt(1);
        const addrRaw = this.#takeHex(Math.ceil(addrLen / 2));
        const isAlpha = (toa & 0x70) === 0x50;
        const phone = isAlpha ? sevenBitDecode(addrRaw, 0, addrLen) : semiPhone(addrRaw);

        const pid = this.#takeInt(1);
        const dcs = this.#takeInt(1);
        const bits = alphaBits(dcs);

        let timestamp;
        if (isSubmit) {
            if (validityPeriodFollowsInSubmit) {
                const validityPeriod = this.#takeInt(1)
            }
        } else {
            timestamp = decodeTimestamp(this.#takeHex(7));
        }

        const userDataLength = this.#takeInt(1);
        const udStart = this.#idx;

        let {udh, encoding, text, length} = this.decodeUserData(
            this.#dataAsHex.slice(udStart * 2),
            udhiPresent,
            bits,
            userDataLength
        );

        const common = {
            firstOctet,
            udhiPresent,
            pid,
            dcs,
            classDesc: (dcs & 0x10) ? `class ${dcs & 3}` : '',
            udh,
            length,
            text,
            encoding,
        };

        return isSubmit ? {...common, type: 'Outgoing', recipient: phone, messageRef: messageRef}
            : {...common, type: 'Incoming', sender: phone, timestamp};
    }

    decodeUserData(bodyHx, udhiPresent, bits, userDataLength) {
        let skipOct = 0, skipChr = 0, udh = '';
        let udhl;
        if (udhiPresent) {
            udhl = this.#takeInt(1);
            udh = bodyHx.slice(0, (udhl + 1) * 2);
            skipOct = udhl + 1;
        }
        let encoding, text;
        switch (bits) {
            case 16: {
                encoding = 'UCS-2';
                text = ucs2Decode(bodyHx, skipOct);
                break;
            }
            case 8: {
                encoding = 'ASCII';
                text = octetDecode(bodyHx, skipOct);
                break;
            }
            case 7: {
                encoding = 'GSM-7';
                text = sevenBitDecode(bodyHx, Math.ceil(skipOct * 8 / 7), userDataLength);
                break;
            }
            default: {
                throw new Error(`Unknown number of bits: ${bits}`);
            }
        }

        const length = bits === 16 ? (bodyHx.length - skipOct) / 2 : (userDataLength - skipOct);
        return {skipOct, udh, encoding, text, length};
    }
}

export class SMSDecoder {
    #dataAsHex = '';
    #format;
    #idx = 0;
    #smsPartsTotal = 0;
    #smsPartsStored = 0;
    #smsType;
    #smsStatus;
    #timestamp;
    #segmentStatus;

    decode(bufOrHex) {
        if (bufOrHex.length <= 5) throw new Error(`File too short`);
        this.#idx = 0;
        this.#dataAsHex = _asStr(bufOrHex);
        let signature = this.#takeHex(5);
        for (const [formatName, formatSignature] of Object.entries(FileFormats)) {
            if (signature === formatSignature.signature) {
                this.#format = formatName;
                break;
            }
        }
        if (this.#format === undefined) throw new Error(`Unknown file format. First 5 bytes: ${signature}`);
        const formatObject = FileFormats[this.#format];
        if (formatObject.hasOwnProperty('smsPartsOffset')) {
            this.#smsPartsTotal = this.#takeInt(1);
            this.#smsPartsStored = this.#takeInt(1);
        }
        if (formatObject.hasOwnProperty('smsTypeOffset')) {
            this.#smsType = this.#takeInt(1);
        }
        if (formatObject.hasOwnProperty('smsStatusOffset')) {
            this.#smsStatus = this.#takeInt(1);
        }
        if (formatObject.hasOwnProperty('timestampOffset')) {
            this.#timestamp = decodeTimestamp(this.#takeHex(7));
        }
        if (formatObject.segmentStatusOffset - formatObject.timestampOffset > 7) {
            this.#takeInt(formatObject.segmentStatusOffset - formatObject.timestampOffset - 7); //waste byte
        }
        let parsingResult;
        for (let smsPartId = 0; smsPartId < this.#smsPartsTotal; smsPartId++) {
            if ((this.#idx + 176) * 2 > this.#dataAsHex.length) {
                console.error(`Warning: Segment ${smsPartId + 1} is not present in full, trying to read partial segment.`);
            }
            let pdu = this.#takeHex(176);
            if (formatObject.hasOwnProperty('segmentStatusOffset')) {
                this.#segmentStatus = hexToInt(pdu.slice(0, 2))
                pdu = pdu.slice(2);
            }

            let decodedPdu = new PDUDecoder().decode(pdu);
            if (decodedPdu === undefined) {
                console.error(`Warning: Segment ${smsPartId + 1} could not be decoded. Skipping.`);
                continue;
            }
            if (parsingResult === undefined) {
                parsingResult = decodedPdu;
                parsingResult.format = this.#format;
                parsingResult.smsPartsStored = this.#smsPartsStored;
                parsingResult.smsPartsTotal = this.#smsPartsTotal;
                if (this.#timestamp !== undefined) parsingResult.timestamp = this.#timestamp;
            } else {
                parsingResult.text += decodedPdu.text;
                parsingResult.length += decodedPdu.length;
            }
        }
        return parsingResult;
    }

    #takeHex = n => {
        const s = this.#dataAsHex.slice(this.#idx * 2, this.#idx * 2 + n * 2);
        this.#idx += n;
        return s;
    }
    #takeInt = n => hexToInt(this.#takeHex(n));
}

export class SMSDatParser {
    #dataAsHex = '';
    #idx = 2;
    #takeHex = n => {
        const s = this.#dataAsHex.slice(this.#idx * 2, this.#idx * 2 + n * 2);
        this.#idx += n;
        return s;
    }

    decode(bufOrHex) {
        if (bufOrHex.length <= 178) throw new Error(`File too short`);
        this.#dataAsHex = _asStr(bufOrHex);
        let messages = [];
        while (this.#idx < bufOrHex.length) {
            let pduHeader = this.#takeHex(2);
            if (pduHeader === 'ffff') { //empty message slot on NewSGold
                continue;
            }
            if (pduHeader !== '1111') {
                throw new Error(`Invalid PDU header: ${pduHeader}`);
            }
            let pdu = this.#takeHex(176);
            let decodedPdu = new PDUDecoder().decodeSmsDat(pdu);
            if (decodedPdu === undefined) continue;
            messages.push(decodedPdu);
        }

        return messages;
    }
}