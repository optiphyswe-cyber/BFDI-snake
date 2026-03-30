const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const bestScoreEl = document.getElementById("bestScore");

const startOverlay = document.getElementById("startOverlay");
const pauseOverlay = document.getElementById("pauseOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const gameOverText = document.getElementById("gameOverText");
const catchFlash = document.getElementById("catchFlash");

const startButton = document.getElementById("startButton");
const resumeButton = document.getElementById("resumeButton");
const restartButton = document.getElementById("restartButton");
const pauseButton = document.getElementById("pauseButton");
const resetButton = document.getElementById("resetButton");
const controlButtons = document.querySelectorAll(".ctrl-btn");

const GRID_SIZE = 15;
const BASE_SPEED = 180;
const MIN_SPEED = 72;
const SPEED_STEP = 12;

let tileSize = 24;

const collectibleFiles = [
  "bread.png",
  "bubble.png",
  "cheese.png",
  "ice.png",
  "leaf.png",
  "pen.png",
  "pin.png",
  "red box.png"
];

const images = {};
let loadedImages = 0;
const totalImages = collectibleFiles.length + 2;

function onImageLoaded() {
  loadedImages++;
}

function loadImage(key, path) {
  const img = new Image();
  img.src = path;
  img.onload = onImageLoaded;
  images[key] = img;
}

loadImage("astorOpen", "/static/astor-oppen-mun.png");
loadImage("astorClosed", "/static/astor-stang-mun.png");

collectibleFiles.forEach((file) => {
  loadImage(file, `/static/${file}`);
});

const bgMusic = new Audio("/static/Screen_Recording_20260330_191922_YouTube.wav");
bgMusic.loop = true;
bgMusic.volume = 0.45;
bgMusic.preload = "auto";

let snake = [];
let direction = "RIGHT";
let queuedDirection = "RIGHT";
let item = null;

let score = 0;
let bestScore = Number(localStorage.getItem("astor-snake-best") || 0);
let level = 1;
let speed = BASE_SPEED;

let running = false;
let gameOver = false;
let mouthOpen = false;
let lastMoveTime = 0;
let animationFrame = null;

bestScoreEl.textContent = bestScore;

function resizeCanvas() {
  const wrap = canvas.parentElement;
  const size = Math.min(wrap.clientWidth, 560);
  canvas.width = size;
  canvas.height = size;
  tileSize = canvas.width / GRID_SIZE;
  draw();
}

window.addEventListener("resize", resizeCanvas);

function gridPos(x, y) {
  return { x, y };
}

function samePos(a, b) {
  return a.x === b.x && a.y === b.y;
}

function randomGridCell() {
  return {
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE)
  };
}

function setRandomItem() {
  let pos = randomGridCell();

  while (snake.some(seg => samePos(seg, pos))) {
    pos = randomGridCell();
  }

  const file = collectibleFiles[Math.floor(Math.random() * collectibleFiles.length)];
  item = { ...pos, file };
}

function resetState() {
  snake = [
    gridPos(7, 7),
    gridPos(6, 7),
    gridPos(5, 7)
  ];

  direction = "RIGHT";
  queuedDirection = "RIGHT";
  score = 0;
  level = 1;
  speed = BASE_SPEED;
  running = false;
  gameOver = false;
  mouthOpen = false;
  lastMoveTime = 0;

  setRandomItem();
  updateHud();
}

function updateHud() {
  scoreEl.textContent = score;
  levelEl.textContent = level;
  bestScoreEl.textContent = bestScore;
}

function updateBest() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("astor-snake-best", String(bestScore));
  }
}

function updateDifficulty() {
  level = Math.floor(score / 4) + 1;
  speed = Math.max(MIN_SPEED, BASE_SPEED - (level - 1) * SPEED_STEP);
  updateHud();
}

function directionAllowed(next) {
  if (direction === "LEFT" && next === "RIGHT") return false;
  if (direction === "RIGHT" && next === "LEFT") return false;
  if (direction === "UP" && next === "DOWN") return false;
  if (direction === "DOWN" && next === "UP") return false;
  return true;
}

function setDirection(next) {
  if (!directionAllowed(next)) return;
  queuedDirection = next;
}

