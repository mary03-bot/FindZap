const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');
const bcryptjs = require('bcryptjs');

// Redirigir la raíz al login
router.get('/', (req, res) => {
    res.redirect('/login');
});

// Vista de Login
router.get('/login', (req, res) => {
    res.render('login', { alerta: null });
});

// Vista de Registro
router.get('/register', (req, res) => {
    res.render('registro', { alerta: null });
});

// Lógica de Registro con Validaciones
router.post('/register', async (req, res) => {
    const { nombreNegocio, user, name, correo, password } = req.body;

    // 1. Validación de campos vacíos
    if (!nombreNegocio || !user || !name || !correo || !password) {
        return res.render('registro', { alerta: "Todos los campos son obligatorios." });
    }

    // 2. Validación de  contraseña
    if (password.length < 6) {
        return res.render('registro', { alerta: "La contraseña debe tener al menos 6 caracteres." });
    }

    try {
        // 3. Verificar si el usuario o correo ya existen en la base de datos
        const usuarioExistente = await Usuario.findOne({ correo });
        if (usuarioExistente) {
            return res.render('registro', { alerta: "El correo electrónico ya está registrado." });
        }

        // 4. Crear la empresa 
        const nuevaEmpresa = new Empresa({ nombreNegocio });
        await nuevaEmpresa.save();

        // 5. Encriptar la contraseña de forma segura con bcrypt
        const salt = await bcryptjs.genSalt(10);
        const passwordHash = await bcryptjs.hash(password, salt);

        // 6. Crear el usuario asociado al negocio
        const nuevoUsuario = new Usuario({
            user,
            name,
            correo,
            password: passwordHash,
            businessId: nuevaEmpresa._id, 
            rol: 'admin_negocio'
        });

        await nuevoUsuario.save();
        
        // Redirigir al login 
        res.redirect('/login');

    } catch (error) {
        console.error("Error en el registro:", error);
        res.render('registro', { alerta: "Ocurrió un error al registrar el negocio. Inténtalo de nuevo." });
    }
});

// Lógica de Login 
router.post('/login', async (req, res) => {
    const { correo, password } = req.body;

    if (!correo || !password) {
        return res.render('login', { alerta: "Por favor, ingresa tu correo y contraseña." });
    }

    try {
        // Buscar el usuario en la base de datos
        const usuario = await Usuario.findOne({ correo });

        if (!usuario) {
            return res.render('login', { alerta: "Correo o contraseña incorrectos." });
        }

        // Comparar la contraseña ingresada con el hash guardado
        const passwordCorrecto = await bcryptjs.compare(password, usuario.password);

        if (!passwordCorrecto) {
            return res.render('login', { alerta: "Correo o contraseña incorrectos." });
        }

        
        req.session.userId = usuario._id;
        req.session.businessId = usuario.businessId; 
        req.session.userName = usuario.name;
        req.session.loggedin = true;

    
        res.redirect('/dashboard'); 

    } catch (error) {
        console.error("Error en el login:", error);
        res.render('login', { alerta: "Error interno en el servidor." });
    }
});

// Ruta del Dashboard principal protegida por sesión
router.get('/dashboard', (req, res) => {
    // Si no ha iniciado sesión, lo mandamos al login por seguridad
    if (!req.session.loggedin) {
        return res.redirect('/login');
    }

    
    res.render('dashboard', { 
        userName: req.session.userName,
        businessId: req.session.businessId 
    });
});

module.exports = router;