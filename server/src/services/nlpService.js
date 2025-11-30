// server/src/services/nlpService.js
class NLPService {
  constructor() {
    this.stopWords = new Set([
      'я', 'ти', 'він', 'вона', 'воно', 'ми', 'ви', 'вони',
      'що', 'як', 'який', 'яка', 'яке', 'які',
      'в', 'на', 'з', 'у', 'для', 'від', 'до', 'про',
      'це', 'той', 'та', 'і', 'а', 'але', 'чи',
      'мій', 'твій', 'його', 'її', 'наш', 'ваш', 'їх'
    ]);

    this.intents = {
      greeting: ['привіт', 'добрий день', 'добрий ранок', 'добрий вечір', 'здрастуйте', 'вітаю'],
      question: ['як', 'яка', 'який', 'які', 'яку', 'якого', 'де', 'коли', 'чому', 'скільки', 'чи', '?'],
      affirmation: ['так', 'звичайно', 'добре', 'гаразд', 'окей', 'згоден', 'згодна'],
      negation: ['ні', 'не хочу', 'не буду', 'не треба', 'не потрібно'],
      gratitude: ['дякую', 'спасибі', 'вдячний', 'вдячна', 'дякую'],
      farewell: ['до побачення', 'бувай', 'прощавай', 'на все добре']
    };

    this.petTypes = {
      'собак': ['собак', 'пес', 'цуцен', 'цуценя', 'песик', 'dog', 'лабрадор', 'ретрівер', 'хаскі', 'овчарк'],
      'кіт': ['кіт', 'кішк', 'котик', 'котяч', 'кошен', 'cat'],
      'птах': ['птах', 'птиц', 'папуг', 'канарк', 'bird'],
      'риб': ['риб', 'акваріум', 'fish'],
      'гризун': ['гризун', 'хом\'як', 'мишк', 'щур', 'hamster', 'mouse'],
      'рептилі': ['черепах', 'ящірк', 'змія', 'гекон', 'reptile']
    };

    this.categories = {
      health: ['хвороб', 'лікув', 'хворий', 'хвора', 'ліки', 'прищеп', 'вакцин', 'симптом', 'дієт', 'харчуван', 'травм', 'ветеринар', 'чхає', 'кашля', 'червон', 'очі', 'вухо', 'чухає'],
      behavior: ['поведінк', 'дресир', 'тренув', 'навчан', 'агресив', 'страх', 'тривож', 'гавка', 'кусає', 'дряпає'],
      adoption: ['усинови', 'прибере', 'притулок', 'adoption'],
      care: ['догляд', 'мити', 'купати', 'годува', 'годуван', 'вигул', 'час', 'вправ', 'ігр', 'забав', 'линяє', 'купат'],
      breed: ['порода', 'породи', 'породу', 'характеристик', 'розмір', 'вага', 'висота', 'довжин', 'особливост', 'різниця', 'порівня', 'лабрадор', 'ретрівер', 'хаскі', 'овчарк', 'розкажи про']
    };
  }

  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\wа-яіїєґ\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 1);
  }

  extractKeywords(text) {
    const tokens = this.tokenize(text);
    const keywords = tokens.filter(word => 
      !this.stopWords.has(word) && 
      word.length > 2
    );
    
    const lowerText = text.toLowerCase();
    const phrases = [
      'взяти', 'підходить', 'підійде', 'краще', 'різниця', 
      'розкажи про', 'в чому', 'порівня'
    ];
    
    phrases.forEach(phrase => {
      if (lowerText.includes(phrase)) {
        keywords.push(phrase);
      }
    });
    
    return keywords;
  }

  stem(word) {
    const endings = ['ати', 'яти', 'ити', 'ові', 'еві', 'ові', 'ою', 'ею', 'ями', 'ями', 'ах', 'ях', 'ам', 'ям'];
    
    for (const ending of endings) {
      if (word.endsWith(ending) && word.length > ending.length + 2) {
        return word.slice(0, -ending.length);
      }
    }
    
    return word;
  }

  calculateSimilarity(text1, text2) {
    const keywords1 = new Set(this.extractKeywords(text1));
    const keywords2 = new Set(this.extractKeywords(text2));
    
    const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
    const union = new Set([...keywords1, ...keywords2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  detectIntent(text) {
    const lowerText = text.toLowerCase();
    const tokens = this.tokenize(text);
    
    const scores = {};
    
    for (const [intent, keywords] of Object.entries(this.intents)) {
      let matches = 0;
      
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          matches++;
        }
      }
      
      scores[intent] = matches / keywords.length;
    }
    
    const topIntent = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)[0];
    
    return {
      intent: topIntent[0],
      confidence: topIntent[1],
      allScores: scores,
      keywords: this.extractKeywords(text),
      isQuestion: lowerText.includes('?') || this.intents.question.some(q => lowerText.includes(q))
    };
  }

  detectPetType(text) {
    const lowerText = text.toLowerCase();
    const stemmedText = this.tokenize(text).map(t => this.stem(t)).join(' ');
    
    for (const [type, keywords] of Object.entries(this.petTypes)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword) || stemmedText.includes(keyword)) {
          return type;
        }
      }
    }
    
    return null;
  }

  analyzePetQuery(text) {
    const lowerText = text.toLowerCase();
    const stemmedText = this.tokenize(text).map(t => this.stem(t)).join(' ');
    
    const petType = this.detectPetType(text);
    
    const foundCategories = [];
    const categoryScores = {};
    
    for (const [category, keywords] of Object.entries(this.categories)) {
      let matches = 0;
      let matchedKeywords = [];
      
      for (const keyword of keywords) {
        if (lowerText.includes(keyword) || stemmedText.includes(keyword)) {
          matches++;
          matchedKeywords.push(keyword);
          if (!foundCategories.includes(category)) {
            foundCategories.push(category);
          }
        }
      }
      
      categoryScores[category] = matches > 0 ? matches / keywords.length : 0;
    }
    
    const sortedCategories = Object.entries(categoryScores)
      .filter(([, score]) => score > 0)
      .sort(([, a], [, b]) => b - a);
    
    return {
      petType: petType || 'unknown',
      categories: foundCategories,
      categoryScores,
      specificity: foundCategories.length / Object.keys(this.categories).length,
      hasPetMention: petType !== null,
      primaryCategory: sortedCategories.length > 0 ? sortedCategories[0][0] : null
    };
  }

  extractEntities(text) {
    const entities = {
      breeds: [],
      sizes: [],
      numbers: [],
      locations: []
    };
    
    const breeds = ['лабрадор', 'вівчарк', 'пудель', 'такс', 'бульдог', 'шпіц', 'хаскі', 'корги', 'йорк', 'ретрівер', 'золотист'];
    const lowerText = text.toLowerCase();
    
    breeds.forEach(breed => {
      if (lowerText.includes(breed)) {
        entities.breeds.push(breed);
      }
    });
    
    const sizes = ['маленьк', 'середн', 'велик', 'малесеньк', 'велетенськ', 'компактн'];
    sizes.forEach(size => {
      if (lowerText.includes(size)) {
        entities.sizes.push(size);
      }
    });
    
    const numberMatches = text.match(/\d+/g);
    if (numberMatches) {
      entities.numbers = numberMatches.map(Number);
    }
    
    return entities;
  }

  analyzeSentiment(text) {
    const positiveWords = ['добрий', 'гарний', 'чудовий', 'класний', 'супер', 'люблю', 'подобається', 'радий', 'рада', 'щасливий'];
    const negativeWords = ['поганий', 'жахливий', 'боюся', 'страшно', 'боляче', 'хворий', 'проблем', 'турбує', 'тривож'];
    
    const lowerText = text.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) positiveScore++;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) negativeScore++;
    });
    
    const total = positiveScore + negativeScore;
    
    if (total === 0) {
      return { sentiment: 'neutral', score: 0 };
    }
    
    const score = (positiveScore - negativeScore) / total;
    
    let sentiment = 'neutral';
    if (score > 0.3) sentiment = 'positive';
    if (score < -0.3) sentiment = 'negative';
    
    return {
      sentiment,
      score,
      positiveScore,
      negativeScore
    };
  }

  analyzeQuery(text) {
    return {
      intent: this.detectIntent(text),
      petAnalysis: this.analyzePetQuery(text),
      entities: this.extractEntities(text),
      sentiment: this.analyzeSentiment(text),
      keywords: this.extractKeywords(text),
      length: text.length,
      wordCount: this.tokenize(text).length
    };
  }
}

module.exports = new NLPService();