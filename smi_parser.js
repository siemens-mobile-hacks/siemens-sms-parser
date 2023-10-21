/*
 * Based on http://smstools3.kekekasvi.com/topic.php?id=288
 * April 2010: Futher changes and functionality by Keijo Kasvi.
 * http://smstools3.kekekasvi.com - Feel free to use this code as you wish.
 *
 * 01.09.2017
 * - Converted sevenbit tables, not yet completely tested.
 *
 * 06.06.2017
 * - Fixed handling of TP-DCS when coding group bits are 1111xxxx.
 *
 * 15.01.2017
 * - < and > are now shown in a browser.
 *
 * 18.05.2011
 * - Recurring and starting spaces in message text are now shown in a browser.
 *
 * 06.04.2011
 * - Fixed handling of TP-DCS when coding group bits are 1111xxxx.
 *
 * 24.03.2011
 * - Added index column to the user data translation.
 *
 * 09.08.2010
 * - Added hexadecimal dump for 8bit messages.
 *
 * 23.07.2010
 * - Added "Type Of Address" selection.
 *
 * 23.05.2010
 * - Added handling for pdu= query variable.
 *
 * 13.05.2010
 * - Result code of a status report is explained.
 *
 * 22.04.2010
 * - Fix: The modified code did not show if a receipt was requested.
 *
 * 11.04.2010
 * - USSD Entry/Display now supports UCS2. Alphabet is not detected from the Cell Broadcast PDU,
 *   use radio buttons to select alphabet.
 *
 * 10.04.2010
 * - Type Of Address is explained.
 * - User Data Header is extracted from the PDU and shown as a hex string.
 * - Fixed incorrectly taken discharge timestamp in status report. Changed all timezone handling.
 *
 * 09.04.2010
 * - New layout, user friendly with long PDU's.
 * - Handling for extended characters (encode and decode).
 * - Update counting when alphabet size is changed.
 * - Plain User Data is created using USSD packing character.
 * - Can decode GSM 7bit packed (USSD) User Data.
 * - Can decode Cell Broadcast PDU (7bit).
 * - etc...
 */

/* Script written by Swen-Peter Ekkebus, edited by Ing. Milan Chudik.
 *
 * Further fixes and functionality by Andrew Alexander:
 * Fix message length issues, handle +xx  & 0xx phone codes, added bit length options,
 * display 8 & 16 bit messages, reformat interface, deal with embedded spaces in hex,
 * allow leading AT command in input, implemented some support for alpanumeric senders...
 *
 * ekkebus[at]cs.utwente.nl
 * Feel free to use it, please don't forget to link to the source ;)
 *
 *
 * www.rednaxela.net - Feel free to use this code as you wish. 
 * Version 1.5 r9aja
 * 
 * Official BPS develop tool
 *
 * (c) BPS & co, 2003
 */

/*
var esc = '\u261d';
var bad = '\u2639';
*/

//Array with "The 7 bit defaultalphabet"
/*
sevenbitdefault = new Array(
	'@',	'ï¿½',	'$',	'ï¿½',	'ï¿½',	'ï¿½',	'ï¿½',	'ï¿½',	'ï¿½',	'ï¿½',	'\n',	'ï¿½',	'ï¿½',	'\r',	'ï¿½',	'ï¿½',
	'\u0394',	'_',	'\u03a6',	'\u0393',	'\u039b',	'\u03a9',	'\u03a0',	'\u03a8',
	'\u03a3',	'\u0398',	'\u039e',	esc,	'ï¿½',	'ï¿½',	'ï¿½',	'ï¿½',
	' ',	'!',	'"',	'#',	'ï¿½',	'%',	'&',	'\'',	'(',	')',	'*',	'+',	',',	'-',	'.',	'/',
	'0',	'1',	'2',	'3',	'4',	'5',	'6',	'7',	'8',	'9',	':',	';',	'<',	'=',	'>',	'?',
	'ï¿½',	'A',	'B',	'C',	'D',	'E',	'F',	'G',	'H',	'I',	'J',	'K',	'L',	'M',	'N',	'O',
	'P',	'Q',	'R',	'S',	'T',	'U',	'V',	'W',	'X',	'Y',	'Z',	'ï¿½',	'ï¿½',	'ï¿½',	'ï¿½',	'ï¿½',
	'ï¿½',	'a',	'b',	'c',	'd',	'e',	'f',	'g',	'h',	'i',	'j',	'k',	'l',	'm',	'n',	'o',
	'p',	'q',	'r',	's',	't',	'u',	'v',	'w',	'x',	'y',	'z',	'ï¿½',	'ï¿½',	'ï¿½',	'ï¿½',	'ï¿½'
);

sevenbitextended = new Array(
	'\f',	0x0A,	// '\u000a',	// <FF>
	'^',	0x14,	// '\u0014',	// CIRCUMFLEX ACCENT
	'{',	0x28,	// '\u0028',	// LEFT CURLY BRACKET
	'}',	0x29,	// '\u0029',	// RIGHT CURLY BRACKET
	'\\',	0x2F,	// '\u002f',	// REVERSE SOLIDUS
	'[',	0x3C,	// '\u003c',	// LEFT SQUARE BRACKET
	'~',	0x3D,	// '\u003d',	// TILDE
	']',	0x3E,	// '\u003e',	// RIGHT SQUARE BRACKET
	'|',	0x40,	// '\u0040',	// VERTICAL LINE \u7c
	'ï¿½',	0x65 	// '\u0065'	// EURO SIGN ï¿½
);
*/

var esc = '\u001b'; //'\u261d';
var bad = '\u2639';

//Array with "The 7 bit defaultalphabet"
/*
sevenbitdefault_utf8 = new Array(
        '@',    'Â£',    '$',    'Â¥',    'Ã¨',    'Ã©',    'Ã¹',    'Ã¬',
        'Ã²',    'Ã‡',    '\n',   'Ã˜',    'Ã¸',    '\r',   'Ã…',    'Ã¥',

        '\u0394', '_', '\u03a6', '\u0393', '\u039b', '\u03a9', '\u03a0', '\u03a8',
        '\u03a3', '\u0398', '\u039e', esc, 'Ã†', 'Ã¦', 'ÃŸ', 'Ã‰',

        ' ',    '!',    '"',    '#',    'Â¤',    '%',    '&',    '\'',
        '(',    ')',    '*',    '+',    ',',    '-',    '.',    '/',

        '0',    '1',    '2',    '3',    '4',    '5',    '6',    '7',
        '8',    '9',    ':',    ';',    '<',    '=',    '>',    '?',

        'Â¡',    'A',    'B',    'C',    'D',    'E',    'F',    'G',
        'H',    'I',    'J',    'K',    'L',    'M',    'N',    'O',

        'P',    'Q',    'R',    'S',    'T',    'U',    'V',    'W',
        'X',    'Y',    'Z',    'Ã„',    'Ã–',    'Ã‘',    'Ãœ',    'Â§',

        'Â¿',    'a',    'b',    'c',    'd',    'e',    'f',    'g',
        'h',    'i',    'j',    'k',    'l',    'm',    'n',    'o',

        'p',    'q',    'r',    's',    't',    'u',    'v',    'w',
        'x',    'y',    'z',    'Ã¤',    'Ã¶',    'Ã±',    'Ã¼',    'Ã '
);
*/

sevenbitdefault = new Array(
        '@', '\u00a3', '$', '\u00a5', '\u00e8', '\u00e9', '\u00f9', '\u00ec',
        '\u00f2', '\u00c7', '\n', '\u00d8', '\u00f8', '\r', '\u00c5', '\u00e5',

        '\u0081', '_', '\u0082', '\u0083', '\u0084', '\u0085', '\u0086', '\u0087',
        '\u0088', '\u0089', '\u008a', esc, '\u00c6', '\u00e6', '\u00df', '\u00c9',

        ' ',    '!',    '"',    '#',    '\u00a4',       '%',    '&',    '\'',
        '(',    ')',    '*',    '+',    ',',    '-',    '.',    '/',

        '0',    '1',    '2',    '3',    '4',    '5',    '6',    '7',
        '8',    '9',    ':',    ';',    '<',    '=',    '>',    '?',

        '\u00a1',       'A',    'B',    'C',    'D',    'E',    'F',    'G',
        'H',    'I',    'J',    'K',    'L',    'M',    'N',    'O',

        'P',    'Q',    'R',    'S',    'T',    'U',    'V',    'W',
        'X',    'Y',    'Z',    '\u00c4', '\u00d6', '\u00d1', '\u00dc', '\u00a7',

        '\u00bf',       'a',    'b',    'c',    'd',    'e',    'f',    'g',
        'h',    'i',    'j',    'k',    'l',    'm',    'n',    'o',

        'p',    'q',    'r',    's',    't',    'u',    'v',    'w',
        'x',    'y',    'z',    '\u00e4', '\u00f6', '\u00f1', '\u00fc', '\u00e0'
);

