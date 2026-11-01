const { Schema, model } = require('mongoose');

// Questions are EMBEDDED in the quiz document (one read gives the whole quiz)
const questionSchema = new Schema({
  question: { type: String, required: true, trim: true, maxlength: 300 },
  options: { type: [String], validate: (v) => v.length === 4 },
  correctIndex: { type: Number, min: 0, max: 3, required: true },
  explanation: { type: String, default: '', maxlength: 300 }
}, { _id: false });

const quizSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: String, required: true, trim: true, maxlength: 40 },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  questions: { type: [questionSchema], validate: (v) => v.length >= 1 && v.length <= 20 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = model('Quiz', quizSchema);
