// Textos de prueba (aproximadamente 30-40 palabras)
const defaultTexts = [
    "hola que tal"
    // "La tecnología no es nada. Lo importante es que tengas fe en la gente, que sean básicamente buenas e inteligentes, y si les das herramientas, harán cosas maravillosas con ellas.",
    // "El diseño no es solo lo que se ve y lo que se siente. El diseño es cómo funciona. La innovación distingue a los líderes de los seguidores en el mundo moderno.",
    // "Escribir rápido y sin errores es una habilidad esencial en la era digital. Cada pulsación en el teclado es un paso más hacia la eficiencia absoluta y el dominio de la máquina.",
    // "En el vasto universo de la programación, la lógica y la creatividad convergen. Una mente aguda puede resolver problemas complejos escribiendo líneas de código que transforman ideas en realidad tangible.",
    // "Las máquinas computacionales pueden procesar información a velocidades increíbles, pero todavía requieren de la intuición humana para guiar su inmenso poder hacia propósitos verdaderamente significativos y útiles."
];

let texts = JSON.parse(localStorage.getItem('mecanorace_texts'));
if (!texts || !Array.isArray(texts) || texts.length === 0) {
    texts = defaultTexts;
    localStorage.setItem('mecanorace_texts', JSON.stringify(texts));
}

// Variables de estado
let currentText = "";
let characters = [];
let currentIndex = 0;
let errors = 0;
let startTime = null;
let timerInterval = null;
let gameActive = false;
let finalWpm = 0;
let finalAcc = 0;
let finalTimeStr = "0.0";
let currentRaceKeystrokes = [];
let bestGhost = null;
let ghostPoints = [];
let maxWpmScale = 100;

// Elementos del DOM
const screens = {
    welcome: document.getElementById('welcome-screen'),
    game: document.getElementById('game-screen'),
    result: document.getElementById('result-screen'),
    leaderboard: document.getElementById('leaderboard-screen')
};

// Botones
const btnStart = document.getElementById('btn-start');
const btnShowLeaderboard = document.getElementById('btn-show-leaderboard');
const btnRestart = document.getElementById('btn-restart');
const btnQuit = document.getElementById('btn-quit');
const btnSkipSave = document.getElementById('btn-skip-save');
const btnBackHome = document.getElementById('btn-back-home');

// Elementos de Juego
const textDisplay = document.getElementById('text-display');
const statTime = document.getElementById('stat-time');
const statWpm = document.getElementById('stat-wpm');
const statAccuracy = document.getElementById('stat-accuracy');

// Elementos de Resultado
const finalWpmEl = document.getElementById('final-wpm');
const finalAccuracyEl = document.getElementById('final-accuracy');
const finalTimeEl = document.getElementById('final-time');
const saveScoreForm = document.getElementById('save-score-form');
const playerNameInput = document.getElementById('player-name');

// Leaderboard
const leaderboardBody = document.getElementById('leaderboard-body');

// Utilidad para cambiar de pantalla
function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    
    screens[screenName].classList.remove('hidden');
    // Pequeño timeout para la transición
    setTimeout(() => {
        screens[screenName].classList.add('active');
    }, 10);
}

// Configuración de pesos para PPM
function getCharWeight(char) {
    if (!char) return 0;
    let weight = 1; // Base

    // Mayúsculas (A-Z y caracteres acentuados en mayúscula)
    const isUpper = char !== char.toLowerCase() && /[A-ZÁÉÍÓÚÜÏÑ]/.test(char);
    if (isUpper) weight += 1;

    // Acentos (áéíóúÁÉÍÓÚ)
    const hasAccent = /[áéíóúÁÉÍÓÚ]/.test(char);
    if (hasAccent) weight += 1;

    // Diéresis (üïÜÏ)
    const hasDieresis = /[üïÜÏ]/.test(char);
    if (hasDieresis) weight += 2;

    return weight;
}

function getWeightForTextRange(text, startIndex, endIndex) {
    let totalWeight = 0;
    for (let i = startIndex; i < endIndex; i++) {
        totalWeight += getCharWeight(text[i]);
    }
    return totalWeight;
}

