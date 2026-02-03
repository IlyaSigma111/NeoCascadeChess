// Импорт Firebase модулей
import { 
    auth, 
    database, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut,
    ref, 
    set, 
    onValue, 
    push, 
    update, 
    remove, 
    get, 
    child 
} from './firebase-config.js';

// Глобальные переменные приложения
let currentUser = null;
let currentGame = null;
let currentGameRef = null;
let currentGameListener = null;
let gameCode = null;
let isWhite = true;
let gameState = {
    board: [],
    turn: 'white',
    whiteTime: 900, // 15 минут в секундах
    blackTime: 900,
    gameStatus: 'waiting', // waiting, active, finished
    winner: null,
    drawOffered: false,
    rematchOffered: false
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    setupEventListeners();
    renderChessBoard();
    
    // Проверяем состояние аутентификации
    auth.onAuthStateChanged(user => {
        if (user) {
            // Пользователь вошел в систему
            currentUser = {
                uid: user.uid,
                displayName: user.displayName || 'Игрок',
                email: user.email,
                photoURL: user.photoURL
            };
            showScreen('main-menu');
            updateUserInfo();
            loadActiveGames();
        } else {
            // Пользователь вышел из системы
            currentUser = null;
            showScreen('auth-screen');
        }
    });
});

// Инициализация приложения
function initApp() {
    console.log('NeoCascadeChess инициализирован');
    
    // Инициализация Toastr для уведомлений
    toastr.options = {
        "closeButton": true,
        "debug": false,
        "newestOnTop": true,
        "progressBar": true,
        "positionClass": "toast-top-right",
        "preventDuplicates": false,
        "onclick": null,
        "showDuration": "300",
        "hideDuration": "1000",
        "timeOut": "5000",
        "extendedTimeOut": "1000",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut"
    };
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Аутентификация
    document.getElementById('google-login').addEventListener('click', signInWithGoogle);
    document.getElementById('guest-login').addEventListener('click', signInAsGuest);
    document.getElementById('logout-btn').addEventListener('click', signOutUser);
    
    // Навигация
    document.getElementById('create-game-card').addEventListener('click', () => showScreen('create-game-screen'));
    document.getElementById('join-game-card').addEventListener('click', () => {
        showScreen('join-game-screen');
        loadPublicGames();
    });
    document.getElementById('games-history-card').addEventListener('click', () => toastr.info('Функция в разработке'));
    document.getElementById('how-to-play-card').addEventListener('click', () => showScreen('rules-screen'));
    
    // Кнопки "Назад"
    document.getElementById('back-to-menu-from-create').addEventListener('click', () => showScreen('main-menu'));
    document.getElementById('back-to-menu-from-join').addEventListener('click', () => showScreen('main-menu'));
    document.getElementById('back-to-menu-from-game').addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите выйти из игры?')) {
            leaveGame();
            showScreen('main-menu');
        }
    });
    document.getElementById('back-to-menu-from-rules').addEventListener('click', () => showScreen('main-menu'));
    
    // Создание игры
    document.getElementById('create-game-btn').addEventListener('click', createNewGame);
    document.getElementById('copy-code-btn').addEventListener('click', copyGameCode);
    document.getElementById('start-game-btn').addEventListener('click', startGame);
    document.getElementById('cancel-game-btn').addEventListener('click', cancelGame);
    
    // Присоединение к игре
    document.getElementById('join-game-btn').addEventListener('click', joinGameByCode);
    
    // Игровой процесс
    document.getElementById('surrender-btn').addEventListener('click', offerSurrender);
    document.getElementById('offer-draw-btn').addEventListener('click', offerDraw);
    document.getElementById('rematch-btn').addEventListener('click', offerRematch);
    document.getElementById('flip-board-btn').addEventListener('click', flipBoard);
    document.getElementById('highlight-moves-btn').addEventListener('click', toggleHighlightMoves);
    document.getElementById('send-chat-btn').addEventListener('click', sendChatMessage);
    document.getElementById('chat-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendChatMessage();
    });
    
    // Модальные окна
    document.getElementById('accept-draw-btn').addEventListener('click', acceptDraw);
    document.getElementById('decline-draw-btn').addEventListener('click', declineDraw);
    document.getElementById('accept-rematch-btn').addEventListener('click', acceptRematch);
    document.getElementById('decline-rematch-btn').addEventListener('click', declineRematch);
    
    // Закрытие модальных окон при клике вне их
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
}

