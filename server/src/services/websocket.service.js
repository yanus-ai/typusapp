const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.userConnections = new Map(); // Map userId to single WebSocket connection
    this.connectionToUser = new Map(); // Map WebSocket to userId for cleanup
    this.connectionHealth = new Map(); // Map userId to connection health metrics
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws, req) => {
      console.log('🔗 WebSocket connection established');

      // Extract token from query parameters or headers
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token') || req.headers.authorization?.replace('Bearer ', '');
      
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const userId = decoded.id;
          
          // Check if user already has a connection
          const existingConnection = this.userConnections.get(userId);
          if (existingConnection && existingConnection.readyState === WebSocket.OPEN) {
            console.log(`🔄 Closing existing connection for user ${userId}`);
            existingConnection.close(1000, 'New connection established');
          }
          
          // Store the new connection for this user
          this.userConnections.set(userId, ws);
          this.connectionToUser.set(ws, userId);
          ws.userId = userId;
          
          // Track connection health
          this.connectionHealth.set(userId, {
            connectedAt: new Date().toISOString(),
            reconnectionCount: (this.connectionHealth.get(userId)?.reconnectionCount || 0) + (existingConnection ? 1 : 0),
            lastPingTime: Date.now(),
            isHealthy: true
          });
          
          console.log(`✅ Authenticated WebSocket connection for user ${userId}`, {
            totalUserConnections: this.userConnections.size,
            connectionHealthEntries: this.connectionHealth.size,
            userConnectionExists: this.userConnections.has(userId),
            connectionHealthExists: this.connectionHealth.has(userId)
          });
        } catch (error) {
          console.error('❌ WebSocket authentication failed:', error);
          ws.close(1008, 'Authentication failed');
          return;
        }
      } else {
        console.log('⚠️ WebSocket connection without authentication token');
      }

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('❌ Invalid WebSocket message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        this.removeClient(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.removeClient(ws);
      });

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'WebSocket connected successfully',
        authenticated: !!ws.userId
      }));
    });

    console.log('🚀 WebSocket server initialized on /ws');
    
    // Start periodic connection health check
    setInterval(() => {
      this.validateConnectionMappings();
    }, 30000); // Check every 30 seconds
  }

  handleMessage(ws, data) {
    switch (data.type) {
      case 'ping':
        // Update connection health on ping
        if (ws.userId && this.connectionHealth.has(ws.userId)) {
          const health = this.connectionHealth.get(ws.userId);
          health.lastPingTime = Date.now();
          health.isHealthy = true;
        }

        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString(),
          userId: ws.userId
        }));
        console.log(`💗 WebSocket heartbeat pong sent to user ${ws.userId || 'unknown'}`);
        break;
      case 'subscribe_masks':
      case 'unsubscribe_masks':
      case 'subscribe_generation':
      case 'unsubscribe_generation':
        // Legacy subscription messages - ignored in unified approach
        console.log('🔄 Legacy subscription message ignored:', data.type);
        break;
      default:
        console.log('🤷 Unknown WebSocket message type:', data.type);
    }
  }


  removeClient(ws) {
    // Clean up user connection mapping
    const userId = this.connectionToUser.get(ws);
    if (userId) {
      this.userConnections.delete(userId);
      this.connectionToUser.delete(ws);

      // Update connection health to mark as disconnected
      if (this.connectionHealth.has(userId)) {
        const health = this.connectionHealth.get(userId);
        health.isHealthy = false;
        health.disconnectedAt = new Date().toISOString();
      }

      console.log(`🧹 Cleaned up connection mapping for user ${userId}`, {
        remainingUserConnections: this.userConnections.size,
        remainingConnectionHealth: this.connectionHealth.size,
        allActiveUserIds: Array.from(this.userConnections.keys()),
        reason: 'WebSocket close/error event'
      });
    }
  }

  // Notify user about mask completion
  notifyUserMaskCompletion(userId, inputImageId, data) {
    const connection = this.getUserConnection(userId);
    if (connection) {
      const message = {
        type: 'masks_completed',
        inputImageId,
        data,
        timestamp: new Date().toISOString()
      };

      connection.send(JSON.stringify(message));
      console.log(`✅ Notified user ${userId} about mask completion for image ${inputImageId}`);
      return true;
    } else {
      console.log(`❌ No connection found for user ${userId} for mask completion`);
      return false;
    }
  }

  // Notify user about mask failure
  notifyUserMaskFailure(userId, inputImageId, error) {
    const connection = this.getUserConnection(userId);
    if (connection) {
      const message = {
        type: 'masks_failed',
        inputImageId,
        error: error.message || error,
        timestamp: new Date().toISOString()
      };

      connection.send(JSON.stringify(message));
      console.log(`✅ Notified user ${userId} about mask failure for image ${inputImageId}`);
      return true;
    } else {
      console.log(`❌ No connection found for user ${userId} for mask failure`);
      return false;
    }
  }


  // NEW: Notify user about image generation completion
  notifyUserImageCompleted(userId, data) {
    const connection = this.getUserConnection(userId);
    if (connection) {
      const message = {
        type: 'user_image_completed',
        data: {
          ...data,
          timestamp: new Date().toISOString()
        }
      };
      
      connection.send(JSON.stringify(message));
      console.log(`✅ Notified user ${userId} about image completion: ${data.imageId}`);
      return true;
    } else {
      console.log(`❌ No connection found for user ${userId}`);
      return false;
    }
  }




  // NEW: Notify user about variation completion (user-based notification)
  notifyUserVariationCompleted(userId, data) {
    const connectionHealth = this.connectionHealth.get(userId);
    
    console.log(`🔍 Attempting to notify user ${userId} about variation completion:`, {
      imageId: data.imageId,
      operationType: data.operationType,
      moduleType: data.moduleType,
      totalUserConnections: this.userConnections.size,
      allConnectedUserIds: Array.from(this.userConnections.keys()),
      hasConnectionForUser: this.userConnections.has(userId),
      connectionHealth: connectionHealth ? {
        isHealthy: connectionHealth.isHealthy,
        reconnectionCount: connectionHealth.reconnectionCount,
        timeSinceLastPing: connectionHealth.lastPingTime ? Date.now() - connectionHealth.lastPingTime : 'unknown'
      } : 'no-health-data'
    });
    
    const connection = this.getUserConnection(userId);
    if (connection) {
      const message = {
        type: 'user_variation_completed', 
        data: {
          ...data,
          timestamp: new Date().toISOString()
        }
      };
      
      connection.send(JSON.stringify(message));
      console.log(`✅ Notified user ${userId} about variation completion: ${data.imageId} (${data.operationType})`);
      return true;
    } else {
      console.log(`❌ No connection found for user ${userId} - connection details:`, {
        userExists: this.userConnections.has(userId),
        connectionCount: this.userConnections.size,
        activeUserIds: Array.from(this.userConnections.keys())
      });
      return false;
    }
  }

  // Notify user about variation started (generation beginning)
  notifyVariationStarted(userId, data) {
    const connectionHealth = this.connectionHealth.get(userId);

    console.log(`🔍 Attempting to notify user ${userId} about variation started:`, {
      imageId: data.imageId,
      batchId: data.batchId,
      operationType: data.operationType,
      moduleType: data.moduleType,
      totalUserConnections: this.userConnections.size,
      allConnectedUserIds: Array.from(this.userConnections.keys()),
      hasConnectionForUser: this.userConnections.has(userId),
      connectionHealth: connectionHealth ? {
        isHealthy: connectionHealth.isHealthy,
        reconnectionCount: connectionHealth.reconnectionCount,
        timeSinceLastPing: connectionHealth.lastPingTime ? Date.now() - connectionHealth.lastPingTime : 'unknown'
      } : 'no-health-data'
    });

    const connection = this.getUserConnection(userId);
    if (connection) {
      const message = {
        type: 'variation_started',
        data: {
          ...data,
          timestamp: new Date().toISOString()
        }
      };

      connection.send(JSON.stringify(message));
      console.log(`✅ Notified user ${userId} about variation started: ${data.imageId} (${data.operationType})`);
      return true;
    } else {
      console.log(`❌ No connection found for user ${userId} for variation started notification - connection details:`, {
        userExists: this.userConnections.has(userId),
        connectionCount: this.userConnections.size,
        activeUserIds: Array.from(this.userConnections.keys())
      });
      return false;
    }
  }

  // Notify user about generation started (batch-level notification)
  notifyGenerationStarted(userId, data) {
    const connectionHealth = this.connectionHealth.get(userId);

    console.log(`🔍 Attempting to notify user ${userId} about generation started:`, {
      batchId: data.batchId,
      totalVariations: data.totalVariations,
      moduleType: data.moduleType,
      totalUserConnections: this.userConnections.size,
      allConnectedUserIds: Array.from(this.userConnections.keys()),
      hasConnectionForUser: this.userConnections.has(userId),
      connectionHealth: connectionHealth ? {
        isHealthy: connectionHealth.isHealthy,
        reconnectionCount: connectionHealth.reconnectionCount,
        timeSinceLastPing: connectionHealth.lastPingTime ? Date.now() - connectionHealth.lastPingTime : 'unknown'
      } : 'no-health-data'
    });

    const connection = this.getUserConnection(userId);
    if (connection) {
      const message = {
        type: 'generation_started',
        data: {
          ...data,
          timestamp: new Date().toISOString()
        }
      };

      connection.send(JSON.stringify(message));
      console.log(`✅ Notified user ${userId} about generation started: batch ${data.batchId} (${data.totalVariations} variations)`);
      return true;
    } else {
      console.log(`❌ No connection found for user ${userId} for generation started notification - connection details:`, {
        userExists: this.userConnections.has(userId),
        connectionCount: this.userConnections.size,
        activeUserIds: Array.from(this.userConnections.keys())
      });
      return false;
    }
  }

  // REMOVED: Legacy broadcast method - SECURITY VULNERABILITY
  // This method was broadcasting user data to ALL connected users
  notifyVariationCompleted(inputImageId, data) {
    console.error(`🚨 SECURITY: Attempted to use removed broadcast method notifyVariationCompleted for image ${inputImageId}`);
    console.error('🚨 This method has been removed to prevent data leakage between users');
    return false;
  }

  // REMOVED: Legacy broadcast method - SECURITY VULNERABILITY
  // This method was broadcasting user data to ALL connected users
  notifyVariationFailed(inputImageId, data) {
    console.error(`🚨 SECURITY: Attempted to use removed broadcast method notifyVariationFailed for image ${inputImageId}`);
    console.error('🚨 This method has been removed to prevent data leakage between users');
    return false;
  }

  // REMOVED: Legacy broadcast method - SECURITY VULNERABILITY
  // This method was broadcasting user data to ALL connected users
  notifyVariationProgress(inputImageId, data) {
    console.error(`🚨 SECURITY: Attempted to use removed broadcast method notifyVariationProgress for image ${inputImageId}`);
    console.error('🚨 This method has been removed to prevent data leakage between users');
    return false;
  }

  // REMOVED: Legacy broadcast method - SECURITY VULNERABILITY
  // This method was broadcasting user data to ALL connected users
  notifyBatchCompleted(inputImageId, data) {
    console.error(`🚨 SECURITY: Attempted to use removed broadcast method notifyBatchCompleted for image ${inputImageId}`);
    console.error('🚨 This method has been removed to prevent data leakage between users');
    return false;
  }

  // Get connection stats
  getStats() {
    const totalConnections = this.wss ? this.wss.clients.size : 0;
    const authenticatedUsers = this.userConnections.size;
    const healthyConnections = Array.from(this.connectionHealth.values()).filter(h => h.isHealthy).length;

    return {
      totalConnections,
      authenticatedUsers,
      healthyConnections,
      connectionHealthEntries: this.connectionHealth.size
    };
  }

  // Debug method to log current state
  logConnectionState() {
    const stats = this.getStats();
    console.log('🔍 WebSocket Connection State:', stats);
    return stats;
  }

  // Get user's connection if exists and is open
  getUserConnection(userId) {
    const connection = this.userConnections.get(userId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      return connection;
    }
    
    // Clean up stale connection
    if (connection) {
      console.log(`🧹 Removing stale connection for user ${userId}, readyState:`, connection.readyState);
      this.userConnections.delete(userId);
      this.connectionToUser.delete(connection);
    }
    
    // Check if we have active connections that might belong to this user but aren't mapped
    if (!connection) {
      console.log(`🔍 No connection found for user ${userId}, checking for orphaned connections...`);
      let foundOrphanedConnection = false;
      
      // Look through all connections to see if any belong to this user
      if (this.wss && this.wss.clients) {
        this.wss.clients.forEach(client => {
          if (client.userId === userId && client.readyState === WebSocket.OPEN) {
            console.log(`🔄 Found orphaned connection for user ${userId}, remapping...`);
            this.userConnections.set(userId, client);
            this.connectionToUser.set(client, userId);
            foundOrphanedConnection = true;
            return client;
          }
        });
      }
      
      if (foundOrphanedConnection) {
        return this.userConnections.get(userId);
      }
    }
    
    return null;
  }

  // Send message to specific user
  sendToUser(userId, message) {
    const connection = this.getUserConnection(userId);
    if (connection) {
      connection.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  // Validate and fix connection mapping inconsistencies
  validateConnectionMappings() {
    if (!this.wss || !this.wss.clients) return;
    
    let mappingIssuesFound = 0;
    let orphanedConnections = 0;
    
    // Check for orphaned connections (connected but not in userConnections map)
    this.wss.clients.forEach(client => {
      if (client.userId && client.readyState === WebSocket.OPEN) {
        if (!this.userConnections.has(client.userId)) {
          console.log(`🔄 Fixing orphaned connection for user ${client.userId}`);
          this.userConnections.set(client.userId, client);
          this.connectionToUser.set(client, client.userId);
          orphanedConnections++;
        }
      }
    });
    
    // Check for stale mappings (mapped but connection is closed)
    const staleUserIds = [];
    this.userConnections.forEach((connection, userId) => {
      if (!connection || connection.readyState !== WebSocket.OPEN) {
        console.log(`🧹 Removing stale mapping for user ${userId}, readyState: ${connection?.readyState || 'null'}`);
        staleUserIds.push(userId);
        mappingIssuesFound++;
      }
    });
    
    // Clean up stale mappings
    staleUserIds.forEach(userId => {
      const connection = this.userConnections.get(userId);
      if (connection) {
        this.connectionToUser.delete(connection);
      }
      this.userConnections.delete(userId);
    });
    
    if (mappingIssuesFound > 0 || orphanedConnections > 0) {
      console.log(`🔄 Connection mapping validation completed: ${orphanedConnections} orphaned connections fixed, ${mappingIssuesFound} stale mappings removed`);
    }
  }
}

module.exports = new WebSocketService();