// renderer.js
let logElement = document.getElementById('logOutput');

// Function to update the UI log area
function log(message) {
    const timestamp = new Date().toLocaleTimeString();
    logElement.innerHTML += `[${timestamp}] ${message}\n`;
    logElement.scrollTop = logElement.scrollHeight;
}

// Modal logic
const modal = document.getElementById('settingsModal');
const settingsIcon = document.getElementById('settingsIcon');
const closeButton = document.getElementsByClassName('close-button')[0];

settingsIcon.onclick = function() {
    modal.style.display = 'block';
}

closeButton.onclick = function() {
    modal.style.display = 'none';
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}


document.getElementById('selectFileButton').addEventListener('click', async () => {
    const filePath = await window.api.openFileDialog();
    if (filePath) {
        document.getElementById('dicomPath').value = filePath;
        const fileName = filePath.split('/').pop();
        document.getElementById('fileDisplay').textContent = `✓ ${fileName}`;
        document.getElementById('fileDisplay').classList.add('has-file');
        log(`✓ File Selected: ${filePath}`);
    }
});

document.getElementById('sendButton').addEventListener('click', async () => {
    const filePath = document.getElementById('dicomPath').value;
    const accessionNumber = document.getElementById('accessionNumber').value;
    const studyDescription = document.getElementById('studyDescription').value;
    
    if (!filePath || !accessionNumber || !studyDescription) {
        alert("⚠️ Please select a DICOM file and enter both Accession Number and Study Description.");
        return;
    }
    
    const routerConfig = {
        routerIP: document.getElementById('routerIP').value,
        routerPort: parseInt(document.getElementById('routerPort').value),
        routerAE: document.getElementById('routerAE').value,
        myAE: document.getElementById('myAE').value,
    };

    // Disable button during transfer
    const sendButton = document.getElementById('sendButton');
    const originalText = sendButton.textContent;
    sendButton.disabled = true;
    sendButton.textContent = '⏳ Transferring...';

    log(`\n╔═══════════════════════════════════════╗`);
    log(`║   DICOM TRANSFER INITIATED           ║`);
    log(`╚═══════════════════════════════════════╝`);
    log(`📋 Accession Number: ${accessionNumber}`);
    log(`📝 Study Description: ${studyDescription}`);
    log(`🎯 Target: ${routerConfig.routerAE}@${routerConfig.routerIP}:${routerConfig.routerPort}`);
    log(`📤 Sending C-STORE request...`);

    const result = await window.api.sendDicom({ 
        filePath, 
        routerConfig,
        accessionNumber,
        studyDescription
    });
    
    if (result.success) {
        log(`\n✅ SUCCESS: ${result.message}`);
        log(`╔═══════════════════════════════════════╗`);
        log(`║   TRANSFER COMPLETED SUCCESSFULLY    ║`);
        log(`╚═══════════════════════════════════════╝\n`);
    } else {
        log(`\n❌ ERROR: ${result.message}`);
        log(`╔═══════════════════════════════════════╗`);
        log(`║   TRANSFER FAILED                    ║`);
        log(`╚═══════════════════════════════════════╝\n`);
    }

    // Re-enable button
    sendButton.disabled = false;
    sendButton.textContent = originalText;
});

log('╔═══════════════════════════════════════╗');
log('║  SATUSEHAT DICOM Bridge v1.0         ║');
log('║  Application Ready                   ║');
log('╚═══════════════════════════════════════╝');
log('💡 Select a DICOM file to begin transfer\n');