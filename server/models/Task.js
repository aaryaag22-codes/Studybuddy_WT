const { Schema, model } = require('mongoose');

const taskSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: Schema.Types.ObjectId, ref: 'Subject', default: null },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  dueDate: { type: Date, default: null },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  done: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = model('Task', taskSchema);
