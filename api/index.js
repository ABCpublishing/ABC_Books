const app = require('../backend/server.js');

module.exports = (req, res) => {
    // Pass to Express
    return app(req, res);
};
