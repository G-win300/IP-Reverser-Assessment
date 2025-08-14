class IPService {
  /**
   * Extract client IP from request, handling proxy headers
   */
  extractClientIP(req) {
    // Check for forwarded headers (common in load balancers/proxies)
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIP = req.headers['x-real-ip'];
    const clientIP = req.headers['x-client-ip'];
    
    let ip;
    
    if (forwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      ip = forwardedFor.split(',')[0].trim();
    } else if (realIP) {
      ip = realIP;
    } else if (clientIP) {
      ip = clientIP;
    } else {
      // Fallback to connection remote address
      ip = req.connection.remoteAddress || req.socket.remoteAddress;
    }
    
    // Clean up IPv6 wrapped IPv4 addresses
    if (ip && ip.includes('::ffff:')) {
      ip = ip.replace('::ffff:', '');
    }
    
    // Default to localhost if no IP found (for testing)
    return ip || '127.0.0.1';
  }
  
  /**
   * Reverse IP address (e.g., 1.2.3.4 -> 4.3.2.1)
   */
  reverseIP(ip) {
    if (!ip) {
      throw new Error('IP address is required');
    }
    
    // Validate IP format (basic IPv4 validation)
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      throw new Error('Invalid IP address format');
    }
    
    // Split, reverse, and join
    return ip.split('.').reverse().join('.');
  }
  
  /**
   * Validate IP address
   */
  isValidIP(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }
}

module.exports = new IPService();