(function (window) {
    const LanParser = {
        parse: function (pe, record) {
            let description = "";
            let details = "";

            switch (pe) {
                case 1:
                    description = "TCP Connection";
                    details = `Data: ${record}`;
                    // Byte 3-2: Type (00: TCP); Byte 1: Error item; Byte 0: Content
                    break;
                case 3:
                    description = "Communication WDT";
                    details = `Data: ${record}`;
                    break;
                case 13:
                    description = "Config Table Error";
                    // Uses same bit order as WiFi usually, or Section 3 specific
                    // Doc says "See Section 3". Section 3 has "Internal Configuration Error Bit Order (PE 13)"
                    details = this.parseConfigError(record);
                    break;
                case 7:
                    description = "Power Action";
                    {
                        const val = parseInt(record, 16);
                        const actionMap = { 1: "Power on", 2: "System restart", 3: "Power off" };

                        // Check for byte 3 variant just in case (similar to WiFi safety check)
                        const byte3 = parseInt(record.substring(0, 2), 16);
                        let finalAction = val;
                        if (val > 255 && byte3 > 0 && byte3 <= 3) {
                            finalAction = byte3;
                        }

                        details = `Action: ${actionMap[finalAction] || finalAction}`;
                    }
                    break;
                case 8: // Log Mem State
                    description = "Log Memory State";
                    {
                        const val = parseInt(record, 16);
                        const memMap = { 1: "IO full", 2: "IO overwrite", 3: "System overwrite" };
                        details = `Status: ${memMap[val] || val}`;
                    }
                    break;
                case 13:
                    description = "Config Table Error";
                // Uses same bit order as WiFi usually, or Section 3 specific
                // Doc says "See Section 3". Section 3 has "Internal Configuration Error Bit Order (PE 13)"
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
                case 13:
                    description = "Config Table Error";
                    // Uses same bit order as WiFi usually, or Section 3 specific
                    // Doc says "See Section 3". Section 3 has "Internal Configuration Error Bit Order (PE 13)"
                    details = this.parseConfigError(record);
                    break;
                default:
                    const simpleMap = {
                        4: "Cloud File Upload",
                        5: "Cloud Data Push",
                        6: "SNTP",
                        9: "Remote Access Fail",
                        10: "Login Error",
                        12: "RTC Battery Low",
                        14: "Flash Access Error"
                    };
                    if (simpleMap[pe]) {
                        description = simpleMap[pe];
                        details = `Data: ${record}`;
                    }
            }
            return { description, details };
        },

        parseConfigError: function (record) {
            const val = parseInt(record, 16);
            const errors = [];
            const map = [
                "Device Information", "Wifi Setting", "Network Setting", "Access Control Setting",
                "IO Setting", "Modbus 0X Address", "Modbus 4X Address", "User Account Setting",
                "Internal Buffer", "Analog Calibration Value", "IO Log Setting", "Cloud Setting",
                "File Upload Setting", "Private Server Setting", "System Log Setting",
                "Internal Buffer", "File Upload Tag Setting"
            ];

            for (let i = 0; i < map.length; i++) {
                if ((val & (1 << i)) !== 0) {
                    errors.push(map[i]);
                }
            }
            return errors.length ? "Errors: " + errors.join(", ") : "No Errors";
        }
    };

    if (window.parser) {
        window.parser.register('lan', LanParser);
    } else {
        window.addEventListener('load', () => window.parser.register('lan', LanParser));
    }

})(window);
