// netlify/functions/guardar-contacto.js
const { Pool } = require('pg');

exports.handler = async (event, context) => {
  // Solo permitir método POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    // Parsear los datos del formulario
    const data = JSON.parse(event.body);
    
    // Validar datos requeridos
    const required = ['companyName', 'companyRut', 'contactName', 'contactEmail', 'contactPhone', 'needs'];
    for (const field of required) {
      if (!data[field] || data[field].trim() === '') {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `El campo ${field} es requerido` })
        };
      }
    }

    // Configurar conexión a PostgreSQL usando variables de entorno de Netlify
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Insertar en la base de datos
    const query = `
      INSERT INTO tabla_contacto (
        nombre_empresa, 
        rut_empresa, 
        cantidad_empleados, 
        giro_empresa, 
        nombre_contacto, 
        telefono_contacto, 
        email_contacto, 
        sistema_actual, 
        necesidades, 
        informacion_adicional,
        fecha_creacion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING id
    `;

    const values = [
      data.companyName,
      data.companyRut,
      data.employeeCount,
      data.industry,
      data.contactName,
      data.contactPhone,
      data.contactEmail,
      data.currentSystem,
      data.needs,
      data.additionalInfo || ''
    ];

    const client = await pool.connect();
    
    try {
      const result = await client.query(query, values);
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Solicitud guardada correctamente',
          data: result.rows[0]
        })
      };
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error en la función:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error.message 
      })
    };
  }
};
