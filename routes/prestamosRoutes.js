const express = require('express');
const router = express.Router();
const PrestamoEmpresa = require('../models/PrestamoEmpresa');

const verificarSesion = (req, res, next) => {
    if (!req.session.loggedin) {
        return res.redirect('/login');
    }
    next();
};

// 1. Vista principal de Préstamos (Listado de Tarjetas, Flujo General y por Tarjeta)
router.get('/prestamos', verificarSesion, async (req, res) => {
    try {
        const businessId = req.session.businessId;
        const { tarjetaId, mes, anio } = req.query;

        // Obtener todas las tarjetas/empresas de préstamos del negocio actual
        const tarjetas = await PrestamoEmpresa.find({ businessId }).sort({ createdAt: -1 });

        // --- FLUJO GENERAL (Todas las tarjetas juntas) ---
        let generalPrestados = 0;
        let generalAbonados = 0;
        let generalIntereses = 0;

        tarjetas.forEach(t => {
            t.clientes.forEach(c => {
                c.movimientos.forEach(m => {
                    // Aplicar filtro de mes/año general si existe
                    if (mes && anio) {
                        const f = new Date(m.fecha);
                        if (f.getMonth() + 1 !== parseInt(mes) || f.getFullYear() !== parseInt(anio)) return;
                    }
                    if (m.tipo === 'prestamo') generalPrestados += m.monto;
                    if (m.tipo === 'abono') generalAbonados += m.monto;
                    if (m.tipo === 'interes') generalIntereses += m.monto;
                });
            });
        });

        const generalBalance = generalAbonados - generalPrestados; // O la lógica de cartera activa

        // --- TARJETA SELECCIONADA ESPECÍFICA (Si el usuario selecciona una) -->
        let tarjetaSeleccionada = null;
        let tarjetaPrestados = 0;
        let tarjetaAbonados = 0;
        let tarjetaIntereses = 0;

        if (tarjetaId) {
            tarjetaSeleccionada = tarjetas.find(t => t._id.toString() === tarjetaId);
            if (tarjetaSeleccionada) {
                tarjetaSeleccionada.clientes.forEach(c => {
                    c.movimientos.forEach(m => {
                        if (mes && anio) {
                            const f = new Date(m.fecha);
                            if (f.getMonth() + 1 !== parseInt(mes) || f.getFullYear() !== parseInt(anio)) return;
                        }
                        if (m.tipo === 'prestamo') tarjetaPrestados += m.monto;
                        if (m.tipo === 'abono') tarjetaAbonados += m.monto;
                        if (m.tipo === 'interes') tarjetaIntereses += m.monto;
                    });
                });
            }
        }

        res.render('prestamos', {
            userName: req.session.userName,
            tarjetas,
            tarjetaSeleccionada,
            general: { prestados: generalPrestados, abonados: generalAbonados, intereses: generalIntereses, balance: generalBalance },
            tarjetaFiltros: { prestados: tarjetaPrestados, abonados: tarjetaAbonados, intereses: tarjetaIntereses },
            filtroMes: mes || '',
            filtroAnio: anio || '',
            tarjetaActivaId: tarjetaId || ''
        });

    } catch (error) {
        console.error("Error al cargar préstamos:", error);
        res.status(500).send("Error interno del servidor");
    }
});

// 2. Crear nueva Empresa / Tarjeta de Préstamos
router.post('/prestamos/tarjeta', verificarSesion, async (req, res) => {
    try {
        const { nombreTarjeta, descripcion } = req.body;
        if (!nombreTarjeta) return res.redirect('/prestamos');

        const nuevaTarjeta = new PrestamoEmpresa({
            businessId: req.session.businessId,
            nombreTarjeta,
            descripcion,
            clientes: []
        });

        await nuevaTarjeta.save();
        res.redirect('/prestamos');
    } catch (error) {
        console.error("Error al crear tarjeta:", error);
        res.redirect('/prestamos');
    }
});

// 3. Editar Tarjeta de Préstamos
router.post('/prestamos/tarjeta/editar/:id', verificarSesion, async (req, res) => {
    try {
        const { nombreTarjeta, descripcion } = req.body;
        await PrestamoEmpresa.findOneAndUpdate(
            { _id: req.params.id, businessId: req.session.businessId },
            { nombreTarjeta, descripcion }
        );
        res.redirect('/prestamos');
    } catch (error) {
        console.error("Error al editar tarjeta:", error);
        res.redirect('/prestamos');
    }
});

