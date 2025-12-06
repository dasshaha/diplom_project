// Глобальные переменные для хранения данных
let appData = {
    halls: [],
    films: [], 
    seances: []
};

let isProcessingClick = false;
window.selectedPosterFile = null;

// Глобальная переменная для отслеживания обработчиков
window.hallsClickHandler = null;
window.filmsClickHandler = null;


// Глобальная защита от множественных кликов
let globalClickLock = false;

function safeConfirm(message, isDragEvent = false) {

  if (!isDragEvent && globalClickLock) return false;
  
  if (!isDragEvent) globalClickLock = true;
  const result = confirm(message);
  
  if (!isDragEvent) {
    setTimeout(() => { globalClickLock = false; }, 500);
  }
  return result;
}

function safeAlert(message, isDragEvent = false) {
  if (!isDragEvent && globalClickLock) return;
  
  if (!isDragEvent) globalClickLock = true;
  alert(message);
  
  if (!isDragEvent) {
    setTimeout(() => { globalClickLock = false; }, 500);
  }
}



function changeSeatType(seatElement) {
    const types = ['free', 'vip', 'blocked'];
    const currentType = types.find(type => seatElement.classList.contains(type)) || 'free';
    
    let nextType;
    switch(currentType) {
        case 'free': nextType = 'vip'; break;
        case 'vip': nextType = 'blocked'; break;
        case 'blocked': nextType = 'free'; break;
        default: nextType = 'free';
    }

    seatElement.classList.remove('free', 'vip', 'blocked');
    seatElement.classList.add(nextType);
    
    if (nextType === 'vip') {
        seatElement.dataset.price = '350';
    } else if (nextType === 'free') {
        seatElement.dataset.price = '250';
    } else {
        delete seatElement.dataset.price;
    }
}



// Функция обновления интерфейса админки
function updateAdminUI() {
    console.log('Обновляем интерфейс...');
    
    // 1. ОБНОВЛЯЕМ СПИСОК ЗАЛОВ
    updateHallsList();
    
    // 2. ОБНОВЛЯЕМ СПИСОК ФИЛЬМОВ
    updateFilmsList();
    
    // 3. ОБНОВЛЯЕМ СЕТКУ ЗАЛОВ
    updateHallsGrid();
    
    // 4. ОБНОВЛЯЕМ СЕТКУ СЕАНСОВ
    updateSeancesGrid();
    
    updateHallSelectionLists();

    updateConfigurationData();

    initHallsHandlers();
    
    initDragAndDropForNewElements();

    initPriceConfiguration();
}





function initDragAndDropForNewElements() {
    const draggableFilms = document.querySelectorAll('.draggable-film');
    const dropZones = document.querySelectorAll('.drop-zone');
    let draggedFilm = null;

    console.log('Инициализация перетаскивания для новых элементов:', {
        films: draggableFilms.length,
        zones: dropZones.length
    });

    if (dropZones.length === 0) {
        console.log('Нет зон для перетаскивания - возможно залы не созданы');
        return;
    }

    // Обработчики для перетаскиваемых фильмов
    draggableFilms.forEach(film => {
        film.setAttribute('draggable', 'true');
        
        film.addEventListener('dragstart', function(e) {
            draggedFilm = this;
            this.classList.add('dragging');
            e.dataTransfer.setData('text/plain', this.dataset.filmId);
            e.dataTransfer.effectAllowed = 'copy';
            console.log('Начато перетаскивание фильма:', this.dataset.filmName);
        });

        film.addEventListener('dragend', function() {
            this.classList.remove('dragging');
            draggedFilm = null;
            dropZones.forEach(zone => zone.classList.remove('drag-over'));
            console.log('Завершено перетаскивание фильма');
        });
    });

    // Обработчики для зон перетаскивания (для фильмов)
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', function(e) {

            if (draggedFilm) {
                e.preventDefault();
                this.classList.add('drag-over');
                e.dataTransfer.dropEffect = 'copy';
            }
        });

        zone.addEventListener('dragleave', function() {
            this.classList.remove('drag-over');
        });

        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.remove('drag-over');
            
            if (draggedFilm) {
                console.log('Фильм перетащен в зону:', this.dataset.hall);
                showTimeInput(this, draggedFilm);
            }
        });
    });


    
    const addedSessions = document.querySelectorAll('.added-session');
    addedSessions.forEach(session => {
        initDragAndDropForSession(session);
    });


    document.addEventListener('dragover', function(e) {

        const draggingSession = document.querySelector('.added-session.dragging');
        
        if (draggingSession) {

            const targetDropZone = e.target.closest('.drop-zone');
            
            if (!targetDropZone) {

                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                document.body.style.cursor = 'no-drop';
            } else {

                e.dataTransfer.dropEffect = 'copy';
                document.body.style.cursor = 'default';
            }
        }
        
    });







    function handleDragOver(e) {

        const draggingSession = document.querySelector('.added-session.dragging');
        
        if (draggingSession) {

            
            const targetDropZone = e.target.closest('.drop-zone');
            
            if (!targetDropZone) {

                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                document.body.style.cursor = 'no-drop';
            } else {

                e.dataTransfer.dropEffect = 'copy';
                document.body.style.cursor = 'default';
            }
        }
    }

    function handleDrop(e) {

        const draggingSession = document.querySelector('.added-session.dragging');
        if (!draggingSession) return;
        
        e.preventDefault();
        e.stopPropagation(); 
        
        // Проверяем, куда бросили элемент
        const target = e.target;
        const targetDropZone = target.closest('.drop-zone');
        
        // Если элемент брошен НЕ в drop-zone - удаляем
        if (!targetDropZone) {
            console.log('Сеанс брошен вне drop-zone - предлагаем удаление');
            
            const seanceId = draggingSession.dataset.seanceId;
            const filmName = draggingSession.querySelector('.film-name')?.textContent || 'сеанс';
            const time = draggingSession.querySelector('.session-time')?.textContent || '';
            
            if (safeConfirm(`Удалить сеанс "${filmName}" на ${time}?`, true)) {
                // Проверяем, временный это сеанс или сохраненный
                if (seanceId && seanceId.startsWith('temp_')) {
                    // Удаляем временный сеанс без обращения к серверу
                    draggingSession.remove();
                    const originalDropZone = draggingSession.closest('.drop-zone');
                    if (originalDropZone) {
                        updateEmptyState(originalDropZone);
                        checkCompactMode(originalDropZone);
                    }
                    console.log('Временный сеанс удален');
                } else if (seanceId) {
                    // Удаляем сохраненный сеанс через сервер
                    deleteSeance(seanceId, draggingSession);
                } else {
                    // Если нет ID, просто удаляем из DOM
                    draggingSession.remove();
                    const originalDropZone = draggingSession.closest('.drop-zone');
                    if (originalDropZone) {
                        updateEmptyState(originalDropZone);
                        checkCompactMode(originalDropZone);
                    }
                }
            }
        } else {
            console.log('Сеанс брошен в drop-zone');
        }
        
        // Восстанавливаем курсор и состояние
        document.body.style.cursor = 'default';
        draggingSession.classList.remove('dragging');
        dropZones.forEach(zone => zone.classList.remove('drag-over'));
    }

    function handleDragEnd(e) {
        document.body.style.cursor = 'default';
        const draggingSession = document.querySelector('.added-session.dragging');
        if (draggingSession) {
            draggingSession.classList.remove('dragging');
        }
        dropZones.forEach(zone => zone.classList.remove('drag-over'));
    }

    // Добавляем обработчики
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragend', handleDragEnd);



}






