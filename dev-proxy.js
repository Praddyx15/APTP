import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
const app = express();
const PORT = 8080;

// Configure proxy options
const proxyOptions = {
  target: 'http://localhost:5000',
  changeOrigin: true,
  logLevel: 'debug',
  onProxyRes: (proxyRes, req, res) => {
    // Add CORS headers
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
  }
};

// Create proxy middleware
const proxy = createProxyMiddleware(proxyOptions);

// Use proxy for all routes
app.use('/', proxy);

// Start the proxy server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log(`Proxying to: http://localhost:5000`);
});