document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  if (key === "arrowup" || key === "w") setDirection("UP");
  if (key === "arrowdown" || key === "s") setDirection("DOWN");
  if (key === "arrowleft" || key === "a") setDirection("LEFT");
  if (key === "arrowright" || key === "d") setDirection("RIGHT");

  if (key === " ") {
    e.preventDefault();
    togglePause();
  }
});

controlButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setDirection(button.dataset.dir);
  });

  button.addEventListener("touchstart", (e) => {
    e.preventDefault();
    setDirection(button.dataset.dir);
  }, { passive: false });
});

function handlePointerControl(clientX, clientY) {
  if (!snake.length || !running || gameOver) return;

  const rect = canvas.getBoundingClientRect();
  const canvasX = clientX - rect.left;
  const canvasY = clientY - rect.top;

  const head = snake[0];
  const headCenterX = head.x * tileSize + tileSize / 2;
  const headCenterY = head.y * tileSize + tileSize / 2;

  const dx = canvasX - headCenterX;
  const dy = canvasY - headCenterY;

  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  let next;

  if (absX > absY) {
    next = dx > 0 ? "RIGHT" : "LEFT";
  } else {
    next = dy > 0 ? "DOWN" : "UP";
  }

  setDirection(next);
}

canvas.addEventListener("click", (e) => {
  handlePointerControl(e.clientX, e.clientY);
});

canvas.addEventListener("touchstart", (e) => {
  const t = e.touches[0];
  handlePointerControl(t.clientX, t.clientY);
}, { passive: true });

startButton.addEventListener("click", startGame);
resumeButton.addEventListener("click", resumeGame);
restartButton.addEventListener("click", restartGame);
pauseButton.addEventListener("click", togglePause);
resetButton.addEventListener("click", restartGame);

function startMusic() {
  bgMusic.play().catch(() => {});
}

function pauseMusic() {
  bgMusic.pause();
}

function startGame() {
  if (loadedImages < totalImages) return;

  startOverlay.classList.add("hidden");
  pauseOverlay.classList.add("hidden");
  gameOverOverlay.classList.add("hidden");
  running = true;
  gameOver = false;
  pauseButton.textContent = "Pausa";
  startMusic();
}

function resumeGame() {
  pauseOverlay.classList.add("hidden");
  running = true;
  pauseButton.textContent = "Pausa";
  startMusic();
}

function restartGame() {
  resetState();
  startOverlay.classList.add("hidden");
  pauseOverlay.classList.add("hidden");
  gameOverOverlay.classList.add("hidden");
  running = true;
  gameOver = false;
  pauseButton.textContent = "Pausa";
  startMusic();
}

function togglePause() {
  if (gameOver || startOverlay.classList.contains("hidden") === false) return;

  running = !running;
  pauseButton.textContent = running ? "Pausa" : "Fortsätt";

  if (!running) {
    pauseOverlay.classList.remove("hidden");
    pauseMusic();
  } else {
    pauseOverlay.classList.add("hidden");
    startMusic();
  }
}

function triggerCatchEffect() {
  catchFlash.classList.remove("hidden");
  void catchFlash.offsetWidth;

  setTimeout(() => {
    catchFlash.classList.add("hidden");
  }, 220);

  if (navigator.vibrate) {
    navigator.vibrate(35);
  }
}

function triggerDeathEffect() {
  if (navigator.vibrate) {
    navigator.vibrate([60, 40, 80]);
  }
}

function moveHead(head, dir) {
  const next = { x: head.x, y: head.y };

  if (dir === "UP") next.y -= 1;
  if (dir === "DOWN") next.y += 1;
  if (dir === "LEFT") next.x -= 1;
  if (dir === "RIGHT") next.x += 1;

  return next;
}

function hitsWall(pos) {
  return pos.x < 0 || pos.y < 0 || pos.x >= GRID_SIZE || pos.y >= GRID_SIZE;
}

function hitsSelf(pos) {
  return snake.some(seg => samePos(seg, pos));
}

function tick() {
  if (!running || gameOver) return;

  if (directionAllowed(queuedDirection)) {
    direction = queuedDirection;
  }

  const newHead = moveHead(snake[0], direction);
  mouthOpen = !mouthOpen;

  if (hitsWall(newHead) || hitsSelf(newHead)) {
    gameOver = true;
    running = false;
    updateBest();
    updateHud();
    triggerDeathEffect();
    pauseMusic();
    gameOverText.textContent = `Poäng: ${score} • Nivå: ${level}`;
    gameOverOverlay.classList.remove("hidden");
    return;
  }

  snake.unshift(newHead);

  if (samePos(newHead, item)) {
    score++;
    updateBest();
    updateDifficulty();
    setRandomItem();
    triggerCatchEffect();
  } else {
    snake.pop();
    updateHud();
  }
}

