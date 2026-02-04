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
                            return { description, details };
                        }
                    }
                    const res = this.parseWifiEvent(record, index, allLogs);
                    if (typeof res === 'object') {
                        details = res.text;
                        if (res.info) {
                            // If info provided, return it
                            return { description, details, info: res.info };
                        }
                    } else {
                        // Fallback for string
                        details = res;
                    }
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

            let text = "";
            let info = null;

            switch (byte3) {
                case 0x01: text = `WLAN disconnect. Reason: ${otherBytes}`; break;
                case 0x02: text = `Unexpected event. Code: ${otherBytes}`; break;
                case 0x03: text = `Unexpected socket. Code: ${otherBytes}`; break;
                case 0x04: text = `Tx socket failed. Socket:${record.substring(2, 4)}, Reason:${record.substring(4)}`; break;
                case 0x05:
                    // Disconnect info.
                    // Byte 2: Profile[0], Byte 1: Priority, Byte 0: Name len
                    const profile = parseInt(record.substring(2, 4), 16);
                    const priority = parseInt(record.substring(4, 6), 16);
                    const nameLen = parseInt(record.substring(6, 8), 16);

                    text = `Disconnect Info. Profile:${profile}, Priority:${priority}, Len:${nameLen}`;
                    break;
                case 0x06:
                    const rssi = parseInt(record.substring(2, 4), 16);
                    const oldLvl = parseInt(record.substring(4, 6), 16);
                    const newLvl = parseInt(record.substring(6, 8), 16);
                    text = `RSSI Change. Level: ${rssi}, Old: ${oldLvl}, New: ${newLvl}`;
                    info = `RSSI Indicators from Old: ${oldLvl} changed to New: ${newLvl}`;
                    break;
                case 0x07: text = `RSSI Histogram. Data: ${otherBytes}`; break;
                case 0x08: text = `Unexpected WLAN policy. Policy:${record.substring(2, 4)}`; break;
                case 0x09:
                    const ip1 = parseInt(record.substring(2, 4), 16);
                    const ip2 = parseInt(record.substring(4, 6), 16);
                    const ip3 = parseInt(record.substring(6, 8), 16);
                    text = `IP acquired. IP Data: ${ip1}.${ip2}.${ip3}`;
                    break;
                case 0x0A: text = `WLAN RF reset. Result: ${otherBytes}`; break;
                case 0x0B: text = `Push connection fail. Error: ${otherBytes}`; break;
                case 0x0C: text = `Upload connection fail. Error: ${otherBytes}`; break;
                case 0x0D: text = `MQTT connection fail. Error: ${otherBytes}`; break;
                case 0x0E:
                    const errCode = otherBytes.toLowerCase();
                    if (errCode === "0bffad") {
                        text = "Device RF fatal error (0BFFAD)";
                        info = "The error code 0bffad is defined as DHCP Server related. It is recommended that the customer use the BSSID binding feature to lock the device to a specific AP MAC address. This is particularly useful in environments where multiple APs share the same SSID, as it prevents the WISE device from roaming to a different AP and causing DHCP IP assignment issues.";
                    } else if (errCode === "05ff93") {
                        text = "Device RF fatal error (05FF93)";
                        info = "The error code 05ff93 is defined as a wrong password issue. The primary recommendation is to first verify the stability of the signal strength to prevent the device from being repeatedly disconnected by the AP, which would cause instability between the WISE device and the AP requiring RF Reset actions. This will also help avoid the occasional occurrence of the 05ff93 error.";
                    } else if (errCode === "05ff9a") {
                        text = "Device RF fatal error (05FF9A)";
                        info = "The error code 05ff9a causes connection instability. Currently, the only solution is to use the FW workaround mechanism. This mechanism primarily involves the FW automatically performing an RF Reset when the device experiences a disconnection (as shown in Flowchart 3-1). If the device is unable to re-establish a connection with the AP, a Reboot Interval can be configured (as shown in Flowcharts 3-2 & 4). When the system enters a System Reboot, it serves as the final software defense line. (Generally, regardless of whether the reboot is triggered manually by power cycling or by the system, the WISE device will have a more stable connection with the AP after the reboot.)";
                    } else {
                        text = `Device RF fatal error. Sender:${record.substring(2, 4)}, Status:${record.substring(4)}`;
                        info = "Refer to File Server's RF Fatal Error Log Analysis and Handling Method (FAQ_WISE-4000 System Log RF Fatal Error Analysis and Handling Scheme)";
                    }
                    break;
                case 0x0F: text = `Device RF abort error. (${record.substring(4)})`; break;
                case 0x10:
                    const pErr = parseInt(record.substring(2, 4), 16);
                    text = `Check ping error. GatewayIP:${record.substring(6)}`; // Byte 0
                    info = "Refer to step 2-1 of the disconnection flowchart: Generate a Ping Error log (WISE failed to ping the GW).";
                    break;
                case 0x11: text = `Net config error`; break;
                case 0x12: text = `Connection list full`; break;
                case 0x13: text = `Reboot interval timeout`;
                    info = "Refer to step 3-3 of the Disconnection Flowchart: WISE FW instructs the MCU to perform an RF Reset at intervals of 15s, 30s, ... < N min. (Simultaneously, the system determines if the RF Reset Time has reached the manually configured N min limit.)";
                    break;
                case 0x14:
                    const sType = parseInt(record.substring(2, 4), 16);
                    const sTypeMap = { 1: "Modbus", 2: "Cloud", 3: "SNTP", 4: "UDPCFG", 5: "P2P", 6: "WebServer" };
                    text = `Socket connect. Type:${sTypeMap[sType] || sType}, ID:${record.substring(6)}`;
                    break;
                case 0x15: text = `Socket disconnect`; break;
                case 0x16:
                    const wMode = parseInt(record.substring(2, 4), 16);
                    const wAction = parseInt(record.substring(4, 6), 16);
                    const wModeMap = { 1: "Disassociate", 2: "Ping" };
                    const wActMap = { 0: "Reset", 1: "Reboot", 2: "Re-associate" };
                    text = `RF WDT. Mode:${wModeMap[wMode] || wMode}, Action:${wActMap[wAction] || wAction}`;
                    break;
                case 0x17: text = `RF callback event. Code:${record.substring(2, 4)}`; break;
                case 0x18:
                    const mCode = parseInt(record.substring(4, 6), 16); // Byte 0
                    text = `RF module msg. Code:${record.substring(2, 4)}, Status:${mCode === 1 ? 'Timeout' : (mCode === 2 ? 'Failure' : mCode)}`;
                    break;
                case 0x19: text = `RF module WiFi event. ID:${record.substring(2, 6)}`; break;
                default:
                    text = `Event Code 0x${byte3.toString(16).toUpperCase().padStart(2, '0')}. Data: ${otherBytes}`;
            }
            return { text: text, info: info };
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
