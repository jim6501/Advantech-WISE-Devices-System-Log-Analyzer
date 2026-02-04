共通 API 資訊 (WISE-4000/4200/4400/4600/2200)

JSON Field Definitions (LogMsg Array)

| Field | Abbreviation | Data Type | Description |
| --- | --- | --- | --- |
| Periodic / Event | PE | Number | Recording mode/Event type (Refer to device event tables) |
| Timestamp | TIM | String | Storage timestamp in ISO 8601 or UTC format |
| UUID | UID | String | Universally Unique Identifier of the device |
| MAC ID | MAC | String | MAC address or LoRa EUI |
| Recording message | Record | String | Hexadecimal string containing event details |

JSON Response Example：

{

"LogMsg": [

{

"PE": 6,

"TIM": "2014-11-11T15:48:32+08:00",

"UID": "WISE-4060_00D0C9CC0001",

"MAC": "00-D0-C9-CC-00-01",

"Record": "00000001"

},

{

"PE": 8,

"TIM": "2014-11-11T15:49:44+08:00",

"UID": "WISE-4060_00D0C9CC0001",

"MAC": "00-D0-C9-CC-00-01",

"Record": "0A090B04"

}

]

}

2. WISE-4000 & WISE-4200 Series (Wi-Fi)

Applicable Models: WISE-4000, WISE-4220, WISE-4250 11

System Logging Event Table (PE Mapping)

| PE Value | Description | Record Parsing Logic |
| --- | --- | --- |
| 1 | Wireless Connection | Last 4 octets of the connected MAC address |
| 2 | Wireless Disconnection | Last 4 octets of the disconnected MAC address |
| 3 | Communication WDT | Byte 3: Index; Bytes 0-2: User IP (See detail table) |
| 4 | Cloud File Upload | Bytes 3-2: Index (0: I/O, 1: System); |
| 5 | Cloud Data Push | Bytes 3-2: Index (0: I/O, 1: System); |
| 6 | SNTP Status | 0: No error, 1: DNS error, 2: No socket, 3: No reply, 4: Socket fatal |
| 7 | Power Action | 1: Power on, 2: System restart, 3: Power off, 4: CoreTask WDT timeout |
| 8 | Memory Full/Overwrite | 1: IO full, 2: IO overwrite, 3: System overwrite |
| 9 | Remote Access Fail | IP address of the rejected access attempt |
| 10 | Login Error | IP address associated with the failed login |
| 11 | FW Upgrade | Upgraded firmware version string |
| 12 | RTC Battery Low | Internal Real-Time Clock battery voltage is low |
| 13 | Config Table Error | Error items indicated by bit order (0-16) (Bit Order: 0:Device Info, 1:WiFi, 2:Network, 3:Access Control, 4:IO, 5:Modbus 0X, 6:Modbus 4X, 7:User Account, 8:Internal Buffer, 9:Analog Cal, 10:IO Log, 11:Cloud, 12:File Upload, 13:Private Server, 14:System Log, 15:Internal Buffer, 16:Tag Setting.) |
| 14 | Internal Flash Error | Error accessing internal flash memory |
| 15 | WiFi Event | Detailed Event ID (0x01~0x19). Includes Disconnect reasons, RSSI changes, IP acquired, Ping errors, and Socket connections |
| 16 | P2P Status | 1: Access control error, 2: Password error, 3: No QOS ACK . |
| 17 | Webserver Utility | Byte 3: Index (0x01: Delete user, 0x02: List full); Bytes 0-2: IP |
| 18 | HW Error | Byte 3: 1 indicates I2C failure |

Detailed WiFi Event Table (PE 15)

When PE is 15 on a Wi-Fi device, the Record is parsed using Byte 3 as the event code 17.

