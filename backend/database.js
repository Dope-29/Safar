const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.VERCEL ? path.join('/tmp', 'safar.db') : path.join(__dirname, 'safar.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDB() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            password_hash TEXT NOT NULL,
            student_verified INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS routes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            destination TEXT NOT NULL,
            distance_km INTEGER,
            base_fare REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS buses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            route_id INTEGER NOT NULL REFERENCES routes(id),
            bus_number TEXT NOT NULL,
            operator TEXT NOT NULL,
            departure_time TEXT NOT NULL,
            arrival_time TEXT NOT NULL,
            total_seats INTEGER NOT NULL DEFAULT 40,
            available_seats INTEGER NOT NULL DEFAULT 40,
            fare REAL NOT NULL,
            amenities TEXT,
            active INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS seats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bus_id INTEGER NOT NULL REFERENCES buses(id),
            seat_number TEXT NOT NULL,
            seat_type TEXT NOT NULL CHECK(seat_type IN ('general','ladies','priority')),
            UNIQUE(bus_id, seat_number)
        );

        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pnr TEXT UNIQUE NOT NULL,
            user_id INTEGER REFERENCES users(id),
            bus_id INTEGER NOT NULL REFERENCES buses(id),
            journey_date TEXT NOT NULL,
            total_fare REAL NOT NULL,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','cancelled')),
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS passengers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER NOT NULL REFERENCES bookings(id),
            name TEXT NOT NULL,
            age INTEGER NOT NULL,
            gender TEXT NOT NULL CHECK(gender IN ('male','female','other')),
            phone TEXT NOT NULL,
            seat_number TEXT,
            is_student INTEGER DEFAULT 0,
            is_specially_abled INTEGER DEFAULT 0,
            fare REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS student_verification (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            passenger_id INTEGER REFERENCES passengers(id),
            student_name TEXT NOT NULL,
            college_name TEXT NOT NULL,
            age INTEGER NOT NULL,
            phone TEXT NOT NULL,
            branch TEXT NOT NULL,
            id_card_path TEXT,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
            reviewed_by INTEGER REFERENCES admin(id),
            submitted_at TEXT DEFAULT (datetime('now')),
            reviewed_at TEXT
        );

        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER NOT NULL REFERENCES bookings(id),
            amount REAL NOT NULL,
            method TEXT DEFAULT 'card',
            transaction_id TEXT UNIQUE,
            status TEXT DEFAULT 'success' CHECK(status IN ('success','failed','refunded')),
            paid_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        );
    `);
}

function seedData() {
    const routeCount = db.prepare('SELECT COUNT(*) as c FROM routes').get().c;
    if (routeCount > 0) return;

    const routes = [
        { source: 'Kochi', destination: 'Bangalore', distance_km: 560, base_fare: 499 },
        { source: 'Bangalore', destination: 'Kochi', distance_km: 560, base_fare: 499 },
        { source: 'Trivandrum', destination: 'Kochi', distance_km: 225, base_fare: 199 },
        { source: 'Kochi', destination: 'Trivandrum', distance_km: 225, base_fare: 199 },
        { source: 'Chennai', destination: 'Bangalore', distance_km: 350, base_fare: 399 },
        { source: 'Bangalore', destination: 'Chennai', distance_km: 350, base_fare: 399 },
        { source: 'Coimbatore', destination: 'Kochi', distance_km: 200, base_fare: 299 },
        { source: 'Kochi', destination: 'Coimbatore', distance_km: 200, base_fare: 299 },
        { source: 'Mumbai', destination: 'Pune', distance_km: 150, base_fare: 249 },
        { source: 'Pune', destination: 'Mumbai', distance_km: 150, base_fare: 249 },
        { source: 'Delhi', destination: 'Agra', distance_km: 200, base_fare: 299 },
        { source: 'Agra', destination: 'Delhi', distance_km: 200, base_fare: 299 },
        { source: 'Hyderabad', destination: 'Bangalore', distance_km: 570, base_fare: 549 },
        { source: 'Bangalore', destination: 'Hyderabad', distance_km: 570, base_fare: 549 },
    ];

    const insertRoute = db.prepare(
        'INSERT INTO routes (source, destination, distance_km, base_fare) VALUES (?,?,?,?)'
    );

    const buses = [];
    for (const r of routes) {
        const info = insertRoute.run(r.source, r.destination, r.distance_km, r.base_fare);
        const routeId = info.lastInsertRowid;

        buses.push({ routeId, bus_number: 'KL07' + routeId + 'A', operator: 'KSRTC', dep: '06:00', arr: '14:00', fare: r.base_fare });
        buses.push({ routeId, bus_number: 'KL07' + routeId + 'B', operator: 'RedBus Express', dep: '22:00', arr: '06:00', fare: r.base_fare + 100 });
        buses.push({ routeId, bus_number: 'KL07' + routeId + 'C', operator: 'Orange Travels', dep: '14:00', arr: '22:00', fare: r.base_fare + 50 });
    }

    const insertBus = db.prepare(
        'INSERT INTO buses (route_id, bus_number, operator, departure_time, arrival_time, total_seats, available_seats, fare, amenities) VALUES (?,?,?,?,?,40,40,?,?)'
    );
    const insertSeat = db.prepare(
        'INSERT INTO seats (bus_id, seat_number, seat_type) VALUES (?,?,?)'
    );

    for (const b of buses) {
        const info = insertBus.run(b.routeId, b.bus_number, b.operator, b.dep, b.arr, b.fare, 'AC, WiFi, Charging');
        const busId = info.lastInsertRowid;

        for (let i = 1; i <= 40; i++) {
            let type = 'general';
            if (i === 1 || i === 2) type = 'priority';
            else if (i === 3 || i === 4 || i === 5) type = 'ladies';
            insertSeat.run(busId, 'S' + i, type);
        }
    }

    const adminHash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admin (username, password_hash, name) VALUES (?,?,?)').run('admin', adminHash, 'System Admin');
}

initDB();
seedData();

module.exports = db;