// Аутентификация через Google
async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    
    try {
        const result = await signInWithPopup(auth, provider);
        toastr.success(`Добро пожаловать, ${result.user.displayName}!`);
    } catch (error) {
        console.error('Ошибка аутентификации:', error);
        toastr.error('Не удалось войти через Google');
    }
}

// Вход как гость
function signInAsGuest() {
    const username = document.getElementById('username').value.trim();
    
    if (!username) {
        toastr.warning('Введите имя пользователя');
        return;
    }
    
    currentUser = {
        uid: 'guest_' + Date.now(),
        displayName: username,
        email: null,
        photoURL: null,
        isGuest: true
    };
    
    showScreen('main-menu');
    updateUserInfo();
    toastr.success(`Добро пожаловать, ${username}!`);
}

// Выход из системы
function signOutUser() {
    if (currentGame) {
        leaveGame();
    }
    
    if (currentUser && currentUser.isGuest) {
        // Для гостя просто очищаем данные
        currentUser = null;
        showScreen('auth-screen');
    } else {
        // Для пользователя Firebase выходим из системы
        signOut(auth).then(() => {
            toastr.info('Вы вышли из системы');
        }).catch(error => {
            console.error('Ошибка выхода:', error);
        });
    }
}

// Показать определенный экран
function showScreen(screenId) {
    // Скрыть все экраны
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Показать нужный экран
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

// Обновить информацию о пользователе
function updateUserInfo() {
    if (currentUser) {
        document.getElementById('user-name').textContent = currentUser.displayName;
        document.getElementById('user-email').textContent = currentUser.email || 'Гостевой аккаунт';
    }
}

// Создать новую игру
function createNewGame() {
    const timeControl = document.getElementById('time-control').value;
    const gameMode = document.getElementById('game-mode').value;
    const gamePrivacy = document.getElementById('game-privacy').value;
    
    // Генерируем код игры
    gameCode = generateGameCode();
    
    // Определяем цвет игрока
    if (gameMode === 'random') {
        isWhite = Math.random() > 0.5;
    } else {
        isWhite = gameMode === 'white';
    }
    
    // Устанавливаем время
    const timeInSeconds = timeControl === 'none' ? 0 : parseInt(timeControl) * 60;
    gameState.whiteTime = timeInSeconds;
    gameState.blackTime = timeInSeconds;
    
    // Создаем игру в базе данных
    const gameRef = ref(database, 'games/' + gameCode);
    
    const gameData = {
        code: gameCode,
        creator: currentUser.uid,
        creatorName: currentUser.displayName,
        whitePlayer: isWhite ? currentUser.uid : null,
        whitePlayerName: isWhite ? currentUser.displayName : null,
        blackPlayer: !isWhite ? currentUser.uid : null,
        blackPlayerName: !isWhite ? currentUser.displayName : null,
        timeControl: timeControl,
        privacy: gamePrivacy,
        status: 'waiting',
        createdAt: Date.now(),
        board: initializeChessBoard(),
        turn: 'white',
        moveHistory: [],
        chat: []
    };
    
    set(gameRef, gameData)
        .then(() => {
            // Показываем экран с кодом приглашения
            document.getElementById('game-code-display').textContent = gameCode;
            document.getElementById('game-invite-container').style.display = 'block';
            document.getElementById('start-game-btn').disabled = true;
            
            // Сохраняем ссылку на игру
            currentGameRef = gameRef;
            
            // Слушаем изменения в игре
            listenToGameChanges(gameCode);
            
            toastr.success('Игра создана! Отправьте код другу.');
        })
        .catch(error => {
            console.error('Ошибка создания игры:', error);
            toastr.error('Не удалось создать игру');
        });
}

// Сгенерировать код игры
function generateGameCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Копировать код игры
function copyGameCode() {
    const code = document.getElementById('game-code-display').textContent;
    navigator.clipboard.writeText(code)
        .then(() => {
            toastr.success('Код скопирован в буфер обмена');
        })
        .catch(err => {
            console.error('Ошибка копирования:', err);
            toastr.error('Не удалось скопировать код');
        });
}

// Начать игру
function startGame() {
    if (!currentGameRef) return;
    
    update(currentGameRef, {
        status: 'active',
        startedAt: Date.now()
    })
    .then(() => {
        document.getElementById('start-game-btn').disabled = true;
        toastr.success('Игра началась!');
    })
    .catch(error => {
        console.error('Ошибка начала игры:', error);
        toastr.error('Не удалось начать игру');
    });
}

// Отменить игру
function cancelGame() {
    if (currentGameRef) {
        remove(currentGameRef)
            .then(() => {
                toastr.info('Игра отменена');
                currentGameRef = null;
                gameCode = null;
                showScreen('main-menu');
            })
            .catch(error => {
                console.error('Ошибка отмены игры:', error);
            });
    } else {
        showScreen('main-menu');
    }
}

// Присоединиться к игре по коду
function joinGameByCode() {
    const codeInput = document.getElementById('game-code-input').value.trim().toUpperCase();
    
    if (codeInput.length !== 6) {
        toastr.warning('Введите 6-значный код игры');
        return;
    }
    
    gameCode = codeInput;
    
    const gameRef = ref(database, 'games/' + gameCode);
    
    get(gameRef).then(snapshot => {
        if (snapshot.exists()) {
            const gameData = snapshot.val();
            
            if (gameData.status === 'finished') {
                toastr.warning('Эта игра уже завершена');
                return;
            }
            
            if (gameData.status === 'active' && 
                gameData.whitePlayer && gameData.blackPlayer) {
                toastr.warning('В этой игре уже два игрока');
                return;
            }
            
            // Определяем цвет игрока
            if (!gameData.whitePlayer) {
                isWhite = true;
                update(gameRef, {
                    whitePlayer: currentUser.uid,
                    whitePlayerName: currentUser.displayName
                });
            } else if (!gameData.blackPlayer) {
                isWhite = false;
                update(gameRef, {
                    blackPlayer: currentUser.uid,
                    blackPlayerName: currentUser.displayName
                });
            } else {
                toastr.warning('В игре нет свободных мест');
                return;
            }
            
            // Если оба игрока на месте, начинаем игру
            if (gameData.whitePlayer && gameData.blackPlayer) {
                update(gameRef, {
                    status: 'active',
                    startedAt: Date.now()
                });
            }
            
            // Сохраняем ссылку на игру
            currentGameRef = gameRef;
            
            // Слушаем изменения в игре
            listenToGameChanges(gameCode);
            
            // Переходим на экран игры
            showScreen('game-screen');
            toastr.success('Вы присоединились к игре!');
            
        } else {
            toastr.error('Игра с таким кодом не найдена');
        }
    }).catch(error => {
        console.error('Ошибка поиска игры:', error);
        toastr.error('Не удалось найти игру');
    });
}

// Загрузить публичные игры
function loadPublicGames() {
    const publicGamesList = document.getElementById('public-games-list');
    publicGamesList.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>Загрузка игр...</p></div>';
    
    const gamesRef = ref(database, 'games');
    
    onValue(gamesRef, (snapshot) => {
        const games = snapshot.val();
        publicGamesList.innerHTML = '';
        
        if (!games) {
            publicGamesList.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>Нет публичных игр</p></div>';
            return;
        }
        
        let publicGamesCount = 0;
        
        Object.keys(games).forEach(gameCode => {
            const game = games[gameCode];
            
            if (game.privacy === 'public' && game.status === 'waiting') {
                publicGamesCount++;
                
                const gameElement = document.createElement('div');
                gameElement.className = 'game-item';
                gameElement.innerHTML = `
                    <div class="game-item-content">
                        <h4>Игра ${gameCode}</h4>
                        <p>Создатель: ${game.creatorName}</p>
                        <p>Контроль времени: ${game.timeControl === 'none' ? 'Без ограничения' : game.timeControl + ' мин'}</p>
                        <button class="join-public-game-btn" data-code="${gameCode}">Присоединиться</button>
                    </div>
                `;
                
                publicGamesList.appendChild(gameElement);
            }
        });
        
        if (publicGamesCount === 0) {
            publicGamesList.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>Нет публичных игр</p></div>';
        }
        
        // Добавляем обработчики для кнопок присоединения
        document.querySelectorAll('.join-public-game-btn').forEach(button => {
            button.addEventListener('click', function() {
                const code = this.getAttribute('data-code');
                document.getElementById('game-code-input').value = code;
                joinGameByCode();
            });
        });
    });
}

// Загрузить активные игры пользователя
function loadActiveGames() {
    if (!currentUser) return;
    
    const activeGamesList = document.getElementById('active-games-list');
    
    const gamesRef = ref(database, 'games');
    
    onValue(gamesRef, (snapshot) => {
        const games = snapshot.val();
        activeGamesList.innerHTML = '';
        
        if (!games) {
            activeGamesList.innerHTML = '<div class="empty-state"><i class="fas fa-chess-board"></i><p>Нет активных игр</p></div>';
            return;
        }
        
        let userGamesCount = 0;
        
        Object.keys(games).forEach(gameCode => {
            const game = games[gameCode];
            
            if ((game.whitePlayer === currentUser.uid || game.blackPlayer === currentUser.uid) && 
                game.status !== 'finished') {
                userGamesCount++;
                
                const gameElement = document.createElement('div');
                gameElement.className = 'game-item';
                gameElement.innerHTML = `
                    <div class="game-item-content">
                        <h4>Игра ${gameCode}</h4>
                        <p>Противник: ${game.whitePlayer === currentUser.uid ? game.blackPlayerName || 'Ожидание...' : game.whitePlayerName || 'Ожидание...'}</p>
                        <p>Статус: ${game.status === 'waiting' ? 'Ожидание соперника' : 'Активна'}</p>
                        <button class="resume-game-btn" data-code="${gameCode}">Продолжить</button>
                    </div>
                `;
                
                activeGamesList.appendChild(gameElement);
            }
        });
        
        if (userGamesCount === 0) {
            activeGamesList.innerHTML = '<div class="empty-state"><i class="fas fa-chess-board"></i><p>Нет активных игр</p></div>';
        }
        
        // Добавляем обработчики для кнопок продолжения игры
        document.querySelectorAll('.resume-game-btn').forEach(button => {
            button.addEventListener('click', function() {
                const code = this.getAttribute('data-code');
                gameCode = code;
                currentGameRef = ref(database, 'games/' + code);
                
                // Определяем цвет игрока
                get(currentGameRef).then(snapshot => {
                    const game = snapshot.val();
                    isWhite = game.whitePlayer === currentUser.uid;
                    
                    // Слушаем изменения в игре
                    listenToGameChanges(gameCode);
                    
                    // Переходим на экран игры
                    showScreen('game-screen');
                });
            });
        });
    });
}

// Слушать изменения в игре
function listenToGameChanges(gameCode) {
    if (currentGameListener) {
        // Удаляем предыдущего слушателя
        currentGameListener();
    }
    
    const gameRef = ref(database, 'games/' + gameCode);
    
    currentGameListener = onValue(gameRef, (snapshot) => {
        if (snapshot.exists()) {
            currentGame = snapshot.val();
            updateGameUI(currentGame);
            
            // Проверяем предложение ничьей
            if (currentGame.drawOffered && currentGame.drawOffered !== currentUser.uid) {
                showModal('draw-offer-modal');
            }
            
            // Проверяем предложение реванша
            if (currentGame.rematchOffered && currentGame.rematchOffered !== currentUser.uid) {
                document.getElementById('rematch-message').textContent = 
                    'Ваш соперник предлагает реванш. Сыграть еще одну партию?';
                showModal('rematch-modal');
            }
            
            // Обновляем активные игры в меню
            loadActiveGames();
        } else {
            // Игра была удалена
            if (document.getElementById('game-screen').classList.contains('active')) {
                toastr.info('Игра была удалена создателем');
                showScreen('main-menu');
            }
            currentGame = null;
        }
    });
}

// Обновить интерфейс игры
function updateGameUI(game) {
    // Обновляем информацию об игроках
    document.getElementById('white-player-name').textContent = game.whitePlayerName || 'Ожидание...';
    document.getElementById('black-player-name').textContent = game.blackPlayerName || 'Ожидание...';
    
    // Обновляем код игры
    document.getElementById('game-code-small').textContent = game.code;
    
    // Обновляем статус игры
    if (game.status === 'waiting') {
        document.getElementById('current-turn').textContent = 'Ожидание соперника';
        document.getElementById('game-result').textContent = '';
    } else if (game.status === 'active') {
        document.getElementById('current-turn').textContent = game.turn === 'white' ? 'Ход белых' : 'Ход чёрных';
        document.getElementById('game-result').textContent = '';
    } else if (game.status === 'finished') {
        document.getElementById('current-turn').textContent = 'Игра завершена';
        
        if (game.winner === 'draw') {
            document.getElementById('game-result').textContent = 'Ничья';
        } else if (game.winner === 'white') {
            document.getElementById('game-result').textContent = 'Победили белые';
        } else if (game.winner === 'black') {
            document.getElementById('game-result').textContent = 'Победили чёрные';
        }
        
        // Показываем кнопку реванша
        document.getElementById('rematch-btn').style.display = 'flex';
    }
    
    // Обновляем таймеры
    if (game.whiteTime !== undefined && game.blackTime !== undefined) {
        document.getElementById('white-timer').textContent = formatTime(game.whiteTime);
        document.getElementById('black-timer').textContent = formatTime(game.blackTime);
    }
    
    // Обновляем доску
    if (game.board) {
        updateChessBoard(game.board);
    }
    
    // Обновляем историю ходов
    if (game.moveHistory) {
        updateMoveHistory(game.moveHistory);
    }
    
    // Обновляем чат
    if (game.chat) {
        updateChat(game.chat);
    }
    
    // Обновляем статусы игроков
    const whiteStatus = document.getElementById('white-status');
    const blackStatus = document.getElementById('black-status');
    
    if (game.turn === 'white') {
        whiteStatus.innerHTML = '<i class="fas fa-hourglass-half"></i>';
        blackStatus.innerHTML = '';
    } else if (game.turn === 'black') {
        whiteStatus.innerHTML = '';
        blackStatus.innerHTML = '<i class="fas fa-hourglass-half"></i>';
    }
    
    // Если игра активна и есть оба игрока, активируем доску
    if (game.status === 'active' && game.whitePlayer && game.blackPlayer) {
        activateBoard();
    }
}

// Форматировать время
function formatTime(seconds) {
    if (seconds === 0) return '∞';
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Инициализировать шахматную доску
function initializeChessBoard() {
    // Стандартная начальная позиция в шахматах
    const board = Array(64).fill(null);
    
    // Белые фигуры
    board[0] = '♜'; board[1] = '♞'; board[2] = '♝'; board[3] = '♛'; board[4] = '♚'; board[5] = '♝'; board[6] = '♞'; board[7] = '♜';
    for (let i = 8; i < 16; i++) board[i] = '♟';
    
    // Черные фигуры
    board[56] = '♖'; board[57] = '♘'; board[58] = '♗'; board[59] = '♕'; board[60] = '♔'; board[61] = '♗'; board[62] = '♘'; board[63] = '♖';
    for (let i = 48; i < 56; i++) board[i] = '♙';
    
    return board;
}

// Отрендерить шахматную доску
function renderChessBoard() {
    const chessBoard = document.getElementById('chess-board');
    chessBoard.innerHTML = '';
    
    // Создаем доску 8x8
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const squareIndex = row * 8 + col;
            const isLight = (row + col) % 2 === 0;
            
            const square = document.createElement('div');
            square.className = `chess-square ${isLight ? 'light' : 'dark'}`;
            square.dataset.index = squareIndex;
            square.dataset.row = row;
            square.dataset.col = col;
            
            // Добавляем координаты
            if (col === 0) {
                const coord = document.createElement('div');
                coord.className = 'coord coord-row';
                coord.textContent = 8 - row;
                square.appendChild(coord);
            }
            
            if (row === 7) {
                const coord = document.createElement('div');
                coord.className = 'coord coord-col';
                coord.textContent = String.fromCharCode(97 + col);
                square.appendChild(coord);
            }
            
            chessBoard.appendChild(square);
        }
    }
}

