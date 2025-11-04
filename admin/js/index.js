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

function safeConfirm(message) {
  if (globalClickLock) return false;
  globalClickLock = true;
  const result = confirm(message);
  setTimeout(() => { globalClickLock = false; }, 500);
  return result;
}

function safeAlert(message) {
  if (globalClickLock) return;
  globalClickLock = true;
  alert(message);
  setTimeout(() => { globalClickLock = false; }, 500);
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

  // Инициализируем обработчики после обновления данных
  initHallsHandlers();
  
  // Переинициализируем перетаскивание
  initDragAndDropForNewElements();
}




// Функция для повторной инициализации перетаскивания после обновления данных
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
            console.log('Завершено перетаскивание');
        });
    });

    // Обработчики для зон перетаскивания
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drag-over');
            e.dataTransfer.dropEffect = 'copy';
        });

        zone.addEventListener('dragleave', function() {
            this.classList.remove('drag-over');
        });

        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            
            if (draggedFilm) {
                console.log('Фильм перетащен в зону:', this.dataset.hall);
                showTimeInput(this, draggedFilm);
            }
        });
    });




    // Обработчики для удаления сеансов перетаскиванием
    const addedSessions = document.querySelectorAll('.added-session');
    addedSessions.forEach(session => {
        session.setAttribute('draggable', 'true');
        
        session.addEventListener('dragstart', function(e) {
            this.classList.add('dragging');
            e.dataTransfer.setData('text/plain', this.dataset.seanceId);
            e.dataTransfer.effectAllowed = 'move';
        });
        
        session.addEventListener('dragend', function() {
            this.classList.remove('dragging');
        });
    });

    // Зона удаления (вся область вне drop-zone)
    document.addEventListener('dragover', function(e) {
        if (!e.target.closest('.drop-zone')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }
    });

    document.addEventListener('drop', function(e) {
        if (!e.target.closest('.drop-zone')) {
            e.preventDefault();
            const seanceId = e.dataTransfer.getData('text/plain');
            if (seanceId) {
                const sessionElement = document.querySelector(`[data-seance-id="${seanceId}"]`);
                if (sessionElement && safeConfirm('Удалить этот сеанс?')) {
                    deleteSeance(seanceId, sessionElement);
                }
            }
        }
    });


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
    
    // Заполняем попап данными
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
    
    // Показываем попап
    openPopup('addSeansPopup');
    
    // Фокус на поле времени
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
            <div class="num-hall-container drop-zone" data-hall="${hall.id}">
                
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
        
        const timeInputContainer = dropZone.querySelector('.time-input-container');
        dropZone.innerHTML = '';
        if (timeInputContainer) {
            dropZone.appendChild(timeInputContainer);
        }
        
        // Находим сеансы для этого зала и сортируем по времени
        const hallSeances = appData.seances.filter(seance => 
            seance.seance_hallid === hallId
        ).sort((a, b) => {
            // Сортируем по времени (формат "HH:MM")
            return a.seance_time.localeCompare(b.seance_time);
        });
        
        // Добавляем отсортированные сеансы в зал
        hallSeances.forEach(seance => {
            const film = appData.films.find(f => f.id === seance.seance_filmid);
            if (film) {
                addSessionToTimeline(dropZone, film, seance.seance_time, seance.id);
            }
        });
        
        updateEmptyState(dropZone);
    });
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



// Вспомогательная функция для добавления сеанса в таймлайн
function addSessionToTimeline(dropZone, film, time, seanceId = null) {
    const sessionElement = document.createElement('div');
    sessionElement.className = 'added-session';
    sessionElement.dataset.filmId = film.id;
    sessionElement.dataset.hallId = dropZone.dataset.hall;
    sessionElement.dataset.time = time;
    if (seanceId) {
        sessionElement.dataset.seanceId = seanceId;
    }

    const shortFilmName = film.film_name.length > 20 ? 
        film.film_name.substring(0, 20) + '...' : film.film_name;
    
    sessionElement.innerHTML = `
        <div class="film-name">${shortFilmName}</div>
        <div class="session-time">${time}</div>
        <button class="remove-session" title="Удалить сеанс">×</button>
    `;

    const removeBtn = sessionElement.querySelector('.remove-session');
    removeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (seanceId) {
            deleteSeance(seanceId, sessionElement);
        } else {
            sessionElement.remove();
            updateEmptyState(dropZone);
        }
    });

    dropZone.appendChild(sessionElement);
    updateEmptyState(dropZone);
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
  
  // ОДНО подтверждение вместо нескольких
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
    if (safeConfirm('Удалить этот сеанс?')) {
        try {
            await api.seanceDelete(seanceId);
            sessionElement.remove();
            await loadAllData(); // Перезагружаем данные
        } catch (error) {
            alert('Ошибка удаления сеанса: ' + error.message);
        }
    }
}