// Функция для показа попапа при перетаскивании фильма в зону
function showTimeInput(zone, filmElement) {
    const hallId = zone.dataset.hall;
    const filmId = filmElement.dataset.filmId;
    const hall = appData.halls.find(h => h.id == hallId);
    const film = appData.films.find(f => f.id == filmId);
    
    if (!hall || !film) {
        alert('Ошибка: не найден зал или фильм');
        return;
    }
    
    console.log('Открываем попап для:', {
        hall: hall.hall_name,
        film: film.film_name
    });
    
    const hallInput = document.getElementById('seansHallName');
    const filmInput = document.getElementById('seansFilmName');
    const timeInput = document.getElementById('seansTime');
    
    if (hallInput) hallInput.value = hall.hall_name;
    if (filmInput) filmInput.value = film.film_name;
    if (timeInput) timeInput.value = '';
    
    
    // Сохраняем данные для использования при подтверждении
    window.currentSeansData = {
        hallId: hallId,
        filmId: filmId,
        hallName: hall.hall_name,
        filmName: film.film_name
    };
    
    openPopup('addSeansPopup');
    
    if (timeInput) {
        setTimeout(() => {
            timeInput.focus();
        }, 100);
    }
}





// Функция загрузки всех данных с сервера
async function loadAllData() {
    try {
        console.log('Загружаем данные с сервера...');
        
        // Получаем данные через API
        const data = await api.getAllData();
        
        // Сохраняем данные в глобальную переменную
        appData = data;
        
        console.log('Данные загружены:', data);
        
        // Обновляем интерфейс
        updateAdminUI();
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        alert('Не удалось загрузить данных: ' + error.message);
    }
}



// 1. Функция обновления списка залов
function updateHallsList() {
    const hallsList = document.querySelector('.info-list');
    if (!hallsList) return;
    
    hallsList.innerHTML = '';
    
    appData.halls.forEach(hall => {
        const hallElement = document.createElement('div');
        hallElement.className = 'free-hall';
        hallElement.innerHTML = `
            <p>--- ${hall.hall_name}</p>
            <div class="mysorka-box" data-hall-id="${hall.id}">
                <img src="./img/mysorka.png" alt="мусорка" class="mysorka">
            </div>
        `;
        hallsList.appendChild(hallElement);
    });
    
    console.log('Список залов обновлен:', appData.halls);
}

// 2. Функция обновления списка фильмов
function updateFilmsList() {
    const filmsList = document.getElementById('filmsList');
    if (!filmsList) return;
    
    filmsList.innerHTML = '';
    
    appData.films.forEach(film => {
        const filmElement = document.createElement('div');
        filmElement.className = 'film-seans draggable-film';
        filmElement.dataset.filmId = film.id;
        filmElement.dataset.filmName = film.film_name;
        filmElement.dataset.duration = film.film_duration;
        filmElement.setAttribute('draggable', 'true');
        
        filmElement.innerHTML = `
            <img src="${film.film_poster}" alt="постер фильма" class="foto-film-seans">
            <div class="info-film-seans">
                <div class="name-film-seans">${film.film_name}</div>
                <div class="time-film-seans">${film.film_duration} минут</div>
            </div>
            <div class="mysorka-box-seans">
                <div class="mysorka-box" data-film-id="${film.id}">
                    <img src="./img/mysorka.png" alt="мусорка" class="mysorka">
                </div>
            </div>
        `;
        filmsList.appendChild(filmElement);
    });
    
    console.log('Список фильмов обновлен:', appData.films);
}


// 4. Функция обновления сетки залов в разделе сеансов
function updateHallsGrid() {
    const hallSeansContainer = document.querySelector('.hall-seans-container');
    if (!hallSeansContainer) return;

    hallSeansContainer.innerHTML = '';

    appData.halls.forEach(hall => {
        const hallSeansElement = document.createElement('div');
        hallSeansElement.className = 'hall-seans';
        hallSeansElement.innerHTML = `
            <p class="hall-num-seans">${hall.hall_name}</p>
            <div class="simple-timeline">
                <div class="timeline-sessions drop-zone" data-hall="${hall.id}">
                    <!-- Сеансы будут добавляться сюда -->
                </div>
            </div>
        `;
        hallSeansContainer.appendChild(hallSeansElement);
    });

    console.log('Сетка залов обновлена:', appData.halls);
}