| Byte 3 (Hex) | Description | Data Detail (Bytes 2, 1, 0) |
| --- | --- | --- |
| 0x01 | WLAN disconnect event | Reason code of WiFi module. |
| 0x02 | Unexpected event | Event code of WiFi module. |
| 0x03 | Unexpected socket | Event code of WiFi module. |
| 0x04 | Tx socket failed | Byte 2: Socket ID; Byte 1-0: Reason. |
| 0x05 | Disconnect info | First Log: Byte 2: Profile[0], Byte 1: Priority, Byte 0: Name length . Second Log (Secondary bytes): Bytes 3-0: SSID content . Byte 3: SSID[0] Byte 2: SSID[1] Byte 1: SSID[2] Byte 30: SSID[3] |
| 0x06 | RSSI level change | Byte 2: RSSI; Byte 1: Old level; Byte 0: New level. |
| 0x07 | RSSI Histogram | First Log: Byte 2-0: RSSI_His[0] to [2]. Second Log (Secondary bytes): Bytes 2-0: RSSI_His[3] to [5]. |
| 0x08 | Unexpected WLAN policy | Byte 2: Policy; Byte 1-0: 0. |
| 0x09 | IP acquired | Byte 2-0: Acquired IP address. |
| 0x0A | WLAN RF reset | Byte 2-0: Result code. |
| 0x0B | Push connection fail | Error code for server connection (Push). |
| 0x0C | Upload connection fail | Error code for server connection (Upload). |
| 0x0D | MQTT connection fail | Error code for server connection (MQTT). |
| 0x0E | Device RF fatal error | Byte 2: Sender; Byte 1-0: Status. |
| 0x0F | Device RF abort error | Byte 2: AbortType; Byte 1-0: AbortData. |
| 0x10 | Check ping error | Byte 2: 1:None, 2:Data error; Byte 0: Gateway IP. |
| 0x11 | Net config error | Fixed value 0. |
| 0x12 | Connection list full | Fixed value 0 (excludes webserver). |
| 0x13 | Reboot interval timeout | Fixed value 0. |
| 0x14 | Socket connect | Byte 2: Type (1:Modbus, 2:Cloud, 3:SNTP, 4: UDPCFG, 5:P2P, 6: WebServer ); Byte 0: Socket ID. |
| 0x15 | Socket disconnect | Socket closure event. |
| 0x16 | RF WDT | Byte 2: WDT Mode(1: Disassociate, 2:Ping); Byte 1: Action (0:Reset, 1:Reboot, 2:Re-associate). |
| 0x17 | RF callback event | Byte 2: Event code. |
| 0x18 | RF module message | Byte 2-1: Message code; Byte 0: 1:Timeout, 2:Failure. |
| 0x19 | RF module WiFi event | Byte 2-1: Event ID; Byte 0: 0. |

3. WISE-4000/LAN Series

For WISE-4000/LAN modules, the PE field determines the category of the log entry. Below is the exhaustive list of PE codes and their parsing logic 2.

| PE | Description | Record Parsing Logic |
| --- | --- | --- |
| 1 | TCP Connection | Byte 3-2: Type (00: TCP); Byte 1: Error item; Byte 0: Content. |
| 2 | Reserved | No data recorded. |
| 3 | Communication WDT | Communication Watchdog Timer event. |
| 4 | Cloud File Upload | 1 (Connect server error), 2 (Upload data fail). |
| 5 | Cloud Data Push | 1 (Connect error), 2 (Push IO fail), 3 (Push System fail). |
| 6 | SNTP | 0: No error, 1: DNS error, 2: No socket, 3: No reply, 4: Socket fatal, Other: NTP time. |
| 7 | Power Action | 1: Power on, 2: System restart, 3: Power off. |
| 8 | Log Memory State | 1: IO full, 2: IO overwrite, 3: System overwrite. |
| 9 | Remote Access Fail | IP address of the rejected access attempt. |
| 10 | Login Error | IP address of the failed login attempt. |
| 11 | FW Upgrade | Upgraded firmware version string. Ex: A1.00 B01 => 0A100B01 |
| 12 | RTC Battery Low | Internal Real-Time Clock battery voltage is low. |
| 13 | Config Table Error | Error items indicated by bit order (See Section 3). |
| 14 | Flash Access Error | Internal flash memory access error. |
| 15 | Reserved | No data recorded for LAN series. |
| 16 | Reserved | No data recorded for LAN series. |

TLS Handshake Failure Table (PE 1)

When PE is 1 and Byte 1 is 0 (Embed TLS failure), Byte 0 indicates the specific handshake failure step.