// Обработчики для залов и фильмов
function initHallsHandlers() {
  let isProcessing = false; // Защита от множественных кликов
  
  // Обработчик для кнопки "СОЗДАТЬ ЗАЛ"
  const createHallBtn = document.querySelector('[data-popup="addHallPopup"]');
  if (createHallBtn) {
    createHallBtn.addEventListener('click', function() {
      openPopup('addHallPopup');
    });
  }

  // Обработчик для кнопки "ДОБАВИТЬ ЗАЛ" в попапе
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

  // ОБЩИЙ обработчик для удаления залов и фильмов (делегирование событий)
  window.globalClickHandler = function(e) {
    // Защита от множественных кликов
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
  initSalesManagement(); 


  // Конфигурация залов
  const hallNumbers = document.querySelectorAll('.list-hall-num');
  const seats = document.querySelectorAll('.seat');
  
  // Управление сеансами
  const trashIcons = document.querySelectorAll('.mysorka-box');

  // Popup элементы
  const popupOverlays = document.querySelectorAll('.popup-overlay');
  const closeButtons = document.querySelectorAll('.krestic');


  // Обработчики для кнопок сохранения сеансов
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
              loadAllData(); // Перезагружаем исходные данные
          }
      });
  }


  // Инициализация конфигурации залов
  initHallConfiguration();

  // Инициализация управления сеансами
  initSessionManagement();

  // Инициализация popup окон
  initPopupWindows();


  function initHallConfiguration() {
    // Обработчики для выбора зала
    hallNumbers.forEach(hall => {
      hall.addEventListener('click', function() {
        selectHall(this);
      });
    });

    // Обработчики для мест
    seats.forEach(seat => {
      seat.addEventListener('click', function() {
        changeSeatType(this);
      });
    });

    // Обработчики для кнопок в каждой секции
    document.querySelectorAll('.index-container').forEach(container => {
      const saveBtn = container.querySelector('.index-button:not([data-popup])');
      const cancelBtn = container.querySelector('.index-button-no');
      
      if (saveBtn) {
        saveBtn.addEventListener('click', function() {
          const hallContainer = this.closest('.index-container');
          saveConfiguration(hallContainer);
        });
      }
      
      if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelChanges);
      }
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

    // Закрытие popup при клике на overlay
    popupOverlays.forEach(overlay => {
      overlay.addEventListener('click', function(e) {
        if (e.target === this) {
          closeAllPopups();
        }
      });
    });

    // Закрытие popup при нажатии Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeAllPopups();
      }
    });

    // Обработчики для кнопок "Отмена" внутри popup
    document.querySelectorAll('.addhall-button.no, .addfilm-button.no, .addseans-button.no').forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        closeAllPopups();
      });
    });


    // Обработчики для кнопок сохранения внутри popup
    document.querySelectorAll('.addhall-button:not(.no), .addfilm-button:not(.no), .addseans-button:not(.no)').forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        // Логика сохранения данных из формы
        console.log('Сохранение данных из popup:', this.textContent);
        closeAllPopups();
      });
    });
  }



  function saveAllSessions() {
    const sessions = [];
    const dropZones = document.querySelectorAll('.drop-zone');

    dropZones.forEach(zone => {
      const hallId = zone.dataset.hall;
      const sessionElements = zone.querySelectorAll('.added-session');

      sessionElements.forEach(session => {
        sessions.push({
          hallId: hallId,
          filmId: session.dataset.filmId,
          filmName: session.querySelector('.film-name').textContent,
          time: session.dataset.time
        });
      });
    });

    console.log('Сохраненные сеансы:', sessions);
    alert('Сетка сеансов успешно сохранена!');
  }

  function cancelAllSessions() {
    if (confirm('Отменить все изменения в сетке сеансов?')) {
      const sessions = document.querySelectorAll('.added-session');
      sessions.forEach(session => session.remove());
      
      const dropZones = document.querySelectorAll('.drop-zone');
      dropZones.forEach(zone => {
        zone.classList.add('empty');
      });
      
      console.log('Все сеансы удалены');
    }
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



  function saveConfiguration(hallContainer) {
    const selectedHall = hallContainer.querySelector('.list-hall-num.active');
    if (!selectedHall) {
      alert('Пожалуйста, выберите зал для конфигурации');
      return;
    }

    const configuration = {
      hall: selectedHall.textContent,
      seats: []
    };

    const hallSeats = hallContainer.querySelectorAll('.seat');
    hallSeats.forEach(seat => {
      configuration.seats.push({
        type: getCurrentSeatType(seat),
        price: seat.dataset.price || '0',
        number: seat.textContent,
        row: seat.parentElement.className.replace('seat-row-', '')
      });
    });

    console.log('Конфигурация сохранена:', configuration);
    alert('Конфигурация успешно сохранена!');
  }

  function cancelChanges() {
    if (confirm('Отменить все изменения?')) {
      seats.forEach(seat => {
        seat.classList.remove('vip', 'blocked');
        seat.classList.add('free');
        seat.dataset.price = '250';
      });
      console.log('Изменения отменены');
    }
  }
  
});  




