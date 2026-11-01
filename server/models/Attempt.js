const { Schema, model } = require('mongoose');

const attemptSchema = new Schema({
  quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  score: { type: Number, required: true },
  total: { type: Number, required: true },
  takenAt: { type: Date, default: Date.now }
});

module.exports = model('Attempt', attemptSchema);
