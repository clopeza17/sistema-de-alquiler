const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';

async function testLogin() {
  console.log('🧪 Probando login...');
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@sistema.com',
        password: 'admin123'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login exitoso');
      console.log('📱 Token:', data.data.accessToken.substring(0, 50) + '...');
      console.log('👤 Usuario:', data.data.user);
      return data.data.accessToken;
    } else {
      console.log('❌ Error en login:', data.message);
      return null;
    }
  } catch (error) {
    console.log('💥 Error de conexión:', error.message);
    return null;
  }
}

async function testProfile(token) {
  console.log('\n🧪 Probando obtener perfil...');
  
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Perfil obtenido exitosamente');
      console.log('👤 Datos del usuario:', JSON.stringify(data.data.user, null, 2));
    } else {
      console.log('❌ Error obteniendo perfil:', data.message);
    }
  } catch (error) {
    console.log('💥 Error de conexión:', error.message);
  }
}

async function testRegister() {
  console.log('\n🧪 Probando registro de usuario...');
  
  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: `test${Date.now()}@test.com`,
        password: 'test123',
        nombres: 'Usuario',
        apellidos: 'Prueba'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Registro exitoso');
      console.log('👤 Usuario creado:', data.data.user);
    } else {
      console.log('❌ Error en registro:', data.message);
    }
  } catch (error) {
    console.log('💥 Error de conexión:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Iniciando pruebas del sistema de autenticación\n');
  
  // Esperar un poco para que el servidor esté listo
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const token = await testLogin();
  
  if (token) {
    await testProfile(token);
  }
  
  await testRegister();
  
  console.log('\n✅ Pruebas completadas');
}

runTests().catch(console.error);
