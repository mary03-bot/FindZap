const mongoose = require('mongoose');

const movimientoPrestamoSchema = new mongoose.Schema({
    tipo: {
        type: String,
        enum: ['prestamo', 'abono', 'interes'], // préstamo (+), abono (-), recargo de intereses (+)
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

const clientePrestamoSchema = new mongoose.Schema({
    codigo: {
        type: Number,
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
    movimientos: [movimientoPrestamoSchema]
});

const prestamoEmpresaSchema = new mongoose.Schema({
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Empresa',
        required: true
    },
    nombreTarjeta: { // El nombre de la empresa o "tarjeta" de cobro (Ej. Tarjeta Ruta 1)
        type: String,
        required: true,
        trim: true
    },
    descripcion: {
        type: String,
        trim: true
    },
    clientes: [clientePrestamoSchema]
}, {
    timestamps: true
});

module.exports = mongoose.model('PrestamoEmpresa', prestamoEmpresaSchema);