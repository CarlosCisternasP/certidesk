const sgMail = require('@sendgrid/mail');

exports.handler = async (event, context) => {
  console.log('🔔 Función de notificación ejecutada');
  
  // Verificar método POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    console.log('📨 Datos para notificación:', data);

    // Validar datos esenciales
    if (!data.contactName || !data.contactEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Datos incompletos para notificación' })
      };
    }

    // Configurar SendGrid
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SendGrid API Key no configurada');
    }
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: process.env.TO_EMAIL,
      from: process.env.FROM_EMAIL,
      subject: `🆕 Nuevo Contacto - ${data.companyName || data.contactName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f0fdf4; padding: 20px; border-radius: 0 0 10px 10px; border: 2px solid #10b981; }
                .field { margin-bottom: 12px; padding: 10px; background: white; border-radius: 5px; border-left: 4px solid #10b981; }
                .label { font-weight: bold; color: #059669; font-size: 14px; }
                .value { color: #1e293b; }
                .alert { background: #fef3c7; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: center; border: 1px solid #f59e0b; }
                .timestamp { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🆕 Nuevo Contacto Registrado</h1>
                    <p>CERTIDESK - Plataforma de Gestión Documental</p>
                </div>
                <div class="content">
                    <div class="alert">
                        <strong>🚀 ¡Nueva solicitud de prueba gratuita!</strong>
                    </div>
                    
                    <div class="field">
                        <div class="label">🏢 Empresa</div>
                        <div class="value">${data.companyName || 'No especificada'}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">📋 RUT</div>
                        <div class="value">${data.companyRut || 'No especificado'}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">👤 Contacto Principal</div>
                        <div class="value">
                            <strong>Nombre:</strong> ${data.contactName}<br>
                            <strong>Email:</strong> ${data.contactEmail}<br>
                            <strong>Teléfono:</strong> ${data.contactPhone || 'No especificado'}
                        </div>
                    </div>
                    
                    <div class="field">
                        <div class="label">🏭 Giro / Industria</div>
                        <div class="value">${data.industry || 'No especificado'}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">💻 Sistema Actual</div>
                        <div class="value">${data.currentSystem || 'No especificado'}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">🎯 Necesidad Principal</div>
                        <div class="value">${data.needs ? data.needs.substring(0, 150) + (data.needs.length > 150 ? '...' : '') : 'No especificada'}</div>
                    </div>
                    
                    <div style="background: #dbeafe; padding: 15px; border-radius: 5px; margin-top: 20px; text-align: center;">
                        <strong>📞 Acción Requerida:</strong> Contactar dentro de 24 horas
                    </div>
                    
                    <div class="timestamp">
                        📅 ${new Date().toLocaleString('es-CL', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </div>
                </div>
            </div>
        </body>
        </html>
      `
    };

    await sgMail.send(msg);
    console.log('✅ Notificación de nuevo contacto enviada');

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Notificación enviada correctamente' 
      })
    };

  } catch (error) {
    console.error('❌ Error en notificación:', error);
    
    // No fallar completamente - devolver éxito pero loguear error
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: false, 
        message: 'Notificación falló pero datos guardados',
        error: error.message 
      })
    };
  }

};