// Обновить шахматную доску
function updateChessBoard(board) {
    if (!board) return;
    
    for (let i = 0; i < 64; i++) {
        const square = document.querySelector(`.chess-square[data-index="${i}"]`);
        if (square) {
            // Очищаем квадрат
            const pieceElement = square.querySelector('.chess-piece');
            if (pieceElement) {
                pieceElement.remove();
            }
            
            // Добавляем фигуру, если она есть
            if (board[i]) {
                const piece = document.createElement('div');
                piece.className = 'chess-piece';
                piece.textContent = board[i];
                piece.draggable = true;
                
                // Определяем цвет фигуры
                if (board[i] === board[i].toLowerCase()) {
                    piece.dataset.color = 'black';
                } else {
                    piece.dataset.color = 'white';
                }
                
                piece.dataset.index = i;
                
                square.appendChild(piece);
            }
        }
    }
}

// Активировать доску для игры
function activateBoard() {
    const pieces = document.querySelectorAll('.chess-piece');
    
    pieces.forEach(piece => {
        // Удаляем старые обработчики
        piece.replaceWith(piece.cloneNode(true));
    });
    
    // Получаем обновленные элементы
    const updatedPieces = document.querySelectorAll('.chess-piece');
    
    updatedPieces.forEach(piece => {
        const pieceColor = piece.dataset.color;
        
        // Проверяем, может ли игрок ходить этой фигурой
        if ((isWhite && pieceColor === 'white') || (!isWhite && pieceColor === 'black')) {
            // Добавляем обработчики drag and drop
            piece.addEventListener('dragstart', handleDragStart);
            piece.addEventListener('dragend', handleDragEnd);
            
            // Делаем фигуру перетаскиваемой
            piece.draggable = true;
        }
    });
    
    // Добавляем обработчики для квадратов
    const squares = document.querySelectorAll('.chess-square');
    squares.forEach(square => {
        square.addEventListener('dragover', handleDragOver);
        square.addEventListener('dragenter', handleDragEnter);
        square.addEventListener('dragleave', handleDragLeave);
        square.addEventListener('drop', handleDrop);
        square.addEventListener('click', handleSquareClick);
    });
}

