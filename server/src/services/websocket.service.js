const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map imageId to WebSocket connections
    this.userConnections = new Map(); // Map userId to single WebSocket connection
    this.connectionToUser = new Map(); // Map WebSocket to userId for cleanup
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
          
          console.log(`✅ Authenticated WebSocket connection for user ${userId}`);
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
        ws.send(JSON.stringify({ type: 'pong' }));
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
      console.log(`🧹 Cleaned up connection mapping for user ${userId}`);
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

  // Get connection stats
  getStats() {
    const totalConnections = this.wss ? this.wss.clients.size : 0;
    const subscribedImages = this.clients.size;
    const authenticatedUsers = this.userConnections.size;
    return { totalConnections, subscribedImages, authenticatedUsers };
  }

  // Get user's connection if exists and is open
  getUserConnection(userId) {
    const connection = this.userConnections.get(userId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      return connection;
    }
    // Clean up stale connection
    if (connection) {
      this.userConnections.delete(userId);
      this.connectionToUser.delete(connection);
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
}

module.exports = new WebSocketService();