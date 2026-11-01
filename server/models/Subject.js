const { Schema, model } = require('mongoose');

const subjectSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 40 },
  color: { type: String, default: '#6366f1' }
});
subjectSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = model('Subject', subjectSchema);