| Byte 0 (Hex) | Handshake Step | Byte 0 (Hex) | Handshake Step |
| --- | --- | --- | --- |
| 0 | HELLO REQUEST | 8 | CLIENT KEY EXCHANGE |
| 1 | CLIENT HELLO | 9 | CERTIFICATE VERIFY |
| 2 | SERVER HELLO | A | CLIENT CHANGE CIPHER |
| 3 | SERVER CERTIFICATE | B | CLIENT FINISHED |
| 4 | SERVER KEY EXCHANGE | C | SERVER CHANGE CIPHER |
| 5 | CERTIFICATE REQUEST | D | SERVER FINISHED |
| 6 | SERVER HELLO DONE | E | FLUSH BUFFERS |
| 7 | CLIENT CERTIFICATE | F | HANDSHAKE WRAPUP |

Internal Configuration Error Bit Order (PE 13)

The following table provides the complete list of all 17 bits defined for the configuration error item:

| Bit | Error Item | Description |
| --- | --- | --- |
| 0 | Device Information | Errors in general device identification data. |
| 1 | Wifi Setting | Errors in wireless configuration (Shared firmware base). |
| 2 | Network Setting | Errors in IP, Subnet, or Gateway configurations. |
| 3 | Access Control Setting | Errors in IP white-list or access restrictions. |
| 4 | IO Setting | Errors in digital/analog input or output parameters. |
| 5 | Modbus 0X Address | Errors in Modbus Coil address mappings. |
| 6 | Modbus 4X Address | Errors in Modbus Holding Register address mappings. |
| 7 | User Account Setting | Errors in login credentials or permission levels. |
| 8 | Internal Buffer | Error related to the internal data buffer configuration. |
| 9 | Analog Calibration Value | Errors in the calibration offsets for analog modules. |
| 10 | IO Log Setting | Errors in the logging interval or storage conditions. |
| 11 | Cloud Setting | Errors in cloud platform connection parameters. |
| 12 | File Upload Setting | Errors in FTP/HTTP file upload configurations. |
| 13 | Private Server Setting | Errors in custom private server endpoint settings. |
| 14 | System Log Setting | Errors in the system logging configuration itself. |
| 15 | Internal Buffer | Secondary error related to the internal buffer. |
| 16 | File Upload Tag Setting | Errors in the naming or tagging of uploaded files. |

4. WISE-4671 / WISE-4471 NB-IoT Series

System Log Event Table (PE Mapping)

The PE field identifies the category of the recorded event and dictates how the Record field should be parsed.

| PE | Event Description | Record Parsing Logic |
| --- | --- | --- |
| 1 | Cellular Info | Records modem initialization, registration status, and RF resets (See Section 3). |
| 2 | Cellular CME Error | Error codes refer to specific AT Command manuals. WISE-4471: Error codes refer to SARA-R4_ATCommands_(UBX-17003787_R08) WISE-4671: Error codes refer to BG96_AT_Commands_Manual_V2.3, |
| 3 | Communication WDT | Communication Watchdog Timer events. |
| 4 | Cloud File Upload | Byte 3, 2: Index (0: I/O, 1: System); Byte 1, 0: Error code. |
| 5 | Cloud Data Push | Byte 3, 2: Index (0: I/O, 1: System); Byte 1, 0: Error code. |
| 6 | Cellular CMS Error | Error codes refer to specific AT Command manuals. WISE-4471: Error codes refer to SARA-R4_ATCommands_(UBX-17003787_R08), WISE-4671: Error codes refer to BG96_AT_Commands_Manual_V2.3, |
| 7 | Power Action | 1: Power on, 2: System restart, 3: Power off. |
| 8 | Memory Status | 1: IO full, 2: IO overwrite, 3: System overwrite. |
| 9 | Remote Access Success | Displays the last 6 digits of the phone number. |
| 10 | Remote Access Fail | Displays the last 6 digits of the phone number. |
| 11 | FW Upgrade | Upgraded firmware version string (e.g., A1.00 B01) . Ex: A1.00 B01 => 0A100B01 |
| 12 | Battery | Detailed battery voltage and temperature status (See Section 4) . |
| 13 | Internal Config Error | Error items defined by bit order (See Section 5). |
| 14 | Internal Flash Error | Error accessing internal flash memory. |
| 15 | Reserved | No data recorded. |
| 16 | Reserved | No data recorded. |

Cellular Information Details (PE 1)

When the PE value is 1, the Record string identifies the specific state of the cellular modem and network registration.

