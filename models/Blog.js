const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 100
  },
  author: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  image: {
    data: Buffer,    
    contentType: String
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  watchlistedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Blog', blogSchema);