// Inicializar Juego
function initGame() {
    // Resetear estado
    currentIndex = 0;
    errors = 0;
    startTime = null;
    gameActive = true;
    currentRaceKeystrokes = [];
    bestGhost = null;
    clearInterval(timerInterval);
    
    statTime.innerText = "0.0s";
    statWpm.innerText = "0";
    statAccuracy.innerText = "100%";
    const ghostEl = document.getElementById('stat-ghost-wpm');
    if(ghostEl) ghostEl.innerText = "-";
    
    const playerBar = document.getElementById('player-progress-bar');
    const ghostBar = document.getElementById('ghost-progress-bar');
    if(playerBar) playerBar.style.width = '0%';
    if(ghostBar) ghostBar.style.width = '0%';

    const lb = JSON.parse(localStorage.getItem('mecanorace_leaderboard')) || [];
    const validGhosts = lb.filter(s => s.keystrokes && s.keystrokes.length > 0);
    if (validGhosts.length > 0) {
        bestGhost = validGhosts[0]; // Assuming highest WPM is first
    }
    
    // Preparar puntos de la gráfica del fantasma
    ghostPoints = [{ progress: 0, wpm: 0 }];
    maxWpmScale = 60;
    if (bestGhost && bestGhost.keystrokes.length > 0) {
        for (let i = 0; i < bestGhost.keystrokes.length; i++) {
            const timeMs = bestGhost.keystrokes[i];
            if (timeMs > 1000) { // Ignorar el primer segundo para evitar picos irreales
                const ghostText = bestGhost.text || "";
                const ghostWeightedKeys = ghostText ? getWeightForTextRange(ghostText, 0, i + 1) : (i + 1);
                const wpm = Math.round((ghostWeightedKeys / 5) / (timeMs / 60000));
                const progress = (i + 1) / bestGhost.keystrokes.length;
                ghostPoints.push({ progress, wpm });
                if (wpm > maxWpmScale) maxWpmScale = wpm;
            }
        }
    }
    maxWpmScale = Math.ceil(maxWpmScale * 1.1);

    const canvas = document.getElementById('wpm-chart');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Seleccionar texto aleatorio
    texts = JSON.parse(localStorage.getItem('mecanorace_texts')) || defaultTexts;
    if (texts.length === 0) texts = defaultTexts;
    currentText = texts[Math.floor(Math.random() * texts.length)];
    
    // Renderizar texto
    textDisplay.innerHTML = '';
    characters = currentText.split('').map((char, index) => {
        const span = document.createElement('span');
        span.innerText = char;
        span.classList.add('char');
        if (index === 0) span.classList.add('active');
        textDisplay.appendChild(span);
        return span;
    });

    showScreen('game');
    
    // Foco oculto para capturar teclado sin input visual extra
    window.addEventListener('keydown', handleTyping);
}

// Manejar la escritura
function handleTyping(e) {
    if (!gameActive) return;

    // No permitir retroceder
    if (e.key === 'Backspace') {
        e.preventDefault();
        return;
    }
    
    // Ignorar teclas de control, flechas y teclas muertas (como acentos: 'Dead')
    if (e.key.length !== 1) {
        return;
    }

    // Iniciar temporizador en la primera tecla
    if (!startTime) {
        startTime = new Date();
        timerInterval = setInterval(updateStats, 100);
    }

    const currentSpan = characters[currentIndex];
    const expectedChar = currentText[currentIndex];

    // Prevenir scroll de espacio
    if (e.key === ' ') e.preventDefault();

    // Verificar si es correcta
    if (e.key === expectedChar) {
        currentSpan.classList.remove('incorrect');
        currentSpan.classList.add('correct');
        const nowMs = new Date() - startTime;
        currentRaceKeystrokes.push(nowMs);
        
        currentSpan.classList.remove('active');
        currentIndex++;

        // Verificar fin del juego
        if (currentIndex >= characters.length) {
            endGame();
        } else {
            characters[currentIndex].classList.add('active');
        }
    } else {
        // Marcar como error pero no avanzar
        currentSpan.classList.add('incorrect');
        errors++;
    }
}