| Code (No.) | Description / Event Status |
| --- | --- |
| 1 | Modem Initial failed: The cellular modem failed to initialize properly. |
| 2 | Get PIN status failed: The device could not retrieve the SIM PIN status. |
| 3 | Set packet data protocol failed: PDP context configuration failed. |
| 4 | Set SMS service center address failed: SMSC address configuration error. |
| 5 | Registered: The device has successfully registered to the home network. |
| 6 | Not registered: MT is not currently searching for an operator. |
| 7 | RF reset: A reset command was issued to the RF module. |
| 8 | RF module reset: The physical RF hardware module has been reset. |
| 9 | Unregistered timeout: Registration was lost due to a timeout. |
| 10 | RF module not respond: The RF hardware is not responding to commands. |
| 11 | Attempting Registration: Not registered, but currently searching or trying to attach. |
| 12 | Registration denied: The network has explicitly denied the registration request. |
| 13 | CEREG: Unknown: Registration status is unknown (Refer to 3GPP TS 27.007). |
| 14 | Registered, roaming: The device is registered but on a roaming network. |
| 15 | RF module manufacturer error: An internal error reported by the RF module hardware. |

Battery and Charging Status (PE 12)

Note: For the WISE-4471, only event code 0 (RTC battery low) is supported.

| No. | Error Item / Event Description |
| --- | --- |
| 0 | RTC battery low |
| 1 | Battery low |
| 2 | Over-Temperature detected in Charge condition |
| 3 | Over-Temperature detected in Discharge condition |
| 4 | Internal Short is detected |
| 5 | Full-charged condition reached |

Internal Configuration Error Bit Order (PE 13)

When the PE value is 13, the Record field is a hexadecimal value that must be converted to binary. Each bit represents a specific section of the device configuration.

| Bit | Error Item | Description |
| --- | --- | --- |
| 0 | Device information | Errors in general device identification data. |
| 1 | Cellular setting | Errors in NB-IoT/LTE-M network parameters. |
| 2 | User account setting | Errors in login credentials or permission levels. |
| 3 | Access control setting | Errors in IP white-list or access restrictions. |
| 4 | IO setting | Errors in digital/analog input or output parameters. |
| 5 | DI counter | Errors in Digital Input counter configurations. |
| 6 | IO log setting | Errors in the I/O data logging configuration. |
| 7 | Cloud setting | Errors in cloud platform connection parameters. |
| 8 | File upload setting | Errors in FTP/HTTP file upload configurations. |
| 9 | Private server setting | Errors in custom private server endpoint settings. |
| 10 | System log setting | Errors in the system logging configuration itself. |
| 11 | Last address | Errors in the recorded last memory/network address. |
| 12 | RS-485 | Errors in the RS-485 serial communication settings. |
| 13 | Modbus RTU | Errors in the Modbus RTU protocol configuration. |
| 14 | System mark | Errors in internal system state markers. |
| 15 | Paas setting | Errors in Platform-as-a-Service integration settings. |

4. WISE-4610 / WISE-2410 / WISE-2200-M LoRaWAN Series

System Log Event Table (PE Mapping)

The PE field identifies the category of the recorded event and dictates how the Record field should be parsed 10.

The PE field defines the category of the log. The Record field is a hexadecimal string parsed based on the PE value2.

| PE | Event Description | Record Parsing Logic |
| --- | --- | --- |
| 1 | Wireless Connection | Records LoRaWAN connection attempts and status. |
| 7 | Power On/Off | Byte 3: Action; Bytes 0–2: Cause/Event. |
| 8 | Memory Status | 1: IO full; 2: IO overwrite; 3: System overwrite. |
| 11 | FW Upgrade | Version string. Ex: A1.00 B01 => 0A100B01 |
| 12 | Battery Info | Byte 3: Data Index (0–4); Bytes 0–2: Value/Status. |
| 13 | Config Error | Byte 3 (Mode): 0:Error Table (Bitmask), 1:Reset Cause .  Bytes 0–2: Binary bit-order for specific configuration tables. |
| 14 | Flash Error | Byte 3 (Event): Index 1–9 defining the operation type . Bytes 0–2: Address, Length, or Sector Size (See PE 14 Detail Table). |
| 15 | RF Event | Byte 3: Protocol Index (1–7, 0x0A); Bytes 0–2: Protocol Data. |
| 18 | Hardware Event | Byte 3: Module Index (1: I/O Module, 2: Serial Command Error Event); Bytes 0–2: Error Details. |

