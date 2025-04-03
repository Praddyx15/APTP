/**
 * Vite HMR WebSocket Fix
 * 
 * This file patches Vite's WebSocket connection to ensure it works
 * properly in both Replit and non-Replit environments.
 * 
 * Reference: https://vitejs.dev/guide/api-hmr.html
 */

// Detect if we're in a Replit environment
const isReplitEnvironment = typeof window !== 'undefined' && 
  (window.location.hostname.endsWith('.replit.dev') || 
   window.location.hostname.endsWith('.replit.app'));

// Fix Vite WebSocket connection
if (typeof window !== 'undefined') {
  // Store the original WebSocket class
  const OriginalWebSocket = window.WebSocket;
  
  // Create a patched WebSocket constructor function
  const PatchedWebSocket = function(
    this: WebSocket, 
    url: string | URL, 
    protocols?: string | string[]
  ) {
    try {
      // Parse the URL
      const urlObj = typeof url === 'string' ? new URL(url) : url;
      
      // For Vite HMR websocket connections
      if (urlObj.pathname === '/' && 
          urlObj.hostname === 'localhost' && 
          (urlObj.protocol === 'ws:' || urlObj.protocol === 'wss:')) {
            
        // Fix undefined port issue
        if (urlObj.port === 'undefined' || urlObj.port === '' || !urlObj.port) {
          // Use the current window location port if available, or default to 3000
          const currentPort = window.location.port || '3000';
          urlObj.port = currentPort;
          console.log(`[Vite WebSocket Fix] Fixed undefined port, using: ${currentPort}`);
        }
          
        // Handle Replit environment specifically
        if (isReplitEnvironment) {
          // The WebSocket should use the same host as the current page in Replit
          urlObj.hostname = window.location.hostname;
          urlObj.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        }
        
        // Reconstruct the URL with our fixes
        url = urlObj.toString();
        console.log(`[Vite WebSocket Fix] Reconnecting to: ${url}`);
      }
      
      // Create the WebSocket with our fixed URL
      return new OriginalWebSocket(url, protocols);
    } catch (error) {
      console.error('[Vite WebSocket Fix] Error patching WebSocket:', error);
      
      // Fall back to original behavior
      return new OriginalWebSocket(url, protocols);
    }
  } as unknown as typeof WebSocket;
  
  // Copy properties from the original WebSocket
  PatchedWebSocket.prototype = OriginalWebSocket.prototype;
  
  // Copy the constants using defineProperties to handle readonly properties
  Object.defineProperties(PatchedWebSocket, {
    CONNECTING: { value: OriginalWebSocket.CONNECTING },
    OPEN: { value: OriginalWebSocket.OPEN },
    CLOSING: { value: OriginalWebSocket.CLOSING },
    CLOSED: { value: OriginalWebSocket.CLOSED },
  });
  
  // Replace the original WebSocket with our patched version
  window.WebSocket = PatchedWebSocket;
  
  console.log('[Vite WebSocket Fix] WebSocket patched for Vite HMR');
  
  // Add error handler to catch any WebSocket errors
  window.addEventListener('error', function(event) {
    // Check if the error is related to WebSocket
    if (event.message && (
      event.message.includes('WebSocket') || 
      event.message.includes('ws:') || 
      event.message.includes('wss:')
    )) {
      // Prevent the error from showing in the console
      event.preventDefault();
      console.info('[HMR] WebSocket connection error caught and handled');
    }
  }, true);
}