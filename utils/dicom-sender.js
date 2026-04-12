const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const dcmjsDimse = require('dcmjs-dimse');
const logger = require('./logger');
const { validateDicomFile } = require('./dicom-validator'); // Import validator

const { Client, Status } = dcmjsDimse;
const { CStoreRequest } = dcmjsDimse.requests;

// Minimum allowed date for SatuSehat API (June 3, 2014)
const MIN_ALLOWED_DATE = new Date('2014-06-03');

/**
 * Sanitizes a string for safe inclusion in a shell command.
 * Allows only alphanumeric characters, spaces, and hyphens.
 * This is a critical security measure to prevent command injection.
 * @param {string} input - The string to sanitize.
 * @returns {string} The sanitized string.
 */
function sanitizeInput(input) {
    if (!input) return '';
    // Allow letters, numbers, spaces, and hyphens. Replace anything else with an empty string.
    return input.replace(/[^a-zA-Z0-9\s-]/g, '');
}

function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                error.stderr = stderr;
                return reject(error);
            }
            resolve(stdout);
        });
    });
}

/**
 * Extracts the Study Date (0008,0020) from a DICOM file using dcmdump.
 * @param {string} filePath - Path to the DICOM file.
 * @returns {Promise<string|null>} Study Date in YYYYMMDD format or null if not found.
 */
async function extractStudyDate(filePath) {
    try {
        const command = `dcmdump +P "0008,0020" "${filePath}"`;
        const output = await runCommand(command);
        
        // Parse dcmdump output - looking for line like: (0008,0020) DA [19941013]
        const match = output.match(/\(0008,0020\)\s+DA\s+\[([0-9]+)\]/);
        if (match && match[1]) {
            return match[1].trim();
        }
        return null;
    } catch (error) {
        logger.warn(`Failed to extract study date from ${filePath}: ${error.message}`);
        return null;
    }
}

/**
 * Parses a DICOM date (YYYYMMDD format) and returns a Date object.
 * @param {string} dicomDate - Date string in YYYYMMDD format.
 * @returns {Date|null} Parsed date or null if invalid.
 */
function parseDicomDate(dicomDate) {
    if (!dicomDate || dicomDate.length < 8) return null;
    
    const year = parseInt(dicomDate.substring(0, 4));
    const month = parseInt(dicomDate.substring(4, 6)) - 1; // JS months are 0-indexed
    const day = parseInt(dicomDate.substring(6, 8));
    
    const date = new Date(year, month, day);
    
    // Validate the date is real
    if (isNaN(date.getTime())) return null;
    
    return date;
}

/**
 * Formats a Date object to DICOM date format (YYYYMMDD).
 * @param {Date} date - JavaScript Date object.
 * @returns {string} Date in YYYYMMDD format.
 */
function formatDicomDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * Sends a DICOM file to the configured SCP (SATUSEHAT DICOM Router).
 * @param {string} filePath - Path to the local DICOM file.
 * @param {object} routerConfig - Contains {routerIP, routerPort, routerAE, myAE}.
 * @param {string} accessionNumber - The Accession Number to inject.
 * @param {string} studyDescription - The Study Description to inject.
 */
