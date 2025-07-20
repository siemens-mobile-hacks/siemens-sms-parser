import {playIMelody} from "./imelody.js";

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
function convertBlobToBase64String(imageBlob) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onloadend = () => resolve(fileReader.result.split(',')[1]);
        fileReader.onerror = () => reject(fileReader.error);
        fileReader.readAsDataURL(imageBlob);
    });
}

function convertUint8ArrayToBase64(uint8ArrayInput) {
    let binaryString = '';
    for (let byteIndex = 0; byteIndex < uint8ArrayInput.length; byteIndex++) {
        binaryString += String.fromCharCode(uint8ArrayInput[byteIndex]);
    }
    return btoa(binaryString);
}

function convertBase64ToUint8Array(base64Input) {
    const binaryString = atob(base64Input);
    const outputArray = new Uint8Array(binaryString.length);
    for (let charIndex = 0; charIndex < binaryString.length; charIndex++) {
        outputArray[charIndex] = binaryString.charCodeAt(charIndex);
    }
    return outputArray;
}

function* iterateBits(uint8Array) {
    for (let byteIndex = 0; byteIndex < uint8Array.length; byteIndex++) {
        const currentByteValue = uint8Array[byteIndex];
        for (let bitPosition = 7; bitPosition >= 0; bitPosition--) {
            yield (currentByteValue >> bitPosition) & 1;
        }
    }
}
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
    if (bytes7.every(b => b === 0x00)) return undefined;
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

