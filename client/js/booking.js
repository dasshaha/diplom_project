document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const film = urlParams.get('film') || 'Фильм не указан';
    const time = urlParams.get('time') || 'Время не указано';
    const hall = urlParams.get('hall') || 'Зал не указан';

    document.querySelector('.movie__title').textContent = decodeURIComponent(film);
    document.querySelector('.movie__start').textContent = `Начало сеанса: ${decodeURIComponent(time)}`;
    document.querySelector('.movie__hall').textContent = `Зал ${decodeURIComponent(hall)}`;

    // Инициализация номеров мест
    document.querySelectorAll('[class^="seat-row-"]').forEach(row => {
        const rowNumber = row.className.match(/seat-row-(\d+)/)[1];
        const seats = row.querySelectorAll('.seat');
        seats.forEach((seat, index) => {
            seat.dataset.originalNumber = seat.textContent;
            seat.dataset.displayNumber = `${rowNumber}-${index + 1}`;
            seat.textContent = seat.dataset.originalNumber;
        });
    });

    const seats = document.querySelectorAll('.seat');
    const bookButton = document.getElementById('bookButton');

    // ОДИН обработчик для всех мест
    seats.forEach(seat => {
        seat.addEventListener('click', function() {
            // ПРОВЕРКА НА ЗАНЯТЫЕ МЕСТА
            if (!this.classList.contains('occupied')) {
                this.classList.toggle('selected');
                updateBookButton();
            }
        });
    });

    function updateBookButton() {
        const selectedSeats = document.querySelectorAll('.seat.selected');
        bookButton.disabled = selectedSeats.length === 0;
        
        if (selectedSeats.length > 0) {
            const totalPrice = Array.from(selectedSeats).reduce((sum, seat) => 
                sum + parseInt(seat.dataset.price), 0);
            console.log(`Выбрано мест: ${selectedSeats.length}, Сумма: ${totalPrice} руб`);
        }
    }


    bookButton.addEventListener('click', function() {
        const selectedSeats = Array.from(document.querySelectorAll('.seat.selected'));
        
        if (selectedSeats.length === 0) {
            alert('Пожалуйста, выберите места');
            return;
        }
        
        const seatsNumbers = selectedSeats.map(seat => {
            const row = seat.closest('[class^="seat-row-"]').className.match(/seat-row-(\d+)/)[1];
            const seatNum = seat.textContent.trim();
            return `${row}-${seatNum}`;
        }).join(', ');
        
        const totalPrice = selectedSeats.reduce((sum, seat) => 
            sum + parseInt(seat.dataset.price || 250), 0);

        const ticketData = {
            film: decodeURIComponent(film),
            seats: seatsNumbers,
            hall: decodeURIComponent(hall),
            time: decodeURIComponent(time),
            price: totalPrice,
            timestamp: Date.now()
        };
        
        console.log('Сохранение данных билета:', ticketData);
        localStorage.setItem('ticketData', JSON.stringify(ticketData));
        
        const savedData = localStorage.getItem('ticketData');
        if (savedData) {
            window.location.href = 'payment.html';
        } else {
            alert('Ошибка сохранения данных');
        }
    });

    // Инициализация кнопки
    updateBookButton();
});