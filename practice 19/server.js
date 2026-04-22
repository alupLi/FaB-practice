const express = require('express');
const sequelize = require('./db/connection');
const userRoutes = require('./routes/users');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/users', userRoutes);

(async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to PostgreSQL');

        await sequelize.sync();
        console.log('✅ Database synced');

        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('❌ Connection error:', err);
    }
})();