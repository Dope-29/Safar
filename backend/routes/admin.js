const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const ADMIN_SECRET = 'safar_admin_2026';

function adminAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Not authenticated.' });
    try {
        jwt.verify(auth.replace('Bearer ', ''), ADMIN_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid admin token.' });
    }
}

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get(username);
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const token = jwt.sign({ id: admin.id, username: admin.username }, ADMIN_SECRET, { expiresIn: '8h' });
    res.json({ token, name: admin.name });
});

router.get('/dashboard', adminAuth, (req, res) => {
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const totalBookings = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'confirmed'").get().c;
    const pendingVerifications = db.prepare("SELECT COUNT(*) as c FROM student_verification WHERE status = 'pending'").get().c;
    const revenue = db.prepare("SELECT COALESCE(SUM(amount),0) as r FROM payments WHERE status = 'success'").get().r;
    res.json({ totalUsers, totalBookings, pendingVerifications, revenue });
});

router.get('/verifications', adminAuth, (req, res) => {
    const records = db.prepare(`
        SELECT sv.*, u.name as user_name, u.email as user_email
        FROM student_verification sv
        LEFT JOIN users u ON sv.user_id = u.id
        ORDER BY sv.submitted_at DESC
    `).all();
    res.json({ records });
});

router.post('/verifications/:id/approve', adminAuth, (req, res) => {
    const { id } = req.params;
    const sv = db.prepare('SELECT * FROM student_verification WHERE id = ?').get(id);
    if (!sv) return res.status(404).json({ error: 'Not found.' });

    db.transaction(() => {
        db.prepare("UPDATE student_verification SET status = 'approved', reviewed_at = datetime('now') WHERE id = ?").run(id);
        if (sv.user_id) {
            db.prepare('UPDATE users SET student_verified = 1 WHERE id = ?').run(sv.user_id);
        }
    })();

    res.json({ message: 'Approved.' });
});

router.post('/verifications/:id/reject', adminAuth, (req, res) => {
    db.prepare("UPDATE student_verification SET status = 'rejected', reviewed_at = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ message: 'Rejected.' });
});

router.get('/bookings', adminAuth, (req, res) => {
    const bookings = db.prepare(`
        SELECT bk.*, u.name as user_name, u.email as user_email,
               r.source, r.destination, b.operator, b.departure_time
        FROM bookings bk
        LEFT JOIN users u ON bk.user_id = u.id
        JOIN buses b ON bk.bus_id = b.id
        JOIN routes r ON b.route_id = r.id
        ORDER BY bk.created_at DESC
        LIMIT 100
    `).all();
    res.json({ bookings });
});

router.get('/buses', adminAuth, (req, res) => {
    const buses = db.prepare(`
        SELECT b.*, r.source, r.destination FROM buses b JOIN routes r ON b.route_id = r.id ORDER BY b.id
    `).all();
    res.json({ buses });
});

router.post('/buses', adminAuth, (req, res) => {
    const { route_id, bus_number, operator, departure_time, arrival_time, fare, amenities } = req.body;
    if (!route_id || !bus_number || !operator || !departure_time || !arrival_time || !fare) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    const result = db.prepare(
        'INSERT INTO buses (route_id, bus_number, operator, departure_time, arrival_time, total_seats, available_seats, fare, amenities) VALUES (?,?,?,?,?,40,40,?,?)'
    ).run(route_id, bus_number, operator, departure_time, arrival_time, fare, amenities || '');

    const insertSeat = db.prepare('INSERT INTO seats (bus_id, seat_number, seat_type) VALUES (?,?,?)');
    for (let i = 1; i <= 40; i++) {
        let type = 'general';
        if (i === 1 || i === 2) type = 'priority';
        else if (i === 3 || i === 4 || i === 5) type = 'ladies';
        insertSeat.run(result.lastInsertRowid, 'S' + i, type);
    }

    res.json({ id: result.lastInsertRowid, message: 'Bus added.' });
});

router.delete('/buses/:id', adminAuth, (req, res) => {
    db.prepare('UPDATE buses SET active = 0 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Bus deactivated.' });
});

router.get('/routes', adminAuth, (req, res) => {
    const routes = db.prepare('SELECT * FROM routes ORDER BY id').all();
    res.json({ routes });
});

router.post('/routes', adminAuth, (req, res) => {
    const { source, destination, distance_km, base_fare } = req.body;
    if (!source || !destination || !base_fare) {
        return res.status(400).json({ error: 'Source, destination and fare are required.' });
    }
    const result = db.prepare(
        'INSERT INTO routes (source, destination, distance_km, base_fare) VALUES (?,?,?,?)'
    ).run(source, destination, distance_km || 0, base_fare);
    res.json({ id: result.lastInsertRowid, message: 'Route added.' });
});

module.exports = router;
