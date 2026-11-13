const mongoose = require('mongoose');

const transaccionSchema = new mongoose.Schema({
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Empresa',
        required: true
    },
    tipo: {
        type: String,
        enum: ['ingreso', 'egreso'], // Ingreso = ventas, Egreso = pagos a proveedores
        required: true
    },
    categoria: {
        type: String,
        enum: ['efectivo', 'nequi', 'llave', 'proveedor', 'otro'],
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
}, {
    timestamps: true
});

module.exports = mongoose.model('Transaccion', transaccionSchema);