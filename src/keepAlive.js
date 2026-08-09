const http = require("http");

// Minimal HTTP server so Render (web service) detects an open port and
// an external pinger (UptimeRobot / cron-job.org) can hit it to prevent
// the free tier from spinning down after 15 min of inactivity.
module.exports = function keepAlive() {
    const port = process.env.PORT || 3000;

    http
        .createServer((req, res) => {
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("OK");
        })
        .listen(port, () => {
            console.log(`🌐 Keep-alive server listening on port ${port}`);
        });
};
