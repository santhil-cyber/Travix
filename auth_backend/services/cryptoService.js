const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load our private key once
const keyPath = path.join(__dirname, '../private-key.pem');
const privateKey = fs.readFileSync(keyPath, 'utf8');

/**
 * Creates a simple XML block mimicking the UIDAI PID block.
 */
function createPidXml(data) {
    // In a real scenario, this would be a much more complex XML structure.
    return `<AuthRequest uid="${data.uid}" tid="public">
  <Demo>
    <Pi name="${data.name}" dob="${data.dob}" />
  </Demo>
</AuthRequest>`;
}

/**
 * Signs any given data with our private key.
 */
function signData(dataToSign) {
    const signer = crypto.createSign('sha256');
    signer.update(dataToSign);
    signer.end();
    return signer.sign(privateKey, 'base64');
}

module.exports = { createPidXml, signData };