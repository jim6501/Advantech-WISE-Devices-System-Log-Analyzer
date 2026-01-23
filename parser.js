(function (window) {
    const Parser = {
        // Shared Utilities
        utils: {
            hexToAscii: function (hex) {
                let str = '';
                for (let i = 0; i < hex.length; i += 2) {
                    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
                }
                return str;
            },

            parseIp: function (hex) {
                // Example: C0A80101 -> 192.168.1.1
                const p1 = parseInt(hex.substring(0, 2), 16);
                const p2 = parseInt(hex.substring(2, 4), 16);
                const p3 = parseInt(hex.substring(4, 6), 16);
                const p4 = parseInt(hex.substring(6, 8), 16);
                return `${p1}.${p2}.${p3}.${p4}`;
            },

            parseMac: function (hex) {
                // Example: 00D0C9CC0001 -> 00:D0:C9:CC:00:01
                return hex.match(/.{1,2}/g).join(':');
            },

            hexToBinary: function (hex) {
                return parseInt(hex, 16).toString(2).padStart(hex.length * 4, '0');
            },

            checkBit: function (val, bit) {
                return (val & (1 << bit)) !== 0;
            }
        },

        // Registry of parsers
        strategies: {},

        register: function (series, strategy) {
            this.strategies[series] = strategy;
        },

        parseLog: function (rawLogs, series) {
            const strategy = this.strategies[series];
            const parsedLogs = [];
            let metadata = {};

            if (!strategy) {
                console.error(`No parser strategy found for series: ${series}`);
                return { logs: [], metadata: {} };
            }

            // Extract generic metadata from the first log if available
            if (rawLogs.length > 0) {
                metadata = {
                    uid: rawLogs[0].UID,
                    mac: rawLogs[0].MAC
                };
            }

            rawLogs.forEach((log, index) => {
                // Common fields
                const entry = {
                    timestamp: log.TIM,
                    eventType: log.PE,
                    description: "Unknown Event",
                    details: "",
                    record: log.Record,
                    uid: log.UID,
                    mac: log.MAC,
                    info: null // Initialize info
                };

                // Strategy specific parsing
                try {
                    const result = strategy.parse(log.PE, log.Record, index, rawLogs);
                    if (result) {
                        entry.description = result.description || entry.description;
                        entry.details = result.details || entry.details;
                        entry.info = result.info || null; // Allow parser to set info
                    }
                } catch (e) {
                    console.warn(`Error parsing log index ${parsedLogs.length}:`, e);
                    entry.details = "Error parsing record: " + e.message;
                }

                // Auto-attach info from central registry if not set
                // Priority: Specific Product > Common
                const seriesDescriptions = this.EVENT_DESCRIPTIONS[series] || {};
                const commonDescriptions = this.EVENT_DESCRIPTIONS.common || {};

                if (!entry.info) {
                    const descTemplate = seriesDescriptions[log.PE] || commonDescriptions[log.PE];
                    if (typeof descTemplate === 'function') {
                        entry.info = descTemplate(log.Record); // Pass hex record
                    } else {
                        entry.info = descTemplate;
                    }
                }

                parsedLogs.push(entry);
            });

            return { logs: parsedLogs, metadata: metadata };
        },

        // Central registry for Event Descriptions (Tooltips)
        // Developers can add specific descriptions for each product series here.
        EVENT_DESCRIPTIONS: {
            common: {
                7: function (record) {
                    let action = parseInt(record.substring(0, 2), 16);
                    // Fallback logic for action location
                    if (action === 0) {
                        const lastByte = parseInt(record.substring(6, 8), 16);
                        if (lastByte >= 1 && lastByte <= 4) action = lastByte;
                    }

                    if (action === 3) {
                        return "手動斷電(或非人為斷電)";
                    }
                    return "System Start (Power On)\nLog recorded when device powers up.";
                },
                8: "Memory Status\nShows current memory usage statistics.",
                11: "Firmware Upgrade\nRecords a firmware update event with version details."
            },
            wifi: {
                15: "WiFi Event\nDetailed status change for Wireless module (Connect/Disconnect/RSSI)."
            },
            lora: {
                // Add LoRa specific event descriptions here
            },
            nbiot: {
                // Add NB-IoT specific event descriptions here
            },
            lan: {
                // Add LAN specific event descriptions here
            }
        }
    };

    window.parser = Parser;

})(window);
