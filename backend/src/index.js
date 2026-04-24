const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Existing routes
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/products',    require('./routes/products'));
app.use('/api/sales',       require('./routes/sales'));
app.use('/api/purchases',   require('./routes/purchases'));
app.use('/api/dashboard',   require('./routes/dashboard'));


//  New feature routes
app.use('/api/expiry',      require('./routes/expiry'));
app.use('/api/forecast',    require('./routes/forecast'));
app.use('/api/substitutes', require('./routes/substitutes'));
app.use('/api/payments',    require('./routes/payments'));

app.get('/', (req, res) => {
  res.json({ message: 'MediTrack server running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`MediTrack server running on http://localhost:${PORT}`);
});