// 3. Функция обновления сетки сеансов
function updateSeancesGrid() {
    const dropZones = document.querySelectorAll('.drop-zone');
    
    dropZones.forEach(dropZone => {
        const hallId = parseInt(dropZone.dataset.hall);
        

        const existingLine = dropZone.querySelector('.timeline-line');
        dropZone.innerHTML = '';
        
        const line = document.createElement('div');
        line.className = 'timeline-line';
        dropZone.appendChild(line);
        
        const hallSeances = appData.seances.filter(seance => 
            seance.seance_hallid === hallId
        ).sort((a, b) => {
            return a.seance_time.localeCompare(b.seance_time);
        });
        
        hallSeances.forEach(seance => {
            const film = appData.films.find(f => f.id === seance.seance_filmid);
            if (film) {
                addSessionToTimeline(dropZone, film, seance.seance_time, seance.id);
            }
        });
        
        updateEmptyState(dropZone);
    });
    
    const allSessions = document.querySelectorAll('.added-session');
    allSessions.forEach(session => {
        initDragAndDropForSession(session);
    });
    
    setTimeout(recalculateAllSessionPositions, 100);
}



// Обновление состояния пустого контейнера 
function updateEmptyState(dropZone) {
    const hasSessions = dropZone.querySelector('.added-session');
    if (hasSessions) {
        dropZone.classList.remove('empty');
    } else {
        dropZone.classList.add('empty');
    }
}




function addSessionToTimeline(dropZone, film, time, seanceId = null) {
    const hallId = dropZone.dataset.hall;
    
    // 1. Форматируем время (12:00)
    const formattedTime = time.substring(0, 5);
    
    // 2. Берем ПОЛНОЕ название фильма
    const fullFilmName = film.film_name;
    
    // 3. Создаем элемент сеанса
    const sessionElement = document.createElement('div');
    sessionElement.className = 'added-session';
    sessionElement.dataset.filmId = film.id;
    sessionElement.dataset.hallId = hallId;
    sessionElement.dataset.time = formattedTime;
    
    if (seanceId) {
        sessionElement.dataset.seanceId = seanceId;
    } else {

        sessionElement.dataset.seanceId = 'temp_' + Date.now();
    }
    
    // 4. Внутри 2 блока: название фильма и время
    sessionElement.innerHTML = `
        <div class="session-time">${formattedTime}</div>
        <div class="film-name">${fullFilmName}</div>
        <button class="remove-session" title="Удалить сеанс">×</button>
    `;
    

    const nameLength = fullFilmName.length;
    let width = 60; 
    
    if (nameLength > 25) width = 90;
    else if (nameLength > 20) width = 85;
    else if (nameLength > 15) width = 75;
    else if (nameLength > 10) width = 70;
    
    sessionElement.style.minWidth = width + 'px';
    sessionElement.style.maxWidth = width + 'px';
    
    const allSessions = dropZone.querySelectorAll('.added-session');
    const containerWidth = dropZone.clientWidth;
    let totalWidth = 0;
    
    allSessions.forEach(s => {
        totalWidth += s.offsetWidth + 3;
    });
    totalWidth += width + 3;
    
    if (totalWidth > containerWidth * 0.95) {
        dropZone.classList.add('compact');
    } else {
        dropZone.classList.remove('compact');
    }
    

    // 7. Добавляем обработчик удаления
    const removeBtn = sessionElement.querySelector('.remove-session');
    removeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const seanceId = sessionElement.dataset.seanceId;
        
        if (seanceId) {
            if (seanceId.startsWith('temp_')) {
                if (safeConfirm('Удалить этот сеанс?')) {
                    sessionElement.remove();
                    updateEmptyState(dropZone);
                    checkCompactMode(dropZone);
                }
            } else {

                deleteSeance(seanceId, sessionElement);
            }
        }
    });
    

    initDragAndDropForSession(sessionElement);
    
    // 9. Добавляем в контейнер
    dropZone.appendChild(sessionElement);
    updateEmptyState(dropZone);
}





function checkCompactMode(dropZone) {
    const allSessions = dropZone.querySelectorAll('.added-session');
    const containerWidth = dropZone.clientWidth;
    let totalWidth = 0;
    
    allSessions.forEach(s => {
        totalWidth += s.offsetWidth + 5;
    });
    
    if (totalWidth > containerWidth * 0.95) {
        dropZone.classList.add('compact');
    } else {
        dropZone.classList.remove('compact');
    }
}



function initDragAndDropForSession(sessionElement) {
    sessionElement.setAttribute('draggable', 'true');
    
    sessionElement.addEventListener('dragstart', function(e) {
        this.classList.add('dragging');
        e.dataTransfer.setData('text/plain', this.dataset.seanceId);
        e.dataTransfer.effectAllowed = 'move';
        console.log('Начато перетаскивание сеанса:', this.dataset.seanceId);
        e.stopPropagation(); 
    });
    
    sessionElement.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        console.log('Завершено перетаскивание сеанса');
    });
    
    sessionElement.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
    });
    
    sessionElement.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
    });
}






function openPopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeAllPopups() {
    const popupOverlays = document.querySelectorAll('.popup-overlay');
    popupOverlays.forEach(popup => {
        popup.style.display = 'none';
    });
    document.body.style.overflow = '';
}



// Функция для создания зала
async function createHall(hallName) {
    try {
        console.log('Создаем зал:', hallName);
        
        // Отправляем запрос на сервер
        await api.hallAdd(hallName);
        
        // Перезагружаем данные с сервера
        await loadAllData();
        
        alert('Зал успешно создан!');
        closeAllPopups();
        
    } catch (error) {
        console.error('Ошибка создания зала:', error);
        alert('Ошибка создания зала: ' + error.message);
    }
}


async function deleteHall(hallId, hallName) {
  if (isProcessingClick) return;
  
  if (!safeConfirm(`Удалить зал "${hallName}"?`)) return;
  
  isProcessingClick = true;
  try {
    await api.hallDelete(hallId);
    await loadAllData();
  } catch (error) {
    console.error('Ошибка удаления зала:', error);
    if (!error.message.includes('No query results')) {
      alert('Ошибка удаления зала: ' + error.message);
    }
  } finally {
    isProcessingClick = false;
  }
}




