const bytesEqual = (a, b) =>
    a.length === b.length && a.every((v, i) => v === b[i]);


const bytesToHex = bytes =>
    [...bytes].map(b => b.toString().padStart(2, '0')).join('');

const byteToBooleansLSBFirst = byte => {
    if (byte < 0 || byte > 255)
        throw new RangeError('Input must be a 1‑byte integer (0–255)');
    const bits = new Array(8);
    for (let i = 0; i < 8; i++) bits[i] = Boolean((byte >> i) & 1);
    return bits;
};
export const formatTimestampToIsoWithOffset = function (dateOrTimestamp, customOffsetMinutes) {
    const inputDate = dateOrTimestamp instanceof Date
        ? new Date(dateOrTimestamp.getTime())
        : new Date(dateOrTimestamp);

    const utcMillis = inputDate.getTime();                      // absolute moment in time

    let offsetMinutes;
    let localDate;

    if (typeof customOffsetMinutes === 'number') {
        offsetMinutes = customOffsetMinutes;
        localDate = new Date(utcMillis + offsetMinutes * 60_000); // shift into requested zone
    } else {
        localDate = inputDate;                                    // keep host zone
        offsetMinutes = -localDate.getTimezoneOffset();           // JS offset sign is opposite of ISO-8601
    }

    const pad = (value, length = 2) => String(Math.abs(value)).padStart(length, '0');

    const year    = localDate.getUTCFullYear();
    const month   = pad(localDate.getUTCMonth() + 1);
    const day     = pad(localDate.getUTCDate());
    const hours   = pad(localDate.getUTCHours());
    const minutes = pad(localDate.getUTCMinutes());
    const seconds = pad(localDate.getUTCSeconds());

    const sign            = offsetMinutes >= 0 ? '+' : '-';
    const absOffset       = Math.abs(offsetMinutes);
    const offsetHours     = pad(Math.floor(absOffset / 60));
    const offsetRemaining = pad(absOffset % 60);

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${sign}${offsetHours}:${offsetRemaining}`;
};
/* encoding detection (identical logic) */
const alphaBits = d =>
    (d & 0xc0) === 0
        ? (d & 0x0c) === 8
            ? 16
            : (d & 0x0c) === 4
                ? 8
                : 7
        : (d & 0xc0) === 0xc0
            ? (d & 0x30) === 0x20
                ? 16
                : (d & 0x30) === 0x30
                    ? 8
                    : 7
            : 7;

const _bcdNibbleToChar = n =>
    n <= 9
        ? String(n)
        : ['*', '#', 'A', 'B', 'C', 'F'][n - 10] /* 0xF = filler */;

const semiPhone = bcd => {
    const digits = [];
    for (const byte of bcd) {
        digits.push(byte & 0x0f, (byte >> 4) & 0x0f);
    }
    let s = digits.map(_bcdNibbleToChar).join('');
    return s.endsWith('F') ? s.slice(0, -1) : s;
};

const bcdByteToNumber = b =>
    ((b >> 4) & 0x0F) * 10 + (b & 0x0F);   // 0x21 → 12

const tzDecode = tzByte => {
    const high = (tzByte >> 4) & 0x0F;      // tens digit + sign
    const low  = tzByte & 0x0F;             // units digit
    const sign = (high & 0x8) ? '-' : '+';  // bit 3 set ⇒ negative
    const qh   = (high & 0x7) * 10 + low;   // quarter-hours (BCD)
    const hh   = String(Math.floor(qh / 4)).padStart(2, '0');
    const mm   = String((qh % 4) * 15).padStart(2, '0');
    return `${sign}${hh}:${mm}`;
};
const sevenByteTimeStampToDateAndTimezoneOffset = bytes7 => {
    const s = bytes7.map(b => ((b & 0x0F) << 4) | (b >> 4));

    const [yy, mo, dd, hh, mi, ss] = s.slice(0, 6).map(bcdByteToNumber);

    const tzByte = s[6];
    const high   = (tzByte >> 4) & 0x0F;
    const low    = tzByte & 0x0F;
    const quarterHours     = (high & 0x7) * 10 + low;
    const timeZoneOffsetMinutes = quarterHours * 15 * ((high & 0x8) ? -1 : 1);
    const timeZoneString = tzDecode(tzByte);

    const utcMillis = Date.UTC(2000 + yy, mo - 1, dd, hh, mi, ss) - timeZoneOffsetMinutes * 60_000;

    const date = new Date(utcMillis);

    // *** step 3 (optional): stash the original printable string
    date.originalTimestamp =
        `20${String(yy).padStart(2, '0')}-` +
        `${String(mo).padStart(2, '0')}-` +
        `${String(dd).padStart(2, '0')} ` +
        `${String(hh).padStart(2, '0')}:` +
        `${String(mi).padStart(2, '0')}:` +
        `${String(ss).padStart(2, '0')} ` +
        tzDecode(tzByte);

    return {date, timeZoneOffsetMinutes};
};

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

const sevenBitDecode = (bytes, skip, septets) => {
    let out = '',
        esc = false,
        bitPos = 0;

    for (let i = 0; i < septets; i++) {
        const bytePos = Math.floor(bitPos / 8);
        const b1 = bytes[bytePos] ?? 0;
        const b2 = bytes[bytePos + 1] ?? 0;
        const v = ((b1 >> (bitPos % 8)) | (b2 << (8 - (bitPos % 8)))) & 0x7f;
        bitPos += 7;
        if (i < skip) continue;

        if (esc) {
            out += EXT.get(v) || '�';
            esc = false;
        } else if (v === 0x1b) esc = true;
        else out += DEF[v] ?? '�';
    }
    return out;
};

const ucs2Decode = (bytes, skipOct) =>
    new TextDecoder('utf-16be').decode(bytes.subarray(skipOct));

const octetDecode = (bytes, skipOct) =>
    String.fromCharCode(...bytes.subarray(skipOct));

/* Remove trailing 0xFF */
const trimTrailingFFs = buf => {
    let end = buf.length;
    while (end >= 1 && buf[end - 1] === 0xff) end--;
    return buf.subarray(0, end);
};

class ByteCursor {
    constructor(bytes) {
        this.b = bytes;
        this.i = 0;
    }
    take(n) {
        if (this.i + n > this.b.length)
            throw new RangeError('Attempt to read past end of buffer');
        const s = this.b.subarray(this.i, this.i + n);
        this.i += n;
        return s;
    }
    takeByte() {
        if (this.i >= this.b.length)
            throw new RangeError('Attempt to read past end of buffer');
        return this.b[this.i++];
    }
    peek(n) {
        return this.b.subarray(this.i, this.i + n);
    }
    remaining() {
        return this.b.length - this.i;
    }
}

export class PDUDecoder {
    #cursor;

    decode(u8) {
        const buf = trimTrailingFFs(
            u8 instanceof Uint8Array ? u8 : Uint8Array.from(u8)
        );
        if (buf.length < 2) return undefined;

        this.#cursor = new ByteCursor(buf);

        const smsCenterLength = this.#cursor.takeByte();
        const smsCenterType = this.#cursor.takeByte();
        let smsCenterNumber = '';
        if (smsCenterLength > 1) {
            const smsCenterRaw = this.#cursor.take(smsCenterLength - 1)
            smsCenterNumber = semiPhone(smsCenterRaw);
        }

        const firstOctet = this.#cursor.peek(1)[0];
        const messageType = firstOctet & 3;
        if (messageType === 2) return this.#statusReport(smsCenterType, smsCenterNumber);

        const decodedPdu = this.#decodePduFromFirstOctet();

        return {
            ...decodedPdu,
            smsCenterType,
            smsCenterNumber,
        };
    }

    decodeSmsDat(u8) {
        const folderFlag = u8[0]; //01 = inbox read, 03 = inbox unread, 05 = outbox sent, 07 = outbox unsent
        const decoded = this.decode(u8.subarray(1));
        if (decoded === undefined) return undefined;
        return {
            ...decoded,
            folder: folderFlag,
            format: 'SMS.dat'
        };
    }

    #statusReport(scaType, scaNumber) {
        const mr = this.#cursor.takeByte();
        const recipientLen = this.#cursor.takeByte();
        this.#cursor.takeByte(); // TOA
        const recipient = semiPhone(this.#cursor.take(Math.ceil(recipientLen / 2)));
        const dateAndTimeZoneOffset = sevenByteTimeStampToDateAndTimezoneOffset(this.#cursor.take(7));
        const dischargeDateAndTimeZoneOffset = sevenByteTimeStampToDateAndTimezoneOffset(this.#cursor.take(7));
        const status = this.#cursor.takeByte();

        return {
            type: 'STATUS_REPORT',
            smsCenterType: scaType,
            smsCenterNumber: scaNumber,
            messageRef: mr,
            recipient,
            dateAndTimeZoneOffset,
            dischargeDateAndTimeZoneOffset,
            status
        };
    }

    #decodePduFromFirstOctet() {
        const firstOctet = this.#cursor.takeByte(); // consume FO
        const firstOctetBits = byteToBooleansLSBFirst(firstOctet);
        const isSubmit = firstOctetBits[0];
        const isCommandOrStatusReport = firstOctetBits[1];
        const rejectDuplicatesOrMoreMessagesToSend = firstOctetBits[2];
        const loopPrevention = firstOctetBits[3];

        const validityPeriodFormat = firstOctetBits[3]; //TP-VPF bit 1
        const validityPeriodFollowsInSubmit = firstOctetBits[4]; //TP-VPF bit 2
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
        if (isSubmit) messageRef = this.#cursor.takeByte();

        const addrLen = this.#cursor.takeByte();
        const addrToa = this.#cursor.takeByte();
        const addrRaw = this.#cursor.take(Math.ceil(addrLen / 2));
        const isAlpha = (addrToa & 0x70) === 0x50;
        const phone = isAlpha
            ? sevenBitDecode(addrRaw, 0, addrLen)
            : semiPhone(addrRaw);

        const pid = this.#cursor.takeByte();
        const dcs = this.#cursor.takeByte();
        const bitsPerChar = alphaBits(dcs);

        let dateAndTimeZoneOffset;
        /**
         * An SMS-SUBMIT TPDU may contain a TP-VP parameter which limits the time period for which the SMSC would attempt
         * to deliver the message. However, the validity period is usually limited globally by the SMSC configuration parameter
         * — often to 48 or 72 hours. The Validity Period format is defined by the Validity Period Format field:
         * TP-VPF 	TP-VP format 	TP-VP length
         * 0 0 	TP-VP not present 	0
         * 0 1 	Enhanced format 	7
         * 1 0 	Relative format 	1
         * 1 1 	Absolute format 	7
         *
         *
         * Relative format
         * Relative Validity Period Values TP-VP value 	Validity period 	Possible validity periods
         * 0–143 	(TP-VP + 1) x 5 minutes 	5, 10, 15 minutes ... 11:55, 12:00 hours
         * 144–167 	(12 + (TP-VP - 143) / 2 ) hours 	12:30, 13:00, ... 23:30, 24:00 hours
         * 168–196 	(TP-VP - 166) days 	2, 3, 4, ... 30 days
         * 197–255 	(TP-VP - 192) weeks 	5, 6, 7, ... 63 weeks
         */
        let validityPeriod;
        if (isSubmit) {
            if (validityPeriodFollowsInSubmit) {
                //this only supports relative format, enhanced and absolute formats are 7 bytes
                validityPeriod = this.#cursor.takeByte();
            }
        } else {
            dateAndTimeZoneOffset = sevenByteTimeStampToDateAndTimezoneOffset(this.#cursor.take(7));
        }

        const udl = this.#cursor.takeByte();
        const udBody = this.#cursor.take(this.#cursor.remaining()); // rest of buffer

        const {
            udh,
            referenceNumber,
            segmentsTotal,
            sequenceNumber,
            isReference16Bit,
            encoding,
            text,
            length
        } = this.#decodeUserData(
            udBody,
            udhiPresent,
            bitsPerChar,
            udl
        );

        const common = {
            firstOctet,
            udhiPresent,
            pid,
            dcs,
            classDesc: dcs & 0x10 ? `class ${(dcs & 3)}` : '',
            udh,
            referenceNumber,
            segmentsTotal,
            sequenceNumber,
            isReference16Bit,
            length,
            text,
            encoding
        };

        return isSubmit
            ? { ...common, type: 'Outgoing', recipient: phone, messageRef, validityPeriod }
            : { ...common, type: 'Incoming', sender: phone, dateAndTimeZoneOffset };
    }

    #decodeUserData(body, udhiPresent, bitsPerChar, udl) {
        let skipOct = 0;
        let userDataHeaderBytes = new Uint8Array(0);
        let referenceNumber, segmentsTotal, sequenceNumber, isReference16Bit;
        if (udhiPresent) {
            const udhl = body[0];
            userDataHeaderBytes = body.subarray(0, udhl + 1);
            skipOct = udhl + 1;
            let currentByte = 1;// Start after the UDH length octet (index 0)
            const informationElementIdentifier = userDataHeaderBytes[currentByte++];
            const informationElementDataLength = userDataHeaderBytes[currentByte++];

            const is8BitConcat = informationElementIdentifier === 0x00 && informationElementDataLength === 0x03;
            const is16BitConcat = informationElementIdentifier === 0x08 && informationElementDataLength === 0x04;

            if (is8BitConcat || is16BitConcat) {
                isReference16Bit = is16BitConcat;

                referenceNumber = isReference16Bit
                    ? (userDataHeaderBytes[currentByte] << 8) | userDataHeaderBytes[currentByte + 1]
                    : userDataHeaderBytes[currentByte];

                const referenceNumberOctetCount = isReference16Bit ? 2 : 1;

                segmentsTotal = userDataHeaderBytes[currentByte + referenceNumberOctetCount];
                sequenceNumber = userDataHeaderBytes[currentByte + referenceNumberOctetCount + 1];
            }
        }

        let encoding, text;
        switch (bitsPerChar) {
            case 16:
                encoding = 'UCS-2';
                text = ucs2Decode(body, skipOct);
                break;
            case 8:
                encoding = 'ASCII';
                text = octetDecode(body, skipOct);
                break;
            case 7:
                encoding = 'GSM-7';
                text = sevenBitDecode(body, Math.ceil(skipOct * 8 / 7), udl);
                break;
            default:
                throw new Error(`Unknown number of bits: ${bitsPerChar}`);
        }

        const length =
            bitsPerChar === 16 ? (body.length - skipOct) / 2 : udl - skipOct;

        return {
            udh: bytesToHex(userDataHeaderBytes),
            referenceNumber,
            segmentsTotal,
            sequenceNumber,
            isReference16Bit,
            encoding,
            text,
            length
        };
    }
}

const FileFormats = Object.freeze({
    SL4x: {
        signature:  Uint8Array.from([0x0b, 0x0b, 0x00, 0x00, 0x00]),
        segmentStatusOffset: 5,
        smsCOffset: 6
    },
    X55_ME45: {
        signature:  Uint8Array.from([0x0b, 0x0b, 0x01, 0x01, 0x00]),
        smsPartsOffset: 5,
        smsTypeOffset: 7,
        smsStatusOffset: 8,
        timestampOffset: 9,
        segmentStatusOffset: 16,
        smsCOffset: 17
    },
    X55_X65_X75: {
        signature:  Uint8Array.from([0x0b, 0x0b, 0x02, 0x0c, 0x00]),
        smsPartsOffset: 5,
        smsTypeOffset: 7,
        smsStatusOffset: 8,
        timestampOffset: 9,
        segmentStatusOffset: 17,
        smsCOffset: 18
    }
});

export class SMSDecoder {
    decode(buf) {
        const b = buf instanceof Uint8Array ? buf : Uint8Array.from(buf);
        if (b.length <= 5) throw new Error('File too short');

        let cursor = new ByteCursor(b);

        const signature = cursor.take(5);
        let formatName;
        for (const [entryFormatName, formatEntry] of Object.entries(FileFormats)) {
            if (bytesEqual(signature, formatEntry.signature)) {
                formatName = entryFormatName;
                break;
            }
        }
        if (formatName === undefined)
            throw new Error(
                `Unknown file format. First 5 bytes: ${bytesToHex(signature)}`
            );

        const format = FileFormats[formatName];

        const segmentsTotal = format.smsPartsOffset ? cursor.takeByte() : 0;
        const segmentsStored = format.smsPartsOffset ? cursor.takeByte() : 0;
        const smsType = format.smsTypeOffset ? cursor.takeByte() : undefined;
        const smsStatus = format.smsStatusOffset ? cursor.takeByte() : undefined;
        const dateAndTimeZoneOffset = format.timestampOffset
            ? sevenByteTimeStampToDateAndTimezoneOffset(cursor.take(7))
            : undefined;

        if (format.segmentStatusOffset - format.timestampOffset > 7)
            cursor.take(format.segmentStatusOffset - format.timestampOffset - 7); // waste byte

        let parsingResult;
        for (let part = 0; part < segmentsTotal; part++) {
            if (cursor.remaining() < 176)
                console.warn(`Segment ${part + 1} incomplete – decoding anyway`);
            let pdu = cursor.take(176);

            if (format.segmentStatusOffset) {
                // first byte is segment status – strip it
                pdu = pdu.subarray(1);
            }

            const decodedPdu = new PDUDecoder().decode(pdu);
            if (decodedPdu === undefined) continue;

            if (parsingResult === undefined) {
                parsingResult = {
                    ...decodedPdu,
                    format,
                    segmentsTotal,
                    segmentsStored
                };
                if (dateAndTimeZoneOffset !== undefined) parsingResult.dateAndTimeZoneOffset = dateAndTimeZoneOffset;
                if (smsType !== undefined) parsingResult.smsType = smsType;
                if (smsStatus !== undefined) parsingResult.smsStatus = smsStatus;
            } else {
                parsingResult.text += decodedPdu.text;
                parsingResult.length += decodedPdu.length;
            }
        }
        return parsingResult;
    }
}

export class SMSDatParser {
    decode(buf) {
        const b = buf instanceof Uint8Array ? buf : Uint8Array.from(buf);
        if (b.length <= 178) throw new Error('File too short');

        let cursor = new ByteCursor(b);
        const NSG_EMPTY =  Uint8Array.from([0xff, 0xff]);
        const EXPECTED_HEADER =  Uint8Array.from([0x11, 0x11]);

        const segments = [];
        let messageIndex = 0;
        while (cursor.remaining() >= 2) {
            const hdr = cursor.take(2);
            if (bytesEqual(hdr, NSG_EMPTY)) continue;
            if (!bytesEqual(hdr, EXPECTED_HEADER))
                throw new Error(`Invalid PDU header: ${bytesToHex(hdr)}`);

            if (cursor.remaining() < 176)
                console.warn('Incomplete PDU record in SMS.dat, attempting a partial read');
            const pdu = cursor.take(176);
            const decoded = new PDUDecoder().decodeSmsDat(pdu);
            if (decoded !== undefined) {
                decoded.messageIndex = messageIndex;
                segments.push(decoded);
            }
            messageIndex++;
        }

        /* Second pass: group and merge concatenated segments */
        const multipartBuckets = new Map(); // key → {meta, parts[]}

        const concatenatedMessages = [];
        for (const segment of segments) {
            if (segment.referenceNumber === undefined || segment.segmentsTotal === 1) { // plain single‑segment SMS
                segment.segmentsTotal = 1
                segment.segmentsStored = 1
                concatenatedMessages.push(segment);
                continue;
            }

            // Use sender/recipient + ref as bucket key
            const peer = segment.sender ?? segment.recipient;
            const dir = segment.sender ? 'IN' : 'OUT';
            const key = `${dir}:${peer}:${segment.referenceNumber}`;

            let bucket = multipartBuckets.get(key);
            if (bucket === undefined) {
                bucket = {
                    first: segment,
                    total: segment.segmentsTotal,
                    parts: new Array(segment.segmentsTotal).fill(undefined)
                };
                multipartBuckets.set(key, bucket);
            }
            if (bucket.parts[segment.sequenceNumber - 1] === undefined) {
                bucket.parts[segment.sequenceNumber - 1] = segment;
            } else {
                console.warn(`Duplicate segment ${segment.sequenceNumber} of ${segment.referenceNumber} from ${peer}`);
            }
        }

        // Assemble buckets whose part list is complete
        for (const {first, total, parts} of multipartBuckets.values()) {
            const merged = {...first}; // shallow clone
            merged.referenceNumber = first.referenceNumber;
            merged.totalSegments = total;
            merged.sequenceNumber = 1;

            merged.segmentsStored = 0;
            merged.legnth = 0;
            merged.text = '';
            for (const part of parts) {
                if (part === undefined) {
                    merged.text += '<missing segment>';
                } else {
                    merged.segmentsStored++;
                    merged.length += part.length;
                    merged.text += part.text;
                }
            }
            concatenatedMessages.push(merged);
        }

        return concatenatedMessages;
    }
}
