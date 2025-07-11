// WebSocket utility functions to prevent URL validation errors

export function createValidWebSocketUrl(host: string, token: string): string {
  try {
    // Ensure we have a valid host
    if (!host || host === 'undefined' || host === 'null') {
      host = window.location.host;
    }
    
    // Validate token
    if (!token || token === 'undefined' || token === 'null') {
      throw new Error('Invalid authentication token');
    }
    
    // Create protocol
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    
    // Construct URL with proper encoding
    const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`;
    
    // Validate URL format
    const urlPattern = /^wss?:\/\/[^\/\s]+\/ws\?token=.+$/;
    if (!urlPattern.test(wsUrl)) {
      throw new Error('Invalid WebSocket URL format');
    }
    
    return wsUrl;
  } catch (error) {
    console.error('Failed to create valid WebSocket URL:', error);
    throw error;
  }
}

export function isValidWebSocketUrl(url: string): boolean {
  try {
    const urlPattern = /^wss?:\/\/[^\/\s]+\/ws\?token=.+$/;
    return urlPattern.test(url);
  } catch {
    return false;
  }
}