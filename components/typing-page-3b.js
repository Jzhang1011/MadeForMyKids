    function handleKeyPress(key) {
      if (charIndex >= targetString.length) return;

      if (!timerRunning) startTimer();

      totalKeystrokes++;
      const targetChar = targetString[charIndex];

      if (key.toLowerCase() === targetChar.toLowerCase() || key === targetChar) {
        correctKeystrokes++;
        consecutiveMistakes = 0;
        hideHint();
        sound.playCorrect();

        const nextCh = targetString[charIndex + 1];
        const finishedWord = targetChar === ' ' || nextCh === undefined || nextCh === ' ';
        if (finishedWord) {
          foxChar.classList.add('fox-step');
          setTimeout(() => foxChar.classList.remove('fox-step'), 300);
        }

        const keyElem = document.querySelector(`.key[data-key="${key.toLowerCase()}"]`);
        if (keyElem) {
          keyElem.classList.add('key-press-success');
          setTimeout(() => keyElem.classList.remove('key-press-success'), 180);
        }

        charIndex++;
        renderTypingChars();
        updateFoxPosition();
        updateLiveStats();

        if (charIndex >= targetString.length) {
          triggerMissionComplete();
        } else {
          highlightTargetKey();
          if (voiceEnabled) speakCurrentLetter();
        }
      } else {
        consecutiveMistakes++;
        sound.playMistake();

        const currentSpan = typingDisplay.children[charIndex];
        if (currentSpan) {
          currentSpan.classList.add('shake');
          setTimeout(() => currentSpan.classList.remove('shake'), 400);
        }

        if (consecutiveMistakes === 1) {
          showHint(`Try pressing ${targetChar === ' ' ? 'SPACE' : targetChar.toUpperCase()}! 🌟`);
        } else if (consecutiveMistakes >= 2) {
          const info = KEY_FINGER_MAP[targetChar.toLowerCase()];
          if (info) showHint(`Use your ${info.label}! 🐾`);
        }
        updateLiveStats();
      }
    }

    function updateLiveStats() {
      const accuracy = totalKeystrokes === 0 ? 100 : Math.round((correctKeystrokes / totalKeystrokes) * 100);
      liveAccuracy.innerText = `${accuracy}%`;
      calculateLiveWPM();
    }

    function triggerMissionComplete() {
      stopTimer();
      sound.playVictory();
      foxChar.classList.add('fox-cheer');

      const finalAccuracy = totalKeystrokes === 0 ? 100 : Math.round((correctKeystrokes / totalKeystrokes) * 100);
      const finalWPM = calculateLiveWPM();
      const showWpm = missionShowsWpm(currentMission);

      let stars = 1;
      if (finalAccuracy >= 90) {
        stars = 2;
        if (!showWpm || finalWPM >= 8) stars = 3;
      }

      starsEarned += stars;
      localStorage.setItem('fox_stars', starsEarned);
      starDisplay.innerText = starsEarned;

      const payoff = (currentMission && currentMission.payoff) ? currentMission.payoff : 'Fox made great progress on his journey!';
      document.getElementById('victory-subtitle').innerText = showWpm
        ? 'Try again for a new line — or walk on.'
        : 'No speed score yet. Smooth paws matter more.';
      document.getElementById('victory-payoff').innerText = payoff;

      document.getElementById('modal-time').innerText = timerDisplay.innerText;
      document.getElementById('modal-wpm').innerText = finalWPM;
      document.getElementById('modal-accuracy').innerText = `${finalAccuracy}%`;
      document.getElementById('modal-score').innerText = Math.round(finalAccuracy * (1 + (showWpm ? finalWPM * 0.1 : 0)));
      applyWpmVisibility(currentMission);

      for (let i = 1; i <= 3; i++) {
        const s = document.getElementById(`star-${i}`);
        if (s) s.classList.toggle('filled', i <= stars);
      }

      renderMap();

      setTimeout(() => {
        document.getElementById('victory-modal').classList.add('open');
      }, 500);
    }

    function retryMission() {
      document.getElementById('victory-modal').classList.remove('open');
      foxChar.classList.remove('fox-cheer');
      loadMission(currentMissionIndex);
    }

    function nextMission() {
      document.getElementById('victory-modal').classList.remove('open');
      foxChar.classList.remove('fox-cheer');
      loadMission(currentMissionIndex + 1);
    }

    function switchMode(mode) {
      currentMode = mode;
      document.getElementById('btn-mode-adventure').classList.toggle('active', mode === 'adventure');
      document.getElementById('btn-mode-practice').classList.toggle('active', mode === 'practice');
      loadMission(0);
    }

    /* WORLD MAP CONTROLS */
    function renderMap() {
      const mapContainer = document.getElementById('map-content');
      mapContainer.innerHTML = '';

      let globalIdx = 0;
      WORLDS.forEach((world) => {
        const section = document.createElement('div');
        section.className = 'map-world-section';
        section.innerHTML = `<div class="world-header">${world.title}</div>`;

        const grid = document.createElement('div');
        grid.className = 'lesson-chip-grid';

        world.lessons.forEach((les) => {
          const idx = globalIdx;
          const chip = document.createElement('div');
          chip.className = `lesson-chip ${currentMode === 'adventure' && currentMissionIndex === idx ? 'active-chip' : ''}`;
          chip.innerHTML = `
            <div>${les.title}</div>
            <div class="chip-stars">★★★★★</div>
          `;
          chip.onclick = () => {
            currentMode = 'adventure';
            document.getElementById('btn-mode-adventure').classList.add('active');
            document.getElementById('btn-mode-practice').classList.remove('active');
            closeMapModal();
            loadMission(idx);
          };
          grid.appendChild(chip);
          globalIdx++;
        });

        section.appendChild(grid);
        mapContainer.appendChild(section);
      });
    }

    function openMapModal() {
      renderMap();
      document.getElementById('map-modal').classList.add('open');
    }

    function closeMapModal() {
      document.getElementById('map-modal').classList.remove('open');
    }

    function openParentModal() {
      document.getElementById('p-stat-missions').innerText = `${currentMissionIndex + 1} / ${ALL_ADVENTURE_MISSIONS.length}`;
      document.getElementById('p-stat-keys').innerText = correctKeystrokes;
      document.getElementById('p-stat-wpm').innerText = `${liveWPM.innerText} WPM`;
      document.getElementById('p-stat-acc').innerText = liveAccuracy.innerText;
      document.getElementById('parent-modal').classList.add('open');
    }

    function closeParentModal() {
      document.getElementById('parent-modal').classList.remove('open');
    }

    window.onload = initGame;
