const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = 'safar_secret_2026';
const STUDENT_DISCOUNT = 0.30;

function getUserId(req) {
    const auth = req.headers.authorization;
    if (!auth) return null;
    try {
        const payload = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
        return payload.id;
    } catch {
        return null;
    }
}

function generatePNR() {
    return 'PNR' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

router.post('/create', (req, res) => {
    const { busId, journeyDate, passengers } = req.body;
    const userId = getUserId(req);

    if (!busId || !journeyDate || !passengers || !passengers.length) {
        return res.status(400).json({ error: 'Bus, date and at least one passenger are required.' });
    }

    const bus = db.prepare('SELECT * FROM buses WHERE id = ?').get(busId);
    if (!bus) return res.status(404).json({ error: 'Bus not found.' });

    if (bus.available_seats < passengers.length) {
        return res.status(400).json({ error: 'Not enough seats available.' });
    }

    const bookedSeats = db.prepare(`
        SELECT p.seat_number FROM passengers p
        JOIN bookings bk ON p.booking_id = bk.id
        WHERE bk.bus_id = ? AND bk.journey_date = ? AND bk.status != 'cancelled'
    `).all(busId, journeyDate).map(r => r.seat_number);

    const availableSeats = db.prepare(
        'SELECT * FROM seats WHERE bus_id = ? ORDER BY id'
    ).all(busId).filter(s => !bookedSeats.includes(s.seat_number));

    const assignSeat = (passenger, seatIndex) => {
        if (passenger.is_specially_abled) {
            const ps = availableSeats.find(s => s.seat_type === 'priority');
            if (ps) { availableSeats.splice(availableSeats.indexOf(ps), 1); return ps.seat_number; }
        }
        if (passenger.gender === 'female') {
            const ls = availableSeats.find(s => s.seat_type === 'ladies');
            if (ls) { availableSeats.splice(availableSeats.indexOf(ls), 1); return ls.seat_number; }
        }
        const gs = availableSeats[0];
        if (gs) { availableSeats.splice(0, 1); return gs.seat_number; }
        return null;
    };

    let totalFare = 0;
    const passengersWithSeats = passengers.map((p, i) => {
        const seat = assignSeat(p, i);
        let fare = bus.fare;
        if (p.is_student) fare = Math.round(fare * (1 - STUDENT_DISCOUNT));
        totalFare += fare;
        return { ...p, seat_number: seat, fare };
    });

    const pnr = generatePNR();

    const createBooking = db.transaction(() => {
        const bookingResult = db.prepare(
            'INSERT INTO bookings (pnr, user_id, bus_id, journey_date, total_fare, status) VALUES (?,?,?,?,?,?)'
        ).run(pnr, userId, busId, journeyDate, totalFare, 'pending');

        const bookingId = bookingResult.lastInsertRowid;

        const insertPassenger = db.prepare(
            'INSERT INTO passengers (booking_id, name, age, gender, phone, seat_number, is_student, is_specially_abled, fare) VALUES (?,?,?,?,?,?,?,?,?)'
        );

        for (const p of passengersWithSeats) {
            insertPassenger.run(bookingId, p.name, p.age, p.gender, p.phone, p.seat_number, p.is_student ? 1 : 0, p.is_specially_abled ? 1 : 0, p.fare);
        }

        db.prepare('UPDATE buses SET available_seats = available_seats - ? WHERE id = ?').run(passengers.length, busId);

        return bookingId;
    });

    const bookingId = createBooking();

    res.json({
        bookingId,
        pnr,
        totalFare,
        passengers: passengersWithSeats,
        bus: { id: bus.id, operator: bus.operator, bus_number: bus.bus_number, departure_time: bus.departure_time, arrival_time: bus.arrival_time }
    });
});

router.post('/confirm/:bookingId', (req, res) => {
    const { bookingId } = req.params;
    const { transactionId, method } = req.body;

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.status === 'confirmed') return res.status(400).json({ error: 'Already confirmed.' });

    const txId = transactionId || 'TXN' + Date.now();

    db.transaction(() => {
        db.prepare("UPDATE bookings SET status = 'confirmed' WHERE id = ?").run(bookingId);
        db.prepare(
            'INSERT INTO payments (booking_id, amount, method, transaction_id, status) VALUES (?,?,?,?,?)'
        ).run(bookingId, booking.total_fare, method || 'card', txId, 'success');
    })();

    const passengers = db.prepare('SELECT * FROM passengers WHERE booking_id = ?').all(bookingId);
    const bus = db.prepare(`
        SELECT b.*, r.source, r.destination FROM buses b JOIN routes r ON b.route_id = r.id WHERE b.id = ?
    `).get(booking.bus_id);

    res.json({ pnr: booking.pnr, status: 'confirmed', booking, passengers, bus, transactionId: txId });
});

router.get('/ticket/:pnr', (req, res) => {
    const { pnr } = req.params;

    const booking = db.prepare('SELECT * FROM bookings WHERE pnr = ?').get(pnr);
    if (!booking) return res.status(404).json({ error: 'Ticket not found.' });

    const passengers = db.prepare('SELECT * FROM passengers WHERE booking_id = ?').all(booking.id);
    const bus = db.prepare(`
        SELECT b.*, r.source, r.destination FROM buses b JOIN routes r ON b.route_id = r.id WHERE b.id = ?
    `).get(booking.bus_id);
    const payment = db.prepare('SELECT * FROM payments WHERE booking_id = ?').get(booking.id);

    res.json({ booking, passengers, bus, payment });
});

router.get('/my', (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

    const bookings = db.prepare(`
        SELECT bk.*, r.source, r.destination, b.operator, b.departure_time, b.arrival_time
        FROM bookings bk
        JOIN buses b ON bk.bus_id = b.id
        JOIN routes r ON b.route_id = r.id
        WHERE bk.user_id = ?
        ORDER BY bk.created_at DESC
    `).all(userId);

    res.json({ bookings });
});

module.exports = router;