const sevenBitDecode = (bytes, bitPos, septets) => {
    let out = '',
        esc = false;

    for (let i = 0; i < septets; i++) {
        const bytePos = Math.floor(bitPos / 8);
        const b1 = bytes[bytePos] ?? 0;
        const b2 = bytes[bytePos + 1] ?? 0;
        const v = ((b1 >> (bitPos % 8)) | (b2 << (8 - (bitPos % 8)))) & 0x7f;
        bitPos += 7;

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

const TextAlignment = Object.freeze({
    Left: 0b00,
    Center: 0b01,
    Right: 0b10,
    LanguageDependent: 0b11
});

const FontSize = Object.freeze({
    Normal: 0b00,
    Large: 0b01,
    Small: 0b10,
    Reserved: 0b11
});

class TextFormatting {
    /**
     * Start position of the text formatting. Set to the number of characters after the formatting shall be applied from the beginning of the SM data.
     * This octet shall be coded as an integer value in the range 0 (beginning of the SM data) to the maximum number of characters included in the SM data of one single SM or one segment of a concatenated SM.
     */
    position;
    /**
     * Text formatting length. Gives the number of formatted characters or sets a default text formatting.
     * This octet shall be coded as an integer value in the range 1 to the maximum number of characters for which the formatting applies in one single SM or one segment of a concatenated SM.
     * A text formatting length value of 0 indicates that the text format shall be used as a default text format for the current SM. The default text format shall be used for all text in a concatenated SM unless temporarily overridden by a text formatting IE with a non-zero text format length field.
     * It shall be possible to re-define the default text formatting to be applied to all subsequent text in the current SM by sending a new Text Format IE with text format length zero.
     * Conflicting overlapping text formatting instructions shall be resolved by applying the formatting instructions in their sequential order.
     */
    length;
    /**
     * Formatting mode value coded as following:
     * Bit 7	Bit 6	Bit 5	Bit 4	Bit 3	Bit 2	Bit 1	Bit 0
     *
     * Bit 1	Bit 0	*Alignment
     * 0	0	Left
     * 0	1	Center
     * 1	0	Right
     * 1	1	Language dependent (default)
     * *in case formatting text is inserted on the same line as previous non formatting text or with a different mode value,
     * the alignment value shall be set to the same value as the previous formatted predefined object.
     * Alignment may affect object placement.
     * Bit 3	Bit 2	Font Size
     * 0	0	Normal (default)
     * 0	1	Large
     * 1	0	Small
     * 1	1	reserved
     * Bit 4		Style bold
     * 1		Bold on
     * 0		Bold off
     * Bit 5		Style Italic
     * 1		Italic on
     * 0		Italic off
     *
     * Bit 6		Style Underlined
     * 1		Underlined on
     * 0		Underlined off
     * Bit 7		Style Strikethrough
     * 1		Strikethrough on
     * 0		Strikethrough off
     * If bit 4,5,6 and 7 are set to 0, it will mean normal style (default).
     */
    formattingMode;
    /**
     * This Octet may be omitted by setting the IED length accordingly.
     *    Bits 0..3 define the Text Foreground Colour
     * Bits 4..7 define the Text Background Colour
     * Each colour is defined in a semi octet according to the table below. The actual colours displayed may vary between ME's depending on the display device used.
     * The colour values defined are simple primary and secondary colours plus four levels of grey. Bright colours have a higher intensity than dark colours.
     * Nibble Value		Colour
     * (msb…lsb)
     * 0000			Black
     * 0001			Dark Grey
     * 0010			Dark Red
     * 0011			Dark Yellow
     * 0100			Dark Green
     * 0101			Dark Cyan
     * 0110			Dark Blue
     * 0111			Dark Magenta
     * 1000			Grey
     * 1001			White
     * 1010			Bright Red
     * 1011			Bright Yellow
     * 1100			Bright Green
     * 1101			Bright Cyan
     * 1110			Bright Blue
     * 1111			Bright Magenta
     */
    foregroundColor;
    backgroundColor;

    constructor(position, length, formattingMode, foregroundColor = undefined, backgroundColor = undefined) {
        this.position = position;
        this.length = length;
        this.formattingMode = formattingMode;
        this.foregroundColor = foregroundColor;
        this.backgroundColor = backgroundColor;
    }

    #nibbleToColor = {
        '0x00': {name: 'black', htmlHex: '#000000'},
        '0x01': {name: 'dark-grey', htmlHex: '#555555'},
        '0x02': {name: 'dark-red', htmlHex: '#800000'},
        '0x03': {name: 'dark-yellow', htmlHex: '#808000'},
        '0x04': {name: 'dark-green', htmlHex: '#008000'},
        '0x05': {name: 'dark-cyan', htmlHex: '#008080'},
        '0x06': {name: 'dark-blue', htmlHex: '#000080'},
        '0x07': {name: 'dark-magenta', htmlHex: '#800080'},
        '0x08': {name: 'grey', htmlHex: '#AAAAAA'},
        '0x09': {name: 'white', htmlHex: '#FFFFFF'},
        '0x0A': {name: 'bright-red', htmlHex: '#FF0000'},
        '0x0B': {name: 'bright-yellow', htmlHex: '#FFFF00'},
        '0x0C': {name: 'bright-green', htmlHex: '#00FF00'},
        '0x0D': {name: 'bright-cyan', htmlHex: '#00FFFF'},
        '0x0E': {name: 'bright-blue', htmlHex: '#0000FF'},
        '0x0F': {name: 'bright-Magenta', htmlHex: '#FF00FF'}
    };

    getTextAlignment() {
        return this.formattingMode & 0b0000_0011;
    }

    getFontSize() {
        return (this.formattingMode & 0b0000_1100) >> 2;
    }

    isBold() {
        return (this.formattingMode & (1 << 4)) !== 0;
    }

    isItalic() {
        return (this.formattingMode & (1 << 5)) !== 0;
    }

    isUnderlined() {
        return (this.formattingMode & (1 << 6)) !== 0;
    }

    isStrikethrough() {
        return (this.formattingMode & (1 << 7)) !== 0;
    }

    getForegroundColor() {
        if (this.foregroundColor === undefined) {
            return undefined;
        }
        return this.#nibbleToColor[this.foregroundColor];
    }

    getBackgroundColor() {
        if (this.backgroundColor === undefined) {
            return undefined;
        }
        return this.#nibbleToColor[this.backgroundColor];
    }
}
class PredefinedAnimation {
    position;
    animationNumber;
    constructor(position, animationNumber) {
        this.position = position;
        this.animationNumber = animationNumber;
        Object.freeze(this);
    }
}

function putPictureDataOnContext(context, pictureData, sideLength) {
    const imageData = context.createImageData(sideLength, sideLength);
    let i = 0;
    for (const pixelBit of iterateBits(pictureData)) {
        imageData.data[i] = pixelBit ? 0 : 255; // R value
        imageData.data[i + 1] = pixelBit ? 0 : 255; // G value
        imageData.data[i + 2] = pixelBit ? 0 : 255; // B value
        imageData.data[i + 3] = 255; // A value
        i += 4;
    }
    context.putImageData(imageData, 0, 0);
}

class Picture {
    constructor(position, pictureData, sideLength) {
        this.position = position;
        this.pictureData = pictureData;
        this.sideLength = sideLength;

        Object.freeze(this);
    }

    renderOnCanvas(canvas) {
        const context = canvas.getContext('2d');
        putPictureDataOnContext(context, this.pictureData, this.sideLength);
    }

    readAsDataUrl() {
        if (typeof document === 'undefined') {
            return '';
        }
        const canvas = Object.assign(document.createElement('canvas'), {
            width:  this.sideLength,
            height: this.sideLength
        });
        this.renderOnCanvas(canvas);
        return canvas.toDataURL('image/png');
    }
}

function renderAnimationOnCanvas(canvas, animationData, sideLength) {
    let frames = []
    const numberOfFrames = 4;
    const totalBytes = animationData.length;
    for (let frameIndex = 0; frameIndex < numberOfFrames; frameIndex++) {
        const startByte = frameIndex * totalBytes / numberOfFrames;
        const endByte = (frameIndex + 1) * totalBytes / numberOfFrames;
        const frameData = animationData.subarray(startByte, endByte);
        const canvas = document.createElement('canvas');
        putPictureDataOnContext(canvas.getContext('2d'), frameData, sideLength)
        frames.push(canvas);
    }

    const framesPerSecond = 3;
    const millisecondsPerFrame = 1000 / framesPerSecond;

    let currentFrameIndex = 0;
    let previousTimestamp = 0;
    const visibleContext = canvas.getContext('2d');

    function renderNextFrame(highResolutionTimestamp) {
        if (highResolutionTimestamp - previousTimestamp >= millisecondsPerFrame) {
            visibleContext.clearRect(0, 0, canvas.width, canvas.height);
            visibleContext.drawImage(frames[currentFrameIndex], 0, 0);

            currentFrameIndex = (currentFrameIndex + 1) % numberOfFrames;
            previousTimestamp = highResolutionTimestamp;
        }
        requestAnimationFrame(renderNextFrame);
    }

    requestAnimationFrame(renderNextFrame);
}

class Animation {
    constructor(position, animationData, sideLength) {
        this.position = position;
        this.animationData = animationData;
        this.sideLength = sideLength;

        Object.freeze(this);
    }


}
class LargePicture extends Picture {
    constructor(position, pictureData) {
        super(position, pictureData, 32);
    }
}

class SmallPicture extends Picture {
    constructor(position, pictureData) {
        super(position, pictureData, 16);
    }
}

class IMelody {
    position;
    iMelodyString;
    constructor(position, iMelodyString) {
        this.position = position;
        this.iMelodyString = iMelodyString;
        Object.freeze(this);
    }
}
class UserData {
    referenceNumber = undefined;   // integer (0-255 or 0-65535)
    segmentsTotal = undefined;   // integer 1-255
    sequenceNumber = undefined;   // integer 1-255
    encoding = undefined;   // 'GSM-7' | 'ASCII' | 'UCS-2'
    text = undefined;   // string
    length = undefined;   // non-negative integer
    errors=[];
    /** @type Array.<TextFormatting> */
    textFormattings = [];
    /** @type Array.<PredefinedAnimation> */
    predefinedAnimations = [];
    pictures = [];
    /** @type Array.<IMelody> */
    iMelodies = [];
    /** @type Array.<Animation> */
    animations = [];
    constructor() {
        Object.seal(this);           // ban undeclared props, keep mutability
    }
}
class UserDataDecoder {
    #cursor;
    #decodedUserData;

    decode(userData, udhiPresent, bitsPerChar) {
        this.#cursor = new ByteCursor(userData);
        this.#decodedUserData = new UserData();

        //TP‑User‑Data‑Length = total length of the TP‑User‑Data field including the Header
        const udl = this.#cursor.takeByte();
        let udhl = 0;
        if (udhiPresent) {
            udhl = this.#cursor.takeByte();
            let headerBytesRead = 0;
            while (headerBytesRead < udhl) {
                const bytesRead = this.readInformationElement();
                headerBytesRead += bytesRead;
            }
        }
        let smData = this.#cursor.take(this.#cursor.remaining());
        const headerOctetCount = udhiPresent ? udhl + 1 : 0;
        switch (bitsPerChar) {
            case 16:
                this.#decodedUserData.encoding = 'UCS-2';
                this.#decodedUserData.text = ucs2Decode(smData, 0);
                this.#decodedUserData.length = (udl - headerOctetCount) / 2
                break;
            case 8:
                this.#decodedUserData.encoding = 'ASCII';
                this.#decodedUserData.text = octetDecode(smData, 0);
                this.#decodedUserData.ength = (udl - headerOctetCount) / 2
                break;
            case 7:
                this.#decodedUserData.encoding = 'GSM-7';
                const bitOffset = (7 - (headerOctetCount % 7)) % 7; // 0-6 pad bits
                const headerSeptetCount = (headerOctetCount * 8 + bitOffset) / 7;      // always integer
                this.#decodedUserData.length  = udl - headerSeptetCount;
                this.#decodedUserData.text = sevenBitDecode(smData, bitOffset, this.#decodedUserData.length);
                break;
            default:
                throw new Error(`Unknown number of bits: ${bitsPerChar}`);
        }

        return this.#decodedUserData;
    }

    readInformationElement() {
        const iei = this.#cursor.takeByte();
        const iedl = this.#cursor.takeByte();
        let bytesRead = 2;

        switch (iei) {
            case 0x00: //Concatenated short messages, 8-bit reference number
            case 0x08: //Concatenated short message, 16-bit reference number
                const referenceOctets = iei === 0x08 ? 2 : 1;
                if ((iei === 0x00 && iedl !== 0x03) || (iei === 0x08 && iedl !== 0x04)) {
                    this.#decodedUserData.errors.push(`Unexpected concatenated short message IEI length: ${iei}/${iedl}`);
                    this.#cursor.take(iedl);
                    bytesRead += iedl;
                    return iedl;
                }
                const refBytes = this.#cursor.take(referenceOctets);
                bytesRead += referenceOctets;

                this.#decodedUserData.referenceNumber = referenceOctets === 2
                    ? (refBytes[0] << 8) | refBytes[1]
                    : refBytes[0];

                this.#decodedUserData.segmentsTotal = this.#cursor.takeByte();
                this.#decodedUserData.sequenceNumber = this.#cursor.takeByte();
                bytesRead += 2;
                break;
            case 0x0A: //Text Formatting
                if (iedl !== 0x03 && iedl !== 0x04) {
                    this.#decodedUserData.errors.push(`Unexpected text formatting IEI length: ${iei}/${iedl}`);
                    this.#cursor.take(iedl);
                    return iedl;
                }
                const startPosition = this.#cursor.takeByte();
                const length = this.#cursor.takeByte();
                const formattingMode = this.#cursor.takeByte();
                let foregroundColor, backgroundColor;
                if (iedl === 0x04) {
                    const color = this.#cursor.takeByte();
                    foregroundColor = color & 0x0F;
                    backgroundColor = (color >> 4) & 0x0F;
                }
                bytesRead += iedl;
                this.#decodedUserData.textFormattings.push(new TextFormatting(startPosition, length, formattingMode, foregroundColor, backgroundColor));
                break;
            case 0x0C: // iMelody
                const iMelodyPosition = this.#cursor.takeByte();
                const iMelody = this.#cursor.take(iedl-1)
                const iMelodyString =  new TextDecoder('ascii').decode(iMelody);
                this.#decodedUserData.iMelodies.push(new IMelody(iMelodyPosition, iMelodyString))
                bytesRead += iedl;
                break;
            case 0x0D: //predefined animation
                if (iedl !== 0x02) {
                    this.#decodedUserData.errors.push(`Unexpected concatenated short message IEI length: ${iei}/${iedl}`);
                    this.#cursor.take(iedl);
                    return iedl;
                }
                let predefinedAnimation = new PredefinedAnimation(this.#cursor.takeByte(), this.#cursor.takeByte());
                bytesRead += 2;
                this.#decodedUserData.predefinedAnimations.push(predefinedAnimation);
                break;
            case 0x0E: //Large Animation (16*16 times 4 = 32*4 =128 bytes)
            case 0x0F: //Small Animation (8*8 times 4 = 8*4 =32 bytes)
                let animation = new Animation(this.#cursor.takeByte(), this.#cursor.take(iedl - 1), iei === 0x0E ? 16 : 8);
                this.#decodedUserData.animations.push(animation);
                bytesRead += iedl;
                break;
            case 0x10: //Large Picture (32*32 = 128 bytes)
            case 0x11: //Small Picture (16*16 = 32 bytes)
                const picturePosition = this.#cursor.takeByte();
                const pictureData = this.#cursor.take(iedl - 1)
                let picture;
                if (iei === 0x10) {
                    picture = new LargePicture(picturePosition, pictureData);
                } else {
                    picture = new SmallPicture(picturePosition, pictureData);
                }
                this.#decodedUserData.pictures.push(picture);
                bytesRead += iedl;
                break;
            default:
            this.#decodedUserData.errors.push(`Message contains an unsupported Information Element: ${iei.toString(16).padStart(2, '0')}`);
            this.#cursor.take(iedl);
            bytesRead += iedl; // skip unknown IE
        }

        return bytesRead;
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
        let phone;
        if (isAlpha) {
            const alphaRaw = sevenBitDecode(addrRaw, 0, addrLen);
            phone = alphaRaw.replace(/@+$/, '');
        } else {
            phone = semiPhone(addrRaw);
        }


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

        const udBody = this.#cursor.take(this.#cursor.remaining()); // rest of buffer
        const userData = new UserDataDecoder().decode(udBody, udhiPresent, bitsPerChar);

        const common = {

            firstOctet,
            udhiPresent,
            pid,
            dcs,
            classDesc: dcs & 0x10 ? `class ${(dcs & 3)}` : '',
            ...userData,
        };

        return isSubmit
            ? { ...common, type: 'Outgoing', recipient: phone, messageRef, validityPeriod }
            : { ...common, type: 'Incoming', sender: phone, dateAndTimeZoneOffset };
    }
}

const FileFormats = Object.freeze({
    SL4x: {
        signature:  Uint8Array.from([0x0b, 0x0b, 0x00, 0x00, 0x00]),
        segmentStatusOffset: 5,
        smsCOffset: 6
    },
    x45_C55: {
        signature:  Uint8Array.from([0x0b, 0x0b, 0x01, 0x01, 0x00]),
        smsPartsOffset: 5,
        smsTypeOffset: 7,
        smsStatusOffset: 8,
        timestampOffset: 9,
        segmentStatusOffset: 16,
        smsCOffset: 17
    },
    ME45_2: {
        signature:  Uint8Array.from([0x0b, 0x0b, 0x01, 0x0b, 0x00]),
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
        const htmlRenderer = new HTMLRenderer();

        for (let part = 0; part < segmentsTotal; part++) {
            let pdu;
            if (cursor.remaining() < 176) {
                console.warn(`Segment ${part + 1} incomplete – decoding anyway`);
                pdu = cursor.take(cursor.remaining());
            } else {
                pdu = cursor.take(176);
            }

            if (format.segmentStatusOffset) {
                // first byte is segment status – strip it
                pdu = pdu.subarray(1);
            }

            const decodedPdu = new PDUDecoder().decode(pdu);
            if (decodedPdu === undefined) continue;

            if (parsingResult === undefined) {
                parsingResult = {
                    ...decodedPdu,
                    format: formatName,
                    segmentsTotal,
                    segmentsStored,
                    html: htmlRenderer.renderSegment(decodedPdu),
                };
                if (dateAndTimeZoneOffset !== undefined) parsingResult.dateAndTimeZoneOffset = dateAndTimeZoneOffset;
                if (smsType !== undefined) parsingResult.smsType = smsType;
                if (smsStatus !== undefined) parsingResult.smsStatus = smsStatus;
            } else {
                parsingResult.text += decodedPdu.text;
                parsingResult.html += htmlRenderer.renderSegment(decodedPdu);
                parsingResult.length += decodedPdu.length;
            }
        }
        return parsingResult;
    }
}

function mergeSegments(segments) {
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
        merged.html = '';
        merged.errors = [];
        for (const part of parts) {
            if (part === undefined) {
                merged.text += '<missing segment>';
            } else {
                merged.segmentsStored++;
                merged.length += part.length;
                merged.text += part.text;
                merged.html += part.html;
                merged.errors = [...merged.errors, ...part.errors];
            }
        }
        concatenatedMessages.push(merged);
    }

    return concatenatedMessages;
}

export class SMSDatParser {
    decode(buf) {
        const b = buf instanceof Uint8Array ? buf : Uint8Array.from(buf);
        if (b.length <= 178) throw new Error('File too short');

        let cursor = new ByteCursor(b);
        const NSG_EMPTY =  Uint8Array.from([0xff, 0xff]);
        const EXPECTED_HEADER =  Uint8Array.from([0x11, 0x11]);

        const htmlRenderer = new HTMLRenderer();
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
                decoded.html = htmlRenderer.renderSegment(decoded);
                segments.push(decoded);
            }
            messageIndex++;
        }

        return mergeSegments(segments);
    }
}
const predefinedAnimations = [
    'I am ironic, flirty',
    'I am glad',
    'I am sceptic',
    'I am sad',
    'WOW!',
    'I am crying',
    'I am winking',
    'I am laughing',
    'I am indifferent',
    'In love/Kissing',
    'I am confused',
    'Tongue hanging out',
    'I am angry',
    'Wearing glasses',
    'Devil'
];
export class HTMLRenderer  {
    #escapeHtml(raw) {
        return raw.replace(/[&<>"']/g, ch => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        }[ch]));
    }

    renderSegment(segment) {
        let insertions = [];
        for (let newlineIndex = segment.text.indexOf('\n'); newlineIndex !== -1; newlineIndex = segment.text.indexOf('\n', newlineIndex + 1)) {
            insertions.push({ position: newlineIndex + 1, text: '<br>' });
        }
        insertions.push(...this.#getTextFormattingInsertions(segment));
        for (const predefinedAnimation of segment.predefinedAnimations) {
            let text;
            if (predefinedAnimation.animationNumber >= predefinedAnimations.length)  {
                text = '<Incorrect predefined animation>';
            } else  {
                text = `<img class="predefined-animation" style="image-rendering: pixelated;" src="/img/predefined-animations/${predefinedAnimation.animationNumber +1}.webp" alt="${predefinedAnimations[predefinedAnimation.animationNumber]}">`;
            }
            insertions.push({
                position: predefinedAnimation.position,
                text,
            });
        }
        if (segment.iMelodies.length > 0) {
            if (typeof window !== 'undefined' && window.playIMelody === undefined) window.playIMelody = playIMelody;
        }
        for (const iMelody of segment.iMelodies) {
            const encoded = encodeURIComponent(iMelody.iMelodyString);
            insertions.push({
                position: iMelody.position,
                text: `<a class="i-melody" data-i-melody="${encoded}" onclick="playIMelody(decodeURIComponent(this.dataset.iMelody)); return" href="javascript:void(0)"><img style="width:13px;" src="/img/play-button-icon.svg" alt="Play iMelody"></a>`,});
        }
        for (const picture of segment.pictures) {
            let pictureType;
            if (picture instanceof LargePicture) {
                pictureType = 'large';
            } else {
                pictureType = 'small';
            }
            insertions.push({
                position: picture.position,
                text: `<img
                        style="image-rendering: pixelated;" 
                        class="picture picture-${pictureType}"
                        src="${picture.readAsDataUrl()}" 
                        alt="User Picture"
                        >`,
            });
        }
        for (const animation of segment.animations) {
            insertions.push({
                position: animation.position,
                text: `<canvas
                        width="${animation.sideLength}"
                        height="${animation.sideLength}"
                        class="animation"
                        style="image-rendering: pixelated;"
                        data-animation="${convertUint8ArrayToBase64(animation.animationData)}"
                        ></canvas>`,
            });
        }
        insertions = insertions.sort((a, b) => a.position - b.position);

        // Build output while preserving positions
        let lastIndex = 0;
        const htmlParts = [];
        for (const { position, text } of insertions) {
            htmlParts.push(this.#escapeHtml(segment.text.slice(lastIndex, position)));
            htmlParts.push(text);
            lastIndex = position;
        }
        htmlParts.push(this.#escapeHtml(segment.text.slice(lastIndex)));

        return htmlParts.join('');
    }
    calculateTextFormattingClassAndStyle(textFormatting) {
        const classes = [];
        const styles = [];
        if (textFormatting.length === 0) return { classes, styles };
        const alignment = textFormatting.getTextAlignment()
        if (alignment !== TextAlignment.LanguageDependent) {
            let alignmentCssValue;
            switch (alignment) {
                case TextAlignment.Left:
                    alignmentCssValue = 'left';
                    break;
                case TextAlignment.Right:
                    alignmentCssValue = 'right';
                    break;
                case TextAlignment.Center:
                    alignmentCssValue = 'center';
                    break;
            }
            classes.push(`text-alignment-${alignmentCssValue}`);
            styles.push(`text-align:${alignmentCssValue}`);
            styles.push('display:block');
        }

        const fontSize = textFormatting.getFontSize();
        if (fontSize !== FontSize.Normal) {
            let fontSizeCssValue;
            let fontSizeClass;
            switch (fontSize) {
                case FontSize.Small:
                    fontSizeCssValue = '8px';
                    fontSizeClass = 'small';
                    break;
                case FontSize.Large:
                    fontSizeCssValue = '16px';
                    fontSizeClass = 'large';
                    break;
                default:
                    fontSizeClass = 'unknown';
                    console.warn(`Unknown font size: ${textFormatting.getFontSize()}`);
            }
            classes.push(`font-size-${fontSizeClass}`);
            if (fontSizeCssValue !== undefined) {
                styles.push(`font-size:${fontSizeCssValue}`);
            }
        }
        if (textFormatting.isBold())  {
            classes.push('text-bold');
            styles.push('font-weight: bold');
        }
        if (textFormatting.isItalic())  {
            classes.push('text-italic');
            styles.push('font-style: italic');
        }
        if (textFormatting.isUnderlined())  {
            classes.push('text-underline');
            if (textFormatting.isStrikethrough()) {
                classes.push('text-strikethrough');
                styles.push('text-decoration: line-through underline');
            } else {
                styles.push('text-decoration: underline');
            }
        } else if (textFormatting.isStrikethrough())  {
            classes.push('text-strikethrough');
            styles.push('text-decoration: line-through');
        }

        const foregroundColor = textFormatting.getForegroundColor();
        if (foregroundColor !== undefined) {
            classes.push(`text-color-${foregroundColor.name}`);
            styles.push(`color: ${foregroundColor.htmlHex}`);
        }
        const backgroundColor = textFormatting.getBackgroundColor();
        if (backgroundColor !== undefined) {
            classes.push(`background-color-${backgroundColor.name}`);
            styles.push(`background-color: ${backgroundColor.htmlHex}`);
        }
        return { classes, styles };
    }
    #getTextFormattingInsertions(segment) {
        if (segment.textFormattings.length === 0) return [];
        let textByCharacter = segment.text.split('');
        let styleByCharacter = [];
        let classByCharacter = [];
        for (const character of textByCharacter) {
            styleByCharacter.push("");
            classByCharacter.push("");
        }
        for (const textFormatting of segment.textFormattings) {
            const {classes, styles} = this.calculateTextFormattingClassAndStyle(textFormatting);
            if (classes.length === 0) continue;
            const finalCharacterIndex = textFormatting.position + textFormatting.length;
            for (let characterIndex = textFormatting.position; characterIndex < finalCharacterIndex; characterIndex++) {
                // per the spec, execute the formatting directives in the order they are encountered
                // and override the previous directive if there is an overalp
                classByCharacter[characterIndex] = classes.join(' ');
                styleByCharacter[characterIndex] = styles.join('; ')
            }
        }
        const insertions = [];
        let lastClass = '';
        let spanOpen = false;
        for (let characterIndex=0; characterIndex < styleByCharacter.length; characterIndex++) {
            if (lastClass !== classByCharacter[characterIndex]) {
                lastClass = classByCharacter[characterIndex];
                if (spanOpen) {
                    insertions.push({
                        position: characterIndex,
                        text: `</span>`
                    });
                }
                if (classByCharacter[characterIndex] === '') {
                    spanOpen = false;
                } else {
                    insertions.push({
                        position: characterIndex,
                        text: `<span class="${classByCharacter[characterIndex]}" style="${styleByCharacter[characterIndex]}">`
                    });
                    spanOpen = true;
                }
            }
        }
        if (spanOpen) {
            insertions.push({
                position: styleByCharacter.length,
                text: `</span>`
            });
        }
        return insertions;
    }

    initHandlers() {
        document.querySelectorAll('canvas.animation').forEach(el => {
            renderAnimationOnCanvas(el, convertBase64ToUint8Array(el.dataset.animation), el.width);
        })
    }
}