// Функция для удаления фильма
async function deleteFilm(filmId, filmName) {
    if (!safeConfirm(`Удалить фильм "${filmName}"?`)) return;
    
    try {
        await api.filmDelete(filmId);
        await loadAllData();
        console.log('Фильм успешно удален!');
    } catch (error) {
        alert('Ошибка удаления фильма: ' + error.message);
    }
}

// Функция для добавления фильма
async function createFilm(filmData, posterFile) {
    try {
        await api.filmAdd(filmData, posterFile);
        await loadAllData();
        alert('Фильм успешно добавлен!');
        closeAllPopups();
    } catch (error) {
        alert('Ошибка добавления фильма: ' + error.message);
    }
}



// Функция для загрузки постера
function handlePosterUpload(callback) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            callback(file);
        }
    });
    
    fileInput.click();
}





// Функция удаления сеанса
async function deleteSeance(seanceId, sessionElement) {
    if (!safeConfirm('Удалить этот сеанс?')) return;
    
    try {
        await api.seanceDelete(seanceId);
        
        // Удаляем элемент из DOM
        if (sessionElement && sessionElement.parentNode) {
            sessionElement.remove();
        }
        
        // Обновляем состояние зоны
        const dropZone = document.querySelector(`.drop-zone[data-hall]`);
        if (dropZone) {
            updateEmptyState(dropZone);
            checkCompactMode(dropZone);
        }
        
        // Перезагружаем данные с сервера для синхронизации
        setTimeout(async () => {
            try {
                await loadAllData();
            } catch (error) {
                console.error('Ошибка при обновлении данных:', error);
            }
        }, 100);
        
    } catch (error) {
        console.error('Ошибка удаления сеанса:', error);
        safeAlert('Ошибка удаления сеанса: ' + error.message);
    }
}




// Обработчики для залов и фильмов
function initHallsHandlers() {
  let isProcessing = false;

  const createHallBtn = document.querySelector('[data-popup="addHallPopup"]');
  if (createHallBtn) {
    createHallBtn.addEventListener('click', function() {
      openPopup('addHallPopup');
    });
  }

  const addHallBtn = document.querySelector('#addhallButton');
  if (addHallBtn) {
    addHallBtn.addEventListener('click', function(e) {
      e.preventDefault();
      const hallNameInput = document.querySelector('#addHallPopup .info-value');
      if (hallNameInput && hallNameInput.value.trim()) {
        createHall(hallNameInput.value.trim());
        hallNameInput.value = '';
      } else {
        alert('Введите название зала');
      }
    });
  }




  if (window.globalClickHandler) {
    document.removeEventListener('click', window.globalClickHandler);
  }

  // ОБЩИЙ обработчик для удаления залов и фильмов
  window.globalClickHandler = function(e) {

    if (isProcessing) {
      console.log('Запрос уже обрабатывается, пропускаем клик');
      return;
    }

    const trashBox = e.target.closest('.mysorka-box');
    if (!trashBox) return;

    e.stopPropagation();
    e.preventDefault();

    // Проверяем, кликнули ли на мусорку зала
    if (trashBox.closest('.free-hall')) {
      isProcessing = true;
      
      const hallElement = trashBox.closest('.free-hall');
      const hallName = hallElement.querySelector('p').textContent.replace('--- ', '').trim();
      const hallId = trashBox.dataset.hallId;

      console.log('Клик по мусорке зала:', hallName, 'ID:', hallId);

      if (hallId) {
        deleteHall(hallId, hallName).finally(() => {
          isProcessing = false; // Разблокируем после завершения
        });
      } else {
        // Если ID нет в data-атрибуте, ищем в данных
        const hall = appData.halls.find(h => h.hall_name === hallName);
        if (hall) {
          deleteHall(hall.id, hallName).finally(() => {
            isProcessing = false;
          });
        } else {
          alert('Не удалось найти ID зала');
          isProcessing = false;
        }
      }
    }
    // Проверяем, кликнули ли на мусорку ФИЛЬМА
    else if (trashBox.closest('.film-seans')) {
      isProcessing = true;
      
      const filmElement = trashBox.closest('.film-seans');
      const filmName = filmElement.querySelector('.name-film-seans').textContent;
      const filmId = filmElement.dataset.filmId;

      console.log('Клик по мусорке фильма:', filmName, 'ID:', filmId);

      if (filmId) {
        deleteFilm(filmId, filmName).finally(() => {
          isProcessing = false; // Разблокируем после завершения
        });
      } else {
        alert('Не удалось найти ID фильма');
        isProcessing = false;
      }
    }
  };

  document.addEventListener('click', window.globalClickHandler);




  // Функция для загрузки постера
  function initPosterUploadHandler() {
      const uploadPosterBtn = document.getElementById('uploadPosterBtn');
      if (uploadPosterBtn) {
          uploadPosterBtn.replaceWith(uploadPosterBtn.cloneNode(true));
          const newBtn = document.getElementById('uploadPosterBtn');
          
          newBtn.addEventListener('click', function(e) {
              e.preventDefault();
              console.log('Клик по кнопке загрузки постера');
              
              const fileInput = document.createElement('input');
              fileInput.type = 'file';
              fileInput.accept = 'image/*';
              
              fileInput.addEventListener('change', function(e) {
                  const file = e.target.files[0];
                  if (file) {
                      // Проверка размера файла (5MB)
                      if (file.size > 5 * 1024 * 1024) {
                          alert('Файл слишком большой. Максимальный размер: 5MB');
                          return;
                      }
                      
                      // Проверка типа файла
                      if (!file.type.startsWith('image/')) {
                          alert('Выберите файл изображения');
                          return;
                      }
                      
                      console.log('Постер выбран:', file.name, file.size, file.type);
                      alert('Постер выбран: ' + file.name);
                      window.selectedPosterFile = file;
                  }
              });
              
              fileInput.click();
          });
      }
  }


  
  // Функция для добавления фильма
  function initAddFilmHandler() {
      const addFilmBtn = document.getElementById('confirmAddFilm');
      if (addFilmBtn) {
          addFilmBtn.replaceWith(addFilmBtn.cloneNode(true));
          const newBtn = document.getElementById('confirmAddFilm');
          
          newBtn.addEventListener('click', async function(e) {
              e.preventDefault();
              
              const popup = document.getElementById('addFilmPopup');
              const inputs = popup.querySelectorAll('.info-value');
              
              const filmData = {
                  name: inputs[0].value.trim(),
                  duration: inputs[1].value.trim(),
                  description: inputs[2].value.trim() || 'Описание отсутствует',
                  origin: inputs[3].value.trim() || 'Не указана'
              };
              
              // Валидация
              if (!filmData.name) {
                  alert('Введите название фильма');
                  return;
              }
              if (!filmData.duration || isNaN(filmData.duration)) {
                  alert('Введите корректную продолжительность фильма');
                  return;
              }
              
              try {
                  console.log('Добавляем фильм:', filmData);
                  console.log('Постер:', window.selectedPosterFile);
                  
                  await api.filmAdd(filmData, window.selectedPosterFile || null);
                  await loadAllData();
                  alert('Фильм успешно добавлен!');
                  closeAllPopups();
                  
                  // Очищаем форму
                  inputs.forEach(input => input.value = '');
                  window.selectedPosterFile = null;
                  
              } catch (error) {
                  console.error('Ошибка добавления фильма:', error);
                  alert('Ошибка добавления фильма: ' + error.message);
              }
          });
      }
  }



  // Обработчик отмены для формы фильма
  const cancelFilmBtn = document.getElementById('cancelAddFilm');
  if (cancelFilmBtn) {
      cancelFilmBtn.addEventListener('click', function(e) {
          e.preventDefault();
          console.log('Отмена добавления фильма');
          closeAllPopups();
          window.selectedPosterFile = null;
      });
  }



  // Инициализация загрузки постера
  initPosterUploadHandler();


  // Инициализация добавления фильма
  initAddFilmHandler();





    // Обработчик для подтверждения добавления сеанса
    const confirmAddSeansBtn = document.getElementById('confirmAddSeans');
    if (confirmAddSeansBtn) {
        // Удаляем старый обработчик и создаем новый
        confirmAddSeansBtn.replaceWith(confirmAddSeansBtn.cloneNode(true));
        const newConfirmBtn = document.getElementById('confirmAddSeans');
        
        newConfirmBtn.addEventListener('click', async function() {
            const timeInput = document.getElementById('seansTime');
            const time = timeInput.value;
            
            if (!time) {
                alert('Введите время сеанса');
                return;
            }
            
            if (!window.currentSeansData) {
                alert('Ошибка: данные сеанса не найдены');
                return;
            }
            
            try {
                console.log('Создаем сеанс:', {
                    hallId: window.currentSeansData.hallId,
                    filmId: window.currentSeansData.filmId, 
                    time: time
                });
                
                await api.seanceAdd(window.currentSeansData.hallId, window.currentSeansData.filmId, time);
                
                // Успех - закрываем попап
                closeAllPopups();
                window.currentSeansData = null;
                
                // Обновляем данные
                await loadAllData();
                
            } catch (error) {
                console.error('Ошибка создания сеанса:', error);
                
                // НЕ закрываем попап при ошибке
                if (error.message.includes('пересекается')) {
                    alert('Ошибка: Сеанс пересекается по времени с другими сеансами');
                } else {
                    alert('Ошибка создания сеанса: ' + error.message);
                }
            }
        });
    }


    // Обработчик для отмены добавления сеанса
    const cancelAddSeansBtn = document.getElementById('cancelAddSeans');
    if (cancelAddSeansBtn) {
        cancelAddSeansBtn.addEventListener('click', function() {
            closeAllPopups();
            window.currentSeansData = null;
        });
    }


}





