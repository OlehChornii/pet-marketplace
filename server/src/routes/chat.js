// server/src/routes/chat.js
const express = require('express');
const auth = require('../middleware/auth');
const intelligenceEngine = require('../services/intelligenceEngine');
const aiService = require('../services/aiService');
const router = express.Router();
const ChatMessage = require('../services/jsonStorage');

router.get('/history/:sessionId', auth.verifyToken, async (req, res) => {
  try {
    const history = await ChatMessage.find({
      userId: String(req.user.id),
      sessionId: String(req.params.sessionId)
    });

    history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/message', auth.verifyToken, async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Поле message обов\'язкове' });
    }
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      return res.status(400).json({ error: 'Поле sessionId обов\'язкове' });
    }

    const result = await intelligenceEngine.processQuery(
      message,
      req.user.id,
      sessionId,
      aiService
    );

    res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/recommend', auth.verifyToken, async (req, res) => {
  try {
    const recommendation = await aiService.recommendPet(req.body);
    res.json({ recommendation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/rate/:messageId', auth.verifyToken, async (req, res) => {
  try {
    const { rating } = req.body;
    await ChatMessage.findByIdAndUpdate(req.params.messageId, { rating });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/query', auth.verifyToken, async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({ 
        error: 'Поля message і sessionId обов\'язкові' 
      });
    }

    const result = await intelligenceEngine.processQuery(
      message,
      req.user.id,
      sessionId,
      aiService
    );

    res.json(result);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

router.get('/stats', auth.verifyToken, async (req, res) => {
  try {
    const stats = intelligenceEngine.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;