sevenbitextended = new Array(
        '\f',   0x0A,   // '\u000a',    // <FF>
        '^',    0x14,   // '\u0014',    // CIRCUMFLEX ACCENT
        '{',    0x28,   // '\u0028',    // LEFT CURLY BRACKET
        '}',    0x29,   // '\u0029',    // RIGHT CURLY BRACKET
        '\\',   0x2F,   // '\u002f',    // REVERSE SOLIDUS
        '[',    0x3C,   // '\u003c',    // LEFT SQUARE BRACKET
        '~',    0x3D,   // '\u003d',    // TILDE
        ']',    0x3E,   // '\u003e',    // RIGHT SQUARE BRACKET
        '|',    0x40,   // '\u0040',    // VERTICAL LINE \u007c
        //'\u00a4', 0x65,       // '\u0065',    // EURO SIGN â‚¬
        '\u20ac', 0x65  // '\u0065'     // EURO SIGN â‚¬
);

// Variable that stores the information to show the user the calculation of the translation
var calculation = "";

var maxChars = 160;
var alerted = true; //false;

function getQueryVariable(variable)
{
	var query = window.location.search.substring(1);
	var vars = query.split("&");
	for (var i=0;i<vars.length;i++)
	{
		var pair = vars[i].split("=");
		if (pair[0] == variable)
			return pair[1];
	}
	return ""; 
}

// function te convert a bit string into a integer
function binToInt(x)//sp
{
	var total = 0;	
	var power = parseInt(x.length)-1;	

	for(var i=0;i<x.length;i++)
	{
		if(x.charAt(i) == '1')
		{
			total = total +Math.pow(2,power);
		}
		power --;
	}
	return total;
}

function decode_timezone(timezone)
{
	var tz = parseInt(timezone.substring(0, 1), 16);
	var result = '+';

	if (tz & 8)
		result = '-';
	tz = (tz & 7) * 10;
	tz += parseInt(timezone.substring(1, 2), 10);

	var tz_hour = Math.floor(tz / 4);
	var tz_min = 15 * (tz % 4) 

	if (tz_hour < 10)
		result += '0';
	result += tz_hour +':';
	if (tz_min == 0)
		result += '00';
	else
		result += tz_min;

	return result;
}

// function to convert a integer into a bit String
function intToBin(x,size) //sp
{
	var base = 2;
	var num = parseInt(x);
	var bin = num.toString(base);
	for(var i=bin.length;i<size;i++)
	{
		bin = "0" + bin;
	}
	return bin;
}

// function to convert a Hexnumber into a 10base number
function HexToNum(numberS)
{
	var tens = MakeNum(numberS.substring(0,1));
	
	var ones = 0;
	if(numberS.length > 1) // means two characters entered
		ones=MakeNum(numberS.substring(1,2));
	if(ones == 'X') 
	{
		return "00";
	}
	return  (tens * 16) + (ones * 1);
}

// helper function for HexToNum
function MakeNum(str) 
{
	if((str >= '0') && (str <= '9'))
		return str;
	switch(str.toUpperCase()) 
	{
		case "A": return 10;
		case "B": return 11;
		case "C": return 12;
		case "D": return 13;
		case "E": return 14;
		case "F": return 15;
		default:
		return 16;
   	}
	return 16;
}

//function to convert integer to Hex
function intToHex(i) //sp
 {
  var sHex = "0123456789ABCDEF";	
  h = ""; 
  i = parseInt(i);	
  for(j = 0; j <= 3; j++)
  {
    h += sHex.charAt((i >> (j * 8 + 4)) & 0x0F) +
	 sHex.charAt((i >> (j * 8)) & 0x0F);
  }
  return h.substring(0,2);
}

function ToHex(i)
{
	var sHex = "0123456789ABCDEF";
	var Out = "";

	Out = sHex.charAt(i&0xf);
	i>>=4;
	Out = sHex.charAt(i&0xf) + Out;

	return Out;
}

function getSevenBitExtendedCh(code)
{
	for (var i = 0; i < sevenbitextended.length; i += 2)
		if (sevenbitextended[i +1] == code)
			return sevenbitextended[i];
	return bad;
}

function getSevenBitExt(character)
{
	for (var i = 0; i < sevenbitextended.length; i += 2)
		if (sevenbitextended[i] == character)
			return sevenbitextended[i +1];
	return 0;
}

function getSevenBit(character)
{
	for (var i = 0; i < sevenbitdefault.length; i++)
		if (sevenbitdefault[i] == character)
			return i;
	return 0;
}

function getEightBit(character)
{
	return character;
}

function get16Bit(character)
{
	return character;
}

function phoneNumberMap(character)
{
//	return character;
	if((character >= '0') && (character <= '9'))
	{
		return character;
	}
	switch(character.toUpperCase())
	{
		case '*':
			return 'A';
		case '#':
			return 'B';
		case 'A':
			return 'C';
		case 'B':
			return 'D';
		case 'C':
			return 'E';
//		case '+':
//			return '+'; // An exception to fit with current processing ...
		default:
			return 'F';
	}
	return 'F';
}

function phoneNumberUnMap(chararacter)
{
	if((chararacter >= '0') && (chararacter <= '9'))
	{
		return chararacter;
	}
	switch(chararacter)
	{
		case 10: return '*';
		case 11: return '#';
		case 12: return 'A';
		case 13: return 'B';
		case 14: return 'C';
		default:
			return 'F';
	}
	return 'F';
}

// function to convert semioctets to a string
function semiOctetToString(inp) //sp
{
	var out = "";	
	for(var i=0;i<inp.length;i=i+2)
	{
		var temp = inp.substring(i,i+2);	
		out = out + phoneNumberMap(temp.charAt(1)) + phoneNumberMap(temp.charAt(0));
	}

	return out;
}

