// server.js
const app = require('./app');
const connectDB = require('./config/db');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, `.env.${process.env.NODE_ENV}`),
});

connectDB();
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
