const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
require('dotenv').config(); // Load environment variables

const app = express();
const port = 3001;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'airplus'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));

app.use(session({
    secret: process.env.SESSION_SECRET, // Use the secret from the environment variable
    resave: false,
    saveUninitialized: true
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

app.get('/', (req, res) => {
    const sql = 'SELECT * FROM popular LIMIT 3';
    connection.query(sql, (err, popularResults) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.render('home', { popular: popularResults });
    });
});

app.get('/flightStatus', (req, res) => {
    const flightID = req.query.flightID;
    const sql = 'SELECT * FROM flights WHERE flightID = ?';
    connection.query(sql, [flightID], (err, flightResults) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.render('flightStatus', {
            flight: flightResults.length > 0 ? flightResults[0] : null,
        });
    });
});

app.get('/allFlightStatus', (req, res) => {
    const sql = 'SELECT * FROM flights';
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            return;
        }
        res.render('allFlightStatus', { flights: results });
    });
});

app.get('/editFlight/:flightID', upload.single('image'), (req, res) => {
    const flightID = req.params.flightID;
    const sql = 'SELECT * FROM flights WHERE flightID = ?';
    connection.query(sql, [flightID], (err, flightResults) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        if (flightResults.length > 0) {
            const flight = flightResults[0];
            flight.departure = new Date(flight.departure).toISOString().split('T')[0];
            flight.arrival = new Date(flight.arrival).toISOString().split('T')[0];
            res.render('editFlight', { flight });
        } else {
            res.render('editFlight', { flight: null });
        }
    });
});
////////////////////////////////////////////////////////////////////////////////////////
// All Popular Destinations Page //
app.get('/allPopularDestination', (req, res) => {
    const sql = 'SELECT * FROM popular';
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            return;
        }
        res.render('allPopularDestination', { popular: results });
    });
});

app.get('/allPopularDestination/:countryID', upload.single('image'), (req, res) => {
    const countryID = req.params.countryID;
    const sql = 'SELECT * FROM popular WHERE countryID = ?';
    connection.query(sql, [countryID], (err, countryResults) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        if (countryResults.length > 0) {
            const country = countryResults[0];
            res.render('editDestination', { country });
        } else {
            res.render('editDestination', { country: null });
        }
    });
});

////////////////////////////////////////////////////////////////////////////////////////
// Add Destinations Page //
app.get('/addDestination', (req, res) => {
    res.render('addDestination');
});

app.post('/addDestination', upload.single('countryImage'), (req, res) => {
    const { countryName } = req.body;
    let countryImage;
    if (req.file) {
        countryImage = req.file.filename;
    } else {
        countryImage = null;
    }

    const sql = 'INSERT INTO popular (countryName, countryImage) VALUES (?, ?)';
    connection.query(sql, [countryName, countryImage], (error, results) => {
        if (error) {
            console.error('Error adding destination:', error);
            res.status(500).send('Error adding destination');
        } else {
            res.redirect('/allPopularDestination');
        }
    });
});

app.get('/deleteDestination/:countryID', (req, res) => {
    const countryID = req.params.countryID;
    const sql = 'DELETE FROM popular WHERE countryID = ?';
    connection.query(sql, [countryID], (error, results) => {
        if (error) {
            console.error('Error deleting destination:', error.message);
            return res.status(500).send('Error deleting destination');
        }
        else {
            res.redirect('/allPopularDestination');
        }
    });
})
////////////////////////////////////////////////////////////////////////////////////////
// Login Page //

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { adminName, password } = req.body;
    const sql = 'SELECT * FROM admins WHERE adminName = ? AND password = ?';
    connection.query(sql, [adminName, password], (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        if (results.length > 0) {
            req.session.user = results[0];
            res.redirect('/');
        } else {
            res.redirect('/login');
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});
////////////////////////////////////////////////////////////////////////////////////////
// Add Flight Page //
app.get('/addFlight', (req, res) => {
    res.render('addFlight');
});

app.post('/addFlight', upload.single('airlineLogo'), (req, res) => {
    const { countryName, departureDate, arrivalDate, planeNo, airline } = req.body;
    let airlineLogo;
    if (req.file) {
        airlineLogo = req.file.filename;
    } else {
        airlineLogo = null;
    }

    const sql = 'INSERT INTO flights (destination, departure, arrival, planeNo, airline, airlineLogo) VALUES (?, ?, ?, ?, ?, ?)';
    connection.query(sql, [countryName, departureDate, arrivalDate, planeNo, airline, airlineLogo], (error, results) => {
        if (error) {
            console.error('Error adding flight:', error);
            res.status(500).send('Error adding flight');
        } else {
            res.redirect('/allFlightStatus');
        }
    });
});

app.get('/deleteFlight/:flightID', (req, res) => {
    const flightID = req.params.flightID;
    const sql = 'DELETE FROM flights WHERE flightID = ?';
    connection.query(sql, [flightID], (error, results) => {
        if (error) {
            console.error('Error deleting flight:', error.message);
            return res.status(500).send('Error deleting flight');
        }
        else {
            res.redirect('/allFlightStatus');
        }
    });
})
////////////////////////////////////////////////////////////////////////////////////////
// About Page //
app.get('/about', (req, res) => {
    res.render('about');
});

////////////////////////////////////////////////////////////////////////////////////////
// Contact Page //
app.get('/contact', (req, res) => {
    res.render('contact');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
