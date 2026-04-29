const https = require('https');

const data = JSON.stringify({
    query: `
        UPDATE categories c
        SET parent_id = l.id
        FROM categories l
        WHERE c.parent_id IS NULL
        AND c.is_language = false
        AND l.is_language = true
        AND (
            c.name ILIKE l.name || ' %'
            OR c.slug LIKE l.slug || '-%'
            OR (c.name ILIKE '%urdu%' AND l.name = 'Urdu')
            OR (c.name ILIKE '%english%' AND l.name = 'English')
            OR (c.name ILIKE '%arabic%' AND l.name = 'Arabic')
            OR (c.name ILIKE '%kashmiri%' AND l.name = 'Kashmiri')
        );
    `
});

const options = {
    hostname: 'abc-books-publishing-house.vercel.app',
    port: 443,
    path: '/api/categories/eval',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, res => {
    let responseData = '';
    res.on('data', d => {
        responseData += d;
    });
    res.on('end', () => {
        console.log(responseData);
    });
});

req.on('error', error => {
    console.error(error);
});

req.write(data);
req.end();
