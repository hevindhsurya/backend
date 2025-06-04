// server.js
const app = require('./app');
const connectDB = require('./config/db');
require('dotenv').config();

connectDB();
app.listen(8080, () => {
  console.log(`Server running on port ${8080}`);
});
