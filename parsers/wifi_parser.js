(function (window) {
    const WifiParser = {
        parse: function (pe, record, index, allLogs) {
            let description = "";
            let details = "";

            switch (pe) {
                case 1:
                    description = "Wireless Connection";
                    details = "Connected MAC (Last 4): " + record;
                    break;
                case 2:
                    description = "Wireless Disconnection";
                    details = "Disconnected MAC (Last 4): " + record;
                    break;
                case 3:
                    description = "Communication WDT";
                    {
                        const idx = record.substring(0, 2); // Byte 3
                        const ipHex = record.substring(2);  // Bytes 0-2 (Actually needs 4 bytes usually, doc says Bytes 0-2 user IP?)
                        // Doc says: Byte 3: Index; Bytes 0-2: User IP. 
                        // Note: IPv4 is 4 bytes. If record is 8 chars (4 bytes), Byte 3 is index, Byte 2,1,0 are IP parts?
                        // Let's assume Standard IP is 4 bytes. If the record is 8 hex chars (4 bytes).
                        // If record is 01C0A801, Byte 3=01, Bytes 2-0=C0A801. 
                        // Wait, IP address usually needs 4 bytes. 
                        // Doc says "Bytes 0-2: User IP". This implies partial IP or non-standard.
                        // However, let's treat it as hex data for now.
                        details = `Index: ${idx}, User IP Data: ${record.substring(2)}`;
                    }
                    break;
                case 4:
                    description = "Cloud File Upload";
                    // Bytes 3-2: Index (0: IO, 1: Sys)
                    {
                        const idx = parseInt(record.substring(0, 4), 16);
                        details = `Index: ${idx === 0 ? 'I/O' : (idx === 1 ? 'System' : idx)}`;
                    }
                    break;
                case 15:
                    description = "RF Event";
                    // Check if previous log was Disconnect Info (0x05), if so, this is the SSID payload
                    if (index > 0 && allLogs && allLogs[index - 1]) {
                        const prevLog = allLogs[index - 1];
                        // Byte 3 (first 2 chars) of previous record should be 05
                        if (prevLog.PE === 15 && parseInt(prevLog.Record.substring(0, 2), 16) === 0x05) {
                            description = "RF Event";
                            const ssid = window.parser.utils.hexToAscii(record);
                            details = `Disconnect Info (SSID) SSID: "${ssid}"`;
                            // Return early with specific info
                            return { description, details, info: "Continuation of previous Disconnect Info event" };
                        }
                    }
                    details = this.parseWifiEvent(record, index, allLogs);
                    break;
                case 13:
                    description = "Config Table Error";
                    details = this.parseConfigError(record);
                    break;
                case 6: // SNTP
                    description = "SNTP Status";
                    {
                        const val = parseInt(record, 16);
                        const sntpMap = { 0: "No error", 1: "DNS error", 2: "No socket", 3: "No reply", 4: "Socket fatal" };
                        details = `Status: ${sntpMap[val] || val}`;
                    }
                    break;
                case 7:
                    description = "Power Action";
                    {
                        const val = parseInt(record, 16);
                        const actionMap = { 1: "Power on", 2: "System restart", 3: "Power off", 4: "CoreTask WDT timeout" };

                        const byte3 = parseInt(record.substring(0, 2), 16);
                        let finalAction = val;
                        if (val > 255 && byte3 > 0 && byte3 <= 4) {
                            finalAction = byte3;
                        }

                        details = `Action: ${actionMap[finalAction] || finalAction}`;
                    }
                    break;
                case 8:
                    description = "Memory Full/Overwrite";
                    {
                        const val = parseInt(record, 16);
                        const memMap = { 1: "IO full", 2: "IO overwrite", 3: "System overwrite" };
                        details = `Status: ${memMap[val] || val}`;
                    }
                    break;
                case 16: // P2P
                    description = "P2P Status";
                    {
                        const val = parseInt(record, 16);
                        const p2pMap = { 1: "Access control error", 2: "Password error", 3: "No QOS ACK" };
                        details = `Status: ${p2pMap[val] || val}`;
                    }
                    break;
                // ... Add other simple cases as per doc
                case 11:
                    description = "FW Upgrade";
                    {
                        const b3 = parseInt(record.substring(0, 2), 16);
                        const b2 = parseInt(record.substring(2, 4), 16);
                        const b1 = parseInt(record.substring(4, 6), 16);
                        const b0 = parseInt(record.substring(6, 8), 16);

                        const majorLet = b3.toString(16).toUpperCase();
                        const verMaj = (b2 >> 4).toString(16);
                        const verMinHigh = (b2 & 0x0F).toString(16);
                        const verMinLow = (b1 >> 4).toString(16);
                        const typeLet = (b1 & 0x0F).toString(16).toUpperCase();
                        const build = b0.toString(16).toUpperCase().padStart(2, '0');

                        details = `Version: ${majorLet}${verMaj}.${verMinHigh}${verMinLow} ${typeLet}${build}`;
                    }
                    break;
                default:
                    // Check common simple cases from doc
                    const simpleMap = {
                        9: "Remote Access Fail",
                        10: "Login Error",
                        12: "RTC Battery Low",
                        14: "Internal Flash Error",
                        17: "Webserver Utility",
                        18: "HW Error"
                    };
                    if (simpleMap[pe]) {
                        description = simpleMap[pe];
                        details = `Data: ${record}`;
                    }
            }

            return { description, details };
        },

        parseWifiEvent: function (record, index, allLogs) {
            // Byte 3 is event code. 
            const byte3 = parseInt(record.substring(0, 2), 16);
            const otherBytes = record.substring(2);

            switch (byte3) {
                case 0x01: return `WLAN disconnect. Reason: ${otherBytes}`;
                case 0x02: return `Unexpected event. Code: ${otherBytes}`;
                case 0x03: return `Unexpected socket. Code: ${otherBytes}`;
                case 0x04: return `Tx socket failed. Socket:${record.substring(2, 4)}, Reason:${record.substring(4)}`;
                case 0x05:
                    // Disconnect info.
                    // Byte 2: Profile[0], Byte 1: Priority, Byte 0: Name len
                    const profile = parseInt(record.substring(2, 4), 16);
                    const priority = parseInt(record.substring(4, 6), 16);
                    const nameLen = parseInt(record.substring(6, 8), 16);

                    return `Disconnect Info. Profile:${profile}, Priority:${priority}, Len:${nameLen}`;
                case 0x06:
                    const rssi = parseInt(record.substring(2, 4), 16);
                    const oldLvl = parseInt(record.substring(4, 6), 16);
                    const newLvl = parseInt(record.substring(6, 8), 16);
                    return `RSSI Change. Level: ${rssi}, Old: ${oldLvl}, New: ${newLvl}`;
                case 0x07: return `RSSI Histogram. Data: ${otherBytes}`;
                case 0x08: return `Unexpected WLAN policy. Policy:${record.substring(2, 4)}`;
                case 0x09:
                    const ip1 = parseInt(record.substring(2, 4), 16);
                    const ip2 = parseInt(record.substring(4, 6), 16);
                    const ip3 = parseInt(record.substring(6, 8), 16);
                    return `IP acquired. IP Data: ${ip3}.${ip2}.${ip1}`;
                case 0x0A: return `WLAN RF reset. Result: ${otherBytes}`;
                case 0x0B: return `Push connection fail. Error: ${otherBytes}`;
                case 0x0C: return `Upload connection fail. Error: ${otherBytes}`;
                case 0x0D: return `MQTT connection fail. Error: ${otherBytes}`;
                case 0x0E: return `Device RF fatal error. Sender:${record.substring(2, 4)}, Status:${record.substring(4)}`;
                case 0x0F: return `Device RF abort error. Type:${record.substring(2, 4)}, Data:${record.substring(4)}`;
                case 0x10:
                    const pErr = parseInt(record.substring(2, 4), 16);
                    return `Check ping error. Type:${pErr === 1 ? 'None' : (pErr === 2 ? 'Data error' : pErr)}, GatewayIP:${record.substring(6)}`; // Byte 0
                case 0x11: return `Net config error`;
                case 0x12: return `Connection list full`;
                case 0x13: return `Reboot interval timeout`;
                case 0x14:
                    const sType = parseInt(record.substring(2, 4), 16);
                    const sTypeMap = { 1: "Modbus", 2: "Cloud", 3: "SNTP", 4: "UDPCFG", 5: "P2P", 6: "WebServer" };
                    return `Socket connect. Type:${sTypeMap[sType] || sType}, ID:${record.substring(6)}`;
                case 0x15: return `Socket disconnect`;
                case 0x16:
                    const wMode = parseInt(record.substring(2, 4), 16);
                    const wAction = parseInt(record.substring(4, 6), 16);
                    const wModeMap = { 1: "Disassociate", 2: "Ping" };
                    const wActMap = { 0: "Reset", 1: "Reboot", 2: "Re-associate" };
                    return `RF WDT. Mode:${wModeMap[wMode] || wMode}, Action:${wActMap[wAction] || wAction}`;
                case 0x17: return `RF callback event. Code:${record.substring(2, 4)}`;
                case 0x18:
                    const mCode = parseInt(record.substring(4, 6), 16); // Byte 0
                    return `RF module msg. Code:${record.substring(2, 4)}, Status:${mCode === 1 ? 'Timeout' : (mCode === 2 ? 'Failure' : mCode)}`;
                case 0x19: return `RF module WiFi event. ID:${record.substring(2, 6)}`;
                default:
                    return `Event Code 0x${byte3.toString(16).toUpperCase().padStart(2, '0')}. Data: ${otherBytes}`;
            }
        },

        parseConfigError: function (record) {
            // Record is hex string. Convert to binary and check bits.
            // Doc: Bit Order 0-16.
            const val = parseInt(record, 16);
            const errors = [];
            const map = [
                "Device Info", "WiFi", "Network", "Access Control", "IO",
                "Modbus 0X", "Modbus 4X", "User Account", "Internal Buffer",
                "Analog Cal", "IO Log", "Cloud", "File Upload", "Private Server",
                "System Log", "Internal Buffer", "Tag Setting"
            ];

            for (let i = 0; i < map.length; i++) {
                if ((val & (1 << i)) !== 0) {
                    errors.push(map[i]);
                }
            }
            return errors.length ? "Errors: " + errors.join(", ") : "No Errors";
        }
    };

    // Register
    if (window.parser) {
        window.parser.register('wifi', WifiParser);
    } else {
        // Retry if parser not loaded yet (simple defer)
        window.addEventListener('load', () => window.parser.register('wifi', WifiParser));
    }

})(window);
