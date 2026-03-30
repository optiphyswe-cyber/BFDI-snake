import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { RefreshCw, Play, Pause } from "lucide-react";

const GRID_SIZE = 14;
const INITIAL_SNAKE = [
  { x: 4, y: 7 },
  { x: 3, y: 7 },
  { x: 2, y: 7 },
];

const THEMES = [
  {
    id: "leafy",
    name: "Leafy",
    head: "🍃",
    body: "🟩",
    food: "🔥",
    accent: "from-green-400 to-lime-300",
    bg: "bg-green-50",
  },
  {
    id: "firey",
    name: "Firey",
    head: "🔥",
    body: "🟧",
    food: "💧",
    accent: "from-orange-400 to-red-400",
    bg: "bg-orange-50",
  },
  {
    id: "bubble",
    name: "Bubble",
    head: "🫧",
    body: "🟦",
    food: "⭐",
    accent: "from-sky-300 to-cyan-300",
    bg: "bg-sky-50",
  },
  {
    id: "rocky",
    name: "Rocky",
    head: "🪨",
    body: "⬛",
    food: "🍰",
    accent: "from-slate-400 to-zinc-500",
    bg: "bg-slate-50",
  },
];

function randomFoodPosition(snake) {
  const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
  const free = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) free.push({ x, y });
    }
  }
  return free[Math.floor(Math.random() * free.length)] || { x: 0, y: 0 };
}

function samePos(a, b) {
  return a.x === b.x && a.y === b.y;
}

