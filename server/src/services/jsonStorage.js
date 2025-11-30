// server/src/services/jsonStorage.js
const fs = require('fs').promises;
const path = require('path');

class JSONStorage {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.chatFile = path.join(this.dataDir, 'chat_messages.json');
    this.initialized = false;
    this.writeLock = false;
    this.writeQueue = [];
  }
  
  async init() {
    if (this.initialized) return;
    
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      
      try {
        const data = await fs.readFile(this.chatFile, 'utf8');
        JSON.parse(data);
      } catch {
        await fs.writeFile(this.chatFile, JSON.stringify([], null, 2));
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Init storage error:', error);
      throw error;
    }
  }

  async readData() {
    await this.init();
    try {
      const data = await fs.readFile(this.chatFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Read data error:', error);
      return [];
    }
  }

  async writeData(data) {
    await this.init();
    
    if (this.writeLock) {
      return new Promise((resolve, reject) => {
        this.writeQueue.push({ data, resolve, reject });
      });
    }

    this.writeLock = true;

    try {
      const tempFile = this.chatFile + '.tmp';
      await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
      
      await fs.rename(tempFile, this.chatFile);
      
    } catch (error) {
      console.error('Write data error:', error);
      throw error;
    } finally {
      this.writeLock = false;
      
      if (this.writeQueue.length > 0) {
        const next = this.writeQueue.shift();
        this.writeData(next.data)
          .then(next.resolve)
          .catch(next.reject);
      }
    }
  }
  
  async create(messageData) {
    const data = await this.readData();
    
    const newMessage = {
      id: Date.now().toString(),
      userId: String(messageData.userId),
      sessionId: String(messageData.sessionId),
      userMessage: messageData.userMessage,
      botResponse: messageData.botResponse,
      context: messageData.context || {},
      timestamp: new Date().toISOString()
    };
    
    data.push(newMessage);
    await this.writeData(data);
    
    return newMessage;
  }
  
  async find(query) {
    const data = await this.readData();
    
    return data.filter(msg => {
      let match = true;
      
      if (query.userId && msg.userId !== String(query.userId)) {
        match = false;
      }
      if (query.sessionId && msg.sessionId !== String(query.sessionId)) {
        match = false;
      }
      
      return match;
    });
  }
  
  async deleteMany(query = {}) {
    const data = await this.readData();
    const beforeCount = data.length;
    
    const filtered = data.filter(msg => {
      if (Object.keys(query).length === 0) return false;
      
      let shouldDelete = true;
      
      if (query.userId && msg.userId !== String(query.userId)) {
        shouldDelete = false;
      }
      if (query.sessionId && msg.sessionId !== String(query.sessionId)) {
        shouldDelete = false;
      }
      
      return !shouldDelete;
    });
    
    await this.writeData(filtered);
    
    return {
      deletedCount: beforeCount - filtered.length
    };
  }
  
  sort(messages, field, order = -1) {
    return messages.sort((a, b) => {
      const aVal = new Date(a[field]).getTime();
      const bVal = new Date(b[field]).getTime();
      return order === -1 ? bVal - aVal : aVal - bVal;
    });
  }
  
  limit(messages, count) {
    return messages.slice(0, count);
  }
}

module.exports = new JSONStorage();