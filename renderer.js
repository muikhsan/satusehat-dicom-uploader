// renderer.js
let logElement = document.getElementById('logOutput');

// Function to update the UI log area
function log(message) {
    const timestamp = new Date().toLocaleTimeString();
    logElement.innerHTML += `[${timestamp}] ${message}\n`;
    logElement.scrollTop = logElement.scrollHeight;
}

document.getElementById('selectFileButton').addEventListener('click', async () => {
    const filePath = await window.api.openFileDialog();
    if (filePath) {
        document.getElementById('dicomPath').value = filePath;
        log(`File Selected: ${filePath}`);
    }
});

document.getElementById('sendButton').addEventListener('click', async () => {
    const filePath = document.getElementById('dicomPath').value;
    const accessionNumber = document.getElementById('accessionNumber').value;
    const studyDescription = document.getElementById('studyDescription').value;
    
    if (!filePath || !accessionNumber || !studyDescription) {
        alert("Please select a DICOM file and enter an Accession Number and Study Description.");
        return;
    }
    
    const routerConfig = {
        routerIP: document.getElementById('routerIP').value,
        routerPort: parseInt(document.getElementById('routerPort').value),
        routerAE: document.getElementById('routerAE').value,
        myAE: document.getElementById('myAE').value,
    };

    log(`--- EXECUTE DICOM TRANSFER ---`);
    log(`SIMRS Order Key (Accession): ${accessionNumber}`);
    log(`Target: ${routerConfig.routerAE}@${routerConfig.routerIP}:${routerConfig.routerPort}`);

    const result = await window.api.sendDicom({ 
        filePath, 
        routerConfig,
        accessionNumber,
        studyDescription
    });
    
    if (result.success) {
        log(`[SIMRS Integration] STATUS: ${result.message}`);
    } else {
        log(`[SIMRS Integration] ERROR: ${result.message}`);
    }
    log(`--- TRANSFER COMPLETE ---`);
});

// Acknowledge the use of the preload script for context
log('Application ready. Use "Login" to validate SATUSEHAT credentials.');
// In a real application, you would set up a pipe to receive logs from main.js/logger.js