document.addEventListener('DOMContentLoaded', function() {
    loadAllData();
    initHallsHandlers();


    updateHallLayoutFromInputs();
    initPriceConfiguration();


    // Конфигурация залов
    const hallNumbers = document.querySelectorAll('.list-hall-num');
    const seats = document.querySelectorAll('.seat');

    // Управление сеансами
    const trashIcons = document.querySelectorAll('.mysorka-box');

    // Popup элементы
    const popupOverlays = document.querySelectorAll('.popup-overlay');
    const closeButtons = document.querySelectorAll('.krestic');


    // Инициализация обработчиков полей конфигурации залов
    const rowInput = document.getElementById('row-count');
    const seatInput = document.getElementById('seat-count');
    
    if (rowInput && seatInput) {
        rowInput.addEventListener('change', updateHallLayoutFromInputs);
        seatInput.addEventListener('change', updateHallLayoutFromInputs);
    }
    
    initSalesManagement();


    const saveSessionsBtn = document.getElementById('saveSessions');
    const cancelSessionsBtn = document.getElementById('cancelSessions');

    if (saveSessionsBtn) {
        saveSessionsBtn.addEventListener('click', function() {
            alert('Все сеансы автоматически сохраняются при создании');
        });
    }

    if (cancelSessionsBtn) {
        cancelSessionsBtn.addEventListener('click', function() {
            if (confirm('Отменить все несохраненные изменения?')) {
                loadAllData();
            }
        });
    }


    initHallConfiguration();

    initSessionManagement();

    initPopupWindows();


    function initHallConfiguration() {

        hallNumbers.forEach(hall => {
            hall.addEventListener('click', function() {
                selectHall(this);
            });
        });


        seats.forEach(seat => {
            seat.addEventListener('click', function() {
                changeSeatType(this);
            });
        });


        const saveHallConfigBtn = document.querySelector('.index-container:nth-child(2) .index-button:not(.index-button-no)');
        if (saveHallConfigBtn) {
            saveHallConfigBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Сохранение конфигурации зала');
                saveHallConfiguration();
            });
        }


        const savePriceBtn = document.querySelector('.index-container:nth-child(3) .index-button:not(.index-button-no)');
        if (savePriceBtn) {
            savePriceBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Сохранение цен');
            });
        }

        
        const cancelBtns = document.querySelectorAll('.index-button-no');
        cancelBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Отмена изменений');
                cancelChanges();
            });
        });
    }

    

    function initSessionManagement() {
        console.log('Инициализация управления сеансами...');
    }

    function initPopupWindows() {
    // Обработчики для открытия popup окон
    document.querySelectorAll('[data-popup]').forEach(button => {
      button.addEventListener('click', function() {
        const popupId = this.getAttribute('data-popup');
        openPopup(popupId);
      });
    });

    // Обработчики для закрытия popup окон
    closeButtons.forEach(button => {
      button.addEventListener('click', function() {
        closeAllPopups();
      });
    });


    popupOverlays.forEach(overlay => {
      overlay.addEventListener('click', function(e) {
        if (e.target === this) {
          closeAllPopups();
        }
      });
    });


    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeAllPopups();
      }
    });

    // Обработчики для кнопок "Отмена" внутри popup
    document.querySelectorAll('.addhall-button.no, .addfilm-button.no, .addseans-button.no').forEach(button => {
      button.addEventListener('click', function(e) {

        if (document.querySelector('.added-session.dragging')) {
          return; 
        }
        
        e.preventDefault();
        closeAllPopups();
      });
    });

    // Обработчики для кнопок сохранения внутри popup
    document.querySelectorAll('.addhall-button:not(.no), .addfilm-button:not(.no), .addseans-button:not(.no)').forEach(button => {
      button.addEventListener('click', function(e) {

        if (document.querySelector('.added-session.dragging')) {
          return;
        }
        
        e.preventDefault();

        console.log('Сохранение данных из popup:', this.textContent);
        closeAllPopups();
      });
    });
  }




  function selectHall(hallElement) {
    const container = hallElement.closest('.index-container');
    container.querySelectorAll('.list-hall-num').forEach(h => h.classList.remove('active'));
    hallElement.classList.add('active');
    console.log('Выбран зал:', hallElement.textContent);
  }

  function changeSeatType(seatElement) {
    const currentType = getCurrentSeatType(seatElement);
    let nextType;
    
    switch(currentType) {
      case 'free': nextType = 'vip'; break;
      case 'vip': nextType = 'blocked'; break;
      case 'blocked': nextType = 'free'; break;
      default: nextType = 'free';
    }

    seatElement.classList.remove('free', 'vip', 'blocked');
    seatElement.classList.add(nextType);
    
    if (nextType === 'vip') {
      seatElement.dataset.price = '350';
    } else if (nextType === 'free') {
      seatElement.dataset.price = '250';
    } else {
      delete seatElement.dataset.price;
    }
    
    console.log('Тип места изменен на:', nextType);
  }

  function getCurrentSeatType(seatElement) {
    if (seatElement.classList.contains('vip')) return 'vip';
    if (seatElement.classList.contains('blocked')) return 'blocked';
    return 'free';
  }




    function cancelChanges() {
        if (safeConfirm('Отменить все изменения в этом разделе?')) {
            // Перезагружаем данные с сервера
            loadAllData();
            alert('Изменения отменены. Данные восстановлены.');
        }
    }
  
});  



