// server/src/services/intelligenceEngine.js
const nlpService = require('./nlpService');

class IntelligenceEngine {
  constructor() {
    this.conversationMemory = new Map();
    this.userProfiles = new Map();
    this.responseCache = new Map();
    
    setInterval(() => this.cleanupOldSessions(), 6 * 60 * 60 * 1000);
  }

  async processQuery(userMessage, userId, sessionId, aiService) {
    const startTime = Date.now();

    try {
      if (!userMessage || userMessage.trim().length === 0) {
        throw new Error('Порожнє повідомлення');
      }

      if (userMessage.length > 2000) {
        throw new Error('Повідомлення занадто довге (макс. 2000 символів)');
      }

      const analysis = nlpService.analyzeQuery(userMessage);
      const userProfile = this.getUserProfile(userId);
      const sessionContext = this.getSessionContext(sessionId);
      const classification = this.classifyQuery(analysis, userMessage);
      
      const enrichedContext = {
        intent: analysis.intent.intent,
        intentConfidence: analysis.intent.confidence,
        isQuestion: analysis.intent.isQuestion,
        petType: analysis.petAnalysis.petType,
        categories: analysis.petAnalysis.categories,
        primaryCategory: analysis.petAnalysis.primaryCategory,
        sentiment: analysis.sentiment.sentiment,
        entities: analysis.entities,
        keywords: analysis.keywords,
        
        userProfile: {
          totalQueries: userProfile.totalQuestions,
          preferredPetType: userProfile.preferredPetType,
          lastIntent: userProfile.lastIntent
        },
        
        sessionHistory: sessionContext.slice(-5),
        messageCount: sessionContext.length,
        isFirstMessage: sessionContext.length === 0,
        
        classification
      };

      const cacheKey = this.generateCacheKey(userMessage, classification.category);
      if (this.responseCache.has(cacheKey)) {
        const cached = this.responseCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 60 * 60 * 1000) {
          return {
            ...cached.response,
            cached: true,
            processingTime: Date.now() - startTime
          };
        }
      }

      const aiResponse = await aiService.getAIResponse(
        userMessage,
        userId,
        sessionId,
        enrichedContext
      );

      this.addToSessionContext(sessionId, {
        role: 'user',
        content: userMessage,
        analysis
      });

      this.addToSessionContext(sessionId, {
        role: 'assistant',
        content: aiResponse,
        classification
      });

      this.updateUserProfile(userId, {
        lastQuery: userMessage,
        lastIntent: analysis.intent.intent,
        totalQuestions: userProfile.totalQuestions + 1,
        lastPetType: analysis.petAnalysis.petType !== 'unknown' ? 
          analysis.petAnalysis.petType : userProfile.lastPetType,
        preferredPetType: this.determinePreferredPet(userProfile, analysis.petAnalysis.petType)
      });

      const response = {
        success: true,
        message: aiResponse,
        classification,
        metadata: {
          intent: analysis.intent.intent,
          confidence: analysis.intent.confidence,
          petType: analysis.petAnalysis.petType,
          sentiment: analysis.sentiment.sentiment,
          processingTime: Date.now() - startTime,
          messageCount: sessionContext.length + 2,
          keywords: analysis.keywords.slice(0, 5)
        }
      };

      this.responseCache.set(cacheKey, {
        response,
        timestamp: Date.now()
      });

      return response;

    } catch (error) {
      console.error('Intelligence Engine Error:', error);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  classifyQuery(analysis, originalMessage) {
    const { petAnalysis, intent, keywords, entities } = analysis;
    const lower = (originalMessage || '').toLowerCase();

    const shelterKeywords = ['притулок', 'усинов'];
    const hasShelterKeyword = keywords.some(k => shelterKeywords.includes(k));

    const wantsToTakeFromShelter = (keywords.includes('взяти') || lower.includes('взяти')) &&
    (lower.includes('з притул') || lower.includes('зпритул') || lower.includes('з притулку') || lower.includes('зприют') || lower.includes('із притул') );

    if (petAnalysis.primaryCategory === 'adoption' || hasShelterKeyword || wantsToTakeFromShelter) {
    return { category: 'shelter', confidence: 0.85 };
    }

    if (analysis.entities && analysis.entities.breeds && analysis.entities.breeds.length >= 2) {
    return { category: 'breed', confidence: 0.95 };
    }

    if (petAnalysis.primaryCategory === 'breed' ||
    keywords.some(k => ['порода', 'породи', 'породу', 'різниця', 'порівня'].includes(k))) {
    return { category: 'breed', confidence: 0.85 };
    }

    if (petAnalysis.primaryCategory === 'health' ||
    keywords.some(k => ['хвороб', 'ліку', 'ветеринар', 'симптом'].includes(k))) {
    return { category: 'care', confidence: 0.85, subcategory: 'health' };
    }

    if (petAnalysis.primaryCategory === 'care' || petAnalysis.primaryCategory === 'behavior') {
    return { category: 'care', confidence: 0.8 };
    }

    if (keywords.some(k => ['рекоменд', 'порадь', 'підходить', 'краще'].includes(k)) ||
    (intent.intent === 'question' && petAnalysis.hasPetMention)) {
    return { category: 'recommendation', confidence: 0.75 };
    }

    if (intent.intent === 'greeting') {
    return { category: 'general', confidence: 0.9, subcategory: 'greeting' };
    }

    try {
    const aiService = require('./aiService');
    const simple = aiService.classifyQuery(originalMessage);
    return simple || { category: 'general', confidence: 0.5 };
    } catch (err) {
    return { category: 'general', confidence: 0.5 };
    }
  }

  generateCacheKey(message, category) {
    const normalized = message.toLowerCase().trim();
    return `${category}:${normalized.substring(0, 50)}`;
  }

  determinePreferredPet(profile, currentPetType) {
    if (currentPetType === 'unknown') {
      return profile.preferredPetType;
    }
    
    if (!profile.preferredPetType) {
      return currentPetType;
    }
    
    profile.petTypeCounter = profile.petTypeCounter || {};
    profile.petTypeCounter[currentPetType] = (profile.petTypeCounter[currentPetType] || 0) + 1;
    
    const maxCount = Math.max(...Object.values(profile.petTypeCounter));
    if (maxCount >= 3) {
      return Object.keys(profile.petTypeCounter).find(
        key => profile.petTypeCounter[key] === maxCount
      );
    }
    
    return profile.preferredPetType;
  }

  getUserProfile(userId) {
    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, {
        userId,
        createdAt: new Date(),
        totalQuestions: 0,
        preferredPetType: null,
        lastPetType: null,
        lastQuery: null,
        lastIntent: null,
        petTypeCounter: {}
      });
    }
    return this.userProfiles.get(userId);
  }

  updateUserProfile(userId, updates) {
    const profile = this.getUserProfile(userId);
    Object.assign(profile, updates);
    profile.updatedAt = new Date();
  }

  getSessionContext(sessionId) {
    if (!this.conversationMemory.has(sessionId)) {
      this.conversationMemory.set(sessionId, []);
    }
    return this.conversationMemory.get(sessionId);
  }

  addToSessionContext(sessionId, message) {
    const context = this.getSessionContext(sessionId);
    context.push({
      timestamp: new Date(),
      ...message
    });

    if (context.length > 50) {
      context.splice(0, context.length - 50);
    }
  }

  clearSessionContext(sessionId) {
    this.conversationMemory.delete(sessionId);
  }

  cleanupOldSessions() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;
    let cleaned = 0;

    for (const [sessionId, context] of this.conversationMemory.entries()) {
      if (context.length > 0) {
        const lastMessage = context[context.length - 1];
        if (now - new Date(lastMessage.timestamp).getTime() > maxAge) {
          this.conversationMemory.delete(sessionId);
          cleaned++;
        }
      }
    }

    for (const [key, value] of this.responseCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.responseCache.delete(key);
      }
    }

    console.log(`🧹 Cleanup: видалено ${cleaned} старих сесій`);
  }

  getStats() {
    return {
      activeSessions: this.conversationMemory.size,
      activeUsers: this.userProfiles.size,
      cachedResponses: this.responseCache.size,
      totalMessages: Array.from(this.conversationMemory.values())
        .reduce((sum, ctx) => sum + ctx.length, 0)
    };
  }
}

module.exports = new IntelligenceEngine();