// Функция для обновления схемы зала
function updateHallLayout(rows, seatsPerRow) {
    const seatsGrid = document.querySelector('.seats-grid');
    if (!seatsGrid) return;
    
    seatsGrid.innerHTML = '';
    
    for (let row = 1; row <= rows; row++) {
        const rowElement = document.createElement('div');
        rowElement.className = `seat-row-${row}`;
        
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
}

// Обработчики для ввода рядов и мест
document.addEventListener('DOMContentLoaded', function() {
    const rowInput = document.getElementById('row-count');
    const seatInput = document.getElementById('seat-count');
    
    if (rowInput && seatInput) {
        rowInput.addEventListener('change', updateHallLayoutFromInputs);
        seatInput.addEventListener('change', updateHallLayoutFromInputs);
    }
});

function updateHallLayoutFromInputs() {
    const rows = parseInt(document.getElementById('row-count').value) || 10;
    const seatsPerRow = parseInt(document.getElementById('seat-count').value) || 8;
    updateHallLayout(rows, seatsPerRow);
}




// Функция для настройки цен
function initPriceConfiguration() {
    const priceInputs = document.querySelectorAll('.make-price .info-value');
    const savePriceBtn = document.querySelector('.index-button'); // Первая кнопка сохранения в разделе цен
    
    if (savePriceBtn) {
        savePriceBtn.addEventListener('click', function() {
            const basicPrice = priceInputs[0]?.value || '250';
            const vipPrice = priceInputs[1]?.value || '350';
            
            // Обновляем цены на всех местах
            document.querySelectorAll('.seat').forEach(seat => {
                if (seat.classList.contains('vip')) {
                    seat.dataset.price = vipPrice;
                } else if (seat.classList.contains('free')) {
                    seat.dataset.price = basicPrice;
                }
            });
            
            alert(`Цены обновлены: обычные - ${basicPrice}р, VIP - ${vipPrice}р`);
        });
    }
}



// Функция для управления продажами
function initSalesManagement() {
    const openSalesBtn = document.querySelector('[data-popup="addSeansPopup"]');
    
    if (openSalesBtn) {
        openSalesBtn.addEventListener('click', function() {
            const selectedHall = document.querySelector('.list-hall-num.active');
            if (!selectedHall) {
                alert('Выберите зал для открытия продаж');
                return;
            }
            
            const hallName = selectedHall.textContent;
            if (confirm(`Открыть продажи билетов для ${hallName}?`)) {
                alert(`Продажи билетов для ${hallName} открыты!`);
                this.textContent = 'ПРИОСТАНОВИТЬ ПРОДАЖУ БИЛЕТОВ';

                this.removeEventListener('click', arguments.callee);
                this.addEventListener('click', function() {
                    if (confirm(`Приостановить продажи билетов для ${hallName}?`)) {
                        alert(`Продажи билетов для ${hallName} приостановлены!`);
                        this.textContent = 'ОТКРЫТЬ ПРОДАЖУ БИЛЕТОВ';
                    }
                });
            }
        });
    }
}

