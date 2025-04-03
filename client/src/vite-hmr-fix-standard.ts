/**
 * Standard Vite HMR WebSocket Fix
 * 
 * This is a non-Replit specific version of the WebSocket fix
 * for deployment outside of Replit. It handles common WebSocket
 * connection issues in Vite's HMR system.
 */

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
        if (urlObj.port === 'undefined') {
          // Use the current window location port if available, or default to 3000
          const currentPort = window.location.port || '3000';
          urlObj.port = currentPort;
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
  
  console.log('[Vite WebSocket Fix] WebSocket patched for standard environments');
  
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