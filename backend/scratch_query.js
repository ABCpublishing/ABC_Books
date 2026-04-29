const { Client } = require('pg');

async function check() {
    const client = new Client({
        connectionString: 'postgresql://neondb_owner:npg_EhaeNt2rB0sO@ep-curly-smoke-an6z66e9-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require'
    });
    
    try {
        await client.connect();
        const res = await client.query('SELECT id, name, parent_id, is_language FROM categories');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

check();
