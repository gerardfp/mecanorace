// Textos de prueba (aproximadamente 30-40 palabras)
const texts = [
    "La tecnología no es nada. Lo importante es que tengas fe en la gente, que sean básicamente buenas e inteligentes, y si les das herramientas, harán cosas maravillosas con ellas.",
    "El diseño no es solo lo que se ve y lo que se siente. El diseño es cómo funciona. La innovación distingue a los líderes de los seguidores en el mundo moderno.",
    "Escribir rápido y sin errores es una habilidad esencial en la era digital. Cada pulsación en el teclado es un paso más hacia la eficiencia absoluta y el dominio de la máquina.",
    "En el vasto universo de la programación, la lógica y la creatividad convergen. Una mente aguda puede resolver problemas complejos escribiendo líneas de código que transforman ideas en realidad tangible.",
    "Las máquinas computacionales pueden procesar información a velocidades increíbles, pero todavía requieren de la intuición humana para guiar su inmenso poder hacia propósitos verdaderamente significativos y útiles."
];

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

// Inicializar Juego
function initGame() {
    // Resetear estado
    currentIndex = 0;
    errors = 0;
    startTime = null;
    gameActive = true;
    clearInterval(timerInterval);
    
    statTime.innerText = "0.0s";
    statWpm.innerText = "0";
    statAccuracy.innerText = "100%";
    
    // Seleccionar texto aleatorio
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
    
    // Ignorar teclas modificadoras
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' || e.key === 'CapsLock' || e.key === 'Tab') {
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

    // Manejar Backspace
    if (e.key === 'Backspace') {
        if (currentIndex > 0) {
            currentSpan.classList.remove('active');
            currentIndex--;
            const prevSpan = characters[currentIndex];
            if (prevSpan.classList.contains('incorrect')) {
                errors--; // Opcional: reducir errores al borrar o mantenerlos como absolutos. Lo mantenemos simple.
            }
            prevSpan.classList.remove('correct', 'incorrect');
            prevSpan.classList.add('active');
        }
        return;
    }

    // Verificar si es correcta
    if (e.key === expectedChar) {
        currentSpan.classList.add('correct');
    } else {
        currentSpan.classList.add('incorrect');
        errors++;
    }

    currentSpan.classList.remove('active');
    currentIndex++;

    // Verificar fin del juego
    if (currentIndex >= characters.length) {
        endGame();
    } else {
        characters[currentIndex].classList.add('active');
    }
}

// Actualizar estadísticas en vivo
function updateStats() {
    if (!startTime) return;
    
    const now = new Date();
    const timeElapsed = (now - startTime) / 1000; // en segundos
    const timeInMinutes = timeElapsed / 60;
    
    // PPM = (Caracteres correctos / 5) / minutos
    // Para simplificar y dar feedback positivo, contamos el indice actual como escritos
    const wordsTyped = currentIndex / 5;
    let wpm = Math.round(wordsTyped / timeInMinutes);
    if (wpm < 0 || !isFinite(wpm)) wpm = 0;

    // Precisión
    let accuracy = 100;
    if (currentIndex > 0) {
        accuracy = Math.round(((currentIndex - errors) / currentIndex) * 100);
        if (accuracy < 0) accuracy = 0;
    }

    statTime.innerText = timeElapsed.toFixed(1) + "s";
    statWpm.innerText = wpm;
    statAccuracy.innerText = accuracy + "%";
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
        date: new Date().toISOString()
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