function collectHallConfiguration() {
    const config = [];
    const seatsGrid = document.querySelector('.seats-grid');
    
    if (!seatsGrid) {
        console.error('Сетка мест не найдена');
        return config;
    }
    
    const rows = seatsGrid.querySelectorAll('[class*="seat-row"]');
    
    rows.forEach(row => {
        const rowConfig = [];
        const seats = row.querySelectorAll('.seat');
        
        seats.forEach(seat => {
            if (seat.classList.contains('vip')) {
                rowConfig.push('vip');
            } else if (seat.classList.contains('blocked')) {
                rowConfig.push('disabled');
            } else {
                rowConfig.push('standart');
            }
        });
        
        config.push(rowConfig);
    });
    
    console.log('Собрана конфигурация:', config);
    return config;
}


function updateHallLayout(rows, seatsPerRow) {
    const seatsGrid = document.querySelector('.seats-grid');
    if (!seatsGrid) return;
    
    seatsGrid.innerHTML = '';
    
    for (let row = 1; row <= rows; row++) {
        const rowElement = document.createElement('div');
        rowElement.className = `seat-row seat-row-${row}`;
        
        for (let seatNum = 1; seatNum <= seatsPerRow; seatNum++) {
            const seat = document.createElement('div');
            seat.className = 'seat free';
            seat.textContent = seatNum;
            seat.dataset.price = '250';
            seat.addEventListener('click', function() {
                changeSeatType(this);
            });
            rowElement.appendChild(seat);
        }
        
        seatsGrid.appendChild(rowElement);
    }
    
    console.log(`Схема зала обновлена: ${rows} рядов × ${seatsPerRow} мест`);
}


function updateHallSelectionLists() {
    console.log('Обновляем списки выбора залов...');
    
    const hallLists = document.querySelectorAll('.list-hall');
    
    hallLists.forEach(list => {
        list.innerHTML = '';
        
        appData.halls.forEach(hall => {
            const hallItem = document.createElement('li');
            hallItem.className = 'list-hall-num';
            
            const displayName = hall.hall_name.length > 20 
                ? hall.hall_name.substring(0, 17) + '...' 
                : hall.hall_name;
                
            hallItem.textContent = displayName.toUpperCase();
            hallItem.title = hall.hall_name;
            hallItem.dataset.hallId = hall.id; // сохраняем ID зала
            hallItem.dataset.fullName = hall.hall_name;
            
            hallItem.addEventListener('click', function() {
                list.querySelectorAll('.list-hall-num').forEach(item => {
                    item.classList.remove('active');
                });
                this.classList.add('active');
                
                console.log('Выбран зал:', this.dataset.fullName, 'ID:', this.dataset.hallId);
                
                // АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ СХЕМЫ ПРИ ВЫБОРЕ ЗАЛА
                const rowCount = parseInt(document.getElementById('row-count').value) || 10;
                const seatCount = parseInt(document.getElementById('seat-count').value) || 8;
                updateHallLayout(rowCount, seatCount);
            });
            
            list.appendChild(hallItem);
        });
        
        const firstHall = list.querySelector('.list-hall-num');
        if (firstHall) {
            firstHall.classList.add('active');
        }
    });
    
    console.log('Списки выбора залов обновлены');
}



