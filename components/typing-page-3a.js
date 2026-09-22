    let currentMode = 'adventure';
    let currentMissionIndex = 0;
    let currentMission = null;
    let lastPickedLine = "";
    let targetString = "";
    let charIndex = 0;
    let totalKeystrokes = 0;
    let correctKeystrokes = 0;
    let starsEarned = parseInt(localStorage.getItem('fox_stars') || '0', 10);
    let consecutiveMistakes = 0;
    let voiceEnabled = false;

    let timerRunning = false;
    let startTime = null;
    let timerInterval = null;
    let elapsedSeconds = 0;

    const typingDisplay = document.getElementById('typing-display');
    const missionTitle = document.getElementById('mission-title');
    const missionInstruction = document.getElementById('mission-instruction');
    const goalMarker = document.getElementById('goal-marker');
    const foxChar = document.getElementById('fox-character');
    const starDisplay = document.getElementById('star-count');
    const liveAccuracy = document.getElementById('live-accuracy');
    const liveWPM = document.getElementById('live-wpm');
    const timerDisplay = document.getElementById('timer-display');
    const fingerInstructionText = document.getElementById('finger-instruction-text');
    const hintBubble = document.getElementById('hint-bubble');
    const btnVoiceToggle = document.getElementById('btn-voice-toggle');
    const btnSoundToggle = document.getElementById('btn-sound-toggle');
    const adventureRealm = document.getElementById('adventure-realm');

    function initGame() {
      starDisplay.innerText = starsEarned;
      loadMission(0);
      setupKeyboardEvents();
      renderMap();
    }

    function loadMission(index) {
      const missionList = currentMode === 'adventure' ? ALL_ADVENTURE_MISSIONS : PRACTICE_MISSIONS;
      currentMissionIndex = index % missionList.length;
      const mission = missionList[currentMissionIndex];
      currentMission = mission;

      targetString = pickLine(mission);
      charIndex = 0;
      consecutiveMistakes = 0;
      totalKeystrokes = 0;
      correctKeystrokes = 0;

      stopTimer();
      elapsedSeconds = 0;
      timerDisplay.innerText = "0:00";
      liveWPM.innerText = "0";
      liveAccuracy.innerText = "100%";
      applyWpmVisibility(mission);

      missionTitle.innerText = mission.title;
      missionInstruction.innerText = mission.storyBeat || mission.prompt;
      goalMarker.innerText = mission.goalIcon || "🏡";

      // Set Realm Theme
      if (mission.realmClass) {
        adventureRealm.className = `adventure-view ${mission.realmClass}`;
      } else {
        adventureRealm.className = `adventure-view realm-forest`;
      }

      renderTypingChars();
      updateFoxPosition();
      highlightTargetKey();
      hideHint();

      if (voiceEnabled) speakCurrentLetter();
    }

    function speakCurrentLetter() {
      if (!voiceEnabled || !('speechSynthesis' in window)) return;
      if (charIndex >= targetString.length) return;
      const char = targetString[charIndex];
      const textToSpeak = char === ' ' ? 'Space' : char;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.0;
      utterance.pitch = 1.2;
      window.speechSynthesis.speak(utterance);
    }

    function toggleVoice() {
      voiceEnabled = !voiceEnabled;
      if (!voiceEnabled) {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        btnVoiceToggle.innerText = '🔇 Voice: OFF';
        btnVoiceToggle.classList.add('muted-pill');
      } else {
        btnVoiceToggle.innerText = '🗣️ Voice: ON';
        btnVoiceToggle.classList.remove('muted-pill');
        speakCurrentLetter();
      }
    }

    function toggleSound() {
      sound.enabled = !sound.enabled;
      btnSoundToggle.innerText = sound.enabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
      btnSoundToggle.classList.toggle('muted-pill', !sound.enabled);
    }

    function startTimer() {
      if (timerRunning) return;
      timerRunning = true;
      startTime = Date.now() - (elapsedSeconds * 1000);
      timerInterval = setInterval(() => {
        elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(elapsedSeconds / 60);
        const secs = elapsedSeconds % 60;
        timerDisplay.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        calculateLiveWPM();
      }, 500);
    }

    function stopTimer() {
      timerRunning = false;
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }

    function calculateLiveWPM() {
      if (elapsedSeconds < 1) return 0;
      const words = correctKeystrokes / 5;
      const minutes = elapsedSeconds / 60;
      const wpm = Math.round(words / minutes);
      liveWPM.innerText = wpm;
      return wpm;
    }

    function renderTypingChars() {
      typingDisplay.innerHTML = '';
      for (let i = 0; i < targetString.length; i++) {
        const span = document.createElement('span');
        span.className = 'char-box';
        const char = targetString[i];
        
        if (char === ' ') {
          span.classList.add('space');
          span.innerHTML = '&nbsp;';
        } else {
          span.innerText = char;
        }

        if (i < charIndex) {
          span.classList.add('typed');
        } else if (i === charIndex) {
          span.classList.add('current');
        }
        typingDisplay.appendChild(span);
      }
    }

    function updateFoxPosition() {
      const progressPercent = (charIndex / targetString.length) * 85;
      foxChar.style.left = `${progressPercent}%`;
    }

    function highlightTargetKey() {
      document.querySelectorAll('.key').forEach(k => k.classList.remove('target-key'));
      document.querySelectorAll('.finger-node').forEach(f => f.classList.remove('active-finger'));

      if (charIndex >= targetString.length) return;

      const targetChar = targetString[charIndex].toLowerCase();
      const fingerInfo = KEY_FINGER_MAP[targetChar];

      const keyElem = document.querySelector(`.key[data-key="${targetChar}"]`);
      if (keyElem) keyElem.classList.add('target-key');

      if (fingerInfo) {
        fingerInstructionText.innerText = fingerInfo.label;
        if (fingerInfo.finger === 'thumb') {
          const thumbL = document.getElementById('f-thumb-left');
          const thumbR = document.getElementById('f-thumb-right');
          if (thumbL) thumbL.classList.add('active-finger');
          if (thumbR) thumbR.classList.add('active-finger');
        } else {
          const fingerElem = document.getElementById(`f-${fingerInfo.finger}`);
          if (fingerElem) fingerElem.classList.add('active-finger');
        }
      }
    }

    function showHint(text) {
      hintBubble.innerText = text;
      hintBubble.classList.add('show');
    }

    function hideHint() {
      hintBubble.classList.remove('show');
    }

    function setupKeyboardEvents() {
      window.addEventListener('keydown', (e) => {
        if (e.key === ' ') e.preventDefault();
        if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) return;

        if (e.key === 'Enter') {
          if (document.getElementById('victory-modal').classList.contains('open')) {
            nextMission();
            return;
          }
        }
        handleKeyPress(e.key);
      });
    }