export default function BFDISnakeMobileGame() {
  const [themeId, setThemeId] = useState("leafy");
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState({ x: 1, y: 0 });
  const [nextDirection, setNextDirection] = useState({ x: 1, y: 0 });
  const [food, setFood] = useState({ x: 10, y: 7 });
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [speed, setSpeed] = useState(180);
  const touchStartRef = useRef(null);

  const theme = useMemo(
    () => THEMES.find((t) => t.id === themeId) || THEMES[0],
    [themeId]
  );

  useEffect(() => {
    const savedBest = Number(localStorage.getItem("bfdi-snake-best") || 0);
    setBest(savedBest);
  }, []);

  const resetGame = useCallback(() => {
    setSnake(INITIAL_SNAKE);
    setDirection({ x: 1, y: 0 });
    setNextDirection({ x: 1, y: 0 });
    setFood(randomFoodPosition(INITIAL_SNAKE));
    setScore(0);
    setSpeed(180);
    setGameOver(false);
    setIsRunning(false);
  }, []);

  const queueDirection = useCallback((dir) => {
    setNextDirection((current) => {
      if (current.x + dir.x === 0 && current.y + dir.y === 0) return current;
      return dir;
    });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (["ArrowUp", "w", "W"].includes(e.key)) queueDirection({ x: 0, y: -1 });
      if (["ArrowDown", "s", "S"].includes(e.key)) queueDirection({ x: 0, y: 1 });
      if (["ArrowLeft", "a", "A"].includes(e.key)) queueDirection({ x: -1, y: 0 });
      if (["ArrowRight", "d", "D"].includes(e.key)) queueDirection({ x: 1, y: 0 });
      if (e.key === " ") setIsRunning((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queueDirection]);

  useEffect(() => {
    if (!isRunning || gameOver) return;

    const timer = setInterval(() => {
      setSnake((currentSnake) => {
        const appliedDir =
          direction.x + nextDirection.x === 0 && direction.y + nextDirection.y === 0
            ? direction
            : nextDirection;

        const head = currentSnake[0];
        const newHead = {
          x: head.x + appliedDir.x,
          y: head.y + appliedDir.y,
        };

        setDirection(appliedDir);

        const hitWall =
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE;

        const hitSelf = currentSnake.some((segment) => samePos(segment, newHead));

        if (hitWall || hitSelf) {
          setGameOver(true);
          setIsRunning(false);
          setBest((prev) => {
            const updated = Math.max(prev, score);
            localStorage.setItem("bfdi-snake-best", String(updated));
            return updated;
          });
          return currentSnake;
        }

        const grew = samePos(newHead, food);
        const nextSnake = [newHead, ...currentSnake];

        if (!grew) nextSnake.pop();
        else {
          const newScore = score + 1;
          setScore(newScore);
          setFood(randomFoodPosition(nextSnake));
          setSpeed((prev) => Math.max(90, prev - 6));
          setBest((prev) => {
            const updated = Math.max(prev, newScore);
            localStorage.setItem("bfdi-snake-best", String(updated));
            return updated;
          });
        }

        return nextSnake;
      });
    }, speed);

    return () => clearInterval(timer);
  }, [direction, nextDirection, food, gameOver, isRunning, score, speed]);

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const threshold = 24;

    if (absX < threshold && absY < threshold) return;

    if (absX > absY) {
      queueDirection(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
    } else {
      queueDirection(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
    }
  };

  const renderCell = (x, y) => {
    const isHead = samePos(snake[0], { x, y });
    const isBody = snake.slice(1).some((segment) => samePos(segment, { x, y }));
    const isFood = samePos(food, { x, y });

    return (
      <div
        key={`${x}-${y}`}
        className={`aspect-square rounded-xl border border-white/60 flex items-center justify-center text-[18px] sm:text-xl shadow-sm ${theme.bg}`}
      >
        {isHead ? theme.head : isFood ? theme.food : isBody ? theme.body : ""}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white via-slate-50 to-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-md space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Card className="rounded-3xl shadow-xl border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl font-bold">BFDI Snake</CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    Mobilvänligt webspel med touch-swipe och knappkontroller.
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${theme.accent} shadow-md`} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-slate-100 p-3 text-center">
                  <div className="text-xs text-slate-500">Poäng</div>
                  <div className="text-2xl font-bold">{score}</div>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3 text-center">
                  <div className="text-xs text-slate-500">Bästa</div>
                  <div className="text-2xl font-bold">{best}</div>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3 text-center">
                  <div className="text-xs text-slate-500">Tema</div>
                  <div className="text-base font-semibold">{theme.name}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {THEMES.map((t) => (
                  <Button
                    key={t.id}
                    variant={themeId === t.id ? "default" : "outline"}
                    className="rounded-2xl"
                    onClick={() => setThemeId(t.id)}
                  >
                    {t.head} {t.name}
                  </Button>
                ))}
              </div>

              <div
                className="select-none rounded-3xl bg-slate-900 p-3 shadow-inner touch-none"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <div className="grid grid-cols-14 gap-1">
                  {Array.from({ length: GRID_SIZE }).map((_, y) =>
                    Array.from({ length: GRID_SIZE }).map((_, x) => renderCell(x, y))
                  )}
                </div>
              </div>

              {gameOver && (
                <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-center">
                  <div className="text-lg font-bold text-red-700">Game over</div>
                  <div className="text-sm text-red-600 mt-1">
                    Du kraschade. Starta om och slå ditt rekord.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="rounded-2xl h-12 text-base"
                  onClick={() => {
                    if (gameOver) resetGame();
                    setIsRunning((v) => !v);
                  }}
                >
                  {isRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {gameOver ? "Ny omgång" : isRunning ? "Pausa" : "Spela"}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl h-12 text-base"
                  onClick={resetGame}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Starta om
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto pt-1">
                <div />
                <Button variant="outline" className="rounded-2xl h-14" onClick={() => queueDirection({ x: 0, y: -1 })}>
                  ⬆️
                </Button>
                <div />
                <Button variant="outline" className="rounded-2xl h-14" onClick={() => queueDirection({ x: -1, y: 0 })}>
                  ⬅️
                </Button>
                <Button variant="outline" className="rounded-2xl h-14" onClick={() => queueDirection({ x: 0, y: 1 })}>
                  ⬇️
                </Button>
                <Button variant="outline" className="rounded-2xl h-14" onClick={() => queueDirection({ x: 1, y: 0 })}>
                  ➡️
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 justify-center pt-1">
                <Badge variant="secondary" className="rounded-xl px-3 py-1">Swipe för att styra</Badge>
                <Badge variant="secondary" className="rounded-xl px-3 py-1">Mobilformat</Badge>
                <Badge variant="secondary" className="rounded-xl px-3 py-1">Fungerar även med tangentbord</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