//Main function to translate the input to a "human readable" string
function getUserMessage(skip_characters, input,truelength) // Add truelength AJA
{
	var byteString = "";
	octetArray = new Array();
	restArray = new Array();
	septetsArray = new Array();
	var s=1;
	var count = 0;
	var matchcount = 0; // AJA
	var smsMessage = "";	
	var escaped = 0;
	var char_counter = 0;
	
	var calculation0 = "<table border=1 ><TR><TD align=center width=75><b>Index</b></TD>";
	//var calculation1 = "<table border=1 ><TR><TD align=center width=75><b>Hex</b></TD>";
	var calculation1 = "<TR><TD align=center width=75><b>Hex</b></TD>";
	var calculation2 = "<TR><TD align=center width=75><b>&nbsp;&nbsp;&nbsp;Octets&nbsp;&nbsp;&nbsp;</b></TD>";
	var calculation3 = "<table border=1 ><TR><TD align=center width=75><b>septets</b></TD>";
	var calculation4 = "<TR><TD align=center width=75><b>Char&nbsp;hex&nbsp;&nbsp;</b></TD>";
	calculation = "";

	var byte_index = 0;

	//Cut the input string into pieces of2 (just get the hex octets)
	for(var i=0;i<input.length;i=i+2)
	{
		var hex = input.substring(i,i+2);
		byteString = byteString + intToBin(HexToNum(hex),8);
		if((i%14 == 0 && i!=0))
		{
			calculation0 = calculation0 + "<TD align=center width=75>+++++++</TD>";
			calculation1 = calculation1 + "<TD align=center width=75>+++++++</TD>";
		}
		calculation0 = calculation0 + "<TD align=center width=75>" + byte_index + "</TD>"; 
		byte_index = byte_index + 1;
		calculation1 = calculation1 + "<TD align=center width=75>" + hex + "</TD>"; 
		 
	}
	calculation0 = calculation0 + "<TD align=center width=75>+++++++</TD>";
	calculation1 = calculation1 + "<TD align=center width=75>+++++++</TD>";
	
	// make two array's these are nessesery to
	for(var i=0;i<byteString.length;i=i+8)
	{
		octetArray[count] = byteString.substring(i,i+8);
		restArray[count] = octetArray[count].substring(0,(s%8));
		septetsArray[count] = octetArray[count].substring((s%8),8);
		if((i%56 == 0 && i!=0))
		{
			calculation2 = calculation2 + "<TD align=center width=75>&nbsp;</TD>";
		}
		calculation2 = calculation2 + "<TD align=center width=75><span style='background-color: #FFFF00'>" + restArray[count] + "</span>"+ septetsArray[count]+"</TD>";
		
		s++;
		count++;
		if(s == 8)
		{
			s = 1;
		}
	}
	calculation2 = calculation2 + "<TD align=center width=75>&nbsp;</TD>";
		
	// put the right parts of the array's together to make the sectets
	for (var i = 0; i < restArray.length; i++)
	{
		if (i % 7 == 0)
		{	
			if (i != 0)
			{
				char_counter++;
				chval = binToInt(restArray[i-1]);
				if (escaped)
				{
					smsMessage = smsMessage + getSevenBitExtendedCh(chval);
					escaped = 0;
				}
				else if (chval == 27 && char_counter > skip_characters)
					escaped = 1;
				else if (char_counter > skip_characters)
					smsMessage = smsMessage + sevenbitdefault[chval];

				calculation3 = calculation3 + "<TD align=center width=75><span style='background-color: #FFFF00'>&nbsp;" + restArray[i-1] + "</span>&nbsp;</TD>";
				calculation4 = calculation4 + "<TD align=center width=75>&nbsp;<B>" + sevenbitdefault[chval] + "</B>&nbsp;"+chval.toString(16)+"</TD>"; 
				matchcount ++; // AJA
			}

			char_counter++;
			chval = binToInt(septetsArray[i]);
			if (escaped)
			{
				smsMessage = smsMessage + getSevenBitExtendedCh(chval);
				escaped = 0;
			}
			else if (chval == 27 && char_counter > skip_characters)
				escaped = 1;
			else if (char_counter > skip_characters)
				smsMessage = smsMessage + sevenbitdefault[chval];

			calculation3 = calculation3 + "<TD align=center width=75>&nbsp;" +septetsArray[i] + "&nbsp;</TD>";
			calculation4 = calculation4 + "<TD align=center width=75>&nbsp;<B>" + sevenbitdefault[chval] + "</B>&nbsp;"+chval.toString(16)+"</TD>";
			matchcount ++; // AJA
		}
		else
		{
			char_counter++;
			chval = binToInt(septetsArray[i] + restArray[i-1]);
			if (escaped)
			{
				smsMessage = smsMessage + getSevenBitExtendedCh(chval);
				escaped = 0;
			}
			else if (chval == 27 && char_counter > skip_characters)
				escaped = 1;
			else if (char_counter > skip_characters)
				smsMessage = smsMessage + sevenbitdefault[chval];

			calculation3 = calculation3 + "<TD align=center width=75>&nbsp;" +septetsArray[i]+ "<span style='background-color: #FFFF00'>" +restArray[i-1] + "&nbsp;</span>" + "</TD>"
			calculation4 = calculation4 + "<TD align=center width=75>&nbsp;<B>" + sevenbitdefault[chval] + "</B>&nbsp;"+chval.toString(16)+"</TD>";
			matchcount ++; // AJA
		}
	
	}
	if (matchcount != truelength) // Don't forget trailing characters!! AJA
	{
		char_counter++;
		chval = binToInt(restArray[i-1]);
		if (!escaped)
		{
			if (char_counter > skip_characters)
				smsMessage = smsMessage + sevenbitdefault[chval];
		}
		else if (char_counter > skip_characters)
			smsMessage = smsMessage + getSevenBitExtendedCh(chval);

		calculation3 = calculation3 + "<TD align=center width=75><span style='background-color: #FFFF00'>&nbsp;" + restArray[i-1] + "</span>&nbsp;</TD>";
		calculation4 = calculation4 + "<TD align=center width=75>&nbsp;<B>" + sevenbitdefault[binToInt(restArray[i-1])] + "</B>&nbsp;"+binToInt(restArray[i-1]).toString(16)+"</TD>"; 
	}
	else // Blank Filler
	{
		calculation3 = calculation3 + "<TD align=center width=75>+++++++</TD>";
		calculation4 = calculation4 + "<TD align=center width=75>&nbsp;</TD>"; 
	}
	
	//Put all the calculation info together	
	calculation =  "<b>Conversion of 8-bit octets to 7-bit default alphabet</b><BR><BR>"+calculation0 + "</TR>" +calculation1 + "</TR>" + calculation2 + "</TR></table>" + calculation3 + "</TR>"+ calculation4 + "</TR></table>";

	return smsMessage;
}

function getUserMessage16(skip_characters, input,truelength)
{
	var smsMessage = "";
	var char_counter = 0;
	calculation = "Not implemented";

	// Cut the input string into pieces of 4
	for(var i=0;i<input.length;i=i+4)
	{
		var hex1 = input.substring(i,i+2);
		var hex2 = input.substring(i+2,i+4);
		char_counter++;
		if (char_counter > skip_characters)
			smsMessage += "" + String.fromCharCode(HexToNum(hex1)*256+HexToNum(hex2));
	}
	
	return smsMessage;
}

function getUserMessage8(skip_characters, input,truelength)
{
	var smsMessage = "";	
	calculation = "Not implemented";

	// Cut the input string into pieces of 2 (just get the hex octets)
	for(var i=0;i<input.length;i=i+2)
	{
		var hex = input.substring(i,i+2);
		smsMessage += "" + String.fromCharCode(HexToNum(hex));
	}
	
	return smsMessage;
}

//Function to build a popup window with the calculation a information
function showCalculation() 
{
	if(calculation.length != 0)
	{
		//myWin=open('','','width=800,height=200,resizable=yes,location=no,directories=no,toolbar=no,status=no,scrollbars=yes');
		myWin=open('','','height=200,resizable=yes,location=no,directories=no,toolbar=no,status=no,scrollbars=yes');
		var b='<html><head><title>User data translation</title></head><body>'+calculation+'</body></html>';
		a=myWin.document;
		a.open();
		a.write(b);
		a.close();
	}	
}

function encodeGSM7bitPacked(inpString)
{
	var octetFirst = "";
	var octetSecond = ""; 
	var output = "";
	var padding = String.fromCharCode(0x0D);
	var tmp = inpString;
	var inpStr = "";

	for (var i = 0; i < tmp.length; i++)
	{
		if (getSevenBitExt(tmp.charAt(i)))
			inpStr += String.fromCharCode(0x1B);

		inpStr += tmp.charAt(i);
	}

	var len = inpStr.length;
	if ((len % 8 == 7) || (len % 8 == 0 && len > 0 && inpStr.charAt(len - 1) == padding))
		inpStr += padding;

	for (var i = 0; i <= inpStr.length; i++)
	{
		if (i == inpStr.length)
		{
			if (octetSecond != "") // AJA Fix overshoot
			{
				output = output + "" + (intToHex(binToInt(octetSecond)));
			}
			break;
		}

		if (inpStr.charAt(i) == String.fromCharCode(0x1B))
			current = intToBin(0x1B,7);
		else
		{
			tmp = getSevenBitExt(inpStr.charAt(i));
			if (tmp == 0)
				tmp = getSevenBit(inpStr.charAt(i));
			else
				tmp = getSevenBitExt(inpStr.charAt(i));

			current = intToBin(tmp,7);
		}

		var currentOctet;
		if(i!=0 && i%8!=0)
		{
			octetFirst = current.substring(7-(i)%8);
			currentOctet = octetFirst + octetSecond;	//put octet parts together
			
			output = output + "" + (intToHex(binToInt(currentOctet)));
			octetSecond = current.substring(0,7-(i)%8);	//set net second octet
		}
		else
		{
			octetSecond = current.substring(0,7-(i)%8);
		}	
	}

	document.getElementById('ussdText').value = output;
	change_ussd(7);

	document.getElementById('pduTool').cell_broadcast.checked = false;
}

function explain_cell_broadcast(inpString)
{
	var result = "";
	var alphabet = HexToNum(inpString.substring(8, 10));
	var explain_alphabet = "";

	if ((alphabet & 0xF0) == 0)
		explain_alphabet = " Default Alphabet (7bit)";
	else if ((alphabet & 0xF0) == 0x10)
	{
		if ((alphabet & 0x0F) == 0)
			explain_alphabet = " Default Alphabet (7bit), message preceeded by language indication";
		else if ((alphabet & 0x0F) == 0x01)
			explain_alphabet = " UCS2 (16bit), message preceeded by language indication";
	}
	else if ((alphabet & 0xC0) == 0x40)
	{
		if ((alphabet & 0x0C) == 0)
			explain_alphabet = " Default Alphabet (7bit)";
		else if ((alphabet & 0x0C) == 0x04)
			explain_alphabet = " 8bit data";
		else if ((alphabet & 0x0C) == 0x08)
			explain_alphabet = " UCS2 (16bit)";
		else if ((alphabet & 0x0C) == 0x0C)
			explain_alphabet = " Reserved";
	}

	result += "Serial number: "+inpString.substring(0, 4)+"\n";
	result += "Message identifier: "+inpString.substring(4, 6)+"\n";
	result += "Data Coding Scheme: "+inpString.substring(8, 10)+explain_alphabet+"\n";
	result += "Page Parameter: "+inpString.substring(10, 12)+"\n";

	return result;
}

