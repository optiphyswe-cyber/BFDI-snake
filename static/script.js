const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const bestScoreEl = document.getElementById("bestScore");

const startOverlay = document.getElementById("startOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const gameOverText = document.getElementById("gameOverText");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const pauseButton = document.getElementById("pauseButton");
const resetButton = document.getElementById("resetButton");

const controlButtons = document.querySelectorAll(".ctrl-btn");

const GRID_COUNT = 15;
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
let loadedCount = 0;
let totalImages = collectibleFiles.length + 2;

const astorOpen = new Image();
astorOpen.src = "/static/astor-oppen-mun.png";
astorOpen.onload = imageLoaded;

const astorClosed = new Image();
astorClosed.src = "/static/astor-stang-mun.png";
astorClosed.onload = imageLoaded;

images["astorOpen"] = astorOpen;
images["astorClosed"] = astorClosed;

collectibleFiles.forEach((file) => {
  const img = new Image();
  img.src = `/static/${file}`;
  img.onload = imageLoaded;
  images[file] = img;
});

function imageLoaded() {
  loadedCount++;
}

function resizeCanvas() {
  const size = Math.min(window.innerWidth - 20, 520);
  const safeSize = Math.max(280, size);
  canvas.width = safeSize;
  canvas.height = safeSize;
  tileSize = canvas.width / GRID_COUNT;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

let snake = [];
let direction = "RIGHT";
let nextDirection = "RIGHT";

let item = null;
let score = 0;
let level = 1;
let bestScore = Number(localStorage.getItem("bfdi-best-score") || 0);

let gameInterval = null;
let moveSpeed = 220;
const minSpeed = 70;
const levelStep = 18;

let isRunning = false;
let isGameOver = false;
let mouthOpen = true;

let touchStartX = 0;
let touchStartY = 0;

bestScoreEl.textContent = bestScore;

function gridToPixel(value) {
  return value * tileSize;
}

function randomGridPosition() {
  return {
    x: Math.floor(Math.random() * GRID_COUNT),
    y: Math.floor(Math.random() * GRID_COUNT)
  };
}

function positionsEqual(a, b) {
  return a.x === b.x && a.y === b.y;
}

function getRandomCollectible() {
  const randomIndex = Math.floor(Math.random() * collectibleFiles.length);
  return collectibleFiles[randomIndex];
}

function spawnItem() {
  let newPos = randomGridPosition();

  while (snake.some(segment => positionsEqual(segment, newPos))) {
    newPos = randomGridPosition();
  }

  item = {
    x: newPos.x,
    y: newPos.y,
    file: getRandomCollectible()
  };
}

function resetGameState() {
  snake = [
    { x: 7, y: 7 },
    { x: 6, y: 7 },
    { x: 5, y: 7 }
  ];

  direction = "RIGHT";
  nextDirection = "RIGHT";

  score = 0;
  level = 1;
  moveSpeed = 220;
  isGameOver = false;
  mouthOpen = true;

  spawnItem();
  updateHud();
}

function updateHud() {
  scoreEl.textContent = score;
  levelEl.textContent = level;
  bestScoreEl.textContent = bestScore;
}

function updateBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("bfdi-best-score", String(bestScore));
    bestScoreEl.textContent = bestScore;
  }
}

function updateLevelAndSpeed() {
  level = Math.floor(score / 4) + 1;
  moveSpeed = Math.max(minSpeed, 220 - (level - 1) * levelStep);
  updateHud();
  restartLoop();
}

function restartLoop() {
  if (gameInterval) clearInterval(gameInterval);
  if (isRunning && !isGameOver) {
    gameInterval = setInterval(gameTick, moveSpeed);
  }
}

function setDirection(newDir) {
  if (newDir === "LEFT" && direction !== "RIGHT") nextDirection = "LEFT";
  if (newDir === "RIGHT" && direction !== "LEFT") nextDirection = "RIGHT";
  if (newDir === "UP" && direction !== "DOWN") nextDirection = "UP";
  if (newDir === "DOWN" && direction !== "UP") nextDirection = "DOWN";
}

document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  if (key === "arrowleft" || key === "a") setDirection("LEFT");
  if (key === "arrowright" || key === "d") setDirection("RIGHT");
  if (key === "arrowup" || key === "w") setDirection("UP");
  if (key === "arrowdown" || key === "s") setDirection("DOWN");

  if (key === " ") {
    e.preventDefault();
    togglePause();
  }
});

controlButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setDirection(btn.dataset.dir);
  });

  btn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    setDirection(btn.dataset.dir);
  }, { passive: false });
});

canvas.addEventListener("touchstart", (e) => {
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: true });

canvas.addEventListener("touchend", (e) => {
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const threshold = 20;

  if (absX < threshold && absY < threshold) return;

  if (absX > absY) {
    if (dx > 0) setDirection("RIGHT");
    else setDirection("LEFT");
  } else {
    if (dy > 0) setDirection("DOWN");
    else setDirection("UP");
  }
}, { passive: true });

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);
pauseButton.addEventListener("click", togglePause);
resetButton.addEventListener("click", restartGame);

