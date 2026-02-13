import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('wordmaster.db');

/**
 * Generate distractor options (wrong answers) for a word
 * @param {Object} correctWord - The correct word object
 * @param {number} count - Number of distractors to generate (default: 3)
 * @returns {Array} Array of distractor words
 */
export const generateDistractors = async (correctWord, count = 3) => {
  const distractors = [];
  const usedIds = new Set([correctWord.id]);
  
  // CRITICAL: Filter by language pair to prevent cross-language mixing
  const sourceLang = correctWord.source_lang || 'en';
  const targetLang = correctWord.target_lang || 'es';
  
  try {
    // Strategy 1: Same category (40% of distractors)
    const sameCategoryCount = Math.ceil(count * 0.4);
    if (correctWord.category && sameCategoryCount > 0) {
      const categoryDistractors = await db.getAllAsync(`
        SELECT * FROM words 
        WHERE category = ? AND id != ?
        AND source_lang = ? AND target_lang = ?
        AND translation NOT LIKE '[%'
        ORDER BY RANDOM() 
        LIMIT ?
      `, [correctWord.category, correctWord.id, sourceLang, targetLang, sameCategoryCount]);
      
      categoryDistractors.forEach(word => {
        if (distractors.length < count && !usedIds.has(word.id)) {
          distractors.push(word);
          usedIds.add(word.id);
        }
      });
    }
    
    // Strategy 2: Similar difficulty (30% of distractors)
    const similarDifficultyCount = Math.ceil(count * 0.3);
    if (distractors.length < count) {
      const difficultyDistractors = await db.getAllAsync(`
        SELECT * FROM words 
        WHERE difficulty BETWEEN ? AND ? 
        AND id != ?
        AND source_lang = ? AND target_lang = ?
        AND translation NOT LIKE '[%'
        AND id NOT IN (${Array(distractors.length).fill('?').join(',') || 'NULL'})
        ORDER BY RANDOM() 
        LIMIT ?
      `, [
        Math.max(1, correctWord.difficulty - 1),
        correctWord.difficulty + 1,
        correctWord.id,
        sourceLang,
        targetLang,
        ...distractors.map(d => d.id),
        similarDifficultyCount
      ]);
      
      difficultyDistractors.forEach(word => {
        if (distractors.length < count && !usedIds.has(word.id)) {
          distractors.push(word);
          usedIds.add(word.id);
        }
      });
    }
    
    // Strategy 3: Random (fill remaining)
    if (distractors.length < count) {
      const remaining = count - distractors.length;
      const randomDistractors = await db.getAllAsync(`
        SELECT * FROM words 
        WHERE id != ?
        AND source_lang = ? AND target_lang = ?
        AND translation NOT LIKE '[%'
        AND id NOT IN (${Array(distractors.length).fill('?').join(',') || 'NULL'})
        ORDER BY RANDOM() 
        LIMIT ?
      `, [correctWord.id, sourceLang, targetLang, ...distractors.map(d => d.id), remaining]);
      
      randomDistractors.forEach(word => {
        if (distractors.length < count && !usedIds.has(word.id)) {
          distractors.push(word);
          usedIds.add(word.id);
        }
      });
    }
    
    return distractors;
  } catch (error) {
    console.error('Error generating distractors:', error);
    // Fallback: return random words (still filtered by language pair!)
    const sourceLang = correctWord.source_lang || 'en';
    const targetLang = correctWord.target_lang || 'es';
    const fallbackDistractors = await db.getAllAsync(`
      SELECT * FROM words 
      WHERE id != ?
      AND source_lang = ? AND target_lang = ?
      AND translation NOT LIKE '[%'
      ORDER BY RANDOM() 
      LIMIT ?
    `, [correctWord.id, sourceLang, targetLang, count]);
    
    return fallbackDistractors;
  }
};

/**
 * Create a multiple choice question with options
 * @param {Object} correctWord - The correct word object
 * @param {boolean} reverseDirection - If true, ask for translation→word, else word→translation
 * @returns {Object} Question object with options
 */
export const createMultipleChoiceQuestion = async (correctWord, reverseDirection = false) => {
  const distractors = await generateDistractors(correctWord, 3);
  
  // Create options array
  const options = [correctWord, ...distractors].map(word => ({
    id: word.id,
    text: reverseDirection ? word.word : word.translation,
    isCorrect: word.id === correctWord.id
  }));
  
  // Shuffle options
  const shuffledOptions = options.sort(() => Math.random() - 0.5);
  
  // Create dynamic language labels
  const languageNames = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'hu': 'Hungarian'
  };
  
  const targetLangName = languageNames[correctWord.target_lang] || correctWord.target_lang;
  const sourceLangName = languageNames[correctWord.source_lang] || correctWord.source_lang;
  
  return {
    question: reverseDirection ? correctWord.translation : correctWord.word,
    questionLabel: reverseDirection ? `${sourceLangName} → ${targetLangName}` : `${targetLangName} → ${sourceLangName}`,
    correctAnswer: correctWord.id,
    options: shuffledOptions,
    word: correctWord
  };
};

export default {
  generateDistractors,
  createMultipleChoiceQuestion
};
