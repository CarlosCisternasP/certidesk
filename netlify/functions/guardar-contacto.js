// netlify/functions/guardar-contacto.js
exports.handler = async (event) => {
    // Configurar CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
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
        const data = JSON.parse(event.body);
        console.log('Datos recibidos:', data);
        
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

        // Preparar datos para tabla_contacto
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
            additional_info: data.additionalInfo ? data.additionalInfo.trim() : null
        };

        console.log('Enviando a Neon:', datosTabla);

        // Enviar a Neon REST API
        const neonResponse = await fetch('https://ep-frosty-unit-a42qx3oz.apirest.us-east-1.aws.neon.tech/neondb/rest/v1/tabla_contacto', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
                'apikey': process.env.NEON_API_KEY,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(datosTabla)
        });

        if (!neonResponse.ok) {
            const errorTexto = await neonResponse.text();
            console.error('Error de Neon:', errorTexto);
            throw new Error(`Error en Neon API: ${neonResponse.status} ${neonResponse.statusText}`);
        }

        const resultado = await neonResponse.json();
        console.log('Respuesta de Neon:', resultado);

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Solicitud recibida correctamente. Nos contactaremos dentro de 24 horas.',
                data: resultado[0] // Neon retorna array con el registro insertado
            })
        };

    } catch (error) {
        console.error('Error en la función:', error);
        
        let mensajeError = 'Error interno del servidor';
        
        if (error.message.includes('Error en Neon API')) {
            mensajeError = 'Error al conectar con la base de datos';
        }

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: mensajeError 
            })
        };
    }
};