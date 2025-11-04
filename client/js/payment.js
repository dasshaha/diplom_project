// payment.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
document.addEventListener('DOMContentLoaded', function() {
    const confirmButton = document.getElementById('confirmButton');
    
    // ПРОВЕРКА ДАННЫХ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
    let ticketData;
    try {
        const savedData = localStorage.getItem('ticketData');
        if (!savedData) {
            throw new Error('Данные не найдены в localStorage');
        }
        
        ticketData = JSON.parse(savedData);
        console.log('Загруженные данные билета:', ticketData);
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showError('Данные билета не найдены. Пожалуйста, начните бронирование заново.');
        return;
    }
    
    // ЗАПОЛНЕНИЕ ФОРМЫ
    document.getElementById('paymentFilm').textContent = ticketData.film || 'Не указано';
    document.getElementById('paymentSeats').textContent = ticketData.seats?.replace(/,/g, ', ') || 'Не указано';
    document.getElementById('paymentHall').textContent = ticketData.hall || 'Не указано';
    document.getElementById('paymentTime').textContent = ticketData.time || 'Не указано';
    document.getElementById('paymentPrice').textContent = ticketData.price || '0';
    
    confirmButton.addEventListener('click', function() {
        // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА
        if (!ticketData || !ticketData.seats) {
            showError('Ошибка данных билета');
            return;
        }
        
        window.location.href = 'ticket.html';
    });
    
    function showError(message) {
        const container = document.querySelector('.payment-container');
        container.innerHTML = `
            <div class="error-message">
                <h2>Ошибка</h2>
                <p>${message}</p>
                <button onclick="window.location.href='index.html'">Вернуться к расписанию</button>
            </div>
        `;
    }
});