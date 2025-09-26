// Función que convierte segundos en un texto tipo "mm:ss"
function formatTime(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// Aquí capturamos los elementos del HTML que vamos a manipular desde JS
const boardEl = document.getElementById("board");
const btnStart = document.getElementById("btnStart");
const btnReset = document.getElementById("btnReset");
const presetSelect = document.getElementById("presetSelect");
const customControls = document.getElementById("customControls");
const rowsInput = document.getElementById("rows");
const colsInput = document.getElementById("cols");
const minesInput = document.getElementById("mines");
const minesLeftEl = document.getElementById("minesLeft");
const timerEl = document.getElementById("timer");
const bestTimeEl = document.getElementById("bestTime");
const btnShowSolution = document.getElementById("btnShowSolution");

// Variables que representan el estado del juego
let rows = 8;           
let cols = 8;           
let totalMines = 10;    
let grid = [];          // aquí vive toda la info de cada celda
let gameOver = false;   
let cellsRevealed = 0;  
let timer = null;       
let elapsed = 0;        
let minesLeft = 0;      

// Cuando cambias el selector de dificultad, mostramos u ocultamos el panel "personalizado"
presetSelect.addEventListener("change", () => {
  if (presetSelect.value === "custom") {
    customControls.style.display = "block";
  } else {
    customControls.style.display = "none";
    const [size, m] = presetSelect.value.split("-");
    const [r, c] = size.split("x").map(Number);
    rowsInput.value = r;
    colsInput.value = c;
    minesInput.value = Number(m);
  }
});

// Configuración inicial cuando la página carga
(function initDefaults(){
  const [size, m] = presetSelect.value.split("-");
  const [r, c] = size.split("x").map(Number);
  rows = r; cols = c; totalMines = Number(m);
  rowsInput.value = rows; colsInput.value = cols; minesInput.value = totalMines;
})();

// Creamos un tablero vacío (todas las celdas sin mina y ocultas)
function createEmptyGrid(r,c){
  const g = new Array(r);
  for(let i=0;i<r;i++){
    g[i] = new Array(c);
    for(let j=0;j<c;j++){
      g[i][j] = { mine:false, revealed:false, flagged:false, adjacent:0 };
    }
  }
  return g;
}

// Colocamos minas de forma aleatoria evitando el primer clic
function placeMines(r,c,m,avoidPos=null){
  const positions = [];
  for(let i=0;i<r;i++){
    for(let j=0;j<c;j++){
      if (avoidPos && avoidPos[0]===i && avoidPos[1]===j) continue;
      positions.push([i,j]);
    }
  }
  // mezclamos posiciones para que sea aleatorio
  for(let k=positions.length-1;k>0;k--){
    const t = Math.floor(Math.random()*(k+1));
    [positions[k], positions[t]] = [positions[t], positions[k]];
  }
  return positions.slice(0, m);
}

// Calcula los números que van en cada celda (minas adyacentes)
function computeAdjacents(g){
  const r = g.length, c = g[0].length;
  for(let i=0;i<r;i++){
    for(let j=0;j<c;j++){
      if (g[i][j].mine) { g[i][j].adjacent = -1; continue; }
      let count = 0;
      for(let di=-1;di<=1;di++){
        for(let dj=-1;dj<=1;dj++){
          if (di===0 && dj===0) continue;
          const ni = i+di, nj = j+dj;
          if (ni>=0 && ni<r && nj>=0 && nj<c && g[ni][nj].mine) count++;
        }
      }
      g[i][j].adjacent = count;
    }
  }
}

// Dibuja el tablero en pantalla según el estado de cada celda
function renderBoard(g){
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${cols}, 36px)`;

  for(let i=0;i<rows;i++){
    for(let j=0;j<cols;j++){
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.r = i;
      cell.dataset.c = j;

      if (g[i][j].revealed) {
        cell.classList.add("revealed");
        if (g[i][j].mine) {
          cell.classList.add("mine");
          cell.textContent = "💣";
        } else if (g[i][j].adjacent > 0) {
          cell.classList.add(`number-${g[i][j].adjacent}`);
          cell.textContent = g[i][j].adjacent;
        }
      } else {
        if (g[i][j].flagged) {
          cell.classList.add("flagged");
          cell.textContent = "🚩";
        }
      }

      // Eventos de click izquierdo y derecho
      cell.addEventListener("click", onCellClick);
      cell.addEventListener("contextmenu", onCellRightClick);
      boardEl.appendChild(cell);
    }
  }
}

// Revela todas las celdas (lo usamos al perder o para debug)
function revealAll(g){
  for(let i=0;i<rows;i++){
    for(let j=0;j<cols;j++){
      g[i][j].revealed = true;
    }
  }
  renderBoard(g);
}

// Inicia el juego: limpia todo y prepara tablero vacío
function startGame(){
  rows = Number(rowsInput.value);
  cols = Number(colsInput.value);
  totalMines = Number(minesInput.value);

  if (rows < 5) rows = 5;
  if (cols < 5) cols = 5;
  if (totalMines < 1) totalMines = 1;
  if (totalMines > rows*cols - 1) totalMines = rows*cols - 1;

  grid = createEmptyGrid(rows,cols);
  gameOver = false;
  cellsRevealed = 0;
  elapsed = 0;
  clearInterval(timer);
  timer = null;
  timerEl.textContent = formatTime(0);
  minesLeft = totalMines;
  minesLeftEl.textContent = minesLeft;
  bestTimeEl.textContent = getBestTimeString(rows,cols,totalMines);

  renderBoard(grid);
}

// Se ejecuta en el primer clic del jugador para colocar minas
function handleFirstClick(r,c){
  const mines = placeMines(rows,cols,totalMines,[r,c]);
  mines.forEach(([mi,mj]) => grid[mi][mj].mine = true);
  computeAdjacents(grid);
  startTimer();
}

// Manejo del temporizador
function startTimer(){
  if (timer) return;
  timer = setInterval(() => {
    elapsed++;
    timerEl.textContent = formatTime(elapsed);
  },1000);
}
function stopTimer(){
  clearInterval(timer);
  timer = null;
}

// Lógica cuando haces clic izquierdo en una celda
function onCellClick(e){
  if (gameOver) return;
  const r = Number(e.currentTarget.dataset.r);
  const c = Number(e.currentTarget.dataset.c);
  const cellData = grid[r][c];

  const minesPlaced = grid.flat().some(x => x.mine);
  if (!minesPlaced) {
    handleFirstClick(r,c);
  }

  if (cellData.flagged || cellData.revealed) return;

  if (grid[r][c].mine) {
    grid[r][c].revealed = true;
    gameOver = true;
    stopTimer();
    revealAll(grid);
    setTimeout(() => alert("💥 Game Over — pisaste una mina."), 40);
    return;
  }

  floodReveal(r,c);
  renderBoard(grid);

  if (checkWin()) {
    gameOver = true;
    stopTimer();
    renderBoard(grid);
    setTimeout(() => {
      alert(`🏆 ¡Ganaste! Tiempo: ${formatTime(elapsed)}`);
      saveBestTime(rows,cols,totalMines,elapsed);
      bestTimeEl.textContent = getBestTimeString(rows,cols,totalMines);
    }, 40);
  }
}

// Descubre automáticamente las celdas vacías adyacentes (como en el buscaminas real)
function floodReveal(sr,sc){
  const stack = [[sr,sc]];
  const visited = new Set();

  while(stack.length){
    const [r,c] = stack.pop();
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (r<0||r>=rows||c<0||c>=cols) continue;
    const cell = grid[r][c];
    if (cell.revealed || cell.flagged) continue;

    cell.revealed = true;
    cellsRevealed++;

    if (cell.adjacent === 0){
      for(let di=-1;di<=1;di++){
        for(let dj=-1;dj<=1;dj++){
          if (di===0 && dj===0) continue;
          stack.push([r+di,c+dj]);
        }
      }
    }
  }
}

// Click derecho: poner o quitar bandera
function onCellRightClick(e){
  e.preventDefault();
  if (gameOver) return;
  const r = Number(e.currentTarget.dataset.r);
  const c = Number(e.currentTarget.dataset.c);
  const cell = grid[r][c];
  if (cell.revealed) return;

  cell.flagged = !cell.flagged;
  minesLeft += cell.flagged ? -1 : 1;
  minesLeftEl.textContent = minesLeft;
  renderBoard(grid);

  if (checkWin()) {
    gameOver = true;
    stopTimer();
    setTimeout(() => {
      alert(`🏆 ¡Ganaste! Tiempo: ${formatTime(elapsed)}`);
      saveBestTime(rows,cols,totalMines,elapsed);
      bestTimeEl.textContent = getBestTimeString(rows,cols,totalMines);
      renderBoard(grid);
    }, 40);
  }
}

// Revisa si ya ganaste
function checkWin(){
  let nonMine = rows*cols - totalMines;
  let revealedCount = 0;
  for(let i=0;i<rows;i++){
    for(let j=0;j<cols;j++){
      if (grid[i][j].revealed && !grid[i][j].mine) revealedCount++;
    }
  }
  return revealedCount === nonMine;
}

// Funciones para guardar y recuperar mejores tiempos en localStorage
function makeKey(r,c,m){ return `ms_best_${r}x${c}_${m}`; }
function saveBestTime(r,c,m,seconds){
  const key = makeKey(r,c,m);
  const prev = Number(localStorage.getItem(key) || 0);
  if (prev === 0 || seconds < prev){
    localStorage.setItem(key, String(seconds));
    return true;
  }
  return false;
}
function getBestTime(r,c,m){
  const key = makeKey(r,c,m);
  const v = Number(localStorage.getItem(key) || 0);
  return v || null;
}
function getBestTimeString(r,c,m){
  const v = getBestTime(r,c,m);
  return v ? formatTime(v) : "—";
}

// Eventos de los botones
btnStart.addEventListener("click", () => startGame());
btnReset.addEventListener("click", () => startGame());
btnShowSolution.addEventListener("click", () => {
  const anyMines = grid.flat().some(x => x.mine);
  if (!anyMines){
    alert("Aún no hay minas, haz clic en el tablero primero.");
    return;
  }
  revealAll(grid);
});

// Evitamos que el navegador seleccione texto en el tablero al hacer clic
boardEl.addEventListener("mousedown", (e) => { e.preventDefault(); });

// Al cargar la página, arrancamos un tablero vacío
startGame();
minesLeft = totalMines;
minesLeftEl.textContent = minesLeft;
bestTimeEl.textContent = getBestTimeString(rows,cols,totalMines);
