const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map imageId to WebSocket connections
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
      case 'subscribe_masks':
        this.subscribeToMasks(ws, data.inputImageId);
        break;
      case 'unsubscribe_masks':
        this.unsubscribeFromMasks(ws, data.inputImageId);
        break;
      case 'subscribe_generation':
        this.subscribeToGeneration(ws, data.inputImageId);
        break;
      case 'unsubscribe_generation':
        this.unsubscribeFromGeneration(ws, data.inputImageId);
        break;
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
      default:
        console.log('🤷 Unknown WebSocket message type:', data.type);
    }
  }

  subscribeToMasks(ws, inputImageId) {
    if (!inputImageId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'inputImageId is required for mask subscription'
      }));
      return;
    }

    // Store the client with the image ID
    ws.subscribedImageId = inputImageId;
    
    if (!this.clients.has(inputImageId)) {
      this.clients.set(inputImageId, new Set());
    }
    this.clients.get(inputImageId).add(ws);

    console.log(`📺 Client subscribed to mask updates for image ${inputImageId}`);
    
    ws.send(JSON.stringify({
      type: 'subscribed',
      inputImageId,
      message: `Subscribed to mask updates for image ${inputImageId}`
    }));
  }

  unsubscribeFromMasks(ws, inputImageId) {
    if (this.clients.has(inputImageId)) {
      this.clients.get(inputImageId).delete(ws);
      if (this.clients.get(inputImageId).size === 0) {
        this.clients.delete(inputImageId);
      }
    }
    ws.subscribedImageId = null;
    
    console.log(`📺 Client unsubscribed from mask updates for image ${inputImageId}`);
  }

  subscribeToGeneration(ws, inputImageId) {
    if (!inputImageId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'inputImageId is required for generation subscription'
      }));
      return;
    }

    // Store the client with the image ID for generation updates
    ws.subscribedGenerationImageId = inputImageId;
    
    if (!this.clients.has(`gen_${inputImageId}`)) {
      this.clients.set(`gen_${inputImageId}`, new Set());
    }
    this.clients.get(`gen_${inputImageId}`).add(ws);

    console.log(`🎨 Client subscribed to generation updates for image ${inputImageId}`);
    console.log(`🔍 SUBSCRIPTION DEBUG: Total clients for gen_${inputImageId}:`, this.clients.get(`gen_${inputImageId}`).size);
    console.log(`🔍 SUBSCRIPTION DEBUG: All active client keys:`, Array.from(this.clients.keys()));
    console.log(`🔍 SUBSCRIPTION DEBUG: Client connection details:`, {
      userId: ws.userId,
      subscribedImageId: inputImageId,
      timestamp: new Date().toISOString()
    });
    
    ws.send(JSON.stringify({
      type: 'subscribed_generation',
      inputImageId,
      message: `Subscribed to generation updates for image ${inputImageId}`
    }));
  }

  unsubscribeFromGeneration(ws, inputImageId) {
    const key = `gen_${inputImageId}`;
    if (this.clients.has(key)) {
      this.clients.get(key).delete(ws);
      if (this.clients.get(key).size === 0) {
        this.clients.delete(key);
      }
    }
    ws.subscribedGenerationImageId = null;
    
    console.log(`🎨 Client unsubscribed from generation updates for image ${inputImageId}`);
  }

  removeClient(ws) {
    // Clean up subscriptions
    if (ws.subscribedImageId) {
      this.unsubscribeFromMasks(ws, ws.subscribedImageId);
    }
    if (ws.subscribedGenerationImageId) {
      this.unsubscribeFromGeneration(ws, ws.subscribedGenerationImageId);
    }
    
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

  // Notify clients about mask completion
  notifyMaskCompletion(inputImageId, data) {
    const clients = this.clients.get(inputImageId);
    if (clients && clients.size > 0) {
      const message = JSON.stringify({
        type: 'masks_completed',
        inputImageId,
        data,
        timestamp: new Date().toISOString()
      });

      let sentCount = 0;
      clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          sentCount++;
        } else {
          // Remove dead connections
          clients.delete(ws);
        }
      });

      console.log(`📤 Notified ${sentCount} clients about mask completion for image ${inputImageId}`);
      
      // Clean up if no clients left
      if (clients.size === 0) {
        this.clients.delete(inputImageId);
      }
    }
  }

  // Notify clients about mask failure
  notifyMaskFailure(inputImageId, error) {
    const clients = this.clients.get(inputImageId);
    if (clients && clients.size > 0) {
      const message = JSON.stringify({
        type: 'masks_failed',
        inputImageId,
        error: error.message || error,
        timestamp: new Date().toISOString()
      });

      clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });

      console.log(`📤 Notified clients about mask failure for image ${inputImageId}`);
    }
  }

  // Notify clients about generation started
  notifyGenerationStarted(inputImageId, data) {
    const clients = this.clients.get(`gen_${inputImageId}`);
    if (clients && clients.size > 0) {
      const message = JSON.stringify({
        type: 'generation_started',
        inputImageId,
        data,
        timestamp: new Date().toISOString()
      });

      let sentCount = 0;
      clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          sentCount++;
        } else {
          clients.delete(ws);
        }
      });

      console.log(`🎨 Notified ${sentCount} clients about generation started for image ${inputImageId}`);
      
      if (clients.size === 0) {
        this.clients.delete(`gen_${inputImageId}`);
      }
    }
  }

  // Notify clients about generation completion
  notifyGenerationCompleted(inputImageId, data) {
    const clients = this.clients.get(`gen_${inputImageId}`);
    if (clients && clients.size > 0) {
      const message = JSON.stringify({
        type: 'generation_completed',
        inputImageId,
        data,
        timestamp: new Date().toISOString()
      });

      let sentCount = 0;
      clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          sentCount++;
        } else {
          clients.delete(ws);
        }
      });

      console.log(`🎨 Notified ${sentCount} clients about generation completed for image ${inputImageId}`);
      
      if (clients.size === 0) {
        this.clients.delete(`gen_${inputImageId}`);
      }
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

  // Notify clients about generation failure
  notifyGenerationFailed(inputImageId, error) {
    const clients = this.clients.get(`gen_${inputImageId}`);
    if (clients && clients.size > 0) {
      const message = JSON.stringify({
        type: 'generation_failed',
        inputImageId,
        error: error.message || error,
        timestamp: new Date().toISOString()
      });

      clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });

      console.log(`🎨 Notified clients about generation failure for image ${inputImageId}`);
    }
  }

  // Individual variation notifications
  notifyVariationStarted(inputImageId, data) {
    const clients = this.clients.get(`gen_${inputImageId}`);
    if (clients && clients.size > 0) {
      const message = JSON.stringify({
        type: 'variation_started',
        inputImageId,
        data,
        timestamp: new Date().toISOString()
      });

      let sentCount = 0;
      clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          sentCount++;
        } else {
          clients.delete(ws);
        }
      });

      console.log(`🔵 Notified ${sentCount} clients about variation started: ${data.variationNumber}`);
    }
  }

  notifyVariationCompleted(inputImageId, data) {
    const clientKey = `gen_${inputImageId}`;
    const clients = this.clients.get(clientKey);
    
    console.log(`🔍 WebSocket notifyVariationCompleted DEBUG:`, {
      inputImageId,
      clientKey,
      hasClients: !!clients,
      clientCount: clients?.size || 0,
      operationType: data.operationType,
      allClientKeys: Array.from(this.clients.keys()),
      timestamp: new Date().toISOString()
    });
    
    // Also log overall connection stats when no clients found
    if (!clients || clients.size === 0) {
      console.log('🔍 WebSocket Connection Stats when no clients found:', this.getStats());
    }
    
    if (clients && clients.size > 0) {
      const message = JSON.stringify({
        type: 'variation_completed',
        inputImageId,
        data,
        timestamp: new Date().toISOString()
      });

      let sentCount = 0;
      clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          sentCount++;
        } else {
          console.log('🔍 Removing closed WebSocket connection for', clientKey);
          clients.delete(ws);
        }
      });

      console.log(`✅ Notified ${sentCount} clients about variation completed: ${data.variationNumber} (operation: ${data.operationType})`);
    } else {
      console.log(`❌ No clients found for ${clientKey} - variation completion not sent!`);
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

  notifyVariationFailed(inputImageId, data) {
    const clients = this.clients.get(`gen_${inputImageId}`);
    if (clients && clients.size > 0) {
      const message = JSON.stringify({
        type: 'variation_failed',
        inputImageId,
        data,
        timestamp: new Date().toISOString()
      });

      let sentCount = 0;
      clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          sentCount++;
        } else {
          clients.delete(ws);
        }
      });

      console.log(`❌ Notified ${sentCount} clients about variation failed: ${data.variationNumber}`);
    }
  }

  notifyVariationProgress(inputImageId, data) {
    const clients = this.clients.get(`gen_${inputImageId}`);
    if (clients && clients.size > 0) {
      const message = JSON.stringify({
        type: 'variation_progress',
        inputImageId,
        data,
        timestamp: new Date().toISOString()
      });

      let sentCount = 0;
      clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          sentCount++;
        } else {
          clients.delete(ws);
        }
      });

      console.log(`🔄 Notified ${sentCount} clients about variation progress: ${data.variationNumber} (${data.runpodStatus})`);
    }
  }

  notifyBatchCompleted(inputImageId, data) {
    const clients = this.clients.get(`gen_${inputImageId}`);
    if (clients && clients.size > 0) {
      const message = JSON.stringify({
        type: 'batch_completed',
        inputImageId,
        data,
        timestamp: new Date().toISOString()
      });

      let sentCount = 0;
      clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          sentCount++;
        } else {
          clients.delete(ws);
        }
      });

      console.log(`🎯 Notified ${sentCount} clients about batch completed: ${data.successfulVariations}/${data.totalVariations} successful`);
    }
  }

  // Get connection stats
  getStats() {
    const totalConnections = this.wss ? this.wss.clients.size : 0;
    const subscribedImages = this.clients.size;
    const authenticatedUsers = this.userConnections.size;
    
    // Detailed breakdown of subscriptions
    const subscriptionDetails = Array.from(this.clients.entries()).map(([key, clients]) => ({
      key,
      clientCount: clients.size,
      type: String(key).startsWith('gen_') ? 'generation' : 'masks'
    }));
    
    return { 
      totalConnections, 
      subscribedImages, 
      authenticatedUsers,
      subscriptionDetails
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