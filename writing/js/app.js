import { ExerciseLoader } from './exercise-loader.js';
import { WritingEngine } from './writing-engine.js';
import { AICoach } from './ai-coach.js';

// State
let currentGrade = 3;
let activeExercise = null;

// DOM Elements
const promptBox = document.getElementById('prompt-container');
const scaffoldBox = document.getElementById('scaffold-container');
const editor = document.getElementById('student-editor');
const feedbackTray = document.getElementById('feedback-tray');
const checkBtn = document.getElementById('btn-submit-workout');
const wordCountEl = document.getElementById('word-count');

// 1. Fetch JSON and initialize workout on boot
async function initGym() {
  const exercises = await ExerciseLoader.loadExercises(currentGrade, 'add_detail');
  activeExercise = exercises[0]; // Load first workout

  renderExercise(activeExercise);
}

// 2. Render JSON fields into the HTML structure
function renderExercise(data) {
  promptBox.innerHTML = `
    <h2>${data.title}</h2>
    <p class="prompt-text"><strong>Starter Sentence:</strong> "${data.prompt}"</p>
  `;

  scaffoldBox.innerHTML = `
    <h3>Workout Steps</h3>
    <ul class="scaffold-list">
      ${data.scaffolding.map(s => `
        <li><strong>${s.label}:</strong>${s.question}</li>
      `).join('')}
    </ul>
  `;
}

// 3. Track live stats
editor.addEventListener('input', () => {
  const words = (editor.value.trim().match(/\b\w+\b/g) || []).length;
  wordCountEl.textContent = `Words: ${words}`;
});

// 4. Evaluate using the 3-layer pipeline
checkBtn.addEventListener('click', async () => {
  const text = editor.value;
  feedbackTray.hidden = false;
  feedbackTray.innerHTML = '<p class="status">Reviewing your writing...</p>';

  // Layer 1: Mechanics
  const mechanics = WritingEngine.analyzeMechanics(text);
  
  // Layer 2: Rule-based validation against exercise JSON rules
  const localEval = ExerciseLoader.evaluateLocalRules(text, activeExercise.localEvaluationRules);

  // Layer 3: Contextual coach (AI if enabled, otherwise fallback static hint)
  const coaching = await AICoach.requestFeedback({
    text,
    grade: currentGrade,
    exerciseType: activeExercise.workoutType,
    fallbackHint: activeExercise.fallbackHints[0]
  });

  // Render unified feedback
  feedbackTray.innerHTML = `
    <div class="feedback-card">
      <h4>Gym Coach Feedback</h4>
      <p class="coach-note">${coaching.feedback}</p>
      
      ${mechanics.issues.length ? `
        <ul class="mechanics-alerts">
          ${mechanics.issues.map(i => `<li>⚠️ ${i}</li>`).join('')}
        </ul>
      ` : ''}

      ${localEval.suggestions.length ? `
        <ul class="style-tips">
          ${localEval.suggestions.map(s => `<li>💡 ${s}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `;
});

// Start the app
initGym();
