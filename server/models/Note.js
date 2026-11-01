const { Schema, model } = require('mongoose');

const noteSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: String, required: true, trim: true, maxlength: 40 },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  body: { type: String, required: true, maxlength: 5000 },
  link: { type: String, default: '', maxlength: 300 },
  shared: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = model('Note', noteSchema);
