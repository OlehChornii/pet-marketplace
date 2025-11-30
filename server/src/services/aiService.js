// server/src/services/aiService.js
const { HfInference } = require('@huggingface/inference');
const ChatMessage = require('./jsonStorage'); // Змінено на JSON storage

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

const WORKING_MODELS = {
  primary: 'meta-llama/Llama-3.2-3B-Instruct',
  fallback: 'microsoft/Phi-3-mini-4k-instruct',
  backup: 'HuggingFaceH4/zephyr-7b-beta'
};

class AIService {
  constructor() {
    this.currentModel = process.env.HUGGINGFACE_MODEL || WORKING_MODELS.primary;
  }

  getSystemPrompt() {
    return `Ви - віртуальний помічник Pet Marketplace, експерт з тварин.
Завдання:
1. Допомагати користувачам знайти ідеальну домашню тварину
2. Дати поради щодо догляду за тваринами
3. Розповісти про різні породи
4. Порекомендувати притулки або розвідників
5. Відповідати українською мовою

Будьте дружелюбні, стислі (до 250 слів) та практичні.`;
  }

  async getContext(userId, sessionId, limit = 5) {
    try {
      const history = await ChatMessage.find({
        userId: String(userId),
        sessionId: String(sessionId)
      });

      const sorted = ChatMessage.sort(history, 'timestamp', -1);
      const limited = ChatMessage.limit(sorted, limit);
      const reversed = limited.reverse();

      return reversed.map(msg => ({
        role: msg.userMessage ? 'user' : 'assistant',
        content: msg.userMessage || msg.botResponse
      }));
    } catch (error) {
      console.error('Context fetch error:', error.message);
      return [];
    }
  }

  async callHfAPI(messages, model) {
    try {
    const MODEL_TASK = {
    'meta-llama/Llama-3.2-3B-Instruct': 'conversational',
    'HuggingFaceH4/zephyr-7b-beta': 'conversational',
    'microsoft/Phi-3-mini-4k-instruct': 'text-generation'
    };

    const preferredTask = MODEL_TASK[model] || 'auto';

    if (preferredTask === 'conversational') {
    const response = await hf.chatCompletion({ model, messages, max_tokens: 300, temperature: 0.7 });
    return response.choices[0].message.content;
    }

    if (preferredTask === 'text-generation') {
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n') + '\nassistant:';
    const result = await hf.textGeneration({ model, inputs: prompt, parameters: { max_new_tokens: 300, temperature: 0.7, return_full_text: false } });
    return result.generated_text.replace(prompt, '').trim();
    }

    try {
    const response = await hf.chatCompletion({ model, messages, max_tokens: 300, temperature: 0.7 });
    return response.choices[0].message.content;
    } catch (chatErr) {
    try {
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n') + '\nassistant:';
    const result = await hf.textGeneration({ model, inputs: prompt, parameters: { max_new_tokens: 300, temperature: 0.7, return_full_text: false } });
    return result.generated_text.replace(prompt, '').trim();
    } catch (textErr) {
    const finalErr = textErr.message || chatErr.message || 'Unknown HF error';
    throw new Error(finalErr);
    }
    }
    } catch (error) {
    throw error;
    }
  }

  async getAIResponse(userMessage, userId, sessionId, context = {}) {
    try {
      const chatHistory = await this.getContext(userId, sessionId);
      const systemContext = this.getSystemPrompt();
      
      const messages = [
        { role: 'system', content: systemContext },
        ...chatHistory,
        { role: 'user', content: userMessage }
      ];

      let botMessage = '';
      const modelsToTry = [
        this.currentModel,
        WORKING_MODELS.primary,
        WORKING_MODELS.fallback,
        WORKING_MODELS.backup
      ];

      const uniqueModels = [...new Set(modelsToTry)];

      for (const model of uniqueModels) {
        try {
          console.log(`🤖 Trying model: ${model}`);
          botMessage = await this.callHfAPI(messages, model);
          
          if (botMessage && botMessage.trim().length > 10) {
            this.currentModel = model;
            console.log(`✅ Success with model: ${model}`);
            break;
          }
        } catch (err) {
          console.warn(`❌ Model ${model} failed:`, err.message);
          continue;
        }
      }

      if (!botMessage || botMessage.trim().length < 10) {
        botMessage = 'Вибачте, виникла технічна проблема з AI. Спробуйте ще раз через кілька секунд або зверніться до підтримки.';
      }

      botMessage = botMessage
        .replace(/<\|.*?\|>/g, '')
        .replace(/assistant:/gi, '')
        .replace(/user:/gi, '')
        .trim();

      if (botMessage.length > 500) {
        const lastPeriod = botMessage.lastIndexOf('.', 500);
        botMessage = lastPeriod > 300 
          ? botMessage.substring(0, lastPeriod + 1)
          : botMessage.substring(0, 500) + '...';
      }

      await ChatMessage.create({
        userId: String(userId),
        sessionId: String(sessionId),
        userMessage,
        botResponse: botMessage,
        context
      });

      return botMessage;
    } catch (error) {
      console.error('AI Service Error:', error.message);
      
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        throw new Error('Помилка API ключа. Перевірте HUGGINGFACE_API_KEY в .env файлі');
      }
      
      const fallbackMessage = 'На жаль, AI сервіс тимчасово недоступний. Будь ласка, спробуйте пізніше або напишіть конкретне питання про тварин.';
      
      try {
        await ChatMessage.create({
          userId: String(userId),
          sessionId: String(sessionId),
          userMessage,
          botResponse: fallbackMessage,
          context
        });
      } catch (dbError) {
        console.error('Storage Error:', dbError.message);
      }
      
      return fallbackMessage;
    }
  }

  async recommendPet(answers) {
    const messages = [
      {
        role: 'system',
        content: 'Ви - експерт з тварин. Дайте короткі рекомендації.'
      },
      {
        role: 'user',
        content: `Порекомендуй 3 породи тварин на основі:
- Тварина: ${answers.petType}
- Помешкання: ${answers.houseSize}
- Час: ${answers.timeAvailable}
- Бюджет: ${answers.budget}
- Сім'я: ${answers.familyType}

Коротко про кожну породу (2-3 речення).`
      }
    ];

    try {
      return await this.callHfAPI(messages, this.currentModel);
    } catch (error) {
      console.error('Recommend pet error:', error);
      return 'Вибачте, не вдалося згенерувати рекомендації. Спробуйте пізніше.';
    }
  }

    async classifyQuery(text) {
    const lowerText = text.toLowerCase();

    let category = 'general';
    let petType = 'none';

    if (lowerText.includes('рекоменд') || lowerText.includes('порад') || lowerText.includes('підійде')) {
      category = 'recommendation';
    } else if (lowerText.includes('догляд') || lowerText.includes('годуват') || lowerText.includes('корм') || lowerText.includes('лікуван') || lowerText.includes('лікува')) {
      category = 'care';
    } else if (lowerText.includes('пород') || lowerText.includes('різниця')) {
      category = 'breed';
    } else if (lowerText.includes('притулок') || lowerText.includes('де купити') || lowerText.includes('заводчик') || lowerText.includes('заводник')) {
      category = 'shelter';
    }

    if (lowerText.includes('собак') || lowerText.includes('пес') || lowerText.includes('песик')) {
      petType = 'dog';
    } else if (lowerText.includes('кіт') || lowerText.includes('кішк') || lowerText.includes('кот')) {
      petType = 'cat';
    } else if (lowerText.includes('птах') || lowerText.includes('хом') || lowerText.includes('риб')) {
      petType = 'other';
    }

    return {
      category,
      petType,
      confidence: 0.8
    };
  }
}

module.exports = new AIService();