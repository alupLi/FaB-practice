const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({
        message: 'Response from backend server',
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});