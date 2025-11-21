// netlify/functions/guardar-contacto.js
exports.handler = async (event) => {
    console.log('Función guardar-contacto ejecutándose');
    
    // Configurar CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Manejar preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return { 
            statusCode: 200, 
            headers, 
            body: '' 
        };
    }

    // Solo permitir POST
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers, 
            body: JSON.stringify({ 
                success: false,
                error: 'Método no permitido' 
            }) 
        };
    }

    try {
        console.log('Procesando solicitud...');
        
        const data = JSON.parse(event.body);
        console.log('Datos recibidos:', JSON.stringify(data, null, 2));
        
        // Validar que tenemos la API Key
        if (!process.env.NEON_API_KEY) {
            console.error('NEON_API_KEY no está configurada');
            throw new Error('Configuración del servidor incompleta');
        }

        // Validar campos requeridos
        const camposRequeridos = ['companyName', 'companyRut', 'contactName', 'contactEmail', 'needs'];
        const camposFaltantes = camposRequeridos.filter(campo => !data[campo]?.trim());
        
        if (camposFaltantes.length > 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Faltan campos obligatorios: ' + camposFaltantes.join(', ') 
                })
            };
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.contactEmail)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'El formato del correo electrónico no es válido' 
                })
            };
        }

        // Preparar datos para tabla_contacto - USANDO EL NOMBRE CORRECTO DE LA COLUMNA
        const datosTabla = {
            company_name: data.companyName.trim(),
            company_rut: data.companyRut.trim(),
            employee_count: data.employeeCount,
            industry: data.industry,
            contact_name: data.contactName.trim(),
            contact_phone: data.contactPhone.trim(),
            contact_email: data.contactEmail.trim().toLowerCase(),
            current_system: data.currentSystem || null,
            needs: data.needs.trim(),
            additions_info: data.additionalInfo ? data.additionalInfo.trim() : null, // ← AQUÍ ESTÁ EL CAMBIO
            status: 'pending' // ← Agregar el campo status que existe en tu tabla
        };

        console.log('Datos preparados para Neon:', JSON.stringify(datosTabla, null, 2));

        // URL CORREGIDA - incluyendo /neondb/
        const neonUrl = 'https://ep-frosty-unit-a42qx3oz.apirest.us-east-1.aws.neon.tech/neondb/rest/v1/tabla_contacto';
        console.log('Enviando a:', neonUrl);

        // Enviar a Neon REST API
        const neonResponse = await fetch(neonUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
                'apikey': process.env.NEON_API_KEY,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(datosTabla)
        });

        console.log('Status de respuesta Neon:', neonResponse.status);
        console.log('Status Text:', neonResponse.statusText);

        if (!neonResponse.ok) {
            const errorTexto = await neonResponse.text();
            console.error('Error detallado de Neon:', {
                status: neonResponse.status,
                statusText: neonResponse.statusText,
                error: errorTexto
            });
            
            let mensajeError = `Error ${neonResponse.status}: ${neonResponse.statusText}`;
            
            if (neonResponse.status === 401) {
                mensajeError = 'Error de autenticación con la base de datos';
            } else if (neonResponse.status === 404) {
                mensajeError = 'Tabla no encontrada en la base de datos';
            } else if (neonResponse.status === 500) {
                mensajeError = 'Error interno del servidor de base de datos';
            }
            
            throw new Error(mensajeError);
        }

        const resultado = await neonResponse.json();
        console.log('Respuesta exitosa de Neon:', JSON.stringify(resultado, null, 2));

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Solicitud recibida correctamente. Nos contactaremos dentro de 24 horas.',
                data: resultado[0]
            })
        };

    } catch (error) {
        console.error('Error completo en la función:', {
            message: error.message,
            stack: error.stack
        });

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: error.message || 'Error interno del servidor'
            })
        };
    }
};
