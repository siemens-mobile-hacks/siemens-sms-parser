# Siemens SMS Archive Parser

Parse SMI/SMO messages from "SMS archive" on Siemens phones.

# Usage

    node cli.js "path/to/SMS Archive"

or

    node cli.js "path/to/file.smi"

Sample output:
```

--- /home/user/SMS archive/SMS archive/Inbox/Офис/29.04.smi ---
Format: X55_X65_X75
Type: Incoming
Segments: 1/1
Date: 2005-04-29 11:20:10 +03:00
SMS Center: 79184330000
Sender: 79183252714
Encoding: GSM-7
Length: 95
Text: PRIVET! U NAS EST' KARTA ROSSII V JPG? OCHEN' SROCHNO NUGNO! ESLI NET, TO NUGNO POISKAT'. TARAS


````
Format description: https://sisms.sourceforge.net/docs/SMISMOStruct.html
Code used as a reference for PDU decoding: http://smstools3.kekekasvi.com/topic.php?id=288