async function sendDicomToRouter(filePath, routerConfig, accessionNumber, studyDescription) {
    // 1. Validate the file before processing
    const validationResult = await validateDicomFile(filePath);
    if (!validationResult.isValid) {
        logger.error(`File validation failed for ${filePath}: ${validationResult.message}`);
        return { success: false, message: `File validation failed: ${validationResult.message}` };
    }
    
    const { routerIP, routerPort, routerAE, myAE } = routerConfig;
    
    logger.info(`Starting C-STORE request for file: ${filePath}`);
    logger.debug(`Target: ${routerAE}@${routerIP}:${routerPort} | Source: ${myAE}`);

    let tempFilePath = null;
    try {
        // 2. Sanitize inputs
        const sanitizedAccession = sanitizeInput(accessionNumber);
        const sanitizedStudyDesc = sanitizeInput(studyDescription);

        // 3. Create a temporary path and copy the original file to it
        tempFilePath = path.join(os.tmpdir(), `dicom-bridge-${Date.now()}.dcm`);
        fs.copyFileSync(filePath, tempFilePath);
        logger.info(`Created temporary file for modification: ${tempFilePath}`);

        // 3a. Extract and validate Study Date - correct if before minimum allowed date
        const studyDateStr = await extractStudyDate(tempFilePath);
        if (studyDateStr) {
            const studyDate = parseDicomDate(studyDateStr);
            if (studyDate && studyDate < MIN_ALLOWED_DATE) {
                const correctedDate = formatDicomDate(MIN_ALLOWED_DATE);
                logger.warn(`Study Date ${studyDateStr} is before minimum allowed date (2014-06-03). Correcting to ${correctedDate}.`);
                
                // Modify the study date to the minimum allowed date
                const dateFixCommand = `dcmodify -m "(0008,0020)=${correctedDate}" "${tempFilePath}"`;
                await runCommand(dateFixCommand);
                logger.info(`Study Date corrected to ${correctedDate}.`);
            } else {
                logger.info(`Study Date ${studyDateStr} is valid.`);
            }
        } else {
            logger.warn('Study Date not found in DICOM file. Proceeding without date validation.');
        }

        // 4. Construct and execute the dcmodify command with sanitized data
        const command = `dcmodify -m "(0008,0050)=${sanitizedAccession}" -m "(0008,1030)=${sanitizedStudyDesc}" "${tempFilePath}"`;
        logger.info(`Executing dcmtk command: ${command}`);
        
        await runCommand(command);
        logger.info('dcmodify successfully injected tags.');

        // 5. Create the C-STORE request
        const request = new CStoreRequest(tempFilePath);
        
        const client = new Client();
        
        let response;
        try {
            response = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('DICOM C-STORE request timed out after 30 seconds.'));
                }, 30000); // 30-second timeout

                request.on('response', (res) => {
                    clearTimeout(timeout);
                    resolve(res);
                });

                client.addRequest(request);
                
                client.send(routerIP, routerPort, myAE, routerAE);
                
                client.on('networkError', (e) => {
                    clearTimeout(timeout);
                    reject(e);
                });
                client.on('closed', () => logger.debug('DICOM association closed.'));
            });
        } catch (e) {
            // This will catch network errors or timeouts
            const errorMsg = `DICOM Network Error: ${e.message}`;
            logger.error(errorMsg, e);
            return { success: false, message: errorMsg };
        }

        // We should get a response object here, but we double-check
        if (!response) {
            const errorMsg = 'C-STORE operation did not receive a response from the server.';
            logger.error(errorMsg);
            return { success: false, message: errorMsg };
        }
        
        // Check status from the response's command dataset
        // Status code 0x0000 (0) means Success in DICOM
        let statusCode = null;
        try {
            if (response.commandDataset && response.commandDataset.elements) {
                statusCode = response.commandDataset.elements.Status;
            }
        } catch (e) {
            logger.error('Failed to extract status from response', e);
        }
        
        logger.debug(`C-STORE Response Status Code: ${statusCode}`);
        
        // Status code 0x0000 (0) means Success in DICOM
        if (statusCode === 0) {
            logger.success(`DICOM C-STORE successful! Status Code: 0x${statusCode.toString(16).toUpperCase().padStart(4, '0')}`);
            return { success: true, message: 'DICOM successfully stored on Router.' };
        }
        
        // Handle C-STORE failure cases
        const statusHex = statusCode !== null ? `0x${statusCode.toString(16).toUpperCase().padStart(4, '0')}` : 'N/A';
        const statusMsg = `C-STORE Failed with Status Code: ${statusHex}`;
        logger.error(statusMsg);
        return { success: false, message: statusMsg };
        
    } catch (e) {
        // Catch any other unhandled errors during the process
        const errorMsg = e.message ? e.message : 'An unknown DICOM processing error occurred.';
        logger.error(`Unhandled DICOM Error: ${errorMsg}`, e);
        return { success: false, message: `DICOM Processing Error: ${errorMsg}` };
    } finally {
        // Clean up the temporary file
        if (tempFilePath) {
            try {
                fs.unlinkSync(tempFilePath);
                logger.info(`Cleaned up temporary file: ${tempFilePath}`);
            } catch (cleanupError) {
                logger.error(`Failed to clean up temporary file: ${tempFilePath}`, cleanupError);
            }
        }
    }
}

module.exports = { sendDicomToRouter };
