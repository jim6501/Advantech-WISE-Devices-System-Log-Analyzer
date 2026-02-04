document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const productSeriesSelect = document.getElementById('product-series');
    const exportBtn = document.getElementById('export-btn');
    const showFlowBtn = document.getElementById('show-flow-btn');
    const clearBtn = document.getElementById('clear-btn');
    const logTableBody = document.getElementById('log-body');
    const emptyState = document.getElementById('empty-state');
    const deviceUidSpan = document.getElementById('device-uid');
    const deviceMacSpan = document.getElementById('device-mac');
    const uidDisplayContainer = document.getElementById('uid-display-container');
    const eventTypeFilter = document.getElementById('event-type-filter');
    const searchFilter = document.getElementById('search-filter');

    // Modal Elements
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-image');
    const closeModal = document.getElementById('close-modal');

    let currentLogs = []; // Stores the parsed logs
    let currentRawLogs = []; // Stores the raw JSON

    // --- Event Listeners ---

    // File Input
    fileInput.addEventListener('change', handleFileSelect);

    // Drop Zone
    // Drop Zone Events
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // Product Series Change - Re-parse if logs exist & Toggle Flow Button
    productSeriesSelect.addEventListener('change', () => {
        const series = productSeriesSelect.value;

        // Show/Hide Disconnection Flow Button
        // Enable/Disable Disconnection Flow Button
        if (series === 'wifi') {
            showFlowBtn.disabled = false;
        } else {
            showFlowBtn.disabled = true;
        }

        // Clear results on switch
        clearBtn.click();
    });

    // Show Flow Button Click
    showFlowBtn.addEventListener('click', () => {
        modal.classList.add('show');
        modal.style.display = 'flex'; // Explicitly set flex for centering
        // Path relative to index.html
        modalImg.src = 'doc/WISE-4000 Disconnection Flow.png';
    });

    // Close Modal
    closeModal.addEventListener('click', () => {
        modal.classList.remove('show');
        modal.style.display = 'none';
    });

    // Close Modal on Outside Click
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
        }
    });

    // Clear Button
    clearBtn.addEventListener('click', () => {
        currentLogs = [];
        currentRawLogs = [];
        renderTable();
        exportBtn.disabled = true;
        clearBtn.disabled = true;
        fileInput.value = '';
        uidDisplayContainer.classList.add('hidden');
        document.getElementById('drop-zone-text').textContent = 'Click or Drag log file';
    });

    // Export CSV
    exportBtn.addEventListener('click', exportToCSV);

    // Filters
    eventTypeFilter.addEventListener('change', renderTable);
    searchFilter.addEventListener('input', renderTable);


    // --- File Handling ---

    function handleFileSelect(e) {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    }

    function handleFile(file) {
        document.getElementById('drop-zone-text').textContent = file.name;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const json = JSON.parse(content);

                if (json.LogMsg && Array.isArray(json.LogMsg)) {
                    currentRawLogs = json.LogMsg;
                    processLogs(json.LogMsg);
                    exportBtn.disabled = false;
                    clearBtn.disabled = false;
                } else {
                    alert('Invalid Log Format: "LogMsg" array not found.');
                }
            } catch (err) {
                console.error(err);
                alert('Error parsing JSON file. Please check the file format.');
            }
        };
        reader.readAsText(file);
    }

    function processLogs(rawLogs) {
        const series = productSeriesSelect.value;
        const parsedResults = window.parser.parseLog(rawLogs, series);

        currentLogs = parsedResults.logs;

        // Update Info
        if (parsedResults.metadata) {
            deviceUidSpan.textContent = parsedResults.metadata.uid || 'N/A';
            deviceMacSpan.textContent = parsedResults.metadata.mac || 'N/A';
            uidDisplayContainer.classList.remove('hidden');
        }

        // Update Filters
        updateEventFilters(currentLogs);

        renderTable();
    }

    // --- Highlighting Logic ---
    let activeHighlights = []; // Format: { type: 'eventType'|'description', value: '...', colorIndex: 0-4 }
    const MAX_HIGHLIGHTS = 5;

    const highlightArea = document.getElementById('highlight-area');
    const highlightTypeSelect = document.getElementById('highlight-type');
    const highlightInput = document.getElementById('highlight-input');
    const addHighlightBtn = document.getElementById('add-highlight-btn');
    const clearHighlightBtn = document.getElementById('clear-highlight-btn');
    const highlightTagsContainer = document.getElementById('highlight-tags');
    const highlightErrorMsg = document.getElementById('highlight-error');
    const highlightSuggestions = document.getElementById('highlight-suggestions');

    addHighlightBtn.addEventListener('click', addHighlight);
    clearHighlightBtn.addEventListener('click', clearHighlights);
    highlightTypeSelect.addEventListener('change', updateHighlightSuggestions);
    // Bind enter key on input
    highlightInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addHighlight();
    });

    function clearHighlights() {
        activeHighlights = [];
        highlightErrorMsg.classList.add('hidden');
        renderHighlightsUI();
        renderTable();
    }


    function addHighlight() {
        const type = highlightTypeSelect.value;
        let value = highlightInput.value.trim();

        if (!value) return;

        // If type is PE, user might select "15: WiFi Event". Extract "15".
        // Regex looks for "Number: " at start? Or just split by ":"
        if (type === 'eventType') {
            const match = value.match(/^(\d+):/);
            if (match) {
                value = match[1];
            }
        }

        if (activeHighlights.length >= MAX_HIGHLIGHTS) {
            highlightErrorMsg.classList.remove('hidden');
            return;
        }

        // Check duplicate
        if (activeHighlights.some(h => h.type === type && h.value.toLowerCase() === value.toLowerCase())) {
            alert('This highlight already exists!');
            return;
        }

        activeHighlights.push({
            type: type,
            value: value,
            colorIndex: activeHighlights.length
        });

        highlightInput.value = '';
        highlightErrorMsg.classList.add('hidden');
        renderHighlightsUI();
        renderTable();
    }

    // Expose remove function globally or bind in render
    window.removeHighlight = function (index) {
        activeHighlights.splice(index, 1);
        highlightErrorMsg.classList.add('hidden');
        renderHighlightsUI();
        renderTable();
    };

    function renderHighlightsUI() {
        highlightTagsContainer.innerHTML = '';
        activeHighlights.forEach((h, index) => {
            const tag = document.createElement('div');
            tag.className = 'highlight-tag';
            tag.classList.add(`row-highlight-${index}`);

            tag.innerHTML = `
                <span>${h.type === 'eventType' ? 'PE' : 'Details'}: ${h.value}</span>
                <span class="remove-btn" onclick="window.removeHighlight(${index})">×</span>
            `;
            highlightTagsContainer.appendChild(tag);
        });
    }

    function updateHighlightSuggestions() {
        const type = highlightTypeSelect.value;
        const suggestions = new Set();

        if (type === 'eventType') {
            // Create map of PE -> Description
            const peMap = {};
            currentLogs.forEach(log => {
                if (!peMap[log.eventType]) {
                    peMap[log.eventType] = log.description; // Capture first description found
                }
            });

            // Format: "15: WiFi Event"
            Object.keys(peMap).sort((a, b) => a - b).forEach(pe => {
                suggestions.add(`${pe}: ${peMap[pe]}`);
            });

        } else if (type === 'details') {
            currentLogs.forEach(log => {
                if (log.details) suggestions.add(log.details);
            });
        }

        highlightSuggestions.innerHTML = '';
        Array.from(suggestions).sort().forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            highlightSuggestions.appendChild(opt);
        });
    }

    function updateEventFilters(logs) {
        const types = new Set(logs.map(l => l.eventType));
        eventTypeFilter.innerHTML = '<option value="all">All Event Types</option>';
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type; // You might want to map PE number to name here if easier
            eventTypeFilter.appendChild(option);
        });

        // Also update highlight suggestions
        updateHighlightSuggestions();
        // Show highlight area
        highlightArea.classList.remove('hidden');
    }

    function renderTable() {
        logTableBody.innerHTML = '';

        const filterType = eventTypeFilter.value;
        const searchText = searchFilter.value.toLowerCase();

        const filteredLogs = currentLogs.filter(log => {
            const matchesType = filterType === 'all' || log.eventType == filterType; // soft match for number/string
            const matchesSearch = log.description.toLowerCase().includes(searchText) ||
                log.details.toLowerCase().includes(searchText) ||
                log.record.toLowerCase().includes(searchText);
            return matchesType && matchesSearch;
        });

        if (filteredLogs.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');

            filteredLogs.forEach((log, index) => {
                const tr = document.createElement('tr');

                // Check Highlighting
                // We re-calculate colorIndex based on current activeHighlights order
                activeHighlights.forEach((h, hIndex) => {
                    let match = false;
                    if (h.type === 'eventType') {
                        // Compare as string/number loose match
                        if (String(log.eventType) === String(h.value)) match = true;
                    } else if (h.type === 'details') {
                        if (log.details.toLowerCase().includes(h.value.toLowerCase())) match = true;
                    }

                    if (match) {
                        tr.classList.add(`row-highlight-${hIndex}`);
                        // Priority? Last one wins or first one? CSS will execute in order. 
                        // But usually we just want one color. The loop continues, so later tags might overwrite if !important used? 
                        // Yes, !important is in CSS. So multiple classes => last one defined in CSS wins or last applied?
                        // Let's assume one match is typical.
                    }
                });

                const infoCell = log.info
                    ? `<span class="info-icon" data-tooltip="${log.info.replace(/"/g, '&quot;')}">!</span>`
                    : '';

                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${formatDate(log.timestamp)}</td>
                    <td>${log.eventType}</td>
                    <td>${log.description}</td>
                    <td>${log.details}</td>
                    <td class="raw-record">${log.record}</td>
                    <td>${infoCell}</td>
                `;
                logTableBody.appendChild(tr);
            });
        }
    }

    function formatDate(isoString) {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) {
                return isoString; // Return raw string if parsing fails
            }
            return date.toLocaleString();
        } catch (e) {
            return isoString;
        }
    }

    function exportToCSV() {
        if (!currentLogs.length) return;

        const headers = ['Timestamp', 'Event Type', 'Description', 'Details', 'Raw Record', 'UID', 'MAC'];
        const rows = currentLogs.map(log => [
            log.timestamp,
            log.eventType,
            `"${log.description.replace(/"/g, '""')}"`, // Escape quotes
            `"${log.details.replace(/"/g, '""')}"`,
            log.record,
            log.uid,
            log.mac
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'system_log_export.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Initial check for button state
    // Initial check for button state
    if (productSeriesSelect.value === 'wifi') {
        showFlowBtn.disabled = false;
    } else {
        showFlowBtn.disabled = true;
    }

    // --- Global Tooltip Implementation ---
    const tooltip = document.createElement('div');
    tooltip.className = 'global-tooltip';
    document.body.appendChild(tooltip);

    // Event Delegation for Tooltips
    document.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('info-icon')) {
            const text = e.target.getAttribute('data-tooltip');
            if (text) {
                tooltip.textContent = text;
                tooltip.style.display = 'block';

                const iconRect = e.target.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();

                // Default: Position to the right, top aligned with icon
                let top = iconRect.top;
                let left = iconRect.right + 10; // 10px gap

                // Check if it fits on the right
                if (left + tooltipRect.width > window.innerWidth - 20) {
                    // Flip to left
                    left = iconRect.left - tooltipRect.width - 10;
                }

                // Check if it fits on the bottom (vertical check)
                // If it goes off screen bottom, move it up
                if (top + tooltipRect.height > window.innerHeight - 10) {
                    top = window.innerHeight - tooltipRect.height - 10;
                }
                // Check top boundary (unlikely with top-alignment strategy unless icon is off screen, but good to have)
                if (top < 10) {
                    top = 10;
                }

                tooltip.style.top = `${top}px`;
                tooltip.style.left = `${left}px`;
            }
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.classList.contains('info-icon')) {
            tooltip.style.display = 'none';
        }
    });

    // Remove tooltip on scroll to prevent detached floating
    window.addEventListener('scroll', () => {
        tooltip.style.display = 'none';
    }, true); // Capture phase to catch table scrolls

});
