// Suppress React error overlay for ResizeObserver errors
// This runs before React loads to intercept the error overlay
(function() {
  // Store original error handler
  const originalError = window.Error;
  
  // Intercept error creation
  window.Error = function(message) {
    if (message && typeof message === 'string' && 
        (message.includes('ResizeObserver') || 
         message.includes('undelivered notifications'))) {
      // Return a dummy error that won't trigger the overlay
      return new originalError('Suppressed ResizeObserver error');
    }
    return new originalError(message);
  };
  
  // Preserve Error prototype
  window.Error.prototype = originalError.prototype;
  
  // Override React DevTools error handler if it exists
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const msg = args[0];
    if (typeof msg === 'string' && 
        (msg.includes('ResizeObserver') || 
         msg.includes('undelivered notifications'))) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
  
  // Intercept error events early
  window.addEventListener('error', function(e) {
    if (e.message && 
        (e.message.includes('ResizeObserver') || 
         e.message.includes('undelivered notifications'))) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return false;
    }
  }, { capture: true, passive: false });
})();
