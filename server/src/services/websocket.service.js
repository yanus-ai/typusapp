const WebSocket = require('ws');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map imageId to WebSocket connections
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws, req) => {
      console.log('🔗 WebSocket connection established');

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
        message: 'WebSocket connected successfully'
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
    if (ws.subscribedImageId) {
      this.unsubscribeFromMasks(ws, ws.subscribedImageId);
    }
    if (ws.subscribedGenerationImageId) {
      this.unsubscribeFromGeneration(ws, ws.subscribedGenerationImageId);
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
    return { totalConnections, subscribedImages };
  }
}

module.exports = new WebSocketService();