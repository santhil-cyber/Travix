const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DB_FILE = path.join(__dirname, 'aadhaar_db.sqlite');

const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) { console.error(err.message); throw err; }
    console.log('Connected to the SQLite database.');
});

const initDb = () => {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS residents (
            uid TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            dob TEXT NOT NULL,
            role TEXT NOT NULL 
        )`, (err) => {
            if (err) { return console.error(err.message); }
            console.log("'residents' table created with 'role' column.");
        });

        const residents = [
            { uid: '111122223333', name: 'Rajesh Kumar', dob: '1990-05-15', role: 'user' },
            { uid: '222233334444', name: 'Sunita Sharma', dob: '1985-11-22', role: 'user' },
            { uid: '333344445555', name: 'Amit Singh', dob: '2001-01-30', role: 'authority' }
        ];

        const insert = db.prepare("INSERT OR IGNORE INTO residents (uid, name, dob, role) VALUES (?,?,?,?)");
        residents.forEach(res => insert.run(res.uid, res.name, res.dob, res.role));
        insert.finalize((err) => {
            if(err) { return console.error(err.message); }
            console.log("Sample data with roles has been loaded.");
        });
    });
};

initDb();

module.exports = db;