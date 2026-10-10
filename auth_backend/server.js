const express = require('express');
const cors = require('cors');
const authController = require('./controllers/authController.js');

let chatHandler;
try {
    chatHandler = require('../api/chat.js');
} catch (e) {
    chatHandler = null;
}

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Define the API routes
app.post('/api/request-auth', authController.handleAuthRequest);
app.get('/api/get-chain', authController.getChain);
app.get('/api/get-history/:uid', authController.getHistory);

// AI Chatbot endpoint
if (chatHandler) {
    app.post('/api/chat', (req, res) => chatHandler(req, res));
    app.post('/chat', (req, res) => chatHandler(req, res));
}

app.listen(port, () => {
    console.log(`Aadhaar Professional Demo server running at http://localhost:${port}`);
});