// Type definitions for siemens-sms-parser
// TypeScript Version: 4.5

/**
 * Formats a timestamp to ISO format with timezone offset
 */
export function formatTimestampToIsoWithOffset(dateOrTimestamp: Date | number, customOffsetMinutes?: number): string;

/**
 * Decoder for PDU format SMS messages
 */
export class PDUDecoder {
  /**
   * Decodes a PDU format SMS message
   * @param u8 - The PDU data as a Uint8Array or array of numbers
   * @returns The decoded SMS message or undefined if decoding failed
   */
  decode(u8: Uint8Array | number[]): DecodedPDU | undefined;

  /**
   * Decodes an SMS.dat format SMS message
   * @param u8 - The SMS.dat data as a Uint8Array
   * @returns The decoded SMS message or undefined if decoding failed
   */
  decodeSmsDat(u8: Uint8Array): DecodedPDU | undefined;
}

/**
 * Decoder for SMS format messages
 */
export class SMSDecoder {
  /**
   * Decodes an SMS format message
   * @param buf - The SMS data as a Uint8Array or array of numbers
   * @returns The decoded SMS message
   */
  decode(buf: Uint8Array | number[]): DecodedSMS;
}

/**
 * Parser for SMS.dat files
 */
export class SMSDatParser {
  /**
   * Decodes an SMS.dat file
   * @param buf - The SMS.dat data as a Uint8Array or array of numbers
   * @returns An array of decoded SMS messages
   */
  decode(buf: Uint8Array | number[]): DecodedPDU[];
}

/**
 * Renderer for HTML representation of SMS messages
 */
export class HTMLRenderer {
  /**
   * Renders an SMS segment to HTML
   * @param segment - The SMS segment to render
   * @returns HTML representation of the SMS segment
   */
  renderSegment(segment: DecodedPDU): string;

  /**
   * Calculates text formatting class and style for a TextFormatting object
   * @param textFormatting - The text formatting to calculate for
   * @returns Object containing classes and styles
   */
  calculateTextFormattingClassAndStyle(textFormatting: TextFormatting): { classes: string[], styles: string[] };

  /**
   * Initializes handlers for animations in the rendered HTML
   */
  initHandlers(): void;
}

/**
 * Text alignment enum
 */
export const TextAlignment: {
  readonly Left: 0;
  readonly Center: 1;
  readonly Right: 2;
  readonly LanguageDependent: 3;
};

/**
 * Font size enum
 */
export const FontSize: {
  readonly Normal: 0;
  readonly Large: 1;
  readonly Small: 2;
  readonly Reserved: 3;
};

/**
 * Text formatting class
 */
export class TextFormatting {
  /**
   * Start position of the text formatting
   */
  position: number;

  /**
   * Text formatting length
   */
  length: number;

  /**
   * Formatting mode value
   */
  formattingMode: number;

  /**
   * Foreground color
   */
  foregroundColor?: number;

  /**
   * Background color
   */
  backgroundColor?: number;

  /**
   * Creates a new TextFormatting instance
   * @param position - Start position
   * @param length - Length
   * @param formattingMode - Formatting mode
   * @param foregroundColor - Foreground color (optional)
   * @param backgroundColor - Background color (optional)
   */
  constructor(position: number, length: number, formattingMode: number, foregroundColor?: number, backgroundColor?: number);

  /**
   * Gets the text alignment
   */
  getTextAlignment(): number;

  /**
   * Gets the font size
   */
  getFontSize(): number;

  /**
   * Checks if the text is bold
   */
  isBold(): boolean;

  /**
   * Checks if the text is italic
   */
  isItalic(): boolean;

  /**
   * Checks if the text is underlined
   */
  isUnderlined(): boolean;

  /**
   * Checks if the text has strikethrough
   */
  isStrikethrough(): boolean;

  /**
   * Gets the foreground color
   */
  getForegroundColor(): { name: string, htmlHex: string } | undefined;

  /**
   * Gets the background color
   */
  getBackgroundColor(): { name: string, htmlHex: string } | undefined;
}

/**
 * Predefined animation class
 */
export class PredefinedAnimation {
  /**
   * Position in the text
   */
  readonly position: number;

  /**
   * Animation number
   */
  readonly animationNumber: number;

  /**
   * Creates a new PredefinedAnimation instance
   * @param position - Position in the text
   * @param animationNumber - Animation number
   */
  constructor(position: number, animationNumber: number);
}

/**
 * Picture class
 */
export class Picture {
  /**
   * Position in the text
   */
  readonly position: number;

  /**
   * Picture data
   */
  readonly pictureData: Uint8Array;

  /**
   * Width in pixels
   */
  readonly width: number;

  /**
   * Height in pixels
   */
  readonly height: number;

  /**
   * Creates a new Picture instance
   * @param position - Position in the text
   * @param pictureData - Picture data
   * @param width - Width in pixels
   * @param height - Height in pixels
   */
  constructor(position: number, pictureData: Uint8Array, width: number, height: number);

  /**
   * Renders the picture on a canvas
   * @param canvas - The canvas to render on
   */
  renderOnCanvas(canvas: HTMLCanvasElement): void;

  /**
   * Reads the picture as a data URL
   * @returns Data URL of the picture
   */
  readAsDataUrl(): string;
}

/**
 * Large picture class
 */
export class LargePicture extends Picture {
  /**
   * Creates a new LargePicture instance
   * @param position - Position in the text
   * @param pictureData - Picture data
   */
  constructor(position: number, pictureData: Uint8Array);
}

/**
 * Small picture class
 */
export class SmallPicture extends Picture {
  /**
   * Creates a new SmallPicture instance
   * @param position - Position in the text
   * @param pictureData - Picture data
   */
  constructor(position: number, pictureData: Uint8Array);
}

/**
 * Animation class
 */
export class Animation {
  /**
   * Position in the text
   */
  readonly position: number;

  /**
   * Animation data
   */
  readonly animationData: Uint8Array;


  /**
   * Width in pixels
   */
  readonly width: number;

  /**
   * Height in pixels
   */
  readonly height: number;

  /**
   * Creates a new Animation instance
   * @param position - Position in the text
   * @param animationData - Animation data
   * @param width - Width in pixels
   * @param height - Height in pixels
   */
  constructor(position: number, animationData: Uint8Array, width: number, height: number);
}

/**
 * IMelody class
 */
export class IMelody {
  /**
   * Position in the text
   */
  readonly position: number;

  /**
   * IMelody string
   */
  readonly iMelodyString: string;

  /**
   * Creates a new IMelody instance
   * @param position - Position in the text
   * @param iMelodyString - IMelody string
   */
  constructor(position: number, iMelodyString: string);
}

/**
 * User data class
 */
export class UserData {
  /**
   * Reference number
   */
  referenceNumber?: number;

  /**
   * Total number of segments
   */
  segmentsTotal?: number;

  /**
   * Sequence number
   */
  sequenceNumber?: number;

  /**
   * Encoding
   */
  encoding?: 'GSM-7' | 'Data' | 'UCS-2';

  /**
   * Text content
   */
  text?: string;

  /**
   * Length
   */
  length?: number;

  /**
   * Errors
   */
  errors: string[];

  /**
   * Text formattings
   */
  textFormattings: TextFormatting[];

  /**
   * Predefined animations
   */
  predefinedAnimations: PredefinedAnimation[];

  /**
   * Pictures
   */
  pictures: Picture[];

  /**
   * IMelodies
   */
  iMelodies: IMelody[];

  /**
   * Animations
   */
  animations: Animation[];
}

/**
 * Interface for a decoded PDU
 */
export interface DecodedPDU {
  /**
   * Type of message
   */
  type: 'Incoming' | 'Outgoing' | 'STATUS_REPORT';

  /**
   * SMS center type
   */
  smsCenterType: number;

  /**
   * SMS center number
   */
  smsCenterNumber: string;

  /**
   * First octet
   */
  firstOctet?: number;

  /**
   * Whether UDHI is present
   */
  udhiPresent?: boolean;

  /**
   * Protocol identifier
   */
  pid?: number;

  /**
   * Data coding scheme
   */
  dcs?: number;

  /**
   * Class description
   */
  classDesc?: string;

  /**
   * Reference number
   */
  referenceNumber?: number;

  /**
   * Total number of segments
   */
  segmentsTotal?: number;

  /**
   * Sequence number
   */
  sequenceNumber?: number;

  /**
   * Encoding
   */
  encoding?: 'GSM-7' | 'Data' | 'UCS-2';

  /**
   * Text content
   */
  text?: string;

  /**
   * Length
   */
  length?: number;

  /**
   * Errors
   */
  errors?: string[];

  /**
   * Text formattings
   */
  textFormattings?: TextFormatting[];

  /**
   * Predefined animations
   */
  predefinedAnimations?: PredefinedAnimation[];

  /**
   * Pictures
   */
  pictures?: Picture[];

  /**
   * IMelodies
   */
  iMelodies?: IMelody[];

  /**
   * Animations
   */
  animations?: Animation[];

  /**
   * Sender (for incoming messages)
   */
  sender?: string;

  /**
   * Recipient (for outgoing messages)
   */
  recipient?: string;

  /**
   * Message reference (for outgoing messages)
   */
  messageRef?: number;

  /**
   * Validity period (for outgoing messages)
   */
  validityPeriod?: number;

  /**
   * Date and timezone offset
   */
  dateAndTimeZoneOffset?: {
    date: Date;
    timeZoneOffsetMinutes: number;
  };

  /**
   * Discharge date and timezone offset (for status reports)
   */
  dischargeDateAndTimeZoneOffset?: {
    date: Date;
    timeZoneOffsetMinutes: number;
  };

  /**
   * Status (for status reports)
   */
  status?: number;

  /**
   * Folder
   */
  folder?: number;

  /**
   * Format
   */
  format?: string;

  /**
   * HTML representation
   */
  html?: string;

  /**
   * Message index
   */
  messageIndex?: number;
}

/**
 * Interface for a decoded SMS
 */
export interface DecodedSMS extends DecodedPDU {
  /**
   * Format name
   */
  format: string;

  /**
   * Total number of segments
   */
  segmentsTotal: number;

  /**
   * Number of segments stored
   */
  segmentsStored: number;

  /**
   * SMS type
   */
  smsType?: number;

  /**
   * SMS status
   */
  smsStatus?: number;
}