// Обработчики drag and drop
let draggedPiece = null;

function handleDragStart(e) {
    draggedPiece = e.target;
    setTimeout(() => {
        e.target.classList.add('dragging');
    }, 0);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedPiece = null;
    
    // Убираем подсветку возможных ходов
    document.querySelectorAll('.chess-square').forEach(square => {
        square.classList.remove('valid-move', 'valid-capture');
    });
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDragEnter(e) {
    e.preventDefault();
    e.target.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.target.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.target.classList.remove('drag-over');
    
    if (draggedPiece) {
        const fromIndex = parseInt(draggedPiece.dataset.index);
        const toIndex = parseInt(e.target.dataset.index);
        
        // Проверяем, что это другой квадрат
        if (fromIndex !== toIndex) {
            makeMove(fromIndex, toIndex);
        }
    }
}

function handleSquareClick(e) {
    const square = e.target.closest('.chess-square');
    if (!square) return;
    
    const squareIndex = parseInt(square.dataset.index);
    
    // Если на квадрате есть фигура текущего игрока
    const piece = square.querySelector('.chess-piece');
    if (piece) {
        const pieceColor = piece.dataset.color;
        const isCurrentPlayerPiece = (isWhite && pieceColor === 'white') || (!isWhite && pieceColor === 'black');
        
        if (isCurrentPlayerPiece) {
            // Подсвечиваем возможные ходы
            highlightPossibleMoves(squareIndex);
        }
    }
}

// Подсветить возможные ходы
function highlightPossibleMoves(fromIndex) {
    // Убираем предыдущую подсветку
    document.querySelectorAll('.chess-square').forEach(square => {
        square.classList.remove('selected', 'valid-move', 'valid-capture');
    });
    
    // Подсвечиваем выбранную фигуру
    const selectedSquare = document.querySelector(`.chess-square[data-index="${fromIndex}"]`);
    selectedSquare.classList.add('selected');
    
    // Для простоты показываем все пустые квадраты как возможные ходы
    // В реальном приложении здесь должна быть логика расчета допустимых ходов для каждой фигуры
    document.querySelectorAll('.chess-square').forEach(square => {
        const toIndex = parseInt(square.dataset.index);
        const piece = square.querySelector('.chess-piece');
        
        // Пропускаем квадрат с выбранной фигурой
        if (toIndex === fromIndex) return;
        
        // Проверяем, пустой ли квадрат
        if (!piece) {
            square.classList.add('valid-move');
        } else {
            // Проверяем, фигура ли противника на этом квадрате
            const pieceColor = piece.dataset.color;
            const isOpponentPiece = (isWhite && pieceColor === 'black') || (!isWhite && pieceColor === 'white');
            
            if (isOpponentPiece) {
                square.classList.add('valid-capture');
            }
        }
    });
}

// Сделать ход
function makeMove(fromIndex, toIndex) {
    if (!currentGameRef || !currentGame) return;
    
    // Проверяем, что это ход текущего игрока
    const currentPlayerColor = isWhite ? 'white' : 'black';
    if (currentGame.turn !== currentPlayerColor) {
        toastr.warning('Сейчас не ваш ход');
        return;
    }
    
    // Получаем текущее состояние доски
    const board = [...currentGame.board];
    const piece = board[fromIndex];
    
    // Проверяем, что на начальном квадрате есть фигура
    if (!piece) {
        toastr.warning('На этом квадрате нет фигуры');
        return;
    }
    
    // Проверяем, что фигура принадлежит текущему игроку
    const pieceColor = piece === piece.toLowerCase() ? 'black' : 'white';
    if (pieceColor !== currentPlayerColor) {
        toastr.warning('Это не ваша фигура');
        return;
    }
    
    // Простой вариант: перемещаем фигуру без проверки правил шахмат
    board[toIndex] = piece;
    board[fromIndex] = null;
    
    // Определяем следующий ход
    const nextTurn = currentGame.turn === 'white' ? 'black' : 'white';
    
    // Создаем запись о ходе
    const moveNotation = getMoveNotation(fromIndex, toIndex, piece);
    const moveHistory = currentGame.moveHistory || [];
    moveHistory.push({
        from: fromIndex,
        to: toIndex,
        piece: piece,
        notation: moveNotation,
        player: currentUser.uid,
        timestamp: Date.now()
    });
    
    // Обновляем игру в базе данных
    update(currentGameRef, {
        board: board,
        turn: nextTurn,
        moveHistory: moveHistory,
        // Сбрасываем предложение ничьей, если оно было
        drawOffered: null
    })
    .then(() => {
        // Убираем подсветку
        document.querySelectorAll('.chess-square').forEach(square => {
            square.classList.remove('selected', 'valid-move', 'valid-capture');
        });
    })
    .catch(error => {
        console.error('Ошибка хода:', error);
        toastr.error('Не удалось сделать ход');
    });
}

// Получить нотацию хода
function getMoveNotation(fromIndex, toIndex, piece) {
    const fromCol = String.fromCharCode(97 + (fromIndex % 8));
    const fromRow = 8 - Math.floor(fromIndex / 8);
    const toCol = String.fromCharCode(97 + (toIndex % 8));
    const toRow = 8 - Math.floor(toIndex / 8);
    
    // Символы фигур для нотации
    const pieceSymbols = {
        '♚': 'K', '♔': 'K',
        '♛': 'Q', '♕': 'Q',
        '♜': 'R', '♖': 'R',
        '♝': 'B', '♗': 'B',
        '♞': 'N', '♘': 'N',
        '♟': '', '♙': ''
    };
    
    const pieceSymbol = pieceSymbols[piece] || '';
    
    return `${pieceSymbol}${fromCol}${fromRow}-${toCol}${toRow}`;
}

// Обновить историю ходов
function updateMoveHistory(moveHistory) {
    const movesList = document.getElementById('moves-list');
    movesList.innerHTML = '';
    
    // Группируем ходы по парам (белые + черные)
    for (let i = 0; i < moveHistory.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = moveHistory[i];
        const blackMove = moveHistory[i + 1];
        
        const moveElement = document.createElement('div');
        moveElement.className = 'move-item';
        
        let moveHtml = `<div class="move-number">${moveNumber}.</div>`;
        moveHtml += `<div class="white-move">${whiteMove?.notation || ''}</div>`;
        moveHtml += `<div class="black-move">${blackMove?.notation || ''}</div>`;
        
        moveElement.innerHTML = moveHtml;
        movesList.appendChild(moveElement);
    }
    
    // Прокручиваем вниз
    movesList.scrollTop = movesList.scrollHeight;
}

// Обновить чат
function updateChat(chatMessages) {
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = '';
    
    chatMessages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${message.senderId === currentUser.uid ? 'sender' : ''}`;
        
        const time = new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        messageElement.innerHTML = `
            <div class="message-sender">${message.senderName}</div>
            <div class="message-text">${message.text}</div>
            <div class="message-time">${time}</div>
        `;
        
        chatContainer.appendChild(messageElement);
    });
    
    // Прокручиваем вниз
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Отправить сообщение в чат
function sendChatMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    
    if (!message || !currentGameRef || !currentGame) return;
    
    const chat = currentGame.chat || [];
    chat.push({
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        text: message,
        timestamp: Date.now()
    });
    
    update(currentGameRef, { chat: chat })
        .then(() => {
            chatInput.value = '';
        })
        .catch(error => {
            console.error('Ошибка отправки сообщения:', error);
            toastr.error('Не удалось отправить сообщение');
        });
}

// Предложить сдачу
function offerSurrender() {
    if (!currentGameRef || !currentGame) return;
    
    if (confirm('Вы уверены, что хотите сдаться?')) {
        const winner = isWhite ? 'black' : 'white';
        
        update(currentGameRef, {
            status: 'finished',
            winner: winner,
            finishedAt: Date.now()
        })
        .then(() => {
            toastr.info('Вы сдались');
        })
        .catch(error => {
            console.error('Ошибка сдачи:', error);
        });
    }
}

// Предложить ничью
function offerDraw() {
    if (!currentGameRef || !currentGame) return;
    
    update(currentGameRef, {
        drawOffered: currentUser.uid
    })
    .then(() => {
        toastr.info('Предложение ничьи отправлено');
    })
    .catch(error => {
        console.error('Ошибка предложения ничьи:', error);
    });
}

// Принять ничью
function acceptDraw() {
    if (!currentGameRef) return;
    
    update(currentGameRef, {
        status: 'finished',
        winner: 'draw',
        finishedAt: Date.now(),
        drawOffered: null
    })
    .then(() => {
        document.getElementById('draw-offer-modal').classList.remove('active');
        toastr.success('Ничья согласована');
    })
    .catch(error => {
        console.error('Ошибка принятия ничьи:', error);
    });
}

// Отклонить ничью
function declineDraw() {
    if (!currentGameRef) return;
    
    update(currentGameRef, {
        drawOffered: null
    })
    .then(() => {
        document.getElementById('draw-offer-modal').classList.remove('active');
        toastr.info('Вы отклонили предложение ничьи');
    })
    .catch(error => {
        console.error('Ошибка отклонения ничьи:', error);
    });
}

// Предложить реванш
function offerRematch() {
    if (!currentGameRef || !currentGame) return;
    
    update(currentGameRef, {
        rematchOffered: currentUser.uid
    })
    .then(() => {
        toastr.info('Предложение реванша отправлено');
    })
    .catch(error => {
        console.error('Ошибка предложения реванша:', error);
    });
}

// Принять реванш
function acceptRematch() {
    if (!currentGameRef || !currentGame) return;
    
    // Создаем новую игру с теми же игроками
    const newGameCode = generateGameCode();
    const newGameRef = ref(database, 'games/' + newGameCode);
    
    // Меняем цвета
    const newIsWhite = !isWhite;
    
    const gameData = {
        code: newGameCode,
        creator: currentGame.creator,
        creatorName: currentGame.creatorName,
        whitePlayer: newIsWhite ? currentUser.uid : (currentUser.uid === currentGame.whitePlayer ? currentGame.blackPlayer : currentGame.whitePlayer),
        whitePlayerName: newIsWhite ? currentUser.displayName : (currentUser.uid === currentGame.whitePlayer ? currentGame.blackPlayerName : currentGame.whitePlayerName),
        blackPlayer: !newIsWhite ? currentUser.uid : (currentUser.uid === currentGame.whitePlayer ? currentGame.blackPlayer : currentGame.whitePlayer),
        blackPlayerName: !newIsWhite ? currentUser.displayName : (currentUser.uid === currentGame.whitePlayer ? currentGame.blackPlayerName : currentGame.whitePlayerName),
        timeControl: currentGame.timeControl,
        privacy: currentGame.privacy,
        status: 'active',
        createdAt: Date.now(),
        startedAt: Date.now(),
        board: initializeChessBoard(),
        turn: 'white',
        moveHistory: [],
        chat: []
    };
    
    set(newGameRef, gameData)
        .then(() => {
            // Удаляем старую игру
            remove(currentGameRef)
                .then(() => {
                    // Переходим в новую игру
                    gameCode = newGameCode;
                    currentGameRef = newGameRef;
                    isWhite = newIsWhite;
                    
                    // Слушаем изменения в новой игре
                    listenToGameChanges(gameCode);
                    
                    // Закрываем модальное окно
                    document.getElementById('rematch-modal').classList.remove('active');
                    
                    toastr.success('Реванш начался!');
                });
        })
        .catch(error => {
            console.error('Ошибка создания реванша:', error);
            toastr.error('Не удалось начать реванш');
        });
}

// Отклонить реванш
function declineRematch() {
    if (!currentGameRef) return;
    
    update(currentGameRef, {
        rematchOffered: null
    })
    .then(() => {
        document.getElementById('rematch-modal').classList.remove('active');
        toastr.info('Вы отклонили предложение реванша');
    })
    .catch(error => {
        console.error('Ошибка отклонения реванша:', error);
    });
}

// Перевернуть доску
function flipBoard() {
    const chessBoard = document.getElementById('chess-board');
    chessBoard.classList.toggle('flipped');
    
    // Для простоты просто сообщим пользователю
    toastr.info('Доска перевернута');
}

// Включить/выключить подсветку ходов
function toggleHighlightMoves() {
    toastr.info('Подсветка ходов ' + (document.body.classList.toggle('highlight-moves') ? 'включена' : 'выключена'));
}

// Показать модальное окно
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

// Покинуть игру
function leaveGame() {
    if (currentGameListener) {
        currentGameListener();
        currentGameListener = null;
    }
    
    currentGame = null;
    currentGameRef = null;
    gameCode = null;
}

// Экспорт функций для отладки
window.app = {
    currentUser,
    currentGame,
    gameCode,
    isWhite,
    showScreen,
    signInWithGoogle,
    signInAsGuest,
    signOutUser,
    createNewGame,
    joinGameByCode
};