// Actualizar estadísticas en vivo
function updateStats() {
    if (!startTime) return;
    
    const now = new Date();
    const timeElapsed = (now - startTime) / 1000; // en segundos
    const timeInMinutes = timeElapsed / 60;
    
    // PPM = (Caracteres correctos / 5) / minutos
    const totalWeightedKeys = getWeightForTextRange(currentText, 0, currentIndex);
    const wpm = timeInMinutes > 0 ? Math.round((totalWeightedKeys / 5) / timeInMinutes) : 0;
    
    statWpm.innerText = wpm;
    statTime.innerText = timeElapsed.toFixed(1) + 's';

    // Precisión
    let accuracy = 100;
    if (currentIndex > 0) {
        accuracy = Math.round(((currentIndex - errors) / currentIndex) * 100);
        if (accuracy < 0) accuracy = 0;
    }
    statAccuracy.innerText = accuracy + "%";
    
    // Player progress
    const playerProgress = (currentIndex / characters.length) * 100;
    const playerBar = document.getElementById('player-progress-bar');
    if(playerBar) playerBar.style.width = `${Math.min(playerProgress, 100)}%`;

    // Update Ghost
    if (bestGhost) {
        const timeElapsedMs = timeElapsed * 1000;
        const playerProgress = currentIndex / characters.length;
        
        // 1. Ghost Progress Bar (Fair Race: Scale ghost time based on TOTAL WEIGHT ratio)
        const ghostText = bestGhost.text || "";
        const ghostTotalWeight = ghostText ? getWeightForTextRange(ghostText, 0, ghostText.length) : bestGhost.keystrokes.length;
        const playerTotalWeight = getWeightForTextRange(currentText, 0, currentText.length);
        
        const lengthRatio = ghostTotalWeight / playerTotalWeight;
        const adjustedTimeMs = timeElapsedMs * lengthRatio;

        let ghostKeyCountAtTime = 0;
        for (let i = 0; i < bestGhost.keystrokes.length; i++) {
            if (bestGhost.keystrokes[i] <= adjustedTimeMs) ghostKeyCountAtTime++;
            else break;
        }
        let ghostProgressBarWidth = (ghostKeyCountAtTime / bestGhost.keystrokes.length) * 100;
        const ghostBar = document.getElementById('ghost-progress-bar');
        if(ghostBar) ghostBar.style.width = `${Math.min(ghostProgressBarWidth, 100)}%`;

        // 2. Ghost WPM Stat (Weighted)
        const ghostTargetIndex = Math.floor(playerProgress * (bestGhost.keystrokes.length - 1));
        const ghostTimeAtProgress = bestGhost.keystrokes[ghostTargetIndex];
        
        let ghostWpmAtProgress = 0;
        if (ghostTimeAtProgress > 0) {
            const ghostText = bestGhost.text || "";
            let ghostWeightedKeys = 0;
            if (ghostText) {
                ghostWeightedKeys = getWeightForTextRange(ghostText, 0, ghostTargetIndex + 1);
            } else {
                ghostWeightedKeys = ghostTargetIndex + 1;
            }
            ghostWpmAtProgress = Math.round((ghostWeightedKeys / 5) / (ghostTimeAtProgress / 60000));
        }
        
        const ghostEl = document.getElementById('stat-ghost-wpm');
        if(ghostEl) ghostEl.innerText = ghostWpmAtProgress || "-";
    }
    
    drawNeonChart();
}

