/**
 * Bla Bli Blu: A Love Story - Mini Game Engine
 * Flappy-style HTML5 Canvas Game with Web Audio synth sounds
 */

class BlaBliBluGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // Canvas resolution setup
    this.canvas.width = 500;
    this.canvas.height = 380;
    
    // Game variables
    this.state = 'INIT'; // INIT, PLAYING, GAMEOVER
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('blabliblu_high_score') || '0', 10);
    this.frameCount = 0;
    this.audioMuted = false;
    
    // Audio Context
    this.audioCtx = null;
    
    // Player properties
    this.player = {
      x: 80,
      y: 190,
      width: 48,
      height: 28,
      vy: 0,
      gravity: 0.36,
      jump: -6.5,
      rotation: 0
    };
    
    // Obstacles array
    this.obstacles = [];
    this.obstacleSpeed = 2.5;
    this.spawnRate = 100; // frames
    this.gapSize = 130;
    
    // Background parallax offsets
    this.bgX = 0;
    this.mountainsX = 0;
    
    // DOM Elements
    this.scoreDisplay = document.getElementById('scratchScore');
    this.overlay = document.getElementById('gameOverlay');
    this.overlayTitle = document.getElementById('overlayTitle');
    this.overlayScore = document.getElementById('overlayScore');
    this.overlayHighScore = document.getElementById('overlayHighScore');
    this.overlayRewardMsg = document.getElementById('overlayRewardMsg');
    this.btnStart = document.getElementById('btnStartGame');
    this.greenFlag = document.getElementById('btnGreenFlag');
    this.redStop = document.getElementById('btnRedStop');
    this.btnAudio = document.getElementById('btnAudioToggle');
    
    this.initEvents();
    this.updateScoreUI();
    this.renderInitialFrame();
  }
  
  initAudio() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playSynthTone(freqStart, freqEnd, type, duration) {
    if (this.audioMuted || !this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, this.audioCtx.currentTime);
      if (freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(freqEnd, this.audioCtx.currentTime + duration);
      }
      
      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch(e) {
      // Audio context error fallback
    }
  }

  playJumpSound() {
    this.playSynthTone(280, 580, 'square', 0.12);
  }

  playScoreSound() {
    this.playSynthTone(523, 784, 'sine', 0.15);
  }

  playCrashSound() {
    this.playSynthTone(160, 40, 'sawtooth', 0.35);
  }

  initEvents() {
    // Jump input listeners
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (this.state === 'PLAYING') {
          e.preventDefault();
          this.jump();
        } else if (this.state === 'INIT' || this.state === 'GAMEOVER') {
          e.preventDefault();
          this.start();
        }
      }
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.state === 'PLAYING') {
        this.jump();
      } else {
        this.start();
      }
    });

    if (this.greenFlag) {
      this.greenFlag.addEventListener('click', () => this.start());
    }

    if (this.redStop) {
      this.redStop.addEventListener('click', () => {
        if (this.state === 'PLAYING') {
          this.gameOver();
        }
      });
    }

    if (this.btnStart) {
      this.btnStart.addEventListener('click', () => this.start());
    }

    if (this.btnAudio) {
      this.btnAudio.addEventListener('click', () => {
        this.audioMuted = !this.audioMuted;
        this.btnAudio.innerHTML = this.audioMuted ? '🔇 Sound OFF' : '🔊 Sound ON';
      });
    }
  }

  jump() {
    this.initAudio();
    this.player.vy = this.player.jump;
    this.playJumpSound();
  }

  start() {
    this.initAudio();
    this.state = 'PLAYING';
    this.score = 0;
    this.frameCount = 0;
    this.player.y = 170;
    this.player.vy = 0;
    this.player.rotation = 0;
    this.obstacles = [];
    this.updateScoreUI();
    
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
    
    this.loop();
  }

  gameOver() {
    this.state = 'GAMEOVER';
    this.playCrashSound();
    
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('blabliblu_high_score', this.highScore.toString());
    }
    
    this.updateScoreUI();
    this.highlightRewardTable();

    // Show overlay
    if (this.overlay) {
      this.overlayTitle.innerText = "GAME OVER";
      this.overlayScore.innerText = this.score;
      this.overlayHighScore.innerText = this.highScore;
      
      let reward = "Keep flying to reach 20 points!";
      if (this.score >= 50) reward = "🎉 UNLOCKED 20% OFF REWARD!";
      else if (this.score >= 40) reward = "🎉 UNLOCKED 15% OFF REWARD!";
      else if (this.score >= 30) reward = "🎉 UNLOCKED 10% OFF REWARD!";
      else if (this.score >= 20) reward = "🎉 UNLOCKED 5% OFF REWARD!";
      
      this.overlayRewardMsg.innerText = reward;
      this.overlay.classList.remove('hidden');
    }
  }

  updateScoreUI() {
    if (this.scoreDisplay) {
      this.scoreDisplay.innerText = `score: ${this.score}`;
    }
  }

  highlightRewardTable() {
    const rows = document.querySelectorAll('.rewards-table tr');
    rows.forEach(r => r.classList.remove('active-reward-row'));
    
    let activeRowIndex = -1;
    if (this.highScore >= 50) activeRowIndex = 4;
    else if (this.highScore >= 40) activeRowIndex = 3;
    else if (this.highScore >= 30) activeRowIndex = 2;
    else if (this.highScore >= 20) activeRowIndex = 1;
    
    if (activeRowIndex !== -1 && rows[activeRowIndex]) {
      rows[activeRowIndex].classList.add('active-reward-row');
    }
  }

  spawnObstacle() {
    const minHeight = 40;
    const maxHeight = this.canvas.height - this.gapSize - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
    
    this.obstacles.push({
      x: this.canvas.width + 10,
      topHeight: topHeight,
      bottomY: topHeight + this.gapSize,
      width: 44,
      passed: false
    });
  }

  update() {
    if (this.state !== 'PLAYING') return;

    this.frameCount++;
    
    // Player physics
    this.player.vy += this.player.gravity;
    this.player.y += this.player.vy;
    this.player.rotation = Math.min(Math.PI / 6, Math.max(-Math.PI / 6, this.player.vy * 0.08));

    // Floor and ceiling bounds
    if (this.player.y + this.player.height >= this.canvas.height || this.player.y <= 0) {
      this.gameOver();
      return;
    }

    // Parallax background update
    this.bgX = (this.bgX - 0.5) % this.canvas.width;
    this.mountainsX = (this.mountainsX - 1.2) % this.canvas.width;

    // Obstacle spawn
    if (this.frameCount % this.spawnRate === 0) {
      this.spawnObstacle();
    }

    // Move & check obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.obstacleSpeed;

      // Score check
      if (!obs.passed && obs.x + obs.width < this.player.x) {
        obs.passed = true;
        this.score++;
        this.updateScoreUI();
        this.playScoreSound();
      }

      // Collision check
      // Player bounding box
      const pLeft = this.player.x;
      const pRight = this.player.x + this.player.width;
      const pTop = this.player.y;
      const pBottom = this.player.y + this.player.height;

      const obsLeft = obs.x;
      const obsRight = obs.x + obs.width;

      if (pRight > obsLeft && pLeft < obsRight) {
        // Hits top tentacle
        if (pTop < obs.topHeight || pBottom > obs.bottomY) {
          this.gameOver();
          return;
        }
      }

      // Remove offscreen
      if (obs.x + obs.width < -20) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  drawBackground() {
    // Sky Gradient
    const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    skyGrad.addColorStop(0, '#2e0014');
    skyGrad.addColorStop(0.5, '#7a0026');
    skyGrad.addColorStop(1, '#b3003b');
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Full Crimson Moon
    this.ctx.fillStyle = 'rgba(255, 120, 150, 0.4)';
    this.ctx.beginPath();
    this.ctx.arc(380, 80, 50, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = 'rgba(255, 200, 220, 0.8)';
    this.ctx.beginPath();
    this.ctx.arc(380, 80, 42, 0, Math.PI * 2);
    this.ctx.fill();

    // Mountain silhouettes
    this.ctx.fillStyle = '#18000a';
    this.ctx.beginPath();
    const mountainWidth = 100;
    for (let x = this.mountainsX - mountainWidth; x < this.canvas.width + mountainWidth; x += mountainWidth) {
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.lineTo(x + mountainWidth / 2, this.canvas.height - 70);
      this.ctx.lineTo(x + mountainWidth, this.canvas.height);
    }
    this.ctx.fill();
  }

  drawTentacle(x, y, width, height, isTop) {
    this.ctx.save();
    this.ctx.translate(x, y);

    // Tentacle gradient
    const grad = this.ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, '#80001a');
    grad.addColorStop(0.5, '#d60036');
    grad.addColorStop(1, '#600014');
    this.ctx.fillStyle = grad;
    this.ctx.strokeStyle = '#111111';
    this.ctx.lineWidth = 3;

    if (isTop) {
      // Top tentacle extending down
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(width, 0);
      this.ctx.quadraticCurveTo(width * 0.8, height * 0.5, width * 0.6, height);
      this.ctx.lineTo(width * 0.2, height);
      this.ctx.quadraticCurveTo(0, height * 0.5, 0, 0);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      // Suction cups along right side
      this.ctx.fillStyle = '#ff8099';
      for (let sY = 20; sY < height - 10; sY += 24) {
        this.ctx.beginPath();
        this.ctx.arc(width * 0.65, sY, 5, 0, Math.PI * 2);
        this.ctx.fill();
      }
    } else {
      // Bottom tentacle extending up
      this.ctx.beginPath();
      this.ctx.moveTo(0, height);
      this.ctx.lineTo(width, height);
      this.ctx.quadraticCurveTo(width * 0.8, height * 0.5, width * 0.6, 0);
      this.ctx.lineTo(width * 0.2, 0);
      this.ctx.quadraticCurveTo(0, height * 0.5, 0, height);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      // Suction cups
      this.ctx.fillStyle = '#ff8099';
      for (let sY = 20; sY < height - 10; sY += 24) {
        this.ctx.beginPath();
        this.ctx.arc(width * 0.65, sY, 5, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    this.ctx.restore();
  }

  drawPlayer() {
    this.ctx.save();
    this.ctx.translate(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
    this.ctx.rotate(this.player.rotation);

    // Jet Thrust Mist / Flame
    if (this.state === 'PLAYING') {
      const mistLength = Math.random() * 12 + 10;
      this.ctx.fillStyle = 'rgba(255, 64, 125, 0.8)';
      this.ctx.beginPath();
      this.ctx.arc(-this.player.width / 2 - 8, 4, 7, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#ffc107';
      this.ctx.beginPath();
      this.ctx.arc(-this.player.width / 2 - 14, 4, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Perfume Bottle Body
    this.ctx.fillStyle = '#fce4ec';
    this.ctx.strokeStyle = '#111111';
    this.ctx.lineWidth = 2.5;
    
    // Rounded bottle rocket body
    this.ctx.beginPath();
    this.ctx.roundRect(-this.player.width / 2, -10, this.player.width - 6, 20, 8);
    this.ctx.fill();
    this.ctx.stroke();

    // Red Cap
    this.ctx.fillStyle = '#cc002b';
    this.ctx.fillRect(this.player.width / 2 - 8, -6, 8, 12);
    this.ctx.strokeRect(this.player.width / 2 - 8, -6, 8, 12);

    // Label Text
    this.ctx.fillStyle = '#8b002b';
    this.ctx.font = 'bold 7px sans-serif';
    this.ctx.fillText('BLABLIBLU', -14, 3);

    // Rider Hero Avatar
    this.ctx.fillStyle = '#ffccaa'; // face
    this.ctx.beginPath();
    this.ctx.arc(-2, -16, 7, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Red-brown Hair
    this.ctx.fillStyle = '#a52a2a';
    this.ctx.beginPath();
    this.ctx.arc(-2, -18, 8, Math.PI, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.drawBackground();

    // Draw Obstacles
    for (const obs of this.obstacles) {
      // Top tentacle
      this.drawTentacle(obs.x, 0, obs.width, obs.topHeight, true);
      // Bottom tentacle
      this.drawTentacle(obs.x, obs.bottomY, obs.width, this.canvas.height - obs.bottomY, false);
    }

    // Draw Player
    this.drawPlayer();
  }

  renderInitialFrame() {
    this.drawBackground();
    this.drawPlayer();
  }

  loop() {
    if (this.state === 'PLAYING') {
      this.update();
      this.draw();
      requestAnimationFrame(() => this.loop());
    }
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.gameEngine = new BlaBliBluGame('gameCanvas');
});
