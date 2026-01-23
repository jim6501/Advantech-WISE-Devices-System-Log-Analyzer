(function (window) {
    const NbiotParser = {
        parse: function (pe, record) {
            let description = "";
            let details = "";

            switch (pe) {
                case 1:
                    description = "Cellular Info";
                    details = this.parseCellularInfo(record);
                    break;
                case 12:
                    description = "Battery Status";
                    details = this.parseBattery(record);
                    break;
                case 13:
                    description = "Internal Config Error";
                    details = this.parseConfigError(record);
                    break;
                case 7:
                    description = "Power Action";
                    {
                        const val = parseInt(record, 16);
                        const actionMap = { 1: "Power on", 2: "System restart", 3: "Power off" };

                        const byte3 = parseInt(record.substring(0, 2), 16);
                        let finalAction = val;
                        if (val > 255 && byte3 > 0 && byte3 <= 3) {
                            finalAction = byte3;
                        }

                        details = `Action: ${actionMap[finalAction] || finalAction}`;
                    }
                    break;
                case 8:
                    description = "Memory Status";
                    {
                        const val = parseInt(record, 16);
                        const memMap = { 1: "IO full", 2: "IO overwrite", 3: "System overwrite" };
                        details = `Status: ${memMap[val] || val}`;
                    }
                    break;
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
                    const simpleMap = {
                        2: "Cellular CME Error",
                        3: "Communication WDT",
                        4: "Cloud File Upload",
                        5: "Cloud Data Push",
                        6: "Cellular CMS Error",
                        9: "Remote Access Success",
                        10: "Remote Access Fail",
                        14: "Internal Flash Error"
                    };
                    if (simpleMap[pe]) {
                        description = simpleMap[pe];
                        details = `Data: ${record}`;
                    }
            }
            return { description, details };
        },

        parseCellularInfo: function (record) {
            // Record string. "When PE value is 1, the Record string identifies the specific state"
            // Table has Codes 1-15.
            // Assuming Record is a hex string representing the integer code
            const code = parseInt(record, 16);
            const map = {
                1: "Modem Initial failed",
                2: "Get PIN status failed",
                3: "Set packet data protocol failed",
                4: "Set SMS service center address failed",
                5: "Registered",
                6: "Not registered",
                7: "RF reset",
                8: "RF module reset",
                9: "Unregistered timeout",
                10: "RF module not respond",
                11: "Attempting Registration",
                12: "Registration denied",
                13: "CEREG: Unknown",
                14: "Registered, roaming",
                15: "RF module manufacturer error"
            };
            return map[code] || `Unknown Code: ${code}`;
        },

        parseBattery: function (record) {
            // Table: No. 0-5
            const code = parseInt(record, 16);
            const map = {
                0: "RTC battery low",
                1: "Battery low",
                2: "Over-Temperature detected in Charge condition",
                3: "Over-Temperature detected in Discharge condition",
                4: "Internal Short is detected",
                5: "Full-charged condition reached"
            };
            return map[code] || `Unknown Code: ${code}`;
        },

        parseConfigError: function (record) {
            const val = parseInt(record, 16);
            const errors = [];
            const map = [
                "Device information", "Cellular setting", "User account setting", "Access control setting",
                "IO setting", "DI counter", "IO log setting", "Cloud setting",
                "File upload setting", "Private server setting", "System log setting", "Last address",
                "RS-485", "Modbus RTU", "System mark", "Paas setting"
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
        window.parser.register('nbiot', NbiotParser);
    } else {
        window.addEventListener('load', () => window.parser.register('nbiot', NbiotParser));
    }

})(window);
