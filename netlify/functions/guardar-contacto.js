const { Pool } = require('pg');

exports.handler = async (event, context) => {
  console.log('🔧 Function iniciada');
  console.log('📦 DATABASE_URL:', process.env.DATABASE_URL ? 'Configurada' : 'NO CONFIGURADA');
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    console.log('📝 Datos recibidos:', JSON.stringify(data, null, 2));

    // Validación básica
    if (!data.contactEmail || !data.contactName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email y nombre son requeridos' })
      };
    }

    // VERIFICAR VARIABLE DE ENTORNO
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL no configurada en variables de entorno');
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Configuración de base de datos faltante. Contacta al administrador.' 
        })
      };
    }

    console.log('🔌 Conectando a la base de datos...');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { 
        rejectUnauthorized: false 
      },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000
    });

    const client = await pool.connect();
    console.log('✅ Conexión a BD exitosa');
    
    try {
      // Crear tabla si no existe
      console.log('🗃️ Creando/verificando tabla...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS tabla_contacto (
          id SERIAL PRIMARY KEY,
          nombre_empresa VARCHAR(255),
          rut_empresa VARCHAR(20),
          cantidad_empleados VARCHAR(50),
          giro_empresa VARCHAR(100),
          nombre_contacto VARCHAR(255) NOT NULL,
          telefono_contacto VARCHAR(50),
          email_contacto VARCHAR(255) NOT NULL,
          sistema_actual VARCHAR(100),
          necesidades TEXT,
          informacion_adicional TEXT,
          fecha_creacion TIMESTAMP DEFAULT NOW()
        )
      `);

      console.log('💾 Insertando datos...');
      // Insertar datos
      const result = await client.query(
        `INSERT INTO tabla_contacto (
          nombre_empresa, rut_empresa, cantidad_empleados, giro_empresa,
          nombre_contacto, telefono_contacto, email_contacto, sistema_actual,
          necesidades, informacion_adicional
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          data.companyName || '',
          data.companyRut || '',
          data.employeeCount || '',
          data.industry || '',
          data.contactName || '',
          data.contactPhone || '',
          data.contactEmail || '',
          data.currentSystem || '',
          data.needs || '',
          data.additionalInfo || ''
        ]
      );

      const insertedId = result.rows[0].id;
      console.log('✅ Datos insertados correctamente. ID:', insertedId);

      // 🔔 ENVIAR NOTIFICACIÓN DIRECTAMENTE
      try {
        console.log('🔔 Enviando notificación directamente...');
        await sendNotificationDirectly(data, insertedId);
        console.log('✅ Notificación enviada correctamente');
      } catch (notificationError) {
        console.log('⚠️ Error en notificación, pero datos guardados:', notificationError.message);
      }
      // 🔔 FIN DE NOTIFICACIÓN DIRECTA
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: '¡Solicitud enviada correctamente! Nos contactaremos dentro de 24 horas.',
          id: insertedId
        })
      };

    } catch (dbError) {
      console.error('❌ Error de base de datos:', dbError);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Error de base de datos: ' + dbError.message 
        })
      };
    } finally {
      client.release();
      console.log('🔌 Conexión liberada');
    }

  } catch (error) {
    console.error('💥 Error general:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Error interno del servidor: ' + error.message 
      })
    };
  }
};

// FUNCIÓN PARA ENVIAR NOTIFICACIÓN DIRECTAMENTE
async function sendNotificationDirectly(formData, recordId) {
  try {
    const sgMail = require('@sendgrid/mail');
    
    console.log('🔍 Verificando variables SendGrid:');
    console.log('   - SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ Configurada' : '❌ NO configurada');
    console.log('   - FROM_EMAIL:', process.env.FROM_EMAIL || '❌ NO configurada');
    console.log('   - TO_EMAIL:', process.env.TO_EMAIL || '❌ NO configurada');
    
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SendGrid API Key no configurada');
    }
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: process.env.TO_EMAIL,
      from: process.env.FROM_EMAIL,
      subject: `🆕 Nuevo Contacto - ${formData.companyName || formData.contactName}`,
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
                        <div class="value">${formData.companyName || 'No especificada'}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">📋 RUT</div>
                        <div class="value">${formData.companyRut || 'No especificado'}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">👤 Contacto Principal</div>
                        <div class="value">
                            <strong>Nombre:</strong> ${formData.contactName}<br>
                            <strong>Email:</strong> ${formData.contactEmail}<br>
                            <strong>Teléfono:</strong> ${formData.contactPhone || 'No especificado'}
                        </div>
                    </div>
                    
                    <div class="field">
                        <div class="label">🏭 Giro / Industria</div>
                        <div class="value">${formData.industry || 'No especificado'}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">💻 Sistema Actual</div>
                        <div class="value">${formData.currentSystem || 'No especificado'}</div>
                    </div>
                    
                    <div class="field">
                        <div class="label">🎯 Necesidad Principal</div>
                        <div class="value">${formData.needs || 'No especificada'}</div>
                    </div>
                    
                    ${formData.additionalInfo ? `
                    <div class="field">
                        <div class="label">📝 Información Adicional</div>
                        <div class="value">${formData.additionalInfo}</div>
                    </div>
                    ` : ''}
                    
                    <div style="background: #dbeafe; padding: 15px; border-radius: 5px; margin-top: 20px; text-align: center;">
                        <strong>📞 Acción Requerida:</strong> Contactar dentro de 24 horas
                    </div>
                    
                    <div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px;">
                        📅 ${new Date().toLocaleString('es-CL')} | ID: #${recordId}
                    </div>
                </div>
            </div>
        </body>
        </html>
      `
    };

    await sgMail.send(msg);
    console.log('✅ Email de notificación enviado directamente');
    return true;
    
  } catch (error) {
    console.error('❌ Error enviando notificación:', error);
    throw error;
  }
}
