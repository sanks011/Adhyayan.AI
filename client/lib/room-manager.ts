/**
 * Room Management Utilities
 * 
 * This file contains utilities for managing quiz rooms, including:
 * - Automatic cleanup of inactive/completed rooms
 * - Participant activity tracking
 * - Room deletion logic
 */

export class RoomManager {
  /**
   * Schedule periodic cleanup of rooms
   * This should be called when the application starts
   */
  static startCleanupSchedule() {
    // Run cleanup every 2 minutes for more responsive auto-deletion
    setInterval(async () => {
      try {
        console.log('Running scheduled room cleanup...');
        const response = await fetch('/api/rooms/cleanup', {
          method: 'POST',
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Cleanup completed:', result);
        } else {
          console.error('Cleanup failed:', response.statusText);
        }
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }, 2 * 60 * 1000); // 2 minutes
  }

  /**
   * Manually trigger room cleanup
   */
  static async triggerCleanup() {
    try {
      const response = await fetch('/api/rooms/cleanup', {
        method: 'POST',
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Cleanup failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Manual cleanup error:', error);
      throw error;
    }
  }
}

// Auto-start cleanup schedule in browser environment
if (typeof window !== 'undefined') {
  // Only start if not already started
  if (!(window as any).__roomCleanupStarted) {
    RoomManager.startCleanupSchedule();
    (window as any).__roomCleanupStarted = true;
  }
}
