// server.js
const app = require('./app');
const connectDB = require('./config/db');
require('dotenv').config();

connectDB();
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
