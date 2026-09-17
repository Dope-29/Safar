const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/search', (req, res) => {
    const { from, to, date } = req.query;

    if (!from || !to || !date) {
        return res.status(400).json({ error: 'from, to and date are required.' });
    }

    const route = db.prepare(
        'SELECT id FROM routes WHERE LOWER(source) = LOWER(?) AND LOWER(destination) = LOWER(?)'
    ).get(from.trim(), to.trim());

    if (!route) {
        return res.json({ buses: [], message: 'No buses found for this route.' });
    }

    const buses = db.prepare(`
        SELECT b.id, b.bus_number, b.operator, b.departure_time, b.arrival_time,
               b.total_seats, b.available_seats, b.fare, b.amenities,
               r.source, r.destination, r.distance_km
        FROM buses b
        JOIN routes r ON b.route_id = r.id
        WHERE b.route_id = ? AND b.active = 1
        ORDER BY b.departure_time
    `).all(route.id);

    res.json({ buses, date });
});

router.get('/:busId/seats', (req, res) => {
    const { busId } = req.params;
    const { date } = req.query;

    const bus = db.prepare('SELECT * FROM buses WHERE id = ?').get(busId);
    if (!bus) return res.status(404).json({ error: 'Bus not found.' });

    const seats = db.prepare('SELECT * FROM seats WHERE bus_id = ? ORDER BY id').all(busId);

    let bookedSeats = [];
    if (date) {
        bookedSeats = db.prepare(`
            SELECT p.seat_number FROM passengers p
            JOIN bookings bk ON p.booking_id = bk.id
            WHERE bk.bus_id = ? AND bk.journey_date = ? AND bk.status != 'cancelled'
        `).all(busId, date).map(r => r.seat_number);
    }

    const seatData = seats.map(s => ({
        ...s,
        is_booked: bookedSeats.includes(s.seat_number)
    }));

    res.json({ seats: seatData, bus });
});

module.exports = router;
