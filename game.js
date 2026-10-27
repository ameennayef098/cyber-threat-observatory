// Game.js - Cyber Threat Defense Game
// Adds a game section, hides less-used sections (sources, about) by default,
// provides a toggle to show them, and includes a cyber defense tower defense game.

(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // ---------- 1. Add game section ----------
    addGameSection();

    // ---------- 2. Hide sources and about sections ----------
    hideSections(['section-sources', 'section-about']);
    addToggleMoreSections();

    // ---------- 3. Initialize game ----------
    initGame();
  }

  function addGameSection() {
    const sidebarGroup = document.querySelector('.sidebar-group');
    if (!sidebarGroup) return;

    const gameLink = document.createElement('a');
    gameLink.href = '#';
    gameLink.className = 'side-link';
    gameLink.setAttribute('data-section', 'game');
    gameLink.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 3m0 0L9 9m5-5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V4a2 2 0 0 0 2-2z"></path></svg>
      <span>اللعبة</span>
    `;
    sidebarGroup.appendChild(gameLink);

    const content = document.querySelector('.content');
    if (!content) return;

    const gameSection = document.createElement('section');
    gameSection.className = 'section';
    gameSection.id = 'section-game';
    gameSection.innerHTML = `
      <div class="page-head">
        <h1><span id="gameTitleIcon"></span> لعبة الدفاع السيبراني</h1>
        <p>دافع عن شبكتك من التهديدات السيبرانية المتقدمة. ضع أبراج الدفاع الاستراتيجيًا على المسار لإيقاف الهجمات قبل أن تصل إلى الخوادم.</p>
      </div>

      <div class="update-bar" id="gameUpdateBar">
        <span>النتيجة: <b id="gameScore">0</b></span>
        <span class="spacer"></span>
        <span>الحياة: <b id="gameLives">3</b></span>
        <span class="spacer"></span>
        <span>المال: <b id="gameMoney">100</b></span>
      </div>

      <div id="game-container" style="position:relative; height:500px;">
        <div id="game-path" style="position:absolute; top:50%; left:0; right:0; height:4px; background:var(--border-bright); transform:translateY(-50%);"></div>
        <div id="game-towers"></div>
        <div id="game-threats"></div>
        <div id="game-sidebar" style="position:absolute; top:20px; right:20px; width:180px;">
          <div class="tower-btn" data-tower="firewall" style="margin-bottom:10px;">
            <div style="font-weight:bold;margin-bottom:5px;">جدار ناري</div>
            <div style="font-size:0.8rem;">التكلفة: 25</div>
            <div style="font-size:0.8rem;">فعّال ضد: جميع التهديدات</div>
          </div>
          <div class="tower-btn" data-tower="antivirus" style="margin-bottom:10px;">
            <div style="font-weight:bold;margin-bottom:5px;">مضاد فيروسات</div>
            <div style="font-size:0.8rem;">التكلفة: 30</div>
            <div style="font-size:0.8rem;">فعّال ضد: البرمجيات الضارة، الفدية</div>
          </div>
          <div class="tower-btn" data-tower="ids" style="margin-bottom:10px;">
            <div style="font-weight:bold;margin-bottom:5px;">نظام كشف الاختراق</div>
            <div style="font-size:0.8rem;">التكلفة: 35</div>
            <div style="font-size:0.8rem;">فعّال ضد: الهجمات المُوجَّهة، ديس</div>
          </div>
          <div class="tower-btn" data-tower="encryption" style="margin-bottom:10px;">
            <div style="font-weight:bold;margin-bottom:5px;">التشفير</div>
            <div style="font-size:0.8rem;">التكلفة: 40</div>
            <div style="font-size:0.8rem;">فعّال ضد: تسريب البيانات، التجسس</div>
          </div>
          <div class="tower-btn" data-tower="training" style="margin-bottom:10px;">
            <div style="font-weight:bold;margin-bottom:5px;">تدريب المستخدمين</div>
            <div style="font-size:0.8rem;">التكلفة: 20</div>
            <div style="font-size:0.8rem;">فعّال ضد: الهندسة الاجتماعية، التصيد</div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:10px; text-align:center;">
        <button class="btn btn-primary" id="gameStartBtn">ابدأ اللعبة</button>
      </div>
    `;
    content.appendChild(gameSection);
  }

  function initGame() {
    const scoreEl = document.getElementById('gameScore');
    const livesEl = document.getElementById('gameLives');
    const moneyEl = document.getElementById('gameMoney');
    const startBtn = document.getElementById('gameStartBtn');
    const towersContainer = document.getElementById('game-towers');
    const threatsContainer = document.getElementById('game-threats');

    let score = 0;
    let lives = 3;
    let money = 100;
    let gameActive = false;
    let gamePaused = false;
    let towers = [];
    let threats = [];
    let threatIdCounter = 0;
    let towerIdCounter = 0;
    let lastThreatSpawn = 0;
    const threatSpawnInterval = 3000; // ms between waves
    const waveLength = 5; // threats per wave
    let currentWave = 0;
    let threatsInWave = 0;

    // Path coordinates (from left 10% to right 90%, vertical center)
    const pathY = 250; // vertical center of 500px container
    const pathStartX = 50; // 10% of 500px width
    const pathEndX = 450; // 90% of 500px width
    const pathLength = pathEndX - pathStartX;

    // Threat types
    const threatTypes = [
      { id: 'malware', name: 'برمجيات ضارة', color: '#ff0000', speed: 1, damage: 1, reward: 10 },
      { id: 'phishing', name: 'هجوم تصيد', color: '#ffff00', speed: 1.5, damage: 1, reward: 15 },
      { id: 'ddos', name: 'حجب الخدمة', color: '#00ffff', speed: 0.7, damage: 2, reward: 20 },
      { id: 'ransomware', name: 'فدية', color: '#ff00ff', speed: 0.8, damage: 3, reward: 25 },
      { id: 'spyware', name: 'برمجيات تجسس', color: '#00ff00', speed: 1.2, damage: 1, reward: 12 }
    ];

    // Tower types
    const towerTypes = {
      firewall: { name: 'جدار ناري', cost: 25, color: '#00bfff', effectiveAgainst: ['malware', 'phishing', 'ddos', 'ransomware', 'spyware'] },
      antivirus: { name: 'مضاد فيروسات', cost: 30, color: '#00ff00', effectiveAgainst: ['malware', 'ransomware', 'spyware'] },
      ids: { name: 'نظام كشف الاختراق', cost: 35, color: '#ffa500', effectiveAgainst: ['ddos', 'spyware'] },
      encryption: { name: 'التشفير', cost: 40, color: '#800080', effectiveAgainst: ['spyware'] },
      training: { name: 'تدريب المستخدمين', cost: 20, color: '#ffff00', effectiveAgainst: ['phishing'] }
    };

    // Initialize path visualization
    const pathDiv = document.getElementById('game-path');
    pathDiv.style.left = pathStartX + 'px';
    pathDiv.style.width = pathLength + 'px';

    // Add endpoint markers
    const sourceDiv = document.createElement('div');
    sourceDiv.style.position = 'absolute';
    sourceDiv.style.left = (pathStartX - 10) + 'px';
    sourceDiv.style.top = (pathY - 10) + 'px';
    sourceDiv.style.width = '20px';
    sourceDiv.style.height = '20px';
    sourceDiv.style.backgroundColor = '#ff0000';
    sourceDiv.style.borderRadius = '50%';
    sourceDiv.style.opacity = '0.7';
    sourceDiv.title = 'المصدر (الإنترنت)';
    document.getElementById('game-container').appendChild(sourceDiv);

    const targetDiv = document.createElement('div');
    targetDiv.style.position = 'absolute';
    targetDiv.style.left = (pathEndX - 10) + 'px';
    targetDiv.style.top = (pathY - 10) + 'px';
    targetDiv.style.width = '20px';
    targetDiv.style.height = '20px';
    targetDiv.style.backgroundColor = '#00ff00';
    targetDiv.style.borderRadius = '50%';
    targetDiv.style.opacity = '0.7';
    targetDiv.title = 'الهدف (الخوادم)';
    document.getElementById('game-container').appendChild(targetDiv);

    // Input handling
    let selectedTowerType = null;
    let isPlacing = false;
    let previewTower = null;

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        cancelPlacement();
      }
    });

    document.getElementById('game-container').addEventListener('click', e => {
      if (!isPlacing || !selectedTowerType) return;

      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if click is on the path area (with some tolerance)
      if (y >= pathY - 20 && y <= pathY + 20 && x >= pathStartX && x <= pathEndX) {
        const towerCost = towerTypes[selectedTowerType].cost;
        if (money >= towerCost) {
          placeTower(x, y, selectedTowerType);
          money -= towerCost;
          moneyEl.textContent = money;
          cancelPlacement();
        } else {
          alert('لا يكفي المال!');
        }
      }
    });

    // Tower button handlers
    document.querySelectorAll('.tower-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectTowerType(btn.dataset.tower);
      });
    });

    startBtn.addEventListener('click', () => {
      if (gameActive) return;
      startGame();
    });

    function selectTowerType(type) {
      // Deselect all
      document.querySelectorAll('.tower-btn').forEach(b => {
        b.style.opacity = '0.6';
        b.style.border = 'none';
      });

      // Select this one
      const btn = document.querySelector(`.tower-btn[data-tower="${type}"]`);
      if (btn) {
        btn.style.opacity = '1';
        btn.style.border = '2px solid var(--ok)';
        selectedTowerType = type;
        startPlacementPreview();
      }
    }

    function startPlacementPreview() {
      if (previewTower) {
        previewTower.remove();
      }
      previewTower = document.createElement('div');
      previewTower.className = 'tower-preview';
      previewTower.style.position = 'absolute';
      previewTower.style.width = '40px';
      previewTower.style.height = '40px';
      previewTower.style.borderRadius = '50%';
      previewTower.style.backgroundColor = towerTypes[selectedTowerType].color;
      previewTower.style.opacity = '0.5';
      previewTower.style.pointerEvents = 'none';
      document.getElementById('game-container').appendChild(previewTower);
      isPlacing = true;
    }

    function cancelPlacement() {
      if (previewTower) {
        previewTower.remove();
        previewTower = null;
      }
      isPlacing = false;
      selectedTowerType = null;
      document.querySelectorAll('.tower-btn').forEach(b => {
        b.style.opacity = '0.6';
        b.style.border = 'none';
      });
    }

    function placeTower(x, y, type) {
      // Snap to path vertically
      const towerY = pathY;
      const tower = {
        id: 'tower_' + towerIdCounter++,
        type: type,
        x: x,
        y: towerY,
        element: createTowerElement(x, towerY, type),
        range: 100, // pixels
        lastShot: 0,
        shotInterval: 1000 // ms
      };
      towers.push(tower);
      towersContainer.appendChild(tower.element);
    }

    function createTowerElement(x, y, type) {
      const el = document.createElement('div');
      el.className = 'tower';
      el.style.position = 'absolute';
      el.style.left = (x - 20) + 'px';
      el.style.top = (y - 20) + 'px';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.backgroundColor = towerTypes[type].color;
      el.style.borderRadius = '50%';
      el.style.border = '2px solid #fff';
      el.style.boxShadow = '0 0 10px rgba(255,255,255,0.5)';
      el.style.zIndex = '10';
      return el;
    }

    function spawnThreatWave() {
      if (!gameActive) return;

      currentWave++;
      threatsInWave = 0;

      // Choose random threat types for this wave
      const waveThreats = [];
      for (let i = 0; i < waveLength; i++) {
        const threatType = threatTypes[Math.floor(Math.random() * threatTypes.length)];
        waveThreats.push(threatType);
      }

      // Spawn threats with small delays
      waveThreats.forEach((threatType, index) => {
        setTimeout(() => {
          spawnThreat(threatType);
          threatsInWave++;
          if (threatsInWave >= waveLength) {
            // Schedule next wave
            setTimeout(spawnThreatWave, threatSpawnInterval);
          }
        }, index * 500); // 500ms between threats in wave
      });
    }

    function spawnThreat(threatType) {
      const threat = {
        id: 'threat_' + threatIdCounter++,
        type: threatType.id,
        x: pathStartX - 20, // start slightly left of path
        y: pathY,
        speed: threatType.speed,
        damage: threatType.damage,
        reward: threatType.reward,
        element: createThreatElement(threatType),
        hitBy: [] // track which towers have hit this threat
      };
      threats.push(threat);
      threatsContainer.appendChild(threat.element);
    }

    function createThreatElement(threatType) {
      const el = document.createElement('div');
      el.className = 'threat';
      el.style.position = 'absolute';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.backgroundColor = threatType.color;
      el.style.borderRadius = '50%';
      el.style.border = '2px solid #fff';
      el.style.boxShadow = '0 0 5px rgba(255,255,255,0.5)';
      // Add threat type icon/letter
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = '#000';
      el.style.fontWeight = 'bold';
      el.style.fontSize = '14px';
      switch (threatType.id) {
        case 'malware': el.textContent = 'M'; break;
        case 'phishing': el.textContent = 'P'; break;
        case 'ddos': el.textContent = 'D'; break;
        case 'ransomware': el.textContent = 'R'; break;
        case 'spyware': el.textContent = 'S'; break;
      }
      return el;
    }

    function gameLoop(timestamp) {
      if (!gameActive || gamePaused) {
        requestAnimationFrame(gameLoop);
        return;
      }

      // Update threats
      for (let i = threats.length - 1; i >= 0; i--) {
        const threat = threats[i];
        threat.x += threat.speed;

        // Update position
        threat.element.style.left = (threat.x - 15) + 'px';
        threat.element.style.top = (threat.y - 15) + 'px';

        // Check if threat reached end
        if (threat.x > pathEndX + 20) {
          // Threat reached target
          threats.splice(i, 1);
          threat.element.remove();
          lives -= threat.damage;
          livesEl.textContent = Math.max(0, lives);
          if (lives <= 0) {
            endGame();
          }
          continue;
        }

        // Check collisions with towers
        for (const tower of towers) {
          // Skip if this tower already hit this threat recently (to prevent multiple hits per frame)
          if (threat.hitBy.includes(tower.id) && timestamp - tower.lastShot < 100) continue;

          const dx = threat.x - tower.x;
          const dy = threat.y - tower.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < tower.range) {
            // Check if tower is effective against this threat type
            if (towerTypes[tower.type].effectiveAgainst.includes(threat.type)) {
              // Hit!
              if (timestamp - tower.lastShot > tower.shotInterval) {
                tower.lastShot = timestamp;
                threat.hitBy.push(tower.id);

                // Visual hit effect
                const originalColor = threat.element.style.backgroundColor;
                threat.element.style.backgroundColor = '#fff';
                setTimeout(() => {
                  threat.element.style.backgroundColor = originalColor;
                }, 100);

                // Apply damage/threat neutralization
                // For simplicity, we'll just remove the threat on hit
                threats.splice(i, 1);
                threat.element.remove();
                score += threat.reward;
                scoreEl.textContent = score;
                break; // threat is destroyed, no need to check other towers
              }
            }
          }
        }
      }

      // Animate towers (pulsing effect when ready to shoot)
      for (const tower of towers) {
        const timeSinceLastShot = timestamp - tower.lastShot;
        const pulse = Math.sin(timeSinceLastShot / tower.shotInterval * Math.PI) * 0.3 + 0.7;
        tower.element.style.transform = `scale(${pulse})`;
      }

      requestAnimationFrame(gameLoop);
    }

    function endGame() {
      gameActive = false;
      // Show game over overlay
      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = '100';
      overlay.innerHTML = `
        <div style="text-align:center; color:#fff;">
          <h2>انتهت اللعبة</h2>
          <p>النتيجة النهائية: <b>${score}</b></p>
          <p>الحياة المتبقية: <b>${lives}</b></p>
          <p>المال المتبقي: <b>${money}</b></p>
        </div>
      `;
      document.getElementById('game-container').appendChild(overlay);
      startBtn.disabled = false;
    }

    function startGame() {
      // Reset game state
      score = 0;
      lives = 3;
      money = 100;
      scoreEl.textContent = score;
      livesEl.textContent = lives;
      moneyEl.textContent = money;

      // Clear existing towers and threats
      towers.forEach(t => t.element.remove());
      towers = [];
      threats.forEach(t => t.element.remove());
      threats = [];

      // Clear any game over overlay
      const overlay = document.getElementById('game-container').querySelector('div[style*="position:absolute"]');
      if (overlay && overlay.style.zIndex === '100') {
        overlay.remove();
      }

      gameActive = true;
      gamePaused = false;
      startBtn.disabled = true;
      cancelPlacement(); // clear any placement preview

      // Start first wave after a short delay
      setTimeout(spawnThreatWave, 2000);

      // Start game loop
      requestAnimationFrame(gameLoop);
    }

    // Handle window resize (simplified)
    window.addEventListener('resize', () => {
      // In a real game, we'd recalculate positions, but for simplicity we'll just note it
      console.log('Window resized');
    });
  }

  function hideSections(ids) {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = 'none';
      }
    });
  }

  function addToggleMoreSections() {
    const sidebarGroup = document.querySelector('.sidebar-group');
    if (!sidebarGroup) return;

    const toggleLink = document.createElement('a');
    toggleLink.href = '#';
    toggleLink.className = 'side-link toggle-more';
    toggleLink.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v6m0 0l3-3m-3 3l-3-3"></path></svg>
      <span>إظهار المزيد</span>
    `;
    sidebarGroup.appendChild(toggleLink);

    let hiddenVisible = false;
    toggleLink.addEventListener('click', function (e) {
      e.preventDefault();
      hiddenVisible = !hiddenVisible;
      const sources = document.getElementById('section-sources');
      const about = document.getElementById('section-about');
      if (sources) sources.style.display = hiddenVisible ? 'block' : 'none';
      if (about) about.style.display = hiddenVisible ? 'block' : 'none';
      // Update icon
      const svg = toggleLink.querySelector('svg');
      if (hiddenVisible) {
        svg.innerHTML = '<path d="M12 18v-6m0 0l3-3m-3 3l-3-3"/>';
      } else {
        svg.innerHTML = '<path d="M12 6v6m0 0l3-3m-3 3l-3-3"></path>';
      }
    });
  }
})();