canvas.addEventListener("click", () => {
  if (!isRunning && !isGameOver) startGame();
});

function drawBackground() {
  for (let row = 0; row < GRID_COUNT; row++) {
    for (let col = 0; col < GRID_COUNT; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#f8fafc" : "#eaf2ff";
      ctx.fillRect(gridToPixel(col), gridToPixel(row), tileSize, tileSize);
    }
  }
}

function drawItem() {
  if (!item) return;

  const img = images[item.file];
  const px = gridToPixel(item.x);
  const py = gridToPixel(item.y);
  const padding = tileSize * 0.08;

  if (img && img.complete) {
    ctx.drawImage(
      img,
      px + padding,
      py + padding,
      tileSize - padding * 2,
      tileSize - padding * 2
    );
  } else {
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(px + tileSize / 2, py + tileSize / 2, tileSize * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSnake() {
  for (let i = snake.length - 1; i >= 0; i--) {
    const seg = snake[i];
    const px = gridToPixel(seg.x);
    const py = gridToPixel(seg.y);

    if (i === 0) {
      drawAstorHead(px, py);
    } else {
      drawBodySegment(px, py, i);
    }
  }
}

function drawBodySegment(px, py, index) {
  const radius = tileSize * 0.22;

  ctx.fillStyle = index % 2 === 0 ? "#60a5fa" : "#3b82f6";
  roundRect(ctx, px + tileSize * 0.08, py + tileSize * 0.08, tileSize * 0.84, tileSize * 0.84, radius);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawAstorHead(px, py) {
  const img = mouthOpen ? images.astorOpen : images.astorClosed;
  const padding = tileSize * 0.02;
  const centerX = px + tileSize / 2;
  const centerY = py + tileSize / 2;

  ctx.save();
  ctx.translate(centerX, centerY);

  let angle = 0;
  if (direction === "RIGHT") angle = 0;
  if (direction === "DOWN") angle = Math.PI / 2;
  if (direction === "LEFT") angle = Math.PI;
  if (direction === "UP") angle = -Math.PI / 2;

  ctx.rotate(angle);

  if (img && img.complete) {
    ctx.drawImage(
      img,
      -tileSize / 2 + padding,
      -tileSize / 2 + padding,
      tileSize - padding * 2,
      tileSize - padding * 2
    );
  } else {
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(0, 0, tileSize * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function draw() {
  drawBackground();
  drawItem();
  drawSnake();
}

function moveHeadPosition(head) {
  const nextHead = { x: head.x, y: head.y };

  if (nextDirection === "LEFT") nextHead.x -= 1;
  if (nextDirection === "RIGHT") nextHead.x += 1;
  if (nextDirection === "UP") nextHead.y -= 1;
  if (nextDirection === "DOWN") nextHead.y += 1;

  return nextHead;
}

function hitWall(head) {
  return (
    head.x < 0 ||
    head.y < 0 ||
    head.x >= GRID_COUNT ||
    head.y >= GRID_COUNT
  );
}

function hitSelf(head) {
  return snake.some(segment => positionsEqual(segment, head));
}

function gameTick() {
  if (!isRunning || isGameOver) return;

  direction = nextDirection;

  const newHead = moveHeadPosition(snake[0]);
  mouthOpen = !mouthOpen;

  if (hitWall(newHead) || hitSelf(newHead)) {
    endGame();
    return;
  }

  snake.unshift(newHead);

  if (item && positionsEqual(newHead, item)) {
    score++;
    updateBestScore();
    updateLevelAndSpeed();
    spawnItem();
  } else {
    snake.pop();
    updateHud();
  }

  draw();
}

function endGame() {
  isGameOver = true;
  isRunning = false;
  clearInterval(gameInterval);
  gameOverText.textContent = `Poäng: ${score} • Nivå: ${level}`;
  gameOverOverlay.classList.remove("hidden");
}

function startGame() {
  if (loadedCount < totalImages) return;
  startOverlay.classList.add("hidden");
  gameOverOverlay.classList.add("hidden");
  isRunning = true;
  restartLoop();
  pauseButton.textContent = "Pausa";
  draw();
}

function restartGame() {
  clearInterval(gameInterval);
  resetGameState();
  gameOverOverlay.classList.add("hidden");
  startOverlay.classList.add("hidden");
  isRunning = true;
  pauseButton.textContent = "Pausa";
  restartLoop();
  draw();
}

function togglePause() {
  if (isGameOver) return;
  if (loadedCount < totalImages) return;

  if (!isRunning) {
    isRunning = true;
    pauseButton.textContent = "Pausa";
    restartLoop();
  } else {
    isRunning = false;
    pauseButton.textContent = "Fortsätt";
    clearInterval(gameInterval);
  }
}

function showStartOverlay() {
  startOverlay.classList.remove("hidden");
}

function waitForImages() {
  if (loadedCount >= totalImages) {
    resetGameState();
    draw();
    showStartOverlay();
  } else {
    setTimeout(waitForImages, 100);
  }
}

waitForImages();
