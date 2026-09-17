/**
 * ai-coach.js - Non-intrusive, Pedagogical Coaching Adapter
 */
import { AI_CONFIG, isAIAvailable } from './config.js';

export class AICoach {
  /**
   * Sanitizes text to remove common PII patterns before payload dispatch.
   */
  static sanitizeStudentInput(text) {
    return text
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]")
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[phone]")
      .replace(/\b(my name is|i am) [A-Z][a-z]+/gi, "$1 [Student]");
  }

  /**
   * Generates coaching nudges. Fallbacks trigger silently on failure.
   */
  static async requestFeedback({ text, grade, exerciseType, fallbackHint }) {
    if (!isAIAvailable()) {
      return {
        source: "fallback",
        feedback: fallbackHint || "Look closely at your verbs. Can you make them show more action?"
      };
    }

    const payload = {
      grade,
      exerciseType,
      studentWriting: this.sanitizeStudentInput(text),
      pedagogyRules: [
        "Never rewrite or provide direct revisions.",
        "Highlight exactly one strength.",
        "Ask one guiding question to promote revision.",
        "Keep language strictly appropriate for Grade " + grade
      ]
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.timeoutMs);

      const response = await fetch(AI_CONFIG.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AI_CONFIG.apiKey}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error("AI Gateway Error");

      const data = await response.json();
      return {
        source: "ai",
        feedback: data.coachResponse
      };
    } catch (err) {
      // Graceful degradation: child sees no error dialog or interrupted UI
      return {
        source: "fallback",
        feedback: fallbackHint || "Can you add one more detail describing what the reader would hear or feel?"
      };
    }
  }
}