Detailed Power & Restart Logic (PE 7)

Byte 3 (Action): 1: Power on, 2: System restart, 3: Power off, 4: CoreTask WDT timeout12.

Bytes 0–2 (Restart Cause): Triggered when Byte 3 is 213:

| Value | Restart Cause | Value | Restart Cause |
| --- | --- | --- | --- |
| 1 | F/W image load complete | 5 | Restart from LoRaWAN downlink |
| 2 | RESTful Restart command | 6 | Power detected during low battery |
| 3 | LoRa configurations changed | 7 | ASCII restart command |
| 4 | RESTful Reset to Default | 8 | I/O connector pin test complete |

Battery Information Table (PE 12)

The parsing of Bytes 0–2 depends on the index provided in Byte 322:

| Byte 3 | Event / Data | Bytes 0–2 Value Details |
| --- | --- | --- |
| 0 | Battery Warning | 1: Low Battery. (ex) 00000001 |
| 1 | Battery Voltage | 01XXXXXX: Voltage in mV. (ex) 01000DB5 => 3509 mV |


Internal Configuration Table (PE 13)

Byte 3 = 0 (Error Table)

When Byte 3 is 0, convert the record to binary. Each bit represents a configuration section:

Bit 0: Device information.

Bit 1: LoRa setting.

Bit 2: IO setting.

Bit 3: DI count.

Bit 4: System log.

Bit 5: RS485 setting.

Bit 6: Modbus RTU.

Bit 7: Position.

Bit 8: IO log setting.

Bit 9: Modbus RTU expansion.

Byte 3 = 1 (Reset to Default Cause)

0: Table not found; 1: Web command; 2: I/O change; 3: ASCII command.

Internal Flash Access Error (PE 14)

When a flash access error occurs, use the value in Byte 3 of the Record field to identify the event type, then interpret Bytes 0–2 according to that event:

| Byte 3 (Event) | Operation / Event Description | Bytes 0–2 (Content Description) |
| --- | --- | --- |
| 1 | Read | The specific Memory Address where the read operation failed. |
| 2 | Write | The specific Memory Address where the write operation failed. |
| 3 | Length | The Length of data that the system attempted to process. |
| 4 | Error Length | The Error Length detected during the operation. |
| 5 | Protect Address | The Protected Memory Address that caused an access violation. |
| 6 | Erase | The Memory Address where the erase operation failed. |
| 7 | Erase Size | The size of the sector being erased: 0: 32K, 1: 4K, 2: 64K. |
| 8 | Erase Protect Address | The Protected Address triggered during an erase operation. |
| 9 | Out of Sector | The Memory Address that was determined to be out of valid sector bounds. |

RF Event Primary Index (PE 15)

The following table defines the specific category of the RF event based on the value of Byte 3 in the hexadecimal Record string.

| Byte 3 (Hex) | Event Description | Data Detail (Byte 2, 1, 0) |
| --- | --- | --- |
| 01 | Join fail | Fixed value 000000. |
| 02 | RF initial fail | Fixed value 000000. |
| 03 | Connect fail | Byte 2-0: Status Code. |
| 04 | LoRaWAN Stack Events | Byte 2-0: Stack Event Code (Refer to LoRaWAN Stack Event Codes). |
| 05 | MAC Command | Header: Cmd ID + Param 1-2.  Log 2+: Remaining Params. (Refer to MAC Command Reference). |
| 06 | Frame Counter (Fcnt) | Byte 2: 01: Uplink, 02: Downlink, 03: Difference; Byte 1-0: Value. |
| 07 | Error Event | Byte 2: Event Category; Byte 1-0: Status Code. |
| 08 | Send Error | Same mapping logic as Byte 3 = 07. |
| 09 | Downlink Frame | Header: FC, Seq, Len. Log 2+: Raw Payload (3 bytes/log). (Refer to Downlink Frame Structure) |
| 0x0A | Data Rate Change | Byte 1: Original Data Rate; Byte 0: New Data Rate (0–6). |

LoRaWAN Stack Event Codes (Byte 3 = 04)

