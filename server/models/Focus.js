const { Schema, model } = require('mongoose');

// One finished focus (Pomodoro) session
const focusSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  minutes: { type: Number, required: true, min: 1, max: 180 },
  subject: { type: String, default: '', maxlength: 40 },
  at: { type: Date, default: Date.now }
});

module.exports = model('Focus', focusSchema);
