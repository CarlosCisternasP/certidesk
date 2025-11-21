// netlify/functions/guardar-contacto.js
exports.handler = async (event) => {
    console.log('=== INICIANDO FUNCIÓN GUARDAR-CONTACTO ===');
    
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
        console.log('📝 Procesando solicitud POST...');
        
        const data = JSON.parse(event.body);
        console.log('📊 Datos recibidos del formulario:', JSON.stringify(data, null, 2));
        
        // Validar que tenemos la API Key
        if (!process.env.NEON_API_KEY) {
            console.error('❌ NEON_API_KEY no está configurada');
            throw new Error('Configuración del servidor incompleta');
        }
        console.log('✅ NEON_API_KEY está configurada');

        // Validar campos requeridos
        const camposRequeridos = ['companyName', 'companyRut', 'contactName', 'contactEmail', 'needs'];
        const camposFaltantes = camposRequeridos.filter(campo => !data[campo]?.trim());
        
        if (camposFaltantes.length > 0) {
            console.error('❌ Campos faltantes:', camposFaltantes);
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
            console.error('❌ Email inválido:', data.contactEmail);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'El formato del correo electrónico no es válido' 
                })
            };
        }

        // Preparar datos para tabla_contacto - CON LÍMITES EXACTOS según tu tabla
        const datosTabla = {
            company_name: data.companyName.trim().substring(0, 255),
            company_rut: data.companyRut.trim().substring(0, 20), // ← 20 caracteres máximo
            employee_count: (data.employeeCount || '').substring(0, 50), // ← 50 caracteres máximo
            industry: (data.industry || '').substring(0, 100), // ← 100 caracteres máximo
            contact_name: data.contactName.trim().substring(0, 255),
            contact_phone: data.contactPhone.trim().substring(0, 50),
            contact_email: data.contactEmail.trim().toLowerCase().substring(0, 255),
            current_system: data.currentSystem ? data.currentSystem.substring(0, 100) : null, // ← 100 caracteres máximo
            needs: data.needs.trim(),
            additional_info: data.additionalInfo ? data.additionalInfo.trim() : null, // ← NOMBRE CORRECTO: additional_info
            status: 'pending' // ← No necesita substring ya que "pending" tiene menos de 20 caracteres
        };

        console.log('📦 Datos preparados para Neon:', JSON.stringify(datosTabla, null, 2));

        // Verificar longitudes
        console.log('📏 Longitudes de campos:');
        Object.keys(datosTabla).forEach(key => {
            if (datosTabla[key] !== null && datosTabla[key] !== undefined) {
                console.log(`  ${key}: ${datosTabla[key].length} caracteres`);
            }
        });

        // URL de Neon
        const neonUrl = 'https://ep-frosty-unit-a42qx3oz.apirest.us-east-1.aws.neon.tech/neondb/rest/v1/tabla_contacto';
        console.log('🌐 Enviando a Neon URL:', neonUrl);

        // Enviar a Neon REST API
        console.log('🚀 Iniciando request a Neon...');
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

        console.log('📨 Response status:', neonResponse.status);
        console.log('📨 Response status text:', neonResponse.statusText);

        const responseText = await neonResponse.text();
        console.log('📨 Response body:', responseText);

        if (!neonResponse.ok) {
            console.error('❌ Error de Neon API:', {
                status: neonResponse.status,
                statusText: neonResponse.statusText,
                body: responseText
            });
            
            let mensajeError = `Error ${neonResponse.status}: ${neonResponse.statusText}`;
            
            if (neonResponse.status === 400) {
                // Mostrar el error específico de Neon si está disponible
                try {
                    const errorJson = JSON.parse(responseText);
                    mensajeError = `Error en los datos: ${errorJson.message || responseText}`;
                } catch (e) {
                    mensajeError = 'Error en los datos enviados. Verifica que todos los campos sean válidos.';
                }
            } else if (neonResponse.status === 401) {
                mensajeError = 'Error de autenticación con la base de datos';
            } else if (neonResponse.status === 404) {
                mensajeError = 'Tabla no encontrada en la base de datos';
            } else if (neonResponse.status === 500) {
                mensajeError = 'Error interno del servidor de base de datos';
            }
            
            throw new Error(mensajeError);
        }

        // Intentar parsear la respuesta como JSON
        let resultado;
        try {
            resultado = JSON.parse(responseText);
            console.log('✅ Respuesta exitosa de Neon:', JSON.stringify(resultado, null, 2));
        } catch (parseError) {
            console.error('❌ Error parseando respuesta JSON:', parseError);
            resultado = { success: true, rawResponse: responseText };
        }

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Solicitud recibida correctamente. Nos contactaremos dentro de 24 horas.',
                data: resultado[0] || resultado
            })
        };

    } catch (error) {
        console.error('💥 Error completo en la función:', {
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