| Code (Hex) | Description | Code (Hex) | Description |
| --- | --- | --- | --- |
| 000000 (0) | Connected | 000007 (7) | Rx done |
| 000001 (1) | Disconnected | 000008 (8) | Rx timeout |
| 000003 (3) | Tx timeout | 000009 (9) | Rx error |
| 000004 (4) | Tx error (Retries exhausted) | 00000A (10) | Join failure |
| 000006 (6) | Tx scheduling error | 00000C (12) | Automatic uplink error |

MAC Command Detail Table (PE 15, Byte 3 = 0x05)

Below is the technical breakdown of common MAC commands and how their data is distributed across logs.

| Command ID (Byte 2) | Command Name | Total Log Records | Parameter Allocation Logic & Sequence |
| --- | --- | --- | --- |
| 0x02 | LinkCheckAns | 1 Record | Contains only the Command ID (Bytes 1–0 are typically 0/Padding). |
| 0x03 | LinkADRReq | 4 Records | Log 1: Cmd ID + DR/TXPower (Byte 1) & Redundancy (Byte 0). Logs 2–4: Sequential recording of ChMask (L/H), Resulting Settings, and ACK Status. |
| 0x04 | DutyCycleReq | 1 Record | Byte 0: MaxDutyCycle. |
| 0x05 | RXParamSetupReq | 3 Records | Log 1: Cmd ID + RX1DRoffset (Byte 1) & RX2DataRate (Byte 0). Logs 2–3: Sequential recording of Frequency (3 bytes) and ACK Status. |
| 0x06 | DevStatusReq | 1 Record | Contains only the Command ID (Bytes 1–0 are typically 0/Padding). |
| 0x07 | NewChannelReq | 3 Records | Log 1: Cmd ID + Channel Index (ChIndex) & DrRange.   Logs 2–3: Sequential recording of Frequency and ACK Status. |
| 0x08 | RXTimingSetupReq | 1 Record | Byte 1: Delay setting. |
| 0x09 | TxParamSetupReq | 1 Record | Byte 1: EIRP / Dwell Time settings. |
| 0x0A | DlChannelReq | 3 Records | Log 1: Byte 2: Cmd ID + Byte 1: 00 + Byte 0: Channel Index (ChIndex). Logs 2–3: Sequential recording of Frequency-related parameters and ACK Status. |

1. LinkADRReq (Cmd ID: 0x03) — Total: 4 Logs

This command manages adaptive data rates and channel masks. It records the request parameters (Logs 1–2) and the final operational result (Logs 3–4).

| Log Order | Byte 3 | Byte 2 | Byte 1 (Content) | Byte 0 (Content) |
| --- | --- | --- | --- | --- |
| Log 1 | 0x05 | 0x03 | Bit7-Bit4: DataRate Bit3-Bit0: TX Power | Redundancy Bit6-Bit4: Channel Mask Control Bit3-Bit0: NoReq |
| Log 2 | 0x05 | 0x03 | ChMask L | ChMask H |
| Log 3 | 0x05 | 0x03 | DataRate after setting | TxPower after setting |
| Log 4 | 0x05 | 0x03 | Status Bits (ACK) Bit2: Power ACK Bit1: DataRate ACK Bit0: Channel mask ACK | Bytes Passed |

Log 4, Byte 1 (Status Bits) Details:

Bits 7:3: Reserved

Bit 2: Power ACK

Bit 1: DataRate ACK

Bit 0: Channel mask ACK

2. RXParamSetupReq (Cmd ID: 0x05) — Total: 3 Logs

This command configures the downlink receiving parameters for the second window.

| Log Order | Byte 3 | Byte 2 | Byte 1 (Content) | Byte 0 (Content) |
| --- | --- | --- | --- | --- |
| Log 1 | 0x05 | 0x05 | RX1DRoffset | RX2DataRate |
| Log 2 | 0x05 | Freq | Freq [15:8] | Freq [7:0] |
| Log 3 | 0x05 | 0x05 | Status Bits (ACK) Bit2: RX2 DataRate ACK Bit1: RX1 DR offset ACK Bit0: Channel frequency ACK | Bytes Passed |

Log 3, Byte 0 (Status Bits) Details:

Bit 2: RX2 DataRate ACK

Bit 1: RX1 DR offset ACK

