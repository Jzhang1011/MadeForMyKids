    const ALL_ADVENTURE_MISSIONS = [];
    WORLDS.forEach(w => {
      w.lessons.forEach(l => {
        ALL_ADVENTURE_MISSIONS.push({
          ...l,
          worldTitle: w.title,
          realmClass: w.realmClass,
          realmIcon: w.icon
        });
      });
    });

    const PRACTICE_MISSIONS = [
      {
        id: 101,
        title: "Home Row Speed Drill",
        prompt: "Keep fingers balanced on the home row!",
        keys: ["a","s","d","f","g","h","j","k","l",";"," "],
        kind: "words",
        goalIcon: "🎯",
        storyBeat: "A warm-up trail through familiar trees.",
        text: "a sad lad asks dad for a salad",
        variants: [
          "a s d f g h j k l ;",
          "a sad lad asks dad for a salad",
          "flags fall; lads laugh",
          "dad had a glass flask",
          "all fall; all stand"
        ],
        payoff: "Smooth home row is the difference between hunting for keys and walking them."
      },
      {
        id: 102,
        title: "Index Fingers Power",
        prompt: "Strengthen F, J, R, U, V, N, T, Y, G, H!",
        keys: ["f","j","r","u","v","n","t","y","g","h"," "],
        kind: "letters-to-words",
        goalIcon: "⚡",
        storyBeat: "Index fingers do the most walking. This trail is theirs.",
        text: "f j r u v n t y g h",
        variants: [
          "f j r u v n t y g h",
          "try your very funny hunt",
          "turn right; hunt left",
          "a very funny yarn",
          "nurture your craft"
        ],
        payoff: "If the index fingers are sure, every other finger has a calmer job."
      },
      {
        id: 103,
        title: "Punctuation & Space Rhythm",
        prompt: "Maintain a smooth cadence on commas, periods, and spaces!",
        keys: "all-letters-punct",
        kind: "sentence",
        goalIcon: "⭐",
        storyBeat: "Type like you speak: words, breath, stop.",
        text: "wait, look. then go.",
        variants: [
          "wait, look. then go.",
          "one, two, three. rest.",
          "yes, fox. no, bat. maybe.",
          "stop. listen. step.",
          "hello, forest. i am home."
        ],
        payoff: "Rhythm is accuracy you can hear."
      },
      {
        id: 104,
        title: "Full Alphabet Walk",
        prompt: "Visit every letter, then turn the letters into a sentence.",
        keys: "all-letters",
        kind: "letters-to-sentence",
        goalIcon: "🏆",
        storyBeat: "From A to Z, then a thought that uses the whole trail.",
        text: "a b c d e f g h i j k l m n o p q r s t u v w x y z",
        variants: [
          "a b c d e f g h i j k l m n o p q r s t u v w x y z",
          "the quick fox jumps over the old log",
          "pack my box with five dozen jewels",
          "a very quiet bat dozes by the warm cave",
          "fox, bat, and duck explore the misty canyon"
        ],
        payoff: "The alphabet is a map. A sentence is a journey on that map."
      }
    ]


    function pickLine(lesson) {
      const bank = (lesson && lesson.variants && lesson.variants.length)
        ? lesson.variants
        : [lesson.text];
      if (bank.length === 1) return bank[0];
      let choice = bank[Math.floor(Math.random() * bank.length)];
      let guard = 0;
      while (choice === lastPickedLine && guard < 8) {
        choice = bank[Math.floor(Math.random() * bank.length)];
        guard++;
      }
      lastPickedLine = choice;
      return choice;
    }

    function missionShowsWpm(mission) {
      if (!mission) return false;
      if (currentMode === 'practice') return mission.id !== 101;
      return Number(mission.id) >= 5;
    }

    function applyWpmVisibility(mission) {
      const show = missionShowsWpm(mission);
      const card = document.getElementById('wpm-telemetry');
      if (card) card.classList.toggle('is-hidden', !show);
      const modalBox = document.getElementById('modal-wpm-box');
      if (modalBox) modalBox.style.display = show ? '' : 'none';
    }

    const KEY_FINGER_MAP = {
      'q': { finger: 'left-pinky', label: 'Left Pinky' },
      'a': { finger: 'left-pinky', label: 'Left Pinky' },
      'z': { finger: 'left-pinky', label: 'Left Pinky' },
      'w': { finger: 'left-ring', label: 'Left Ring' },
      's': { finger: 'left-ring', label: 'Left Ring' },
      'x': { finger: 'left-ring', label: 'Left Ring' },
      'e': { finger: 'left-middle', label: 'Left Middle' },
      'd': { finger: 'left-middle', label: 'Left Middle' },
      'c': { finger: 'left-middle', label: 'Left Middle' },
      'r': { finger: 'left-index', label: 'Left Index' },
      'f': { finger: 'left-index', label: 'Left Index' },
      'v': { finger: 'left-index', label: 'Left Index' },
      't': { finger: 'left-index', label: 'Left Index' },
      'g': { finger: 'left-index', label: 'Left Index' },
      'b': { finger: 'left-index', label: 'Left Index' },
      'y': { finger: 'right-index', label: 'Right Index' },
      'h': { finger: 'right-index', label: 'Right Index' },
      'u': { finger: 'right-index', label: 'Right Index' },
      'j': { finger: 'right-index', label: 'Right Index' },
      'n': { finger: 'right-index', label: 'Right Index' },
      'm': { finger: 'right-index', label: 'Right Index' },
      'i': { finger: 'right-middle', label: 'Right Middle' },
      'k': { finger: 'right-middle', label: 'Right Middle' },
      ',': { finger: 'right-middle', label: 'Right Middle' },
      'o': { finger: 'right-ring', label: 'Right Ring' },
      'l': { finger: 'right-ring', label: 'Right Ring' },
      '.': { finger: 'right-ring', label: 'Right Ring' },
      'p': { finger: 'right-pinky', label: 'Right Pinky' },
      ';': { finger: 'right-pinky', label: 'Right Pinky' },
      '!': { finger: 'right-pinky', label: 'Right Pinky (Shift)' },
      ' ': { finger: 'thumb', label: 'Thumb (Space)' }
    };

    /* AUDIO ENGINE */
    class SoundEngine {
      constructor() {
        this.ctx = null;
        this.enabled = true;
      }
      init() {
        if (!this.ctx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AudioContext();
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      }
      playCorrect() {
        if (!this.enabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(659.25, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.18);
      }
      playMistake() {
        if (!this.enabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(196.00, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(164.81, this.ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
      }
      playVictory() {
        if (!this.enabled) return;
        this.init();
        [440, 554.37, 659.25, 880].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime + (idx * 0.1));
          gain.gain.setValueAtTime(0.2, this.ctx.currentTime + (idx * 0.1));
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (idx * 0.1) + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(this.ctx.currentTime + (idx * 0.1));
          osc.stop(this.ctx.currentTime + (idx * 0.1) + 0.4);
        });
      }
    }

    const sound = new SoundEngine();

    /* GAME ENGINE STATE */
