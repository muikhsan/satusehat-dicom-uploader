const path = require('path');
const { exec } = require('child_process');
const logger = require('./logger');

/**
 * Validates if a given file path points to a file with a .dcm extension
 * and if its content is a valid DICOM file using dcmdump.
 * @param {string} filePath - The path to the file to validate.
 * @returns {Promise<{isValid: boolean, message: string}>} - An object indicating validity and a message.
 */
async function validateDicomFile(filePath) {
    // 1. Check for .dcm extension
    if (path.extname(filePath).toLowerCase() !== '.dcm') {
        return { isValid: false, message: 'File does not have a .dcm extension.' };
    }

    // 2. Validate content using dcmdump
    // We run dcmdump and check its exit code. A non-zero exit code usually indicates an error,
    // meaning the file is not a valid DICOM file or is corrupted.
    const command = `dcmdump "${filePath}"`;
    logger.info(`Running DICOM content validation: ${command}`);

    try {
        await new Promise((resolve, reject) => {
            exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
                if (error) {
                    logger.warn(`dcmdump failed for ${filePath}: ${error.message}`);
                    logger.debug(`dcmdump stderr: ${stderr}`);
                    return reject(new Error('File content is not a valid DICOM format.'));
                }
                // If dcmdump runs without error, it's likely a valid DICOM file.
                logger.info(`dcmdump successfully processed ${filePath}`);
                resolve(stdout);
            });
        });
        return { isValid: true, message: 'File is a valid DICOM file with .dcm extension.' };
    } catch (e) {
        return { isValid: false, message: e.message };
    }
}

module.exports = { validateDicomFile };
