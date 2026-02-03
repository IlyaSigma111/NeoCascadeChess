// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC-rP_14WecIFKWJHGvlszK16voEKNQ1Gw",
    authDomain: "chessproject-3d878.firebaseapp.com",
    projectId: "chessproject-3d878",
    storageBucket: "chessproject-3d878.firebasestorage.app",
    messagingSenderId: "735951507631",
    appId: "1:735951507631:web:587083ce4d0f34e01f845a"
};

// Инициализация Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

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
    whiteTime: 900,
    blackTime: 900,
    gameStatus: 'waiting',
    winner: null,
    drawOffered: false,
    rematchOffered: false
};

// Карта фигур для Font Awesome иконок
const pieceIcons = {
    // Черные фигуры
    'black-king': 'fas fa-chess-king',
    'black-queen': 'fas fa-chess-queen',
    'black-rook': 'fas fa-chess-rook',
    'black-bishop': 'fas fa-chess-bishop',
    'black-knight': 'fas fa-chess-knight',
    'black-pawn': 'fas fa-chess-pawn',
    
    // Белые фигуры
    'white-king': 'fas fa-chess-king',
    'white-queen': 'fas fa-chess-queen',
    'white-rook': 'fas fa-chess-rook',
    'white-bishop': 'fas fa-chess-bishop',
    'white-knight': 'fas fa-chess-knight',
    'white-pawn': 'fas fa-chess-pawn'
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
    document.getElementById('game-code-input').addEventListener('input', function(e) {
        // Разрешаем только цифры
        this.value = this.value.replace(/[^0-9]/g, '');
    });
    
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
    const provider = new firebase.auth.GoogleAuthProvider();
    
    try {
        const result = await auth.signInWithPopup(provider);
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
        auth.signOut().then(() => {
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
        
        // Прокручиваем вверх экрана
        window.scrollTo(0, 0);
        
        // Если это главное меню, обновляем активные игры
        if (screenId === 'main-menu') {
            loadActiveGames();
        }
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
    const timeControl = parseInt(document.getElementById('time-control').value);
    const gameMode = document.getElementById('game-mode').value;
    const gamePrivacy = document.getElementById('game-privacy').value;
    
    // Генерируем код игры (только цифры)
    gameCode = generateGameCode();
    
    // Определяем цвет игрока
    if (gameMode === 'random') {
        isWhite = Math.random() > 0.5;
    } else {
        isWhite = gameMode === 'white';
    }
    
    // Устанавливаем время
    const timeInSeconds = timeControl;
    gameState.whiteTime = timeInSeconds;
    gameState.blackTime = timeInSeconds;
    
    // Создаем игру в базе данных
    currentGameRef = database.ref('games/' + gameCode);
    
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
        whiteTime: timeInSeconds,
        blackTime: timeInSeconds,
        moveHistory: [],
        chat: [],
        lastUpdate: Date.now()
    };
    
    currentGameRef.set(gameData)
        .then(() => {
            // Показываем экран с кодом приглашения
            document.getElementById('game-code-display').textContent = gameCode;
            document.getElementById('game-invite-container').style.display = 'block';
            document.getElementById('start-game-btn').disabled = true;
            document.getElementById('invite-status').textContent = 'Ожидание соперника...';
            
            // Слушаем изменения в игре
            listenToGameChanges(gameCode);
            
            toastr.success('Игра создана! Отправьте код другу.');
        })
        .catch(error => {
            console.error('Ошибка создания игры:', error);
            toastr.error('Не удалось создать игру');
        });
}

// Сгенерировать цифровой код игры
function generateGameCode() {
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += Math.floor(Math.random() * 10);
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
    
    currentGameRef.update({
        status: 'active',
        startedAt: Date.now(),
        lastUpdate: Date.now()
    })
    .then(() => {
        document.getElementById('start-game-btn').disabled = true;
        toastr.success('Игра началась!');
        
        // Автоматически переходим на экран игры
        setTimeout(() => {
            showScreen('game-screen');
        }, 1000);
    })
    .catch(error => {
        console.error('Ошибка начала игры:', error);
        toastr.error('Не удалось начать игру');
    });
}

// Отменить игру
function cancelGame() {
    if (currentGameRef) {
        currentGameRef.remove()
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
    const codeInput = document.getElementById('game-code-input').value.trim();
    
    if (codeInput.length !== 6 || !/^\d+$/.test(codeInput)) {
        toastr.warning('Введите 6-значный цифровой код игры');
        return;
    }
    
    gameCode = codeInput;
    currentGameRef = database.ref('games/' + gameCode);
    
    currentGameRef.once('value').then(snapshot => {
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
            let updates = {};
            if (!gameData.whitePlayer) {
                isWhite = true;
                updates = {
                    whitePlayer: currentUser.uid,
                    whitePlayerName: currentUser.displayName,
                    lastUpdate: Date.now()
                };
            } else if (!gameData.blackPlayer) {
                isWhite = false;
                updates = {
                    blackPlayer: currentUser.uid,
                    blackPlayerName: currentUser.displayName,
                    lastUpdate: Date.now()
                };
            } else {
                toastr.warning('В игре нет свободных мест');
                return;
            }
            
            // Если оба игрока на месте, начинаем игру
            const hasWhitePlayer = gameData.whitePlayer || updates.whitePlayer;
            const hasBlackPlayer = gameData.blackPlayer || updates.blackPlayer;
            
            if (hasWhitePlayer && hasBlackPlayer) {
                updates.status = 'active';
                updates.startedAt = Date.now();
            }
            
            currentGameRef.update(updates)
                .then(() => {
                    // Слушаем изменения в игре
                    listenToGameChanges(gameCode);
                    
                    // Переходим на экран игры
                    showScreen('game-screen');
                    toastr.success('Вы присоединились к игре!');
                    
                    // Если игра началась автоматически
                    if (hasWhitePlayer && hasBlackPlayer) {
                        toastr.info('Игра началась!');
                    }
                });
            
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
    
    const gamesRef = database.ref('games');
    
    gamesRef.on('value', (snapshot) => {
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
                        <p>Контроль времени: ${game.timeControl === 0 ? 'Без ограничения' : (game.timeControl/60) + ' мин'}</p>
                        <p>Игроков: ${(game.whitePlayer ? 1 : 0) + (game.blackPlayer ? 1 : 0)}/2</p>
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
    
    const gamesRef = database.ref('games');
    
    gamesRef.on('value', (snapshot) => {
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
                
                const opponentName = game.whitePlayer === currentUser.uid ? 
                    (game.blackPlayerName || 'Ожидание...') : 
                    (game.whitePlayerName || 'Ожидание...');
                
                const gameElement = document.createElement('div');
                gameElement.className = 'game-item';
                gameElement.innerHTML = `
                    <div class="game-item-content">
                        <h4>Игра ${gameCode}</h4>
                        <p>Противник: ${opponentName}</p>
                        <p>Статус: ${game.status === 'waiting' ? 'Ожидание соперника' : 'Активна'}</p>
                        <p>Ход: ${game.turn === 'white' ? 'Белые' : 'Чёрные'}</p>
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
                currentGameRef = database.ref('games/' + code);
                
                // Определяем цвет игрока
                currentGameRef.once('value').then(snapshot => {
                    const game = snapshot.val();
                    isWhite = game.whitePlayer === currentUser.uid;
                    
                    // Слушаем изменения в игре
                    listenToGameChanges(gameCode);
                    
                    // Переходим на экран игры
                    showScreen('game-screen');
                    toastr.info('Возвращаемся в игру...');
                });
            });
        });
    });
}

// Слушать изменения в игре
function listenToGameChanges(gameCode) {
    if (currentGameListener) {
        // Удаляем предыдущего слушателя
        currentGameRef.off('value', currentGameListener);
    }
    
    currentGameRef = database.ref('games/' + gameCode);
    
    currentGameListener = currentGameRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            currentGame = snapshot.val();
            
            // Обновляем UI игры
            updateGameUI(currentGame);
            
            // Если мы на экране создания игры, проверяем статус
            if (document.getElementById('create-game-screen').classList.contains('active')) {
                updateCreateGameScreen(currentGame);
            }
            
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

// Обновить экран создания игры
function updateCreateGameScreen(game) {
    const inviteContainer = document.getElementById('game-invite-container');
    const inviteStatus = document.getElementById('invite-status');
    const startButton = document.getElementById('start-game-btn');
    
    if (game.status === 'waiting') {
        if (game.whitePlayer && game.blackPlayer) {
            // Оба игрока на месте
            inviteStatus.textContent = 'Соперник присоединился!';
            inviteStatus.style.color = '#4caf50';
            startButton.disabled = false;
            startButton.classList.add('pulse');
            
            // Автоматически начинаем игру через 3 секунды
            setTimeout(() => {
                if (startButton.disabled === false && game.status === 'waiting') {
                    startGame();
                }
            }, 3000);
        } else {
            // Ожидаем второго игрока
            const hasOpponent = game.whitePlayer !== currentUser.uid || game.blackPlayer !== currentUser.uid;
            inviteStatus.textContent = hasOpponent ? 'Соперник присоединяется...' : 'Ожидание соперника...';
            inviteStatus.style.color = '#ff9800';
            startButton.disabled = true;
            startButton.classList.remove('pulse');
        }
    } else if (game.status === 'active') {
        // Игра началась, автоматически переходим на экран игры
        inviteStatus.textContent = 'Игра началась!';
        inviteStatus.style.color = '#4caf50';
        
        setTimeout(() => {
            showScreen('game-screen');
        }, 1000);
    }
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
        document.getElementById('rematch-btn').style.display = 'none';
    } else if (game.status === 'active') {
        document.getElementById('current-turn').textContent = game.turn === 'white' ? 'Ход белых' : 'Ход чёрных';
        document.getElementById('game-result').textContent = '';
        document.getElementById('rematch-btn').style.display = 'none';
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
    
    if (game.turn === 'white' && game.status === 'active') {
        whiteStatus.innerHTML = '<i class="fas fa-hourglass-half"></i>';
        blackStatus.innerHTML = '';
    } else if (game.turn === 'black' && game.status === 'active') {
        whiteStatus.innerHTML = '';
        blackStatus.innerHTML = '<i class="fas fa-hourglass-half"></i>';
    } else {
        whiteStatus.innerHTML = '';
        blackStatus.innerHTML = '';
    }
    
    // Если игра активна и есть оба игрока, активируем доску
    if (game.status === 'active' && game.whitePlayer && game.blackPlayer) {
        setTimeout(() => {
            activateBoard();
        }, 100);
    }
}

// Форматировать время
function formatTime(seconds) {
    if (seconds === 0) return '∞';
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Инициализировать шахматную доску с Font Awesome иконками
function initializeChessBoard() {
    // Стандартная начальная позиция в шахматах
    const board = Array(64).fill(null);
    
    // Черные фигуры (верхние)
    // Ладьи, кони, слоны, ферзь, король
    board[0] = 'black-rook'; board[1] = 'black-knight'; board[2] = 'black-bishop'; 
    board[3] = 'black-queen'; board[4] = 'black-king'; 
    board[5] = 'black-bishop'; board[6] = 'black-knight'; board[7] = 'black-rook';
    // Черные пешки
    for (let i = 8; i < 16; i++) board[i] = 'black-pawn';
    
    // Белые фигуры (нижние)
    // Белые пешки
    for (let i = 48; i < 56; i++) board[i] = 'white-pawn';
    // Ладьи, кони, слоны, ферзь, король
    board[56] = 'white-rook'; board[57] = 'white-knight'; board[58] = 'white-bishop'; 
    board[59] = 'white-queen'; board[60] = 'white-king'; 
    board[61] = 'white-bishop'; board[62] = 'white-knight'; board[63] = 'white-rook';
    
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
            
            chessBoard.appendChild(square);
        }
    }
}

// Обновить шахматную доску с Font Awesome иконками
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
                
                // Определяем цвет фигуры
                const isBlack = board[i].startsWith('black');
                piece.dataset.color = isBlack ? 'black' : 'white';
                piece.dataset.piece = board[i];
                piece.dataset.index = i;
                
                // Создаем иконку Font Awesome
                const icon = document.createElement('i');
                const iconClass = pieceIcons[board[i]];
                if (iconClass) {
                    icon.className = iconClass;
                    piece.appendChild(icon);
                } else {
                    // Fallback на текст, если иконка не найдена
                    piece.textContent = getPieceSymbol(board[i]);
                }
                
                piece.draggable = true;
                square.appendChild(piece);
            }
        }
    }
}

// Получить символ фигуры (fallback)
function getPieceSymbol(pieceType) {
    const symbols = {
        'black-king': '♚',
        'black-queen': '♛',
        'black-rook': '♜',
        'black-bishop': '♝',
        'black-knight': '♞',
        'black-pawn': '♟',
        'white-king': '♔',
        'white-queen': '♕',
        'white-rook': '♖',
        'white-bishop': '♗',
        'white-knight': '♘',
        'white-pawn': '♙'
    };
    return symbols[pieceType] || '?';
}

// Активировать доску для игры
function activateBoard() {
    const pieces = document.querySelectorAll('.chess-piece');
    
    pieces.forEach(piece => {
        // Удаляем старые обработчики
        const newPiece = piece.cloneNode(true);
        piece.replaceWith(newPiece);
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
            
            // Добавляем обработчики для мобильных устройств
            piece.addEventListener('touchstart', handleTouchStart, { passive: false });
            piece.addEventListener('touchend', handleTouchEnd, { passive: false });
            
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
        
        // Для мобильных устройств
        square.addEventListener('touchmove', handleTouchMove, { passive: false });
        square.addEventListener('touchend', handleTouchEndOnSquare, { passive: false });
    });
}

// Обработчики drag and drop
let draggedPiece = null;
let touchStartX = 0;
let touchStartY = 0;

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

// Обработчики для сенсорных устройств
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    draggedPiece = e.target;
    draggedPiece.classList.add('dragging');
}

function handleTouchMove(e) {
    e.preventDefault();
}

function handleTouchEnd(e) {
    e.preventDefault();
    if (draggedPiece) {
        draggedPiece.classList.remove('dragging');
        draggedPiece = null;
    }
    
    // Убираем подсветку возможных ходов
    document.querySelectorAll('.chess-square').forEach(square => {
        square.classList.remove('valid-move', 'valid-capture');
    });
}

function handleTouchEndOnSquare(e) {
    e.preventDefault();
    const square = e.target.closest('.chess-square');
    if (!square || !draggedPiece) return;
    
    const fromIndex = parseInt(draggedPiece.dataset.index);
    const toIndex = parseInt(square.dataset.index);
    
    // Проверяем, что это другой квадрат
    if (fromIndex !== toIndex) {
        makeMove(fromIndex, toIndex);
    }
    
    if (draggedPiece) {
        draggedPiece.classList.remove('dragging');
        draggedPiece = null;
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
    if (selectedSquare) {
        selectedSquare.classList.add('selected');
    }
    
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
    const pieceColor = piece.startsWith('black') ? 'black' : 'white';
    if (pieceColor !== currentPlayerColor) {
        toastr.warning('Это не ваша фигура');
        return;
    }
    
    // Простой вариант: перемещаем фигуру без проверки правил шахмат
    board[toIndex] = piece;
    board[fromIndex] = null;
    
    // Определяем следующий ход
    const nextTurn = currentGame.turn === 'white' ? 'black' : 'white';
    
    // Обновляем время
    const timeUpdate = {};
    const currentTime = Date.now();
    const timePassed = currentTime - (currentGame.lastUpdate || currentTime);
    
    if (currentGame.turn === 'white' && currentGame.whiteTime > 0) {
        timeUpdate.whiteTime = Math.max(0, currentGame.whiteTime - Math.floor(timePassed / 1000));
    } else if (currentGame.turn === 'black' && currentGame.blackTime > 0) {
        timeUpdate.blackTime = Math.max(0, currentGame.blackTime - Math.floor(timePassed / 1000));
    }
    
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
    currentGameRef.update({
        board: board,
        turn: nextTurn,
        moveHistory: moveHistory,
        lastUpdate: Date.now(),
        ...timeUpdate,
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
        'black-king': 'K', 'white-king': 'K',
        'black-queen': 'Q', 'white-queen': 'Q',
        'black-rook': 'R', 'white-rook': 'R',
        'black-bishop': 'B', 'white-bishop': 'B',
        'black-knight': 'N', 'white-knight': 'N',
        'black-pawn': '', 'white-pawn': ''
    };
    
    const pieceSymbol = pieceSymbols[piece] || '';
    
    return `${pieceSymbol}${fromCol}${fromRow}-${toCol}${toRow}`;
}

// Обновить историю ходов
function updateMoveHistory(moveHistory) {
    const movesList = document.getElementById('moves-list');
    movesList.innerHTML = '';
    
    if (!moveHistory || moveHistory.length === 0) {
        movesList.innerHTML = '<div class="empty-state"><i class="fas fa-chess-board"></i><p>Еще не было ходов</p></div>';
        return;
    }
    
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
    
    if (!chatMessages || chatMessages.length === 0) {
        chatContainer.innerHTML = '<div class="system-message">Игра началась. Удачной игры!</div>';
        return;
    }
    
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
    
    currentGameRef.update({ 
        chat: chat,
        lastUpdate: Date.now()
    })
        .then(() => {
            chatInput.value = '';
            chatInput.focus();
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
        
        currentGameRef.update({
            status: 'finished',
            winner: winner,
            finishedAt: Date.now(),
            lastUpdate: Date.now()
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
    
    currentGameRef.update({
        drawOffered: currentUser.uid,
        lastUpdate: Date.now()
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
    
    currentGameRef.update({
        status: 'finished',
        winner: 'draw',
        finishedAt: Date.now(),
        drawOffered: null,
        lastUpdate: Date.now()
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
    
    currentGameRef.update({
        drawOffered: null,
        lastUpdate: Date.now()
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
    
    currentGameRef.update({
        rematchOffered: currentUser.uid,
        lastUpdate: Date.now()
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
    const newGameRef = database.ref('games/' + newGameCode);
    
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
        whiteTime: currentGame.timeControl,
        blackTime: currentGame.timeControl,
        moveHistory: [],
        chat: [],
        lastUpdate: Date.now()
    };
    
    newGameRef.set(gameData)
        .then(() => {
            // Удаляем старую игру
            currentGameRef.remove()
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
    
    currentGameRef.update({
        rematchOffered: null,
        lastUpdate: Date.now()
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
    const isFlipped = chessBoard.classList.toggle('flipped');
    
    // Сохраняем состояние переворота
    if (isFlipped) {
        chessBoard.style.transform = 'rotate(180deg)';
        toastr.info('Доска перевернута');
    } else {
        chessBoard.style.transform = 'rotate(0deg)';
        toastr.info('Доска возвращена в исходное положение');
    }
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
    if (currentGameListener && currentGameRef) {
        currentGameRef.off('value', currentGameListener);
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

console.log('NeoCascadeChess готов к работе!');
