const express = require('express');
const cors = require('cors');
const authController = require('./controllers/authController.js');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// Serve files from the 'public' directory
app.use(express.static('public'));

// Define the API routes
app.post('/api/request-auth', authController.handleAuthRequest);
app.get('/api/get-chain', authController.getChain);
app.get('/api/get-history/:uid', authController.getHistory);

app.listen(port, () => {
    console.log(`Aadhaar Professional Demo server running at http://localhost:${port}`);
});