require('dotenv').config();
const express = require('express');
const session = require('express-session');
const conectarDB = require('./config/db');

const app = express();

// Conectar a MongoDB
conectarDB();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.set('view engine', 'ejs');

// Rutas
app.use('/', require('./routes/authRoutes'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});