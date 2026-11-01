// Adds demo data so the app looks full for screenshots.  Run:  npm run seed
// Demo login:  demo@studybuddy.dev  /  Demo@1234
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../server/models/User');
const Subject = require('../server/models/Subject');
const Task = require('../server/models/Task');
const Note = require('../server/models/Note');
const Quiz = require('../server/models/Quiz');
const Attempt = require('../server/models/Attempt');
const Focus = require('../server/models/Focus');

const day = (offset) => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() + offset); return d; };
const ago = (days, hour = 10) => new Date(Date.now() - days * 86400000 - (24 - hour) * 3600000 * 0);

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studybuddy');
  const old = await User.find({ email: { $in: ['demo@studybuddy.dev', 'aarav@studybuddy.dev'] } });
  for (const u of old) {
    await Promise.all([Subject, Task, Note, Quiz, Attempt, Focus].map((M) => M.deleteMany({ user: u._id })));
    await User.deleteOne({ _id: u._id });
  }
  const hash = await bcrypt.hash('Demo@1234', 10);
  const demo = await User.create({ name: 'Riya Sharma', email: 'demo@studybuddy.dev', passwordHash: hash });
  const aarav = await User.create({ name: 'Aarav Mehta', email: 'aarav@studybuddy.dev', passwordHash: hash });

  const [dbms, os, cn, maths] = await Subject.create([
    { user: demo._id, name: 'DBMS', color: '#6366f1' },
    { user: demo._id, name: 'Operating Systems', color: '#0d9488' },
    { user: demo._id, name: 'Computer Networks', color: '#b45309' },
    { user: demo._id, name: 'Engineering Maths', color: '#db2777' }
  ]);

  await Task.create([
    { user: demo._id, subject: dbms._id, title: 'Revise normalisation (1NF to BCNF)', dueDate: day(1), priority: 'high', done: false },
    { user: demo._id, subject: dbms._id, title: 'Finish ER diagram for library system', dueDate: day(-2), priority: 'medium', done: true },
    { user: demo._id, subject: dbms._id, title: 'Practise 10 SQL joins', dueDate: day(3), priority: 'medium', done: false },
    { user: demo._id, subject: os._id, title: 'Read chapter on process scheduling', dueDate: day(2), priority: 'high', done: false },
    { user: demo._id, subject: os._id, title: 'Solve deadlock numericals', dueDate: day(-1), priority: 'low', done: false },
    { user: demo._id, subject: os._id, title: 'Summarise paging and segmentation', dueDate: day(-3), priority: 'medium', done: true },
    { user: demo._id, subject: cn._id, title: 'Subnetting worksheet', dueDate: day(5), priority: 'high', done: false },
    { user: demo._id, subject: cn._id, title: 'Compare TCP and UDP', dueDate: day(-4), priority: 'low', done: true },
    { user: demo._id, subject: maths._id, title: 'Laplace transform practice set', dueDate: day(4), priority: 'medium', done: false },
    { user: demo._id, subject: maths._id, title: 'Revise matrices and eigenvalues', dueDate: day(-5), priority: 'medium', done: true },
    { user: demo._id, subject: null, title: 'Pack lab record for Monday', dueDate: day(0), priority: 'low', done: false }
  ]);

  await Note.create([
    { user: demo._id, subject: 'DBMS', title: 'Normalisation in one page', shared: true, body: '1NF: every cell holds one value and there are no repeating groups. 2NF: 1NF plus no partial dependency on part of a composite key. 3NF: 2NF plus no transitive dependency. BCNF: for every dependency X to Y, X must be a super key.' },
    { user: demo._id, subject: 'Operating Systems', title: 'CPU scheduling cheat sheet', shared: true, body: 'FCFS is simple but causes the convoy effect. SJF gives the lowest average waiting time but needs burst estimates. Round robin uses a time quantum and suits time-sharing. Priority scheduling can starve low priority jobs; aging fixes this.' },
    { user: demo._id, subject: 'Computer Networks', title: 'OSI versus TCP/IP layers', shared: false, link: 'https://www.geeksforgeeks.org/layers-of-osi-model/', body: 'OSI has seven layers: physical, data link, network, transport, session, presentation, application. TCP/IP merges the top three into one application layer and has four layers in all.' },
    { user: demo._id, subject: 'Engineering Maths', title: 'Laplace transform table', shared: false, body: 'L{1} = 1/s, L{t} = 1/s^2, L{e^at} = 1/(s-a), L{sin at} = a/(s^2+a^2), L{cos at} = s/(s^2+a^2). Remember the first shifting theorem for e^at multiplied by f(t).' },
    { user: aarav._id, subject: 'DBMS', title: 'Transactions and ACID', shared: true, body: 'Atomicity: all or nothing. Consistency: the database moves from one valid state to another. Isolation: concurrent transactions do not see each other half done. Durability: committed data survives a crash.' },
    { user: aarav._id, subject: 'Computer Networks', title: 'Subnetting in five steps', shared: true, body: 'Write the mask in binary, count host bits h, usable hosts = 2^h - 2, block size = 256 minus the interesting octet, then list the network ranges in steps of the block size.' }
  ]);

  const quiz = await Quiz.create({
    user: demo._id, subject: 'DBMS', title: 'DBMS basics check',
    questions: [
      { question: 'Which normal form removes partial dependencies?', options: ['1NF', '2NF', '3NF', 'BCNF'], correctIndex: 1, explanation: '2NF removes dependency on part of a composite key.' },
      { question: 'What does the "I" in ACID stand for?', options: ['Integrity', 'Isolation', 'Indexing', 'Inheritance'], correctIndex: 1, explanation: 'Isolation keeps concurrent transactions from interfering.' },
      { question: 'Which SQL clause filters groups after GROUP BY?', options: ['WHERE', 'ORDER BY', 'HAVING', 'LIMIT'], correctIndex: 2, explanation: 'HAVING works on aggregated groups; WHERE works on rows.' },
      { question: 'A primary key can contain NULL values.', options: ['True', 'False', 'Only in MySQL', 'Only for composite keys'], correctIndex: 1, explanation: 'A primary key must be unique and not null.' }
    ]
  });
  await Quiz.create({
    user: demo._id, subject: 'Operating Systems', title: 'OS scheduling quick quiz',
    questions: [
      { question: 'Which scheduling algorithm can cause starvation?', options: ['Round robin', 'FCFS', 'Priority scheduling', 'None of these'], correctIndex: 2, explanation: 'Low priority jobs may wait forever without aging.' },
      { question: 'What is the convoy effect?', options: ['Short jobs wait behind a long job', 'Many processes sleep', 'Memory runs out', 'Two jobs deadlock'], correctIndex: 0, explanation: 'It happens with FCFS when a long job arrives first.' },
      { question: 'A time quantum is used in which algorithm?', options: ['SJF', 'Round robin', 'FCFS', 'Priority'], correctIndex: 1, explanation: 'Each process runs for one quantum at a time.' }
    ]
  });
  await Attempt.create([
    { quiz: quiz._id, user: demo._id, score: 2, total: 4, takenAt: ago(6) },
    { quiz: quiz._id, user: demo._id, score: 3, total: 4, takenAt: ago(3) },
    { quiz: quiz._id, user: demo._id, score: 4, total: 4, takenAt: ago(1) }
  ]);

  const minutesPerDay = [50, 25, 75, 0, 50, 100, 25]; // oldest to today
  const sessions = [];
  minutesPerDay.forEach((m, i) => {
    const daysAgo = 6 - i;
    let left = m;
    while (left > 0) {
      const chunk = Math.min(25, left);
      sessions.push({ user: demo._id, minutes: chunk, subject: ['DBMS', 'Operating Systems', 'Computer Networks'][i % 3], at: new Date(Date.now() - daysAgo * 86400000 - 3600000) });
      left -= chunk;
    }
  });
  await Focus.create(sessions);

  console.log('Seeded. Log in with demo@studybuddy.dev / Demo@1234');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