function drawNeonChart() {
    const canvas = document.getElementById('wpm-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    function drawLine(points, color, glowColor) {
        if (points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(points[0].progress * width, height - (points[0].wpm / maxWpmScale) * height);
        for (let i = 1; i < points.length; i++) {
            let x = points[i].progress * width;
            let y = height - (points[i].wpm / maxWpmScale) * height;
            y = Math.max(0, Math.min(height, y));
            ctx.lineTo(x, y);
        }
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = glowColor;
        ctx.stroke();
        
        // Brillo extra
        ctx.shadowBlur = 20;
        ctx.stroke();
        
        ctx.shadowBlur = 0;
    }

    // Dibujar Ghost
    if (ghostPoints.length > 0) {
        drawLine(ghostPoints, '#ff00ff', 'rgba(255, 0, 255, 0.8)');
    }

    // Calcular y dibujar Player
    const playerPoints = [{ progress: 0, wpm: 0 }];
    for (let i = 0; i < currentRaceKeystrokes.length; i++) {
        const timeMs = currentRaceKeystrokes[i];
        if (timeMs > 1000) {
            const wpm = Math.round(((i + 1) / 5) / (timeMs / 60000));
            const progress = (i + 1) / characters.length;
            playerPoints.push({ progress, wpm });
            
            if (wpm > maxWpmScale) maxWpmScale = Math.ceil(wpm * 1.1);
        }
    }

    if (playerPoints.length > 1) {
        drawLine(playerPoints, '#00ffcc', 'rgba(0, 255, 204, 0.8)');
    }
}

// Finalizar juego
function endGame() {
    gameActive = false;
    clearInterval(timerInterval);
    window.removeEventListener('keydown', handleTyping);

    // Calcular finales precisos
    const now = new Date();
    const timeElapsed = (now - startTime) / 1000;
    const timeInMinutes = timeElapsed / 60;
    const wordsTyped = characters.length / 5;
    
    finalWpm = Math.round(wordsTyped / timeInMinutes);
    finalAcc = Math.round(((characters.length - errors) / characters.length) * 100);
    if (finalAcc < 0) finalAcc = 0;
    finalTimeStr = timeElapsed.toFixed(1);

    // Actualizar UI de resultado
    finalWpmEl.innerHTML = `${finalWpm} <small>PPM</small>`;
    finalAccuracyEl.innerText = `${finalAcc}%`;
    finalTimeEl.innerText = `${finalTimeStr}s`;

    showScreen('result');
    playerNameInput.value = '';
    setTimeout(() => playerNameInput.focus(), 100);
}

// Guardar Puntuación
function saveScore(e) {
    e.preventDefault();
    const name = playerNameInput.value.trim().toUpperCase() || 'ANÓNIMO';
    
    const score = {
        name: name,
        wpm: finalWpm,
        accuracy: finalAcc,
        date: new Date().toISOString(),
        keystrokes: currentRaceKeystrokes,
        text: currentText
    };

    let leaderboard = JSON.parse(localStorage.getItem('mecanorace_leaderboard')) || [];
    leaderboard.push(score);
    
    // Ordenar por PPM descendente, y en caso de empate, por mayor precisión
    leaderboard.sort((a, b) => {
        if (b.wpm !== a.wpm) {
            return b.wpm - a.wpm;
        }
        return b.accuracy - a.accuracy;
    });

    // Mantener solo top 100
    leaderboard = leaderboard.slice(0, 100);
    
    localStorage.setItem('mecanorace_leaderboard', JSON.stringify(leaderboard));
    
    renderLeaderboard();
    showScreen('leaderboard');
}

// Renderizar Leaderboard
function renderLeaderboard() {
    const leaderboard = JSON.parse(localStorage.getItem('mecanorace_leaderboard')) || [];
    leaderboardBody.innerHTML = '';

    if (leaderboard.length === 0) {
        leaderboardBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Aún no hay corredores. ¡Sé el primero!</td></tr>';
        return;
    }

    const top10 = leaderboard.slice(0, 10);
    
    top10.forEach((score, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${index + 1}</td>
            <td>${score.name}</td>
            <td>${score.wpm}</td>
            <td>${score.accuracy}%</td>
        `;
        leaderboardBody.appendChild(tr);
    });
}

// Event Listeners
btnStart.addEventListener('click', initGame);
btnRestart.addEventListener('click', initGame);

btnQuit.addEventListener('click', () => {
    gameActive = false;
    clearInterval(timerInterval);
    window.removeEventListener('keydown', handleTyping);
    showScreen('welcome');
});

btnShowLeaderboard.addEventListener('click', () => {
    renderLeaderboard();
    showScreen('leaderboard');
});

saveScoreForm.addEventListener('submit', saveScore);

btnSkipSave.addEventListener('click', () => {
    showScreen('welcome');
});

btnBackHome.addEventListener('click', () => {
    showScreen('welcome');
});

// Inicializar la primera pantalla
showScreen('welcome');
