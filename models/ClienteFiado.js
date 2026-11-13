const mongoose = require('mongoose');

const movimientoFiadoSchema = new mongoose.Schema({
    tipo: {
        type: String,
        enum: ['fiado', 'abono'],
        required: true
    },
    monto: {
        type: Number,
        required: true
    },
    descripcion: {
        type: String,
        required: true,
        trim: true
    },
    fecha: {
        type: Date,
        default: Date.now
    }
});

const clienteFiadoSchema = new mongoose.Schema({
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Empresa',
        required: true
    },
    nombreCliente: {
        type: String,
        required: true,
        trim: true
    },
    telefono: {
        type: String,
        trim: true
    },
    movimientos: [movimientoFiadoSchema]
}, {
    timestamps: true
});

module.exports = mongoose.model('ClienteFiado', clienteFiadoSchema);