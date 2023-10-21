# Siemens SMS Archive Parser

Code mostly from http://smstools3.kekekasvi.com/topic.php?id=288


Parse SMI messages from "SMS archive"

# Usage

    node smi_parser.js "path/to/SMS Archive"

or

    node smi_parser "path/to/file.smi"

Sample output:
```
/home/user/SMS Archive/9.04.smi
SMS DELIVER (receive)
Receipt requested: no
SMSC: 79184330000
Sender: 79183232214
TOA: 91 international, Numbering Plan: unknown
TimeStamp: 2005-04-29 11:20:10 GMT +03:00
TP-PID: 00
TP-DCS: 00
TP-DCS-desc: Uncompressed Text, No class
Alphabet: Default (7bit)

Message:

PRIVET! U NAS EST' KARTA ROSSII V JPG? OCHEN' SROCHNO NUGNO! ESLI NET, TO NUGNO POISKAT'. TARAS

````
Messages with multiple segments are currently not parsed well.

Format description: https://sisms.sourceforge.net/docs/SMISMOStruct.html

(But currently this is mostly unused and only PDU data is extracted from the file)
