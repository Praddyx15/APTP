import { spawn } from 'child_process';

// Start the proxy server as a child process
console.log('Starting access proxy on port 8080');
console.log('Access your application at: http://localhost:8080');

// Configure environment variables
process.env.PROXY_PORT = '8080';
process.env.PROXY_TARGET = 'http://localhost:5000';

// Spawn the proxy server process
const proxyServer = spawn('node', ['proxy-server.js'], {
  stdio: 'inherit',
  env: process.env
});

// Handle process exit
process.on('SIGINT', () => {
  console.log('Shutting down proxy server...');
  proxyServer.kill('SIGINT');
  process.exit(0);
});

process.on('exit', () => {
  proxyServer.kill();
});