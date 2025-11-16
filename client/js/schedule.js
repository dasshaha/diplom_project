document.addEventListener('DOMContentLoaded', function() {
    loadScheduleData();
});

async function loadScheduleData() {
    try {
        console.log('Загружаем расписание с сервера...');
        
        // Получаем все данные с сервера
        const data = await api.getAllData();
        
        // Очищаем текущий контент
        const main = document.querySelector('main');
        const scheduleNav = document.querySelector('.schedule');
        main.innerHTML = '';
        main.appendChild(scheduleNav);
        
        // Группируем сеансы по фильмам
        const moviesWithSeances = groupSeancesByMovie(data);
        
        // Создаем элементы фильмов
        moviesWithSeances.forEach(movieData => {
            createMovieElement(movieData);
        });
        
        console.log('Расписание успешно загружено');
        
    } catch (error) {
        console.error('Ошибка загрузки расписания:', error);
        showFallbackContent();
    }
}

function groupSeancesByMovie(data) {
    const moviesMap = new Map();
    
    // Группируем сеансы по фильмам
    data.seances.forEach(seance => {
        const film = data.films.find(f => f.id === seance.seance_filmid);
        const hall = data.halls.find(h => h.id === seance.seance_hallid);
        
        if (film && hall) {
            if (!moviesMap.has(film.id)) {
                moviesMap.set(film.id, {
                    film: film,
                    halls: new Map()
                });
            }
            
            const movieData = moviesMap.get(film.id);
            if (!movieData.halls.has(hall.id)) {
                movieData.halls.set(hall.id, {
                    hall: hall,
                    seances: []
                });
            }
            
            movieData.halls.get(hall.id).seances.push(seance);
        }
    });
    
    return Array.from(moviesMap.values()).map(movieData => ({
        film: movieData.film,
        halls: Array.from(movieData.halls.values()).map(hallData => ({
            hall: hallData.hall,
            seances: hallData.seances.sort((a, b) => a.seance_time.localeCompare(b.seance_time))
        }))
    }));
}

function createMovieElement(movieData) {
    const movieElement = document.createElement('article');
    movieElement.className = 'movie';
    
    const { film, halls } = movieData;
    
    movieElement.innerHTML = `
        <img src="${film.film_poster}" alt="${film.film_name}" class="movie__poster" onerror="this.src='./img/poster.png'">
        <div class="movie__content">
            <h2 class="movie__title">${film.film_name}</h2>
            <p class="movie__description">${film.film_description || 'Описание отсутствует'}</p>
            <p class="movie__info">${film.film_duration} минут, ${film.film_origin || 'Не указана'}</p>  
        </div>
        <div class="movie__halls">
            ${halls.map(hallData => createHallElement(hallData, film)).join('')}
        </div>
    `;
    
    document.querySelector('main').appendChild(movieElement);
}


function createHallElement(hallData, film) {
    const { hall, seances } = hallData;
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                       now.getMinutes().toString().padStart(2, '0');

    return `
        <div class="hall">
            <h3 class="hall__title">${hall.hall_name}</h3>
            <ul class="hall__times">
                ${seances.map(seance => {
                    const seanceTime = formatTime(seance.seance_time);
                    const isPast = seanceTime < currentTime;
                    
                    if (isPast) {
                        // Прошедший сеанс - неактивная кнопка
                        return `
                            <li>
                                <span class="hall__time hall__time--past">
                                    ${seanceTime}
                                </span>
                            </li>
                        `;
                    } else {
                        // Будущий сеанс - активная ссылка
                        return `
                            <li>
                                <a href="booking.html?seanceId=${seance.id}&film=${encodeURIComponent(film.film_name)}&time=${seance.seance_time}&hall=${hall.hall_name}" 
                                   class="hall__time">
                                    ${seanceTime}
                                </a>
                            </li>
                        `;
                    }
                }).join('')}
            </ul>
        </div>
    `;
}


function formatTime(timeString) {
    return timeString.length > 5 ? timeString.substring(0, 5) : timeString;
}

function showFallbackContent() {
    const main = document.querySelector('main');
    const fallbackHTML = `
        <div style="text-align: center; padding: 40px; color: white;">
            <h2>Временно недоступно</h2>
            <p>Расписание сеансов временно недоступно. Пожалуйста, попробуйте позже.</p>
        </div>
    `;
    
    const scheduleNav = document.querySelector('.schedule');
    main.innerHTML = '';
    main.appendChild(scheduleNav);
    main.insertAdjacentHTML('beforeend', fallbackHTML);
}