// 4. Eliminar Tarjeta de Préstamos
router.post('/prestamos/tarjeta/eliminar/:id', verificarSesion, async (req, res) => {
    try {
        await PrestamoEmpresa.findOneAndDelete({ _id: req.params.id, businessId: req.session.businessId });
        res.redirect('/prestamos');
    } catch (error) {
        console.error("Error al eliminar tarjeta:", error);
        res.redirect('/prestamos');
    }
});

// 5. Agregar Cliente a una Tarjeta (Con Código Automático Secuencial)
router.post('/prestamos/tarjeta/:id/cliente', verificarSesion, async (req, res) => {
    try {
        const { nombreCliente, telefono } = req.body;
        const tarjetaId = req.params.id;
        if (!nombreCliente) return res.redirect('/prestamos');

        const tarjeta = await PrestamoEmpresa.findOne({ _id: tarjetaId, businessId: req.session.businessId });
        if (!tarjeta) return res.redirect('/prestamos');

        // Generar código automático: si hay clientes, toma el código mayor y suma 1, sino empieza en 1
        let nuevoCodigo = 1;
        if (tarjeta.clientes.length > 0) {
            const codigos = tarjeta.clientes.map(c => c.codigo);
            nuevoCodigo = Math.max(...codigos) + 1;
        }

        tarjeta.clientes.push({
            codigo: nuevoCodigo,
            nombreCliente,
            telefono,
            movimientos: []
        });

        await tarjeta.save();
        res.redirect(`/prestamos?tarjetaId=${tarjetaId}`);
    } catch (error) {
        console.error("Error al agregar cliente de préstamo:", error);
        res.redirect('/prestamos');
    }
});

// 6. Eliminar Cliente de una Tarjeta
router.post('/prestamos/tarjeta/:tarjetaId/cliente/eliminar/:clienteId', verificarSesion, async (req, res) => {
    try {
        const { tarjetaId, clienteId } = req.params;
        const tarjeta = await PrestamoEmpresa.findOne({ _id: tarjetaId, businessId: req.session.businessId });
        
        if (tarjeta) {
            tarjeta.clientes = tarjeta.clientes.filter(c => c._id.toString() !== clienteId);
            await tarjeta.save();
        }

        res.redirect(`/prestamos?tarjetaId=${tarjetaId}`);
    } catch (error) {
        console.error("Error al eliminar cliente:", error);
        res.redirect('/prestamos');
    }
});

// 7. Agregar Movimiento a Cliente (Préstamo, Abono o Interés)
router.post('/prestamos/tarjeta/:tarjetaId/cliente/:clienteId/movimiento', verificarSesion, async (req, res) => {
    try {
        const { tarjetaId, clienteId } = req.params;
        const { tipo, monto, descripcion, fecha } = req.body;

        if (!tipo || !monto || !descripcion) return res.redirect('/prestamos');

        const tarjeta = await PrestamoEmpresa.findOne({ _id: tarjetaId, businessId: req.session.businessId });
        if (!tarjeta) return res.redirect('/prestamos');

        const cliente = tarjeta.clientes.id(clienteId);
        if (!cliente) return res.redirect('/prestamos');

        cliente.movimientos.push({
            tipo,
            monto: parseFloat(monto),
            descripcion,
            fecha: fecha ? new Date(fecha) : Date.now()
        });

        await tarjeta.save();
        res.redirect(`/prestamos?tarjetaId=${tarjetaId}`);
    } catch (error) {
        console.error("Error al registrar movimiento de préstamo:", error);
        res.redirect('/prestamos');
    }
});

// 8. Eliminar Movimiento de un Cliente
router.post('/prestamos/tarjeta/:tarjetaId/cliente/:clienteId/movimiento/eliminar/:movId', verificarSesion, async (req, res) => {
    try {
        const { tarjetaId, clienteId, movId } = req.params;
        const tarjeta = await PrestamoEmpresa.findOne({ _id: tarjetaId, businessId: req.session.businessId });
        
        if (tarjeta) {
            const cliente = tarjeta.clientes.id(clienteId);
            if (cliente) {
                cliente.movimientos = cliente.movimientos.filter(m => m._id.toString() !== movId);
                await tarjeta.save();
            }
        }

        res.redirect(`/prestamos?tarjetaId=${tarjetaId}`);
    } catch (error) {
        console.error("Error al eliminar movimiento de préstamo:", error);
        res.redirect('/prestamos');
    }
});

module.exports = router;