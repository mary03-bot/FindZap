const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
    user: {
        type: String,
        required: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    correo: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Empresa',
        required: true
    },
    rol: {
        type: String,
        default: 'admin_negocio'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Usuario', usuarioSchema);