const express = require('express');
const router = express.Router();
const Transaccion = require('../models/Transaccion');
const ClienteFiado = require('../models/ClienteFiado');

const verificarSesion = (req, res, next) => {
    if (!req.session.loggedin) {
        return res.redirect('/login');
    }
    next();
};

// Vista principal de la Tienda 
router.get('/tienda', verificarSesion, async (req, res) => {
    try {
        const businessId = req.session.businessId;
        const { mes, anio } = req.query;

        
        let filtroTransacciones = { businessId };
        if (mes && anio) {
            const inicioMes = new Date(anio, mes - 1, 1);
            const finMes = new Date(anio, mes, 0, 23, 59, 59);
            filtroTransacciones.fecha = { $gte: inicioMes, $lte: finMes };
        } else if (anio) {
            const inicioAnio = new Date(anio, 0, 1);
            const finAnio = new Date(anio, 11, 31, 23, 59, 59);
            filtroTransacciones.fecha = { $gte: inicioAnio, $lte: finAnio };
        }

        const transacciones = await Transaccion.find(filtroTransacciones).sort({ fecha: -1 });

        let totalIngresos = 0;
        let totalEgresos = 0;

        transacciones.forEach(t => {
            if (t.tipo === 'ingreso') totalIngresos += t.monto;
            if (t.tipo === 'egreso') totalEgresos += t.monto;
        });

        const balanceTotal = totalIngresos - totalEgresos;

        const clientes = await ClienteFiado.find({ businessId }).sort({ createdAt: -1 });


        const clientesConSaldo = clientes.map(cliente => {
            let saldoActual = 0;
            cliente.movimientos.forEach(m => {
                if (m.tipo === 'fiado') saldoActual += m.monto;
                if (m.tipo === 'abono') saldoActual -= m.monto;
            });
            return {
                _id: cliente._id,
                nombreCliente: cliente.nombreCliente,
                telefono: cliente.telefono,
                movimientos: cliente.movimientos,
                saldoActual,
                estado: saldoActual > 0 ? 'debiendo' : 'no debiendo'
            };
        });

        res.render('tienda', {
            userName: req.session.userName,
            transacciones,
            totalIngresos,
            totalEgresos,
            balanceTotal,
            clientes: clientesConSaldo,
            filtroMes: mes || '',
            filtroAnio: anio || '',
            alerta: null
        });

    } catch (error) {
        console.error("Error al cargar la tienda:", error);
        res.status(500).send("Error interno del servidor");
    }
});

// Registrar Transacción 
router.post('/tienda/transaccion', verificarSesion, async (req, res) => {
    try {
        const { tipo, categoria, monto, descripcion } = req.body;

        if (!monto || !descripcion || !categoria || !tipo) {
            return res.redirect('/tienda?error=Campos+incompletos');
        }

        const nuevaTransaccion = new Transaccion({
            businessId: req.session.businessId,
            tipo,
            categoria,
            monto: parseFloat(monto),
            descripcion
        });

        await nuevaTransaccion.save();
        res.redirect('/tienda');

    } catch (error) {
        console.error("Error al registrar transacción:", error);
        res.redirect('/tienda?error=Error+al+guardar');
    }
});

// Eliminar Transacción del historial
router.post('/tienda/transaccion/eliminar/:id', verificarSesion, async (req, res) => {
    try {
        await Transaccion.findOneAndDelete({ _id: req.params.id, businessId: req.session.businessId });
        res.redirect('/tienda');
    } catch (error) {
        console.error("Error al eliminar transacción:", error);
        res.redirect('/tienda');
    }
});

// Registrar Nuevo Cliente Fiado
router.post('/tienda/cliente', verificarSesion, async (req, res) => {
    try {
        const { nombreCliente, telefono } = req.body;
        if (!nombreCliente) return res.redirect('/tienda');

        const nuevoCliente = new ClienteFiado({
            businessId: req.session.businessId,
            nombreCliente,
            telefono,
            movimientos: []
        });

        await nuevoCliente.save();
        res.redirect('/tienda');
    } catch (error) {
        console.error("Error al crear cliente:", error);
        res.redirect('/tienda');
    }
});

//  Agregar Movimiento (Fiado o Abono) a un Cliente
router.post('/tienda/cliente/:id/movimiento', verificarSesion, async (req, res) => {
    try {
        const { tipo, monto, descripcion, fecha } = req.body;
        const clienteId = req.params.id;

        if (!monto || !descripcion || !tipo) return res.redirect('/tienda');

        const cliente = await ClienteFiado.findOne({ _id: clienteId, businessId: req.session.businessId });
        if (!cliente) return res.redirect('/tienda');

        cliente.movimientos.push({
            tipo,
            monto: parseFloat(monto),
            descripcion,
            fecha: fecha ? new Date(fecha) : Date.now()
        });

        await cliente.save();
        res.redirect('/tienda');

    } catch (error) {
        console.error("Error al agregar movimiento de fiado:", error);
        res.redirect('/tienda');
    }
});

//  Eliminar un movimiento específico del historial del cliente
router.post('/tienda/cliente/:clienteId/movimiento/eliminar/:movId', verificarSesion, async (req, res) => {
    try {
        const { clienteId, movId } = req.params;
        const cliente = await ClienteFiado.findOne({ _id: clienteId, businessId: req.session.businessId });
        
        if (cliente) {
            cliente.movimientos = cliente.movimientos.id(movId) ? cliente.movimientos.filter(m => m._id.toString() !== movId) : cliente.movimientos;
            await cliente.save();
        }

        res.redirect('/tienda');
    } catch (error) {
        console.error("Error al eliminar movimiento:", error);
        res.redirect('/tienda');
    }
});

module.exports = router;