function decodeGSM7bitPacked(inpString, is_cell_broadcast)
{
	var result_prefix = "";

	var NewString = "";
	for(var i = 0; i < inpString.length;i++)
		if (MakeNum(inpString.substr(i, 1)) != 16)
			NewString += inpString.substr(i,1);
	inpString = NewString;

	var i = inpString.length;

	if (i % 2)
		return "ERROR: Length is not even";

	if (is_cell_broadcast)
	{
		if (i < 14)
			return "ERROR: Too short";

		result_prefix += explain_cell_broadcast(inpString);

		inpString = inpString.substring(12);
		i = inpString.length;
	}

	var septets = Math.floor(i / 2 * 8 / 7);
	var buffer = getUserMessage(0, inpString, septets);
	var len = buffer.length;
	var padding = String.fromCharCode(0x0D);
	var info = "";

	if ((septets % 8 == 0 && len > 0 && buffer.charAt(len -1) == padding) || (septets % 8 == 1 && len > 1 && buffer.charAt(len -1) == padding && buffer.charAt(len -2) == padding))
	{
		buffer = buffer.substring(0, len -1);
		info = "<BR><SMALL>( Had padding which is removed )</SMALL>";
	}

	return '<B>USSD/User Data without length information</B>\nAlphabet: GSM 7bit\n'+result_prefix+'\n<BIG>'+buffer+"</BIG>\nLength: "+buffer.length+info;
}

function decode_ussdText(inpString, is_cell_broadcast)
{
	var elem = document.getElementById('pduTool').ussd;
	var bitSize = elem[0].value * elem[0].checked | elem[1].value * elem[1].checked;

	if (bitSize == 7)
		return decodeGSM7bitPacked(inpString, is_cell_broadcast);

	if (bitSize == 16)
	{
		var result_prefix = "";
		var NewString = "";
		for(var i = 0; i < inpString.length;i++)
			if (MakeNum(inpString.substr(i, 1)) != 16)
				NewString += inpString.substr(i,1);
		inpString = NewString;

		var i = inpString.length;

		if (i % 2)
			return "ERROR: Length is not even";

		if (is_cell_broadcast)
		{
			if (i < 14)
				return "ERROR: Too short";

			result_prefix += explain_cell_broadcast(inpString);

			inpString = inpString.substring(12);
		}

		var messagelength = inpString.length / 2;
		var buffer = getUserMessage16(0, inpString, messagelength);
		var info = "";		

		return '<B>USSD/User Data without length information</B>\nAlphabet: UCS2\n'+result_prefix+'\n<BIG>'+buffer+"</BIG>\nLength: "+messagelength/2+info;
	}

	return "ERROR";
}

function explain_toa(octet)
{
	var result = "";
	var p = "reserved";
	var octet_int = parseInt(octet, 16);

	if (octet_int != -1)
	{
		switch ((octet_int & 0x70) >> 4)
		{
			case 0:
				p = "unknown";
				break;
			case 1:
				p = "international";
				break;
			case 2:
				p = "national";
				break;
			case 3:
				p = "network specific";
				break;
			case 4:
				p = "subsciber";
				break;
			case 5:
				p = "alphanumeric";
				break;
			case 6:
				p = "abbreviated";
				break;
		}

		result += p;
		p = "";

		switch (result & 0x0F)
		{
			case 0:
				p = "unknown";
				break;
			case 1:
				p = "ISDN/telephone";
				break;
			case 3:
				p = "data";
				break;
			case 4:
				p = "telex";
				break;
			case 8:
				p = "national";
				break;
			case 9:
				p = "private";
				break;
			case 10:
				p = "ERMES";
				break;
		}

		if (p != "")
			p = "Numbering Plan: " +p;
		result += ", " +p;
	}

	return result;
}

function explain_status(octet)
{
	var p = "unknown";
	var octet_int = parseInt(octet, 16);

	switch (octet_int)
	{
		case 0: p = "Ok,short message received by the SME"; break;
		case 1: p = "Ok,short message forwarded by the SC to the SME but the SC is unable to confirm delivery"; break;
		case 2: p = "Ok,short message replaced by the SC"; break;

		case 32: p = "Still trying,congestion"; break;
		case 33: p = "Still trying,SME busy"; break;
		case 34: p = "Still trying,no response sendr SME"; break;
		case 35: p = "Still trying,service rejected"; break;
		case 36: p = "Still trying,quality of service not available"; break;
		case 37: p = "Still trying,error in SME"; break;

		case 64: p = "Error,remote procedure error"; break;
		case 65: p = "Error,incompatible destination"; break;
		case 66: p = "Error,connection rejected by SME"; break;
		case 67: p = "Error,not obtainable"; break;
		case 68: p = "Error,quality of service not available"; break;
		case 69: p = "Error,no interworking available"; break;
		case 70: p = "Error,SM validity period expired"; break;
		case 71: p = "Error,SM deleted by originating SME"; break;
		case 72: p = "Error,SM deleted by SC administration"; break;
		case 73: p = "Error,SM does not exist"; break;

		case 96: p = "Error,congestion"; break;
		case 97: p = "Error,SME busy"; break;
		case 98: p = "Error,no response sendr SME"; break;
		case 99: p = "Error,service rejected"; break;
		case 100: p = "Error,quality of service not available"; break;
		case 101: p = "Error,error in SME"; break;
	}

	return p;
}

