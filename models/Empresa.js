const mongoose = require('mongoose');

const empresaSchema = new mongoose.Schema({
    nombreNegocio: {
        type: String,
        required: true,
        trim: true
    },
    fechaCreacion: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Empresa', empresaSchema);