// Функция для заполнения полей данными из БД
function updateConfigurationData() {
    console.log('Заполняем поля данными из БД...');
    
    // Заполняем поля "Конфигурация залов"
    if (appData.halls.length > 0) {
        const firstHall = appData.halls[0];
        
        // Заполняем поля рядов и мест
        if (firstHall.hall_config) {
            const config = firstHall.hall_config;
            const rowCount = config.length;
            const seatCount = config[0] ? config[0].length : 0;
            
            const rowInput = document.getElementById('row-count');
            const seatInput = document.getElementById('seat-count');
            
            if (rowInput) rowInput.value = rowCount;
            if (seatInput) seatInput.value = seatCount;
            
            // Обновляем схему зала
            updateHallLayout(rowCount, seatCount);
            
            // Восстанавливаем типы мест из конфигурации
            restoreSeatTypes(config);
        }
    }
    

    const basicPriceInput = document.getElementById('basic-price-input');
    const vipPriceInput = document.getElementById('vip-price-input');
    
    if (basicPriceInput && vipPriceInput && appData.halls.length > 0) {

        const hall = appData.halls[0];
        
        // Заполняем цены
        basicPriceInput.value = hall.price_standart || 250;
        vipPriceInput.value = hall.price_vip || 350;
    }
    
    console.log('Поля заполнены данными из БД');
}



// Функция для восстановления типов мест из конфигурации
function restoreSeatTypes(config) {
    const seatsGrid = document.querySelector('.seats-grid');
    if (!seatsGrid) return;
    
    const rows = seatsGrid.querySelectorAll('[class*="seat-row"]');
    
    rows.forEach((row, rowIndex) => {
        const seats = row.querySelectorAll('.seat');
        
        seats.forEach((seat, seatIndex) => {
            if (config[rowIndex] && config[rowIndex][seatIndex]) {
                const seatType = config[rowIndex][seatIndex];
                
                // Очищаем классы
                seat.classList.remove('free', 'vip', 'blocked');
                
                // Устанавливаем правильный тип
                if (seatType === 'vip') {
                    seat.classList.add('vip');
                    seat.dataset.price = '350';
                } else if (seatType === 'disabled') {
                    seat.classList.add('blocked');
                    delete seat.dataset.price;
                } else {
                    seat.classList.add('free');
                    seat.dataset.price = '250';
                }
            }
        });
    });
}








function updateHallLayoutFromInputs() {
    const rows = parseInt(document.getElementById('row-count').value) || 10;
    const seatsPerRow = parseInt(document.getElementById('seat-count').value) || 8;
    updateHallLayout(rows, seatsPerRow);
}





function validateNumberInput(value, fieldName, min = 1, max = 20) {
    const num = parseInt(value);
    if (isNaN(num)) {
        alert(`${fieldName} должно быть числом`);
        return false;
    }
    if (num < min) {
        alert(`${fieldName} должно быть больше ${min}`);
        return false;
    }
    if (num > max) {
        alert(`${fieldName} не может быть больше ${max}`);
        return false;
    }
    return true;
}



// Функция для инициализации конфигурации цен
function initPriceConfiguration() {
    console.log('Инициализация конфигурации цен...');
    

    const priceContainers = document.querySelectorAll('.index-container');
    let priceContainer = null;
    

    for (let container of priceContainers) {
        const title = container.querySelector('.index-title');
        if (title && title.textContent.includes('КОНФИГУРАЦИЯ ЦЕН')) {
            priceContainer = container;
            break;
        }
    }
    
    if (!priceContainer) {
        console.error('Контейнер с ценами не найден');
        return;
    }
    

    const basicPriceInput = priceContainer.querySelector('#basic-price-input');
    const vipPriceInput = priceContainer.querySelector('#vip-price-input');
    const savePriceBtn = priceContainer.querySelector('.index-button:not(.index-button-no)');
    
    if (!basicPriceInput || !vipPriceInput || !savePriceBtn) {
        console.error('Не все элементы конфигурации цен найдены');
        return;
    }
    
    console.log('Элементы конфигурации цен найдены');
    

    const newSaveBtn = savePriceBtn.cloneNode(true);
    savePriceBtn.parentNode.replaceChild(newSaveBtn, savePriceBtn);
    
    // Добавляем новый обработчик
    newSaveBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Находим выбранный зал в ЭТОМ контейнере
        const selectedHall = priceContainer.querySelector('.list-hall-num.active');
        if (!selectedHall) {
            alert('Пожалуйста, выберите зал для настройки цен');
            return;
        }

        const hallId = selectedHall.dataset.hallId;
        const hallName = selectedHall.dataset.fullName || selectedHall.textContent;
        
        // Получаем значения
        const basicPrice = parseInt(basicPriceInput.value.trim());
        const vipPrice = parseInt(vipPriceInput.value.trim());

        // Валидация
        if (isNaN(basicPrice) || basicPrice <= 0) {
            alert('Введите корректную цену для обычных мест (больше 0)');
            basicPriceInput.focus();
            return;
        }
        if (isNaN(vipPrice) || vipPrice <= 0) {
            alert('Введите корректную цену для VIP мест (больше 0)');
            vipPriceInput.focus();
            return;
        }

        try {
            console.log('Сохранение цен:', { 
                hallId, 
                hallName, 
                basicPrice, 
                vipPrice 
            });

            await api.hallSetPrice(hallId, basicPrice, vipPrice);
            alert(`Цены для зала "${hallName}" успешно сохранены!`);
            
            // Обновляем данные
            await loadAllData();
            
        } catch (error) {
            console.error('Ошибка сохранения цен:', error);
            alert('Ошибка сохранения цен: ' + error.message);
        }
    });
    
    console.log('Обработчик цен успешно инициализирован!');
}