// Function to get SMSmeta info information from PDU String
function getPDUMetaInfo(inp, linefeed, ud_start, ud_end)
{
	var PDUString = inp;
	var start = 0;
	var out="";

	// Silently Strip leading AT command
	if (PDUString.substr(0,2)=="AT")
	{
		for(var i=0;i<PDUString.length;i++)
		{
			if(PDUString.charCodeAt(i)==10)
			{
				PDUString = PDUString.substr(i+1);
				break;
			}
		}
	}

	// Silently strip whitespace
	var NewPDU="";
	for(var i=0;i<PDUString.length;i++)
	{
		if (MakeNum(PDUString.substr(i,1))!=16)
		{
			NewPDU = NewPDU + PDUString.substr(i,1);
		}
	}
	PDUString = NewPDU;

	var SMSC_lengthInfo = HexToNum(PDUString.substring(0,2));
	var SMSC_info = PDUString.substring(2,2+(SMSC_lengthInfo*2));
	var SMSC_TypeOfAddress = SMSC_info.substring(0,2);
	var SMSC_Number = SMSC_info.substring(2,2+(SMSC_lengthInfo*2));

	if (SMSC_lengthInfo != 0)
	{
		SMSC_Number = semiOctetToString(SMSC_Number);

		// if the length is odd remove the trailing  F
		if((SMSC_Number.substr(SMSC_Number.length-1,1) == 'F') || (SMSC_Number.substr(SMSC_Number.length-1,1) == 'f'))
		{
			SMSC_Number = SMSC_Number.substring(0,SMSC_Number.length-1);
		}
		//if (SMSC_TypeOfAddress == 91)
		//{
		//	SMSC_Number = "+" + SMSC_Number;
		//}
	}
		
	var start_SMSDeleivery = (SMSC_lengthInfo*2)+2;

	start = start_SMSDeleivery;
	var firstOctet_SMSDeliver = PDUString.substr(start,2);
	start = start + 2;
	//if ((HexToNum(firstOctet_SMSDeliver) & 0x20) == 0x20)
	//{ 
	//	out += "Receipt requested"+linefeed;
	//}

	var UserDataHeader = 0;
	if ((HexToNum(firstOctet_SMSDeliver) & 0x40) == 0x40)
	{
		UserDataHeader = 1;
		//out += "User Data Header"+linefeed;
	}

	var hex_dump = "";

//	bit1	bit0	Message type
//	0	0	SMS DELIVER (in the direction SC to MS)	
//	0	0	SMS DELIVER REPORT (in the direction MS to SC)	
//	1	0	SMS STATUS REPORT (in the direction SC to MS)		
//	1	0	SMS COMMAND (in the direction MS to SC)	
//	0	1	SMS SUBMIT (in the direction MS to SC)	
//	0	1	SMS SUBMIT REPORT (in the direction SC to MS)	
//	1	1	Reserved

// This needs tidying up!! AJA

	if ((HexToNum(firstOctet_SMSDeliver) & 0x03) == 1 || (HexToNum(firstOctet_SMSDeliver) & 0x03) == 3) // Transmit Message
	{
		out = "<B>SMS SUBMIT (send)</B>"+linefeed;

		if ((HexToNum(firstOctet_SMSDeliver) & 0x03) == 3)
		{
			out = "Unknown Message"+linefeed+"Treat as Deliver"+linefeed;
		}

		out += "Receipt requested: ";
		if ((HexToNum(firstOctet_SMSDeliver) & 0x20) == 0x20)
			out += "yes";
		else
			out += "no";
		out += linefeed;

		var MessageReference = HexToNum(PDUString.substr(start,2));
		start = start + 2;

		// length in decimals
		var sender_addressLength = HexToNum(PDUString.substr(start,2));
		if(sender_addressLength%2 != 0)
		{
			sender_addressLength +=1;
		}
		start = start + 2;

		var sender_typeOfAddress = PDUString.substr(start,2);
		start = start + 2

		var sender_number = semiOctetToString(PDUString.substring(start,start+sender_addressLength));

		if((sender_number.substr(sender_number.length-1,1) == 'F') || (sender_number.substr(sender_number.length-1,1) == 'f' ))
		{
			sender_number =	sender_number.substring(0,sender_number.length-1);
		}
		//if (sender_typeOfAddress == 91)
		//{
		//	sender_number = "+" + sender_number;
		//}
		start +=sender_addressLength;

		var tp_PID = PDUString.substr(start,2);
		start +=2;

		var tp_DCS = PDUString.substr(start,2);
		var tp_DCS_desc = tpDCSMeaning(tp_DCS);
		start +=2;

		var ValidityPeriod;
		switch( (HexToNum(firstOctet_SMSDeliver) & 0x18) )
		{
			case 0: // Not Present
				ValidityPeriod = "Not Present";
				break;
			case 0x10: // Relative
				ValidityPeriod = "Rel " + cValid(HexToNum(PDUString.substr(start,2)));
				start +=2;
				break;
			case 0x08: // Enhanced
				ValidityPeriod = "Enhanced - Not Decoded";
				start +=14;
				break;
			case 0x18: // Absolute
				ValidityPeriod = "Absolute - Not Decoded";
				start +=14;
				break;
		}

// Commonish...
		var messageLength = HexToNum(PDUString.substr(start,2));

		start += 2;

		var bitSize = DCS_Bits(tp_DCS);
	    	var userData = "Undefined format";
		var skip_characters = 0;

		if ((bitSize == 7 || bitSize == 16) && UserDataHeader)
		{
			var ud_len = HexToNum(PDUString.substr(start,2));

			UserDataHeader = "";
			for (var i = 0; i <= ud_len; i++)
				UserDataHeader += PDUString.substr(start +i *2, 2) +" ";

			if (bitSize == 7)
				skip_characters = (((ud_len + 1) * 8) + 6) / 7;
			else
				skip_characters = (ud_len +1) /2;
		}

		if (bitSize==7)
		{
			userData = getUserMessage(skip_characters, PDUString.substr(start,PDUString.length-start),messageLength);
		}
		else if (bitSize==8)
		{
			userData = getUserMessage8(skip_characters, PDUString.substr(start,PDUString.length-start),messageLength);

			for (var i = 0; i < userData.length;i++)
			{
				if (userData.substr(i, 1) >= ' ')
					hex_dump += " "+intToHex(userData.charCodeAt(i))+"["+userData.substr(i, 1)+"]&nbsp;";
				else
					hex_dump += " "+intToHex(userData.charCodeAt(i))+"[.]&nbsp;";
			}

		}
		else if (bitSize==16)
		{
			userData = getUserMessage16(skip_characters, PDUString.substr(start,PDUString.length-start),messageLength);
		}

		userData = userData.substr(0,messageLength);
		if (bitSize==16)
		{
			messageLength/=2;
		}

		out += "SMSC: "+SMSC_Number+linefeed
			+"Receipient: "+sender_number+linefeed
			+"TOA: "+sender_typeOfAddress+" "+explain_toa(sender_typeOfAddress)+linefeed
			+"Validity: " +ValidityPeriod+linefeed
			+"TP-PID: "+tp_PID+linefeed
			+"TP-DCS: "+tp_DCS+linefeed
			+"TP-DCS-desc: "+tp_DCS_desc+linefeed;

		if (UserDataHeader != "")
			out += "User Data Header: "+UserDataHeader+linefeed;

		// Show spaces:
		userData = userData.replace(/  /g, '&nbsp; ');
		userData = userData.replace(/  /g, ' &nbsp;');
		userData = userData.replace(/\n /g, '\n&nbsp;');
		userData = userData.replace(/^ /g, '&nbsp;');

                // Show < and >:
		userData = userData.replace(/</g, '&lt;');
		userData = userData.replace(/>/g, '&gt;');

		out +=	linefeed+ud_start+userData+ud_end+linefeed
			+"Length: "+messageLength;

		if (hex_dump != "")
			out += linefeed+linefeed+"Hexadecimal dump:"+linefeed+hex_dump;

	}
	else // Receive Message
	if ((HexToNum(firstOctet_SMSDeliver) & 0x03) == 0) // Receive Message
	{
		out = "<B>SMS DELIVER (receive)</B>"+linefeed;

		out += "Receipt requested: ";
		if ((HexToNum(firstOctet_SMSDeliver) & 0x20) == 0x20)
			out += "yes";
		else
			out += "no";
		out += linefeed;

		// length in decimals
		var sender_addressLength = HexToNum(PDUString.substr(start,2));

		start = start + 2;

		var sender_typeOfAddress = PDUString.substr(start,2);
		start = start + 2

		var sender_number;
		if (sender_typeOfAddress == "D0")
		{
			_sl = sender_addressLength;

			if(sender_addressLength%2 != 0)
			{
				sender_addressLength +=1;
			}

//alert(sender_addressLength);
//alert(_sl);

//alert(parseInt(sender_addressLength/2*8/7));
//alert(parseInt(_sl/2*8/7));

//alert(PDUString.substring(start,start+sender_addressLength));
//alert(PDUString.substring(start,start+_sl));

//			sender_number = getUserMessage(PDUString.substring(start,start+sender_addressLength),parseInt(sender_addressLength/2*8/7));
			sender_number = getUserMessage(0, PDUString.substring(start,start+sender_addressLength),parseInt(_sl/2*8/7));
//alert(sender_number);
		}
		else
		{

		if(sender_addressLength%2 != 0)
		{
			sender_addressLength +=1;
		}

			sender_number = semiOctetToString(PDUString.substring(start,start+sender_addressLength));

			if((sender_number.substr(sender_number.length-1,1) == 'F') || (sender_number.substr(sender_number.length-1,1) == 'f' ))
			{
				sender_number =	sender_number.substring(0,sender_number.length-1);
			}
			//if (sender_typeOfAddress == 91)
			//{
			//	sender_number = "+" + sender_number;
			//}
		}
		start +=sender_addressLength;

		var tp_PID = PDUString.substr(start,2);
		start +=2;

		var tp_DCS = PDUString.substr(start,2);
		var tp_DCS_desc = tpDCSMeaning(tp_DCS);  
		start +=2;

		var timeStamp = semiOctetToString(PDUString.substr(start,14));
	
		// get date	
		var year = timeStamp.substring(0,2);
		var month = timeStamp.substring(2,4);
		var day = timeStamp.substring(4,6);
		var hours = timeStamp.substring(6,8);
		var minutes = timeStamp.substring(8,10);
		var seconds = timeStamp.substring(10,12);
		var timezone = timeStamp.substring(12,14);

		timeStamp = day + "/" + month + "/" + year + " " + hours + ":" + minutes + ":" + seconds + " GMT " +decode_timezone(timezone);

		start +=14;

// Commonish...
		var messageLength = HexToNum(PDUString.substr(start,2));
		start += 2;

		var bitSize = DCS_Bits(tp_DCS);
		var userData = "Undefined format";
		var skip_characters = 0;

		if ((bitSize == 7 || bitSize == 16) && UserDataHeader)
		{
			var ud_len = HexToNum(PDUString.substr(start,2));

			UserDataHeader = "";
			for (var i = 0; i <= ud_len; i++)
				UserDataHeader += PDUString.substr(start +i *2, 2) +" ";

			if (bitSize == 7)
				skip_characters = (((ud_len + 1) * 8) + 6) / 7;
			else
				skip_characters = (ud_len +1) /2;
		}

		if (bitSize==7)
		{
			userData = getUserMessage(skip_characters, PDUString.substr(start,PDUString.length-start),messageLength);
		}
		else if (bitSize==8)
		{
			userData = getUserMessage8(skip_characters, PDUString.substr(start,PDUString.length-start),messageLength);

			for (var i = 0; i < userData.length;i++)
			{
				if (userData.substr(i, 1) >= ' ')
					hex_dump += " "+intToHex(userData.charCodeAt(i))+"["+userData.substr(i, 1)+"]&nbsp;";
				else
					hex_dump += " "+intToHex(userData.charCodeAt(i))+"[.]&nbsp;";
			}

		}
		else if (bitSize==16)
		{
			userData = getUserMessage16(skip_characters, PDUString.substr(start,PDUString.length-start),messageLength);
		}

		userData = userData.substr(0,messageLength);

		if (bitSize==16)
		{
			messageLength/=2;
		}

		out += "SMSC: "+SMSC_Number+linefeed
			+"Sender: "+sender_number+linefeed
			+"TOA: "+sender_typeOfAddress+" "+explain_toa(sender_typeOfAddress)+linefeed
			+"TimeStamp: "+timeStamp+linefeed
			+"TP-PID: "+tp_PID+linefeed
			+"TP-DCS: "+tp_DCS+linefeed
			+"TP-DCS-desc: "+tp_DCS_desc+linefeed;

		if (UserDataHeader != "")
			out += "User Data Header: "+UserDataHeader+linefeed;

		// Show spaces:
		userData = userData.replace(/  /g, '&nbsp; ');
		userData = userData.replace(/  /g, ' &nbsp;');
		userData = userData.replace(/\n /g, '\n&nbsp;');
		userData = userData.replace(/^ /g, '&nbsp;');

		out += linefeed+ud_start+userData+ud_end+linefeed
			+"Length: "+messageLength;

		if (hex_dump != "")
			out += linefeed+linefeed+"Hexadecimal dump:"+linefeed+hex_dump;

	}
	else
	{
		out =  "<B>SMS STATUS REPORT</B>"+linefeed;

		var MessageReference = HexToNum(PDUString.substr(start,2)); // ??? Correct this name
		start = start + 2;

		// length in decimals
		var sender_addressLength = HexToNum(PDUString.substr(start,2));
		if(sender_addressLength%2 != 0)
		{
			sender_addressLength +=1;
		}
		start = start + 2;

		var sender_typeOfAddress = PDUString.substr(start,2);
		start = start + 2

		var sender_number = semiOctetToString(PDUString.substring(start,start+sender_addressLength));

		if((sender_number.substr(sender_number.length-1,1) == 'F') || (sender_number.substr(sender_number.length-1,1) == 'f' ))
		{
			sender_number =	sender_number.substring(0,sender_number.length-1);
		}
		//if (sender_typeOfAddress == 91)
		//{
		//	sender_number = "+" + sender_number;
		//}
		start +=sender_addressLength;

		var timeStamp = semiOctetToString(PDUString.substr(start,14));
	
		// get date	
		var year = timeStamp.substring(0,2);
		var month = timeStamp.substring(2,4);
		var day = timeStamp.substring(4,6);
		var hours = timeStamp.substring(6,8);
		var minutes = timeStamp.substring(8,10);
		var seconds = timeStamp.substring(10,12);
		var timezone = timeStamp.substring(12,14);
	
		timeStamp = day + "/" + month + "/" + year + " " + hours + ":" + minutes + ":" + seconds + " GMT " +decode_timezone(timezone);
		start +=14;

		var timeStamp2 = semiOctetToString(PDUString.substr(start,14));
	
		// get date	
		var year2 = timeStamp2.substring(0,2);
		var month2 = timeStamp2.substring(2,4);
		var day2 = timeStamp2.substring(4,6);
		var hours2 = timeStamp2.substring(6,8);
		var minutes2 = timeStamp2.substring(8,10);
		var seconds2 = timeStamp2.substring(10,12);
		var timezone2 = timeStamp2.substring(12,14);
	
		timeStamp2 = day2 + "/" + month2 + "/" + year2 + " " + hours2 + ":" + minutes2 + ":" + seconds2 + " GMT " +decode_timezone(timezone2);
		start +=14;

		var mStatus = PDUString.substr(start,2);

		out += "SMSC: "+SMSC_Number+linefeed
			+"Sender: "+sender_number+linefeed
			+"TOA: "+sender_typeOfAddress+" "+explain_toa(sender_typeOfAddress)+linefeed
			+"Message Ref: "+MessageReference+linefeed
			+"TimeStamp: "+timeStamp+linefeed
			+"Discharge Timestamp: "+timeStamp2+linefeed
			+"Status: "+mStatus +" " +explain_status(mStatus);

	}
	
	return out;
}

