
async function healthCheck() {
    const baseUrl = 'http://localhost:3001/api';
    const endpoints = [
        '/books',
        '/categories',
        '/auth/check'
    ];

    console.log('--- ABC Books Health Check ---');
    
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(`${baseUrl}${endpoint}`);
            if (response.ok || (response.status === 401 && endpoint === '/auth/check')) {
                console.log(`✅ ${endpoint}: OK (${response.status})`);
            } else {
                const body = await response.text();
                console.log(`❌ ${endpoint}: Failed with status ${response.status}`);
                console.log(`   Message: ${body}`);
            }
        } catch (error) {
            console.log(`❌ ${endpoint}: Error - ${error.message}`);
        }
    }
}

healthCheck();