function initSalesManagement() {
    const openSalesBtn = document.querySelector('[data-popup="addSeansPopup"]');
    
    if (openSalesBtn) {
        openSalesBtn.addEventListener('click', async function() {
            const selectedHall = document.querySelector('.index-container:last-child .list-hall-num.active');
            if (!selectedHall) {
                alert('Выберите зал для открытия продаж');
                return;
            }
            
            const hallId = selectedHall.dataset.hallId;
            const hallName = selectedHall.dataset.fullName || selectedHall.textContent;
            
            if (confirm(`Открыть продажи билетов для "${hallName}"?`)) {
                try {
                    await api.hallSetOpen(hallId, 1);
                    alert(`Продажи билетов для "${hallName}" открыты!`);
                    this.textContent = 'ПРИОСТАНОВИТЬ ПРОДАЖУ БИЛЕТОВ';
                    
                } catch (error) {
                    console.error('Ошибка открытия продаж:', error);
                    alert('Ошибка открытия продаж: ' + error.message);
                }
            }
        });
    }
}



// Функция для пересчета позиций всех сеансов при изменении размера
function recalculateAllSessionPositions() {
    const dropZones = document.querySelectorAll('.drop-zone');
    
    dropZones.forEach(dropZone => {
        const sessions = dropZone.querySelectorAll('.added-session');
        const containerWidth = dropZone.offsetWidth;
        
        if (sessions.length > 0 && containerWidth > 0) {
            // Сначала получаем все позиции
            const positions = [];
            sessions.forEach(session => {
                const time = session.dataset.time;
                const [hours, minutes] = time.split(':').map(Number);
                const totalMinutes = hours * 60 + minutes;
                const positionPercentage = (totalMinutes / 1439) * 100;
                positions.push({
                    session: session,
                    originalPosition: positionPercentage
                });
            });
            
            // Сортируем по времени
            positions.sort((a, b) => a.originalPosition - b.originalPosition);
            
            // Пересчитываем позиции с учетом ширины
            positions.forEach((item, index) => {
                const session = item.session;
                const minDistance = 60;
                
                // Рассчитываем новую позицию с учетом соседей
                let newPosition = item.originalPosition;
                
                if (index > 0) {
                    const prevSession = positions[index - 1];
                    const prevPosition = parseFloat(prevSession.session.style.left) || prevSession.originalPosition;
                    const distance = (newPosition - prevPosition) / 100 * containerWidth;
                    
                    if (distance < minDistance) {
                        newPosition = prevPosition + (minDistance / containerWidth * 100);
                    }
                }
                
                // Проверяем границы
                if (newPosition > 98) newPosition = 98;
                if (newPosition < 2) newPosition = 2;
                
                session.style.left = `${newPosition}%`;
            });
        }
    });
}



// Функция для сохранения конфигурации залов
async function saveHallConfiguration() {
    const selectedHall = document.querySelector('.index-container:nth-child(2) .list-hall-num.active');
    if (!selectedHall) {
        alert('Пожалуйста, выберите зал для сохранения конфигурации');
        return;
    }

    const hallId = selectedHall.dataset.hallId;
    const hallName = selectedHall.dataset.fullName || selectedHall.textContent;
    
    // Получаем количество рядов и мест из полей ввода
    const rowCount = parseInt(document.getElementById('row-count').value) || 10;
    const seatCount = parseInt(document.getElementById('seat-count').value) || 8;
    
    // Валидация
    if (!validateNumberInput(rowCount, 'Количество рядов', 1, 20) || 
        !validateNumberInput(seatCount, 'Количество мест в ряду', 1, 20)) {
        return;
    }
    
    // Собираем конфигурацию
    const config = collectHallConfiguration();
    
    try {
        console.log('Сохраняем конфигурацию зала:', { 
            hallId, 
            hallName, 
            rowCount, 
            seatCount, 
            config 
        });
        
        await api.hallConfig(hallId, rowCount, seatCount, config);
        
        alert(`Конфигурация зала "${hallName}" успешно сохранена!`);
        
        // Обновляем данные
        await loadAllData();
    } catch (error) {
        console.error('Ошибка сохранения конфигурации зала:', error);
        alert('Ошибка сохранения конфигурации зала: ' + error.message);
    }
}


// Функция для сохранения конфигурации цен
async function savePriceConfiguration() {
    const selectedHall = document.querySelector('.index-container:nth-child(3) .list-hall-num.active');
    if (!selectedHall) {
        alert('Пожалуйста, выберите зал для настройки цен');
        return;
    }

    const hallId = selectedHall.dataset.hallId;
    const hallName = selectedHall.dataset.fullName || selectedHall.textContent;
    
    // Получаем значения из правильных полей
    const basicPriceInput = document.getElementById('basic-price-input');
    const vipPriceInput = document.getElementById('vip-price-input');
    
    if (!basicPriceInput || !vipPriceInput) {
        alert('Не найдены поля для ввода цен');
        return;
    }
    
    const basicPrice = parseInt(basicPriceInput.value) || 250;
    const vipPrice = parseInt(vipPriceInput.value) || 350;

    // Валидация
    if (isNaN(basicPrice) || basicPrice <= 0) {
        alert('Введите корректную цену для обычных мест (больше 0)');
        basicPriceInput.focus();
        return;
    }
    if (isNaN(vipPrice) || vipPrice <= 0) {
        alert('Введите корректную цену для VIP мест (больше 0)');
        vipPriceInput.focus();
        return;
    }

    try {
        console.log('Сохраняем цены:', { 
            hallId, 
            hallName, 
            basicPrice, 
            vipPrice 
        });
        
        await api.hallSetPrice(hallId, basicPrice, vipPrice);
        alert(`Цены для зала "${hallName}" успешно сохранены!`);
        
        // Обновляем данные
        await loadAllData();
    } catch (error) {
        console.error('Ошибка сохранения цен:', error);
        alert('Ошибка сохранения цен: ' + error.message);
    }
}



window.addEventListener('resize', recalculateAllSessionPositions);