// function that print the default alphabet to a String
function printDefaultAlphabet()
{
	var out = "";
	out = "<table border=1 cellpadding=0 cellspacing=0";
	out = out + "<TR><TD align=left> &nbsp;#&nbsp; </TD><TD align=center>&nbsp; <b>character</b>&nbsp;</TD><TD align=right> &nbsp;<b>ASCII Code</b>&nbsp; </TD><TD align=right> &nbsp;<b>bits</b>&nbsp; </TD><TD align=right> &nbsp;<b>HEX</b>&nbsp; </TD></TR>";
	for(var i=0;i<sevenbitdefault.length;i++)
	{
		if (i == 27)
			out = out +"<TR>"
				+"<TD align=left> &nbsp;" +i +"&nbsp; </TD>"
				+"<TD align=center> &nbsp;" +sevenbitdefault[i] +" esc" +"&nbsp; </TD>"
				+"<TD align=right> &nbsp;" +i +"&nbsp; </TD>"
				+"<TD align=right> &nbsp;" +intToBin(i,8) +"&nbsp; </TD>"
				+"<TD align=right> &nbsp;" +i.toString(16) +"&nbsp; </TD>"
				+"</TR>";
		else
			out = out +"<TR>"
				+"<TD align=left> &nbsp;" +i +"&nbsp; </TD>"
				+"<TD align=center> &nbsp;" +sevenbitdefault[i] +"&nbsp; </TD>"
				+"<TD align=right> &nbsp;" +sevenbitdefault[i].charCodeAt(0) +"&nbsp; </TD>"
				+"<TD align=right> &nbsp;" +intToBin(sevenbitdefault[i].charCodeAt(0),8) +"&nbsp; </TD>"
				+"<TD align=right> &nbsp;" +sevenbitdefault[i].charCodeAt(0).toString(16) +"&nbsp; </TD>"
				+"</TR>";
		
	}
	out = out +"</table>";
	return out;	
} 

// function to make a new window
function show(title,text)
{
	myWin=open('','','width=500,height=600,resizable=no,location=no,directories=no,toolbar=no,status=no,scrollbars=yes');

	var b='<html><head><title>'+title+'</title></head><body><center>'+ text +'</center></body></html>';
	a=myWin.document;
	a.open();
	a.write(b);
	a.close();
}

