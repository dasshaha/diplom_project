document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const seanceId = urlParams.get('seanceId');
    const film = urlParams.get('film') || 'Фильм не указан';
    const time = urlParams.get('time') || 'Время не указано';
    const hall = urlParams.get('hall') || 'Зал не указан';
    const hallId = urlParams.get('hallId');


    document.getElementById('movieTitle').textContent = `Фильм: ${decodeURIComponent(film)}`;
    document.getElementById('movieStart').textContent = `Начало сеанса: ${decodeURIComponent(time)}`;
    document.getElementById('movieHall').textContent = `Зал: ${decodeURIComponent(hall)}`;

    const seatsGrid = document.querySelector('.seats-grid');
    const bookButton = document.getElementById('bookButton');
    let selectedSeats = [];

    let allData = null;
    try {
        allData = await api.getAllData();
        console.log('Все данные загружены:', allData);
        

        console.log('Все залы из API:', allData.halls);
        if (allData.halls && allData.halls.length > 0) {
            allData.halls.forEach((h, i) => {
                console.log(`Зал ${i}:`, h);
                console.log(`Поля зала ${h.hall_name}:`, Object.keys(h));
                console.log(`Цены зала ${h.hall_name}: standart=${h.price_standart}, vip=${h.price_vip}`);
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        alert('Ошибка загрузки данных. Пожалуйста, обновите страницу.');
    }


    let hallData = null;
    let standartPrice = 250;
    let vipPrice = 350;
    
    if (allData && allData.halls && hallId) {
        // Преобразуем hallId в число для сравнения
        const targetHallId = parseInt(hallId);
        
        // Ищем зал по ID
        hallData = allData.halls.find(h => h.id === targetHallId);
        
        if (hallData) {
            console.log('НАЙДЕННЫЙ ЗАЛ:', hallData);
            console.log('Все поля зала:', Object.keys(hallData));
            

            standartPrice = hallData.price_standart || 
                           hallData.priceStandart || 
                           hallData.standart_price || 
                           hallData.basicPrice || 
                           250;
            
            vipPrice = hallData.vipPrice || 
                      hallData.priceVip || 
                      hallData.vip_price || 
                      350;
            
            console.log(`Установлены цены: обычные=${standartPrice}, VIP=${vipPrice}`);
        } else {
            console.warn(`Зал с ID ${hallId} не найден. Используем цены по умолчанию.`);
            console.warn('Доступные залы:', allData.halls.map(h => ({id: h.id, name: h.hall_name})));
        }
    } else {
        console.warn('Нет данных залов или hallId. Используем цены по умолчанию.');
    }

    // Обновляем легенду с реальными ценами
    updateLegend(standartPrice, vipPrice);


    if (!seanceId) {
        console.error('seanceId не передан в URL параметрах');
        seatsGrid.innerHTML = '<p class="error">Ошибка: не указан сеанс</p>';
        return;
    }

    try {
        const today = new Date().toISOString().split('T')[0];
        
        console.log('Загружаем конфигурацию зала:', {seanceId, date: today});
        const hallConfig = await api.getHallConfig(seanceId, today);
        console.log('Полученная конфигурация зала:', hallConfig);

        if (!hallConfig || !Array.isArray(hallConfig)) {
            throw new Error('Некорректная конфигурация зала');
        }

        // Передаем цены в функцию создания мест
        createSeatsLayout(hallConfig, seatsGrid, standartPrice, vipPrice);
        
    } catch (error) {
        console.error('Ошибка загрузки конфигурации зала:', error);
        seatsGrid.innerHTML = '<p class="error">Ошибка загрузки схемы зала: ' + error.message + '</p>';
    }

    function updateLegend(standartPrice, vipPrice) {
        // Обновляем легенду
        const legendStandard = document.getElementById('legendStandard');
        const legendVip = document.getElementById('legendVip');
        
        if (legendStandard) {
            legendStandard.textContent = `Свободно (${standartPrice}руб)`;
        }
        if (legendVip) {
            legendVip.textContent = `Свободно VIP (${vipPrice}руб)`;
        }
    }

    function createSeatsLayout(hallConfig, container, standartPrice, vipPrice) {
        container.innerHTML = '';
        
        hallConfig.forEach((row, rowIndex) => {
            const rowElement = document.createElement('div');
            rowElement.className = 'seat-row';
            
            row.forEach((seatType, seatIndex) => {
                if (seatType === 'disabled') {
                    return;
                }
                
                const seat = document.createElement('div');
                seat.className = `seat ${seatType === 'vip' ? 'vip' : 'free'}`;
                seat.dataset.row = rowIndex + 1;
                seat.dataset.seat = seatIndex + 1;
                seat.dataset.type = seatType;
                
                // Устанавливаем цену в зависимости от типа места
                if (seatType === 'vip') {
                    seat.dataset.price = vipPrice;
                } else if (seatType === 'standart' || seatType === 'free') {
                    seat.dataset.price = standartPrice;
                }
                
                seat.textContent = seatIndex + 1;
                
                seat.addEventListener('click', function() {
                    handleSeatClick(this);
                });
                
                rowElement.appendChild(seat);
            });
            
            container.appendChild(rowElement);
        });
    }

    function handleSeatClick(seat) {
        const seatId = `${seat.dataset.row}-${seat.dataset.seat}`;
        
        if (seat.classList.contains('selected')) {
            seat.classList.remove('selected');
            selectedSeats = selectedSeats.filter(s => s.id !== seatId);
        } else {
            seat.classList.add('selected');
            selectedSeats.push({
                id: seatId,
                row: seat.dataset.row,
                seat: seat.dataset.seat,
                type: seat.dataset.type,
                price: parseInt(seat.dataset.price) || 250
            });
        }
        
        updateBookButton();
    }

    function updateBookButton() {
        bookButton.disabled = selectedSeats.length === 0;
        
        if (selectedSeats.length > 0) {
            const totalPrice = selectedSeats.reduce((sum, seat) => sum + (seat.price || 250), 0);
            console.log(`Выбрано мест: ${selectedSeats.length}, Сумма: ${totalPrice} руб`);
            
            bookButton.textContent = `ЗАБРОНИРОВАТЬ (${totalPrice} руб)`;
        } else {
            bookButton.textContent = 'ЗАБРОНИРОВАТЬ';
        }
    }

    bookButton.addEventListener('click', async function() {
        if (selectedSeats.length === 0) {
            alert('Пожалуйста, выберите места');
            return;
        }
        
        const totalPrice = selectedSeats.reduce((sum, seat) => sum + (seat.price || 250), 0);
        const seatsNumbers = selectedSeats.map(seat => seat.id).join(', ');

        const ticketData = {
            seanceId: seanceId,
            film: decodeURIComponent(film),
            seats: seatsNumbers,
            hall: decodeURIComponent(hall),
            hallId: hallId,
            time: decodeURIComponent(time),
            price: totalPrice,
            selectedSeats: selectedSeats,
            standartPrice: standartPrice,
            vipPrice: vipPrice,
            timestamp: Date.now()
        };
        
        console.log('Сохранение данных билета:', ticketData);
        localStorage.setItem('ticketData', JSON.stringify(ticketData));
        
        window.location.href = 'payment.html';
    });

    updateBookButton();
});