Bit 0: Channel frequency ACK

3. NewChannelReq (Cmd ID: 0x07) — Total: 3 Logs

Used to add or modify a specific radio channel frequency and data rate range.

| Log Order | Byte 3 | Byte 2 | Byte 1 (Content) | Byte 0 (Content) |
| --- | --- | --- | --- | --- |
| Log 1 | 0x05 | 0x07 | ChIndex | DrRange(Byte1: HighDR Byte0: LowDR) |
| Log 2 | 0x05 | Freq | Freq [15:8] | Freq [7:0] |
| Log 3 | 0x05 | 0x07 | Bit7-Bit2 Reserved Bit1 DR range ACK Bit0 Channel frequency ACK | Bytes Passed |

Log 1, Byte 0 (Status Bits) Details:

Bit 1: DR range ACK

Bit 0: Channel frequency ACK

4. DlChannelReq (Cmd ID: 0x0A) — Total: 3 Logs

Assigns a dedicated downlink frequency to a specific existing channel.

| Log Order | Byte 3 | Byte 2 | Byte 1 (Content) | Byte 0 (Content) |
| --- | --- | --- | --- | --- |
| Log 1 | 0x05 | 0x0A | 0 | ChIndex |
| Log 2 | 0x05 | Freq | Freq [15:8] | Freq [7:0] |
| Log 3 | 0x05 | 0x0A | Bit7-Bit2 Reserved Bit1 Uplink frequency ACK Bit0 Channel frequency ACK | Bytes Passed |

Log 1, Byte 0 (Status Bits) Details:

Bit 1: Uplink frequency ACK

Bit 0: Channel frequency ACK

RF Error Event Detail Table (PE 15, Byte 3 = 07 or 08)

When parsing the hexadecimal Record, if Byte 3 is 07 or 08, use this table to decode Byte 2:

| Byte 2 (Hex) | Error Category | Description of Failure |
| --- | --- | --- |
| 0x00 | Event Code | General LoRaWAN stack event error. |
| 0x01 | Initialize Error | Failure during the initial RF module setup. |
| 0x02 | Set Join Error | Failed to set parameters for the Join procedure. |
| 0x03 | Get Join Error | Failed to retrieve Join status or parameters. |
| 0x04 | Set Channel Plan Error | Error while configuring regional channel frequencies. |
| 0x05 | Get Channel Plan Error | Failed to read the current channel plan configuration. |
| 0x06 | Set Join Config Error | Error in configuring OTAA/ABP security keys. |
| 0x07 | Get Join Config Error | Failed to retrieve stored security/Join configurations. |
| 0x08 | Set Send Error | Error while preparing the transmission buffer. |
| 0x09 | Send Error | Most Common: The actual transmission failed. |
| 0x0A | Receive Error | Failure during the Rx1 or Rx2 receiving windows. |
| 0x0B | Internal Stack Error | Critical error within the LoRaWAN protocol stack. |
| 0x0C | Downlink Frame Error | Error occurred while receiving a downlink packet. |
| 0x0D | Downlink Parsed Error | Packet received but failed data parsing (See sub-codes below). |

Downlink Frame Structure

The reconstruction follows a "Header + Data Blocks" pattern. All entries in a single downlink sequence will share the same PE (15) and the same Byte 3 (0x09).

A. The Header Entry (First Log)

This entry acts as the metadata descriptor for the incoming packet.

| Byte | Field | Description |
| --- | --- | --- |
| Byte 3 | Event Index | Fixed at 0x09. |
| Byte 2 | Frame Control (FC) | Status of the frame (e.g., Confirmed vs. Unconfirmed). |
| Byte 1 | Sequence Number (SN) | The Downlink Frame Counter from the server. |
| Byte 0 | Length (L) | Total number of bytes in the WPayload. |

B. The Data Entries (Subsequent Logs)

Every entry following the header provides exactly 3 bytes of the payload until the total Length (L) is reached.

| Byte | Field | Content |
| --- | --- | --- |
| Byte 3 | Event Index | Fixed at 0x09. |
| Byte 2 | Data Segment 1 | Payload Byte [n] |
| Byte 1 | Data Segment 2 | Payload Byte [n+1] |
| Byte 0 | Data Segment 3 | Payload Byte [n+2] |

