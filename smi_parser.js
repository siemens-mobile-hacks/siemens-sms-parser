/*
 * Based on http://smstools3.kekekasvi.com/topic.php?id=288
 * Script written by Swen-Peter Ekkebus, edited by Ing. Milan Chudik.
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

var esc = '\u001b'; //'\u261d';
var bad = '\u2639';



sevenbitdefault = ['@', '\u00a3', '$', '\u00a5', '\u00e8', '\u00e9', '\u00f9', '\u00ec',
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
        'x',    'y',    'z',    '\u00e4', '\u00f6', '\u00f1', '\u00fc', '\u00e0'];

sevenbitextended = ['\f',   0x0A,   // '\u000a',    // <FF>
        '^',    0x14,   // '\u0014',    // CIRCUMFLEX ACCENT
        '{',    0x28,   // '\u0028',    // LEFT CURLY BRACKET
        '}',    0x29,   // '\u0029',    // RIGHT CURLY BRACKET
        '\\',   0x2F,   // '\u002f',    // REVERSE SOLIDUS
        '[',    0x3C,   // '\u003c',    // LEFT SQUARE BRACKET
        '~',    0x3D,   // '\u003d',    // TILDE
        ']',    0x3E,   // '\u003e',    // RIGHT SQUARE BRACKET
        '|',    0x40,   // '\u0040',    // VERTICAL LINE \u007c
        //'\u00a4', 0x65,       // '\u0065',    // EURO SIGN â‚¬
        '\u20ac', 0x65];

// Variable that stores the information to show the user the calculation of the translation
var calculation = "";


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

function getSevenBitExtendedCh(code)
{
	for (var i = 0; i < sevenbitextended.length; i += 2)
		if (sevenbitextended[i +1] == code)
			return sevenbitextended[i];
	return bad;
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
	octetArray = [];
	restArray = [];
	septetsArray = [];
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
		out = "SMS DELIVER (receive)"+linefeed;

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

		timeStamp =  "20" + year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds + " GMT " +decode_timezone(timezone);

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
		out =  "SMS STATUS REPORT"+linefeed;

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
const fs = require('fs').promises;
const path = require('path');

async function processFile(filePath) {
    console.log(filePath);
    const fd = await fs.open(filePath, 'r');
    const stats = await fd.stat();
    const bufferSize = stats.size - 18;
    const buffer = Buffer.alloc(bufferSize);
    await fd.read(buffer, 0, bufferSize, 18);
    await fd.close();

    let hexString = buffer.toString('hex');
    hexString = hexString.replace(/ff+$/, '');

    console.log(getPDUMetaInfo(hexString, "\n", "Message:\n\n", "\n"));
}

async function readDirRecursively(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const dirent of entries) {
        const entryPath = path.join(dirPath, dirent.name);

        if (dirent.isDirectory()) {
            await readDirRecursively(entryPath);
        } else {
            await processFile(entryPath);
        }
    }
}

async function main() {
    const inputPath = process.argv[2];

    if (!inputPath) {
        console.error("Error: No input path provided.");
        console.log("Usage: node <script_name> <file_or_directory_name>");
        process.exit(1);
    }

    const stats = await fs.stat(inputPath);

    if (stats.isDirectory()) {
        await readDirRecursively(inputPath);
    } else if (stats.isFile()) {
        await processFile(inputPath);
    } else {
        console.error("Error: The input path is neither a file nor a directory.");
        process.exit(1);
    }
}

main().catch(console.error);
