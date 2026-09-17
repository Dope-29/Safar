const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = 'safar_secret_2026';

const storage = multer.diskStorage({
    destination: path.join(__dirname, '../uploads'),
    filename: (req, file, cb) => {
        cb(null, Date.now() + '_' + file.originalname.replace(/\s/g, '_'));
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

function getUserId(req) {
    const auth = req.headers.authorization;
    if (!auth) return null;
    try {
        return jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET).id;
    } catch { return null; }
}

router.post('/verify', upload.single('idCard'), (req, res) => {
    const { studentName, collegeName, age, phone, branch, passengerId } = req.body;
    const userId = getUserId(req);

    if (!studentName || !collegeName || !age || !phone || !branch) {
        return res.status(400).json({ error: 'All student details are required.' });
    }

    const idCardPath = req.file ? req.file.filename : null;

    const result = db.prepare(`
        INSERT INTO student_verification (user_id, passenger_id, student_name, college_name, age, phone, branch, id_card_path, status)
        VALUES (?,?,?,?,?,?,?,?,?)
    `).run(userId, passengerId || null, studentName, collegeName, age, phone, branch, idCardPath, 'pending');

    res.json({
        id: result.lastInsertRowid,
        status: 'pending',
        message: 'Student ID submitted for verification. Admin will review shortly.'
    });
});

router.get('/status/:userId', (req, res) => {
    const records = db.prepare(
        'SELECT id, student_name, college_name, status, submitted_at, reviewed_at FROM student_verification WHERE user_id = ? ORDER BY submitted_at DESC'
    ).all(req.params.userId);
    res.json({ records });
});

module.exports = router;
