const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB successfully!'))
  .catch((err) => console.error('❌ MongoDB connection failed:', err.message));
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
app.use("/api/chat", require("./chatRoutes"));
app.use("/api/admin", require("./adminRoutes"));
app.use("/api/vocab", require("./vocabRoutes"));
app.get('/', (req, res) => {
  res.send('SignRelay backend is running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));