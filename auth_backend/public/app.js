// --- STATE MANAGEMENT ---
let captchaText = '';

// --- DOM ELEMENTS ---
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
// ... (add other element getters here for cleanliness)

// --- CAPTCHA LOGIC ---
function generateCaptcha() {
    const canvas = document.getElementById('captcha-canvas');
    const ctx = canvas.getContext('2d');
    captchaText = Math.random().toString(36).substring(2, 8).toUpperCase();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f0f2f5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "30px Arial";
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Add some distortion for effect
    for (let i = 0; i < captchaText.length; i++) {
        ctx.save();
        ctx.translate(25 + i * 20, canvas.height / 2);
        ctx.rotate((Math.random() - 0.5) * 0.4);
        ctx.fillText(captchaText[i], 0, 0);
        ctx.restore();
    }
}

// --- API CALLS & LOGIC ---
async function requestAuth() {
    const statusEl = document.getElementById('login-status');
    const authButton = document.getElementById('auth-button');
    const aadhaarNumber = document.getElementById('aadhaarNumber').value;
    const name = document.getElementById('name').value;
    const dob = document.getElementById('dob').value;
    const captchaInput = document.getElementById('captcha-input').value.toUpperCase();

    // --- Frontend Validation ---
    if (aadhaarNumber.length !== 12 || !/^\d+$/.test(aadhaarNumber)) {
        statusEl.innerText = 'Error: Aadhaar number must be 12 digits.';
        statusEl.className = 'failure';
        return;
    }

    if (captchaInput !== captchaText) {
        statusEl.innerText = 'Error: CAPTCHA does not match.';
        statusEl.className = 'failure';
        generateCaptcha(); // Regenerate for a new attempt
        return;
    }

    statusEl.innerText = 'Processing...';
    statusEl.className = '';
    authButton.disabled = true;

    const authData = {
        aadhaarNumber: aadhaarNumber,
        name: name,
        dob: dob
    };

    try {
        // --- The Corrected API Call ---
        const response = await fetch('/api/request-auth', {
            method: 'POST', // Explicitly set the method to POST
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(authData) // Send the data as a JSON string
        });

        const data = await response.json();

        if (response.ok) {
            statusEl.innerText = data.message;
            statusEl.className = 'success';

            if (data.role === 'authority') {
                loginView.style.display = 'none';
                dashboardView.style.display = 'block';
                getChain();
            } else {
                setTimeout(() => { 
                    statusEl.innerText = ''; 
                    statusEl.className = ''; 
                }, 3000);
                generateCaptcha();
            }
        } else {
            statusEl.innerText = `Error: ${data.error}`;
            statusEl.className = 'failure';
            generateCaptcha();
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        statusEl.innerText = 'Error: Could not connect to the server.';
        statusEl.className = 'failure';
    } finally {
        authButton.disabled = false;
    }
}

// --- DASHBOARD FUNCTIONS ---
function logout() {
    dashboardView.style.display = 'none';
    loginView.style.display = 'block';
    generateCaptcha();
}

async function getChain(filteredChain = null) {
    let chainToDisplay;

    if (filteredChain !== null) {
        // If data is passed directly (from search, could be an empty array), use it.
        chainToDisplay = filteredChain;
    } else {
        // Otherwise, fetch the full chain and skip the Genesis block.
        const response = await fetch('/api/get-chain');
        const fullChain = await response.json();
        chainToDisplay = fullChain.chain.slice(1);
    }
    
    const chainViewEl = document.getElementById('blockchain-view');
    chainViewEl.innerHTML = ''; // Clear previous view
    
    if (chainToDisplay.length === 0) {
        chainViewEl.innerHTML = "<p>No authentication events found.</p>";
        return;
    }

    // Display the newest blocks first by reversing the array
    chainToDisplay.reverse().forEach(block => {
        const blockCard = document.createElement('div');
        blockCard.className = 'block-card';
        
        blockCard.innerHTML = `
            <h4>Authentication Event</h4>
            <strong>Timestamp:</strong> ${new Date(block.timestamp).toLocaleString()}<br>
            <strong>Hashed UID:</strong> ${block.data.hashedUid.substring(0, 30)}...<br>
            <strong>Auth TXN ID:</strong> ${block.data.authTxnId}<br>
            <details>
                <summary>View Full Block Details</summary>
                <pre>${JSON.stringify(block, null, 2)}</pre>
            </details>
        `;
        chainViewEl.appendChild(blockCard);
    });
}

async function searchHistory() {
    const uidToSearch = document.getElementById('search-uid').value;
    if (!uidToSearch) {
        getChain(); // If search is empty, show the full chain
        return;
    }
    const response = await fetch(`/api/get-history/${uidToSearch}`);
    const historyData = await response.json();
    getChain(historyData); // Render the filtered results
}


// --- INITIALIZATION ---
window.onload = () => {
    generateCaptcha();
};