function stringToPDU(inpString,phoneNumber,smscNumber,size,mclass,to_toa,valid,receipt) // AJA fixed SMSC processing
{
	var bitSize = size[0].value * size[0].checked | size[1].value * size[1].checked | size[2].value * size[2].checked;

	var octetFirst = "";
	var octetSecond = ""; 
	var output = "";

	//Make header
	var SMSC_INFO_LENGTH = 0;
	var SMSC_LENGTH = 0;
	var SMSC_NUMBER_FORMAT = "";
	var SMSC = "";
	if (smscNumber != 0)
	{
		SMSC_NUMBER_FORMAT = "81"; // national

		if (smscNumber.substr(0,1) == '+')
		{
			SMSC_NUMBER_FORMAT = "91"; // international
			smscNumber = smscNumber.substr(1);
		}
		else if (smscNumber.substr(0,1) !='0')
		{
			SMSC_NUMBER_FORMAT = "91"; // international
		}

		if(smscNumber.length%2 != 0)
		{
			// add trailing F
			smscNumber += "F";
		}	
	
		SMSC = semiOctetToString(smscNumber);
		SMSC_INFO_LENGTH = ((SMSC_NUMBER_FORMAT + "" + SMSC).length)/2;
		SMSC_LENGTH = SMSC_INFO_LENGTH;
		
	}
	if(SMSC_INFO_LENGTH < 10)
	{
		SMSC_INFO_LENGTH = "0" + SMSC_INFO_LENGTH;
	}
	var firstOctet; // = "1100";

	if (receipt.checked)
	{
		if (document.getElementById('pduTool').vFlag.checked)
		{
			firstOctet = "3100"; // 18 is mask for validity period // 10 indicates relative
		}
		else
		{
			firstOctet = "2100";
		}
	}
	else
	{
		if (document.getElementById('pduTool').vFlag.checked)
		{
			firstOctet = "1100";
		}
		else
		{
			firstOctet = "0100";
		}
	}
	
	var REIVER_NUMBER_FORMAT = "81"; // (national) 81 is "unknown"
	if (phoneNumber.substr(0,1) == '+')
	{
		REIVER_NUMBER_FORMAT = "91"; // international
		phoneNumber = phoneNumber.substr(1); //,phoneNumber.length-1);
	}
	else if (phoneNumber.substr(0,1) !='0')
	{
		REIVER_NUMBER_FORMAT = "91"; // international
	}

	switch (to_toa)
	{
		case "145":
			REIVER_NUMBER_FORMAT = "91"; // international
			break;

		case "161":
			REIVER_NUMBER_FORMAT = "A1"; // national
			break;

		case "129":
			REIVER_NUMBER_FORMAT = "81"; // unknown
			break;
	}

	var REIVER_NUMBER_LENGTH = intToHex(phoneNumber.length);

	if(phoneNumber.length%2 != 0)
	{
		// add trailing F
		phoneNumber += "F";
	}

	var REIVER_NUMBER = semiOctetToString(phoneNumber);
	var PROTO_ID = "00";
	var DCS=0;
	if (mclass != -1) // AJA
	{
		DCS = mclass | 0x10;
	}
	switch(bitSize)
	{
		case 7:
			break;
		case 8:
			DCS = DCS | 4;
			break;
		case 16:
			DCS = DCS | 8;
			break;

		default:
			alert("Invalid Alphabet Size");
			return "";
	}

	document.getElementById('ussdText').value = "";
	document.getElementById('pduTool').cell_broadcast.checked = false;

	var DATA_ENCODING = intToHex(DCS);
//	var DATA_ENCODING = "00"; // Default
//	if (bitSize == 8)
//	{
//		DATA_ENCODING = "04";
//	}
//	else if (bitSize == 16)
//	{
//		DATA_ENCODING = "08";
//	}

	var VALID_PERIOD = ""; // AA
	if (document.getElementById('pduTool').vFlag.checked)
	{
		VALID_PERIOD = intToHex(valid); // AA
	}

	var userDataSize;
	if (bitSize == 7)
	{
		var tmp = inpString;
		var inpStr = "";

		for (var i = 0; i < tmp.length; i++)
		{
			if (getSevenBitExt(tmp.charAt(i)))
				inpStr += String.fromCharCode(0x1B);

			inpStr += tmp.charAt(i);
		}

		inpStr = inpStr.substring(0, maxChars);

		userDataSize = intToHex(inpStr.length);

		for (var i = 0; i <= inpStr.length; i++)
		{
			if (i == inpStr.length)
			{
				if (octetSecond != "") // AJA Fix overshoot
				{
					output = output + "" + (intToHex(binToInt(octetSecond)));
				}
				break;
			}

			//var current = intToBin(getSevenBit(inpStr.charAt(i)),7);

			if (inpStr.charAt(i) == String.fromCharCode(0x1B))
				current = intToBin(0x1B,7);
			else
			{
				tmp = getSevenBitExt(inpStr.charAt(i));
				if (tmp == 0)
					tmp = getSevenBit(inpStr.charAt(i));
				else
					tmp = getSevenBitExt(inpStr.charAt(i));

				current = intToBin(tmp,7);
			}

			var currentOctet;
			if(i!=0 && i%8!=0)
			{
				octetFirst = current.substring(7-(i)%8);
				currentOctet = octetFirst + octetSecond;	//put octet parts together
			
				output = output + "" + (intToHex(binToInt(currentOctet)));
				octetSecond = current.substring(0,7-(i)%8);	//set net second octet
			}
			else
			{
				octetSecond = current.substring(0,7-(i)%8);
			}	
		}

		encodeGSM7bitPacked(inpString);
	}
	else if (bitSize == 8)
	{
		userDataSize = intToHex(inpString.length);

		var CurrentByte = 0;
		for(var i=0;i<inpString.length;i++)
		{
			CurrentByte = getEightBit(inpString.charCodeAt(i));
			output = output + "" + ( ToHex( CurrentByte ) );
		}
	}
	else if (bitSize == 16)
	{
		userDataSize = intToHex(inpString.length * 2);

		var myChar=0;
		var ussd = "";

		for(var i=0;i<inpString.length;i++)
		{
			myChar = get16Bit( inpString.charCodeAt(i) );
			output = output + "" + ( ToHex( (myChar&0xff00)>>8 )) + ( ToHex( myChar&0xff ) );
			ussd += ( ToHex( (myChar&0xff00)>>8 )) + ( ToHex( myChar&0xff ) );
		}

		document.getElementById('ussdText').value = ussd;
		change_ussd(16);
	}

	var header = SMSC_INFO_LENGTH + SMSC_NUMBER_FORMAT + SMSC + firstOctet + REIVER_NUMBER_LENGTH + REIVER_NUMBER_FORMAT  + REIVER_NUMBER +  PROTO_ID + DATA_ENCODING + VALID_PERIOD + userDataSize;

	var PDU = header + output;

	var AT = "AT+CMGS=" + (PDU.length/2 - SMSC_LENGTH - 1) ; // Add /2 for PDU length AJA - I think the SMSC information should also be excluded

//	var bStep=18;
//	for(var breakUp=1;breakUp*bStep < PDU.length;breakUp++)
//	{
//		PDU = PDU.substr(0,breakUp*bStep+breakUp-1) + " " + PDU.substr(breakUp*bStep+breakUp-1); 
//	}

	//CMGW
	return AT + "\n" + PDU;
}

function countCharacters(elem)
{
	var size = document.getElementById('pduTool').size;
	var bitSize = size[0].value * size[0].checked | size[1].value * size[1].checked | size[2].value * size[2].checked;
	//var keysSoFar = elem.value.length;
	var characters = 0;
	var extented = 0;

	if (bitSize == 7)
	{
		for (var i = 0; i < elem.value.length; i++)
		{
			if (getSevenBitExt(elem.value.charAt(i)))
			{
				extented++;
				characters++;
			}
			characters++;
		}
	}
	else
		characters = elem.value.length;
/*
	if (characters > maxChars)
	{
		if (!alerted)
		{
			alert ('Max length '+ maxChars + '!');
		}
		elem.value = elem.value.substring (0, maxChars); //chop
		alerted = true;
		characters = maxChars;
	}
*/
	//window.status = "Characters left : " + (maxChars - characters);
	document.getElementById('counter').innerHTML = characters+" / "+maxChars;

	var info = "<BR><SMALL>&nbsp;</SMALL>";
	if (extented)
		info = "<BR><SMALL>"+extented+" extended character(s).</SMALL>";

	if (characters > maxChars)
		document.getElementById('counter_notice').innerHTML = "<font color=red>Text is too long.</font>"+info;
	else
		document.getElementById('counter_notice').innerHTML = info;
}

function change_size(value)
{
	var elem = document.getElementById('pduTool').size;
	var bitSize = elem[0].value * elem[0].checked | elem[1].value * elem[1].checked | elem[2].value * elem[2].checked;

	if (value)
	{
		var len = elem.length;
		for (var i = 0; i < len; i++)
		{
			elem[i].checked = false;
			if (elem[i].value == "7")
				elem[i].checked = true;
		}
		return;
	}

	switch (bitSize)
	{
		case 7:
			maxChars = 160;
			break;

		case 8:
			maxChars = 140;
			break;

		case 16:
			maxChars = 70;
			break;
	}

	countCharacters(document.getElementById('smsText'));
}

function change_ussd(value)
{
	var elem = document.getElementById('pduTool').ussd;

	if (value)
	{
		var len = elem.length;
		for (var i = 0; i < len; i++)
		{
			elem[i].checked = false;
			if (elem[i].value == value)
				elem[i].checked = true;
		}
	}

	var bitSize = elem[0].value * elem[0].checked | elem[1].value * elem[1].checked;

	switch (bitSize)
	{
		case 7:
			document.getElementById('ussd_label').innerHTML = "<SMALL><i>( Padding as defined on GSM 03.38 version 5.6.1 (ETS 300 900) page 17 )</i></SMALL>";
			break;

		case 16:
			document.getElementById('ussd_label').innerHTML = "";
			break;
	}
}

function DCS_Bits(tp_DCS)
{
	var AlphabetSize=7; // Set Default
//alert(tp_DCS);
	var pomDCS = HexToNum(tp_DCS); 	
//alert(pomDCS);
	switch(pomDCS & 192)
	{
		case 0: if(pomDCS & 32)
			{
				// tp_DCS_desc="Compressed Text\n";
			}
			else
			{
				// tp_DCS_desc="Uncompressed Text\n";
			}
			switch(pomDCS & 12)
			{
				case 4:
					AlphabetSize=8;
					break;
				case 8:
					AlphabetSize=16;
					break;
			}
			break;
		case 192:
			switch(pomDCS & 0x30)
			{
				case 0x20:
					AlphabetSize=16;
					break;
				case 0x30:
					// 06.06.2017: if (pomDCS & 0x4)
					if (!(pomDCS & 0x4))
					{
						;
					}
					else
					{
						AlphabetSize=8;
					}
					break;
			}
			break;
	}

	return(AlphabetSize);
}

function tpDCSMeaning(tp_DCS)
{
	var tp_DCS_desc=tp_DCS;
	var pomDCS = HexToNum(tp_DCS); 	
	var alphabet = "";

	switch(pomDCS & 192)
	{
		case 0: if(pomDCS & 32)
			{
				tp_DCS_desc="Compressed Text";
			}
			else
			{
				tp_DCS_desc="Uncompressed Text";
			}
			if(!(pomDCS & 16)) // AJA
			{
				tp_DCS_desc+=", No class";
			}
			else
			{
			  	tp_DCS_desc+=", class: ";	

		  		switch(pomDCS & 3)
				{
					case 0:
						tp_DCS_desc+="0 Flash";
						break;
					case 1:
						tp_DCS_desc+="1 ME specific";
						break;
					case 2:
						tp_DCS_desc+="2 SIM specific";
						break;
					case 3:
						tp_DCS_desc+="3 TE specific";
						break;
				}	
			}

			tp_DCS_desc += "\nAlphabet: ";
			switch(pomDCS & 12)
			{
				case 0:
					tp_DCS_desc+="Default (7bit)";
					break;
				case 4:
					tp_DCS_desc+="8bit";
					break;
				case 8:
					tp_DCS_desc+="UCS2 (16bit)";
					break;
				case 12:
					tp_DCS_desc+="Reserved";
					break;
			}
			break;
		case 64:
		case 128: 
			tp_DCS_desc ="Reserved coding group";
			break;
		case 192:
			switch(pomDCS & 0x30)
			{
				case 0:
					tp_DCS_desc ="Message waiting group: Discard Message";
					break;
				case 0x10:
					tp_DCS_desc ="Message waiting group: Store Message. Default Alphabet.";
					break;
				case 0x20:
					tp_DCS_desc ="Message waiting group: Store Message. UCS2 Alphabet.";
					break;
				case 0x30:
					// 06.04.2011: tp_DCS_desc ="Data coding message class: ";
					alphabet = "\nAlphabet: ";
					// 06.04.2011: if (pomDCS & 0x4)
					if (!(pomDCS & 0x4))
					{
						alphabet += "Default (7bit)";
					}
					else
					{
						alphabet += "8bit";
					}
					break;
			}

			// 06.04.2011:
			if (tp_DCS_desc == tp_DCS)
			  	tp_DCS_desc = "Class: ";
			else
			  	tp_DCS_desc += ", class: ";

	  		switch(pomDCS & 3)
			{
				case 0:
					tp_DCS_desc+="0 Flash";
					break;
				case 1:
					tp_DCS_desc+="1 ME specific";
					break;
				case 2:
					tp_DCS_desc+="2 SIM specific";
					break;
				case 3:
					tp_DCS_desc+="3 TE specific";
					break;
			}	
			tp_DCS_desc += alphabet;
			// -----------

			break;

	}

	//alert(tp_DCS.valueOf());
	return(tp_DCS_desc); 
}

function checkFlag(valid)
{
	if (valid.checked)
	{
		document.getElementById('pduTool').valid.disabled = false;
		document.getElementById('pduTool').valid.value = "255";
		document.getElementById('validy').innerHTML=cValid("255");
	}
	else
	{
		document.getElementById('pduTool').valid.disabled = true;
		document.getElementById('pduTool').valid.value = "";
		document.getElementById('validy').innerHTML="";
	}
}

function Validity(valid)
{
var byValidityPeriod = 0;

	if (isNaN(parseInt(valid)))
	{
		valid = 0;
		document.getElementById('pduTool').valid.value = valid;
	}
	else
	{
		valid=parseInt(valid);
		if (valid <0)
		{
			valid = 0;
			document.getElementById('pduTool').valid.value = valid;
		}
		if (valid>255)
		{
			valid = 255;
			document.getElementById('pduTool').valid.value = valid;
		}
	}
	return cValid(valid);
}

function cValid(valid)
{
	var value,out=""; 
//	if (isNaN(parseInt(valid)))
//	{
//		alert("No text please we're British!");
//	}
	valid=parseInt(valid);
	if (valid <= 143)
	{
		value = (valid+1)*5; // Minutes
	}
	else if (valid <= 167)
	{
		value = ((valid-143) / 2 + 12); // Hours
		value *= 60; // Convert to Minutes
	}
	else if (valid <= 196)
	{
		value = valid-166; // days
		value *= 60*24; // Convert to Minutes
	}
	else
	{
		value = valid-192; // Weeks
		value *= 7*60*24; // Convert to Minutes
	}
	var mins,hours,days,weeks;

	mins = value % 60;
	hours = value / 60;
	days = hours / 24;
	weeks = days / 7;
	hours %= 24;
	days %= 7;

	if (parseInt(weeks) != 0)
	{
		out += parseInt(weeks) + "w ";
	}

	if (parseInt(days) != 0)
	{
		out += parseInt(days) + "d ";
	}

	if (parseInt(hours) != 0)
	{
		out += parseInt(hours) + "h ";
	}
	if (mins != 0)
	{
		out += mins + "m ";
	}

	return out;
}



function add_to_memo(val)
{
	var elem = document.getElementById('smsMemo');
	var add = val;

	add = add.replace(/<BR>/gi, '\n');
	add = add.replace(/<BIG>/gi, '');
	add = add.replace(/<\/BIG>/gi, '');
	add = add.replace(/<B>/gi, '');
	add = add.replace(/<\/B>/gi, '');
	add = add.replace(/<SMALL>/gi, '');
	add = add.replace(/<\/SMALL>/gi, '');

	if (document.getElementById('pduTool').quote_memo.checked)
	{
		var memo = elem.value;
		if (memo.length > 0)
			if (memo.substring(0, 1) != "\n")
				memo = "\n"+memo;

		memo = memo.replace(/\n/g, '\n> ');
		elem.value = add+memo;
	}
	else
		elem.value += add;
}

function sizeMemo(val)
{
	//var elem = document.getElementById('smsMemo');
	//elem.rows += val;

	set_rows(0,val,'smsMemo');
}
const fs = require('fs');

// Function to show usage information
function showUsage() {
    console.log("Usage: node <script_name> <file_name>");
    console.log("Reads a file starting from byte 18 and processes its content.");
}

// Get the file name from the command-line arguments
const fileName = process.argv[2];

// If no file name provided, show usage and exit
if (!fileName) {
    console.error("Error: No file name provided.");
    showUsage();
    process.exit(1);
}

// Read the file asynchronously starting from byte 18
fs.open(fileName, 'r', (err, fd) => {
    if (err) {
        console.error(`Error opening file: ${err}`);
        return;
    }

    // Find the size of the file
    fs.fstat(fd, (err, stats) => {
        if (err) {
            console.error(`Error getting file stats: ${err}`);
            return;
        }

        const bufferSize = stats.size - 18; // File size - 18 bytes
        const buffer = Buffer.alloc(bufferSize);

        // Read the file into the buffer starting at byte 18
        fs.read(fd, buffer, 0, bufferSize, 18, (err, bytesRead, buffer) => {
            if (err) {
                console.error(`Error reading file: ${err}`);
                return;
            }

            // Convert the buffer to hex and remove trailing FF bytes
            let hexString = buffer.toString('hex');
            hexString = hexString.replace(/ff+$/, '');

            console.log(getPDUMetaInfo(hexString, "\n", "Message:\n\n", "\n"));

            // Close the file descriptor
            fs.close(fd, (err) => {
                if (err) {
                    console.error(`Error closing file: ${err}`);
                }
            });
        });
    });
});
