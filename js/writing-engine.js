/**
 * writing-engine.js - Local Evaluator and Heuristic Feedback
 */

// Weak verb map for Sentence Surgery & Detective workouts
const WEAK_VERB_ALTERNATIVES = {
  "went": ["stumbled", "sprinted", "crept", "dashed", "marched"],
  "said": ["whispered", "declared", "argued", "murmured", "bellowed"],
  "got": ["acquired", "grabbed", "received", "snatched"],
  "saw": ["noticed", "spotted", "examined", "glimpsed"],
  "ran": ["bolted", "jogged", "scampered", "galloped"]
};

const OVERUSED_ADJECTIVES = ["good", "bad", "nice", "fun", "cool", "big", "small"];

export class WritingEngine {
  /**
   * Layer 1: Fundamental Mechanics & Sentence Structure
   */
  static analyzeMechanics(text) {
    const trimmed = text.trim();
    if (!trimmed) return { valid: false, errors: ["Start writing to get feedback!"] };

    const issues = [];
    
    // Capitalization check
    if (!/^[A-Z"']/.test(trimmed)) {
      issues.push("Remember to start your sentence with a capital letter.");
    }

    // Terminal punctuation check
    if (!/[.!?]$/.test(trimmed)) {
      issues.push("Don't forget closing punctuation (. ! ?).");
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Layer 2: Stylistic Heuristics & Vocabulary Variety
   */
  static analyzeStyle(text) {
    const suggestions = [];
    const tokens = text.toLowerCase().match(/\b[a-z']+\b/g) || [];
    
    // Check for weak verbs
    tokens.forEach(word => {
      if (WEAK_VERB_ALTERNATIVES[word]) {
        suggestions.push({
          type: "vocabulary",
          target: word,
          message: `Notice the verb '${word}'. Could you swap it for: ${WEAK_VERB_ALTERNATIVES[word].slice(0, 3).join(", ")}?`
        });
      }
    });

    // Check for repetitive/empty adjectives
    OVERUSED_ADJECTIVES.forEach(adj => {
      const count = tokens.filter(w => w === adj).length;
      if (count > 0) {
        suggestions.push({
          type: "precision",
          target: adj,
          message: `You used '${adj}'. Can you replace it with a more specific sensory detail?`
        });
      }
    });

    // Sensory/detail density detection (where, when, why markers)
    const detailMarkers = ["because", "when", "behind", "under", "suddenly", "whispered", "outside"];
    const hasDetail = tokens.some(t => detailMarkers.includes(t));
    if (!hasDetail && tokens.length > 5) {
      suggestions.push({
        type: "expansion",
        target: null,
        message: "Add a detail answering: *Where* did this happen, or *why*?"
      });
    }

    return suggestions;
  }
}