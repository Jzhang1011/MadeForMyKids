/**
 * js/exercise-loader.js
 * Asynchronous data provider for Writing Gym workouts
 */

const DATA_REGISTRY = {
  3: "/data/writing/grade3/exercises.json",
  7: "/data/writing/grade7/exercises.json"
};

export class ExerciseLoader {
  /**
   * Fetches exercises for a given grade and optional workout filter
   * @param {number} grade - 3 or 7
   * @param {string} [workoutType] - Optional filter key
   * @returns {Promise<Array>} List of exercise objects
   */
  static async loadExercises(grade, workoutType = null) {
    const url = DATA_REGISTRY[grade];
    if (!url) {
      throw new Error(`Unsupported grade level: ${grade}`);
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status} loading ${url}`);
      
      const exercises = await response.json();
      
      if (!workoutType) return exercises;
      return exercises.filter(ex => ex.workoutType === workoutType);
    } catch (err) {
      console.warn(`[WritingGym] Fallback to embedded seed data for Grade ${grade}:`, err);
      return [];
    }
  }

  /**
   * Evaluates student writing against the exercise's local rules (Layer 1 & 2)
   */
  static evaluateLocalRules(text, rules) {
    const tokens = (text.toLowerCase().match(/\b[a-z']+\b/g) || []);
    const wordCount = tokens.length;
    const errors = [];
    const suggestions = [];

    // Word count threshold
    if (rules.minWordCount && wordCount < rules.minWordCount) {
      errors.push(`Aim for at least ${rules.minWordCount} words (currently ${wordCount}).`);
    }

    // Prohibited / weak expressions
    if (rules.bannedWords) {
      rules.bannedWords.forEach(banned => {
        if (text.toLowerCase().includes(banned.toLowerCase())) {
          errors.push(`Try replacing the overused phrase '${banned}'.`);
        }
      });
    }

    // Vocabulary recommendations
    if (rules.suggestedKeywords) {
      const matched = rules.suggestedKeywords.filter(w => tokens.includes(w.toLowerCase()));
      if (matched.length === 0) {
        suggestions.push(`Try working in a power word such as: ${rules.suggestedKeywords.slice(0, 3).join(", ")}.`);
      }
    }

    return {
      passesLocalCheck: errors.length === 0,
      errors,
      suggestions
    };
  }
}