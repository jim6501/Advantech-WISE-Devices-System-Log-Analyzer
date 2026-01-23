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

    function updateEventFilters(logs) {
        const types = new Set(logs.map(l => l.eventType));
        eventTypeFilter.innerHTML = '<option value="all">All Event Types</option>';
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type; // You might want to map PE number to name here if easier
            eventTypeFilter.appendChild(option);
        });
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

});
