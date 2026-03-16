
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const formData = require('form-data');
const Mailgun = require('mailgun.js');

async function testEmail() {
    console.log('--- Mailgun Test Tool ---');
    console.log('Domain:', process.env.MAILGUN_DOMAIN);
    console.log('API Key:', process.env.MAILGUN_API_KEY ? 'Present (Hidden)' : 'MISSING');
    
    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
        console.error('❌ Missing Mailgun configuration in .env');
        return;
    }

    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({ 
        username: 'api', 
        key: process.env.MAILGUN_API_KEY 
    });

    const domains = [
        process.env.MAILGUN_DOMAIN,
        // In case they misconfigured it
        'mg.abcbooks.store' 
    ];

    const toEmail = 'abcpublishinghouse@gmail.com'; // Use their own email for testing

    try {
        console.log(`🚀 Sending test email to ${toEmail}...`);
        const result = await mg.messages.create(process.env.MAILGUN_DOMAIN, {
            from: `ABC Books Test <support@${process.env.MAILGUN_DOMAIN}>`,
            to: [toEmail],
            subject: 'Test Email from ABC Books',
            text: 'If you receive this, your Mailgun configuration is working!',
            html: '<h1>Success!</h1><p>Your Mailgun configuration is working.</p>'
        });
        console.log('✅ Success! message ID:', result.id);
    } catch (error) {
        console.error('❌ Failed to send email:');
        console.error('Status:', error.status);
        console.error('Details:', error.details);
        console.error('Message:', error.message);
        
        if (error.status === 401) {
            console.log('💡 Tip: Your API Key might be invalid.');
        } else if (error.status === 404) {
            console.log('💡 Tip: The domain might be incorrect or you might be using the wrong region (US vs EU).');
            console.log('Trying EU region...');
            try {
                const mgEU = mailgun.client({ 
                    username: 'api', 
                    key: process.env.MAILGUN_API_KEY,
                    url: 'https://api.eu.mailgun.net'
                });
                const resultEU = await mgEU.messages.create(process.env.MAILGUN_DOMAIN, {
                    from: `ABC Books Test <support@${process.env.MAILGUN_DOMAIN}>`,
                    to: [toEmail],
                    subject: 'Test Email from ABC Books (EU)',
                    html: '<h1>Success (EU)!</h1>'
                });
                console.log('✅ Success using EU region! message ID:', resultEU.id);
                console.log('💡 Recommendation: Update your email service to use the EU endpoint.');
            } catch (euError) {
                console.error('❌ EU region also failed:', euError.message);
            }
        } else if (error.status === 403) {
            console.log('💡 Tip: Permission denied. If this is a Sandbox domain, make sure the recipient is authorized.');
        }
    }
}

testEmail();