function drawRoundedRect(x, y, w, h, r, fillStyle) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function drawBackground() {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const px = x * tileSize;
      const py = y * tileSize;
      const warm = (x + y) % 2 === 0 ? "#fff8dc" : "#ffefbf";
      drawRoundedRect(
        px + tileSize * 0.03,
        py + tileSize * 0.03,
        tileSize * 0.94,
        tileSize * 0.94,
        tileSize * 0.18,
        warm
      );
    }
  }
}

function drawItem(time) {
  if (!item) return;

  const img = images[item.file];
  const px = item.x * tileSize;
  const py = item.y * tileSize;
  const pulse = 1 + Math.sin(time * 0.008) * 0.06;
  const size = tileSize * 0.78 * pulse;
  const offset = (tileSize - size) / 2;

  ctx.save();
  ctx.shadowColor = "rgba(255, 196, 0, 0.35)";
  ctx.shadowBlur = 14;

  if (img && img.complete) {
    ctx.drawImage(img, px + offset, py + offset, size, size);
  } else {
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(px + tileSize / 2, py + tileSize / 2, tileSize * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawBody() {
  for (let i = snake.length - 1; i >= 1; i--) {
    const seg = snake[i];
    const px = seg.x * tileSize;
    const py = seg.y * tileSize;
    const inner = tileSize * 0.16;
    const color = i % 2 === 0 ? "#60a5fa" : "#3b82f6";

    ctx.save();
    ctx.shadowColor = "rgba(59, 130, 246, 0.22)";
    ctx.shadowBlur = 8;
    drawRoundedRect(
      px + inner,
      py + inner,
      tileSize - inner * 2,
      tileSize - inner * 2,
      tileSize * 0.22,
      color
    );
    ctx.restore();
  }
}

function headAngleFromDirection(dir) {
  if (dir === "RIGHT") return 0;
  if (dir === "DOWN") return Math.PI / 2;
  if (dir === "LEFT") return Math.PI;
  if (dir === "UP") return -Math.PI / 2;
  return 0;
}

function drawHead() {
  const head = snake[0];
  const px = head.x * tileSize;
  const py = head.y * tileSize;
  const centerX = px + tileSize / 2;
  const centerY = py + tileSize / 2;

  const img = mouthOpen ? images.astorOpen : images.astorClosed;
  const bob = mouthOpen ? 1.04 : 0.98;
  const size = tileSize * 1.08 * bob;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(headAngleFromDirection(direction));
  ctx.shadowColor = "rgba(249, 115, 22, 0.32)";
  ctx.shadowBlur = 16;

  if (img && img.complete) {
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
  } else {
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(0, 0, tileSize * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawAimHint() {
  if (!snake.length || !running || gameOver) return;

  const head = snake[0];
  const px = head.x * tileSize;
  const py = head.y * tileSize;
  const centerX = px + tileSize / 2;
  const centerY = py + tileSize / 2;

  let arrowX = centerX;
  let arrowY = centerY;

  if (queuedDirection === "UP") arrowY -= tileSize * 0.9;
  if (queuedDirection === "DOWN") arrowY += tileSize * 0.9;
  if (queuedDirection === "LEFT") arrowX -= tileSize * 0.9;
  if (queuedDirection === "RIGHT") arrowX += tileSize * 0.9;

  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(arrowX, arrowY, tileSize * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw(time = 0) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawItem(time);
  drawBody();
  if (snake.length > 0) drawHead();
  drawAimHint();
}

function gameLoop(time) {
  if (!lastMoveTime) lastMoveTime = time;

  if (running && !gameOver && time - lastMoveTime >= speed) {
    tick();
    lastMoveTime = time;
  }

  draw(time);
  animationFrame = requestAnimationFrame(gameLoop);
}

function boot() {
  resetState();
  resizeCanvas();
  startOverlay.classList.remove("hidden");
  animationFrame = requestAnimationFrame(gameLoop);
}

function waitForAssets() {
  if (loadedImages >= totalImages) {
    boot();
  } else {
    setTimeout(waitForAssets, 100);
  }
}

waitForAssets();
