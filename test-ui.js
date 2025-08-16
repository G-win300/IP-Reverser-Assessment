const express = require('express');
const path = require('path');
const app = express();
const PORT = 3001;

// Simple IP extraction function for testing
function extractClientIP(req) {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         '127.0.0.1';
}

// Simple IP reversal function for testing
function reverseIP(ip) {
  return ip.split('.').reverse().join('.');
}

// Middleware
app.use(express.static(path.join(__dirname, 'src', 'views')));

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'views', 'index.html'));
});

// API endpoint for IP processing (without database)
app.get('/api/ip', (req, res) => {
  try {
    const clientIP = extractClientIP(req);
    const reversedIP = reverseIP(clientIP);
    
    res.json({
      originalIp: clientIP,
      reversedIp: reversedIP,
      timestamp: new Date().toISOString(),
      message: `Your IP ${clientIP} reversed is ${reversedIP}`
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process IP address'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', mode: 'test' });
});

app.listen(PORT, () => {
  console.log(`Test UI server running on http://localhost:${PORT}`);
  console.log('Open http://localhost:3001 in your browser to test the UI');
});