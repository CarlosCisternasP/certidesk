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

      console.log('✅ Datos insertados correctamente. ID:', result.rows[0].id);
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Solicitud guardada correctamente',
          id: result.rows[0].id
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
