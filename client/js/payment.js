document.addEventListener('DOMContentLoaded', function() {
    const confirmButton = document.getElementById('confirmButton');
    const ticketData = JSON.parse(localStorage.getItem('ticketData'));
    
    if (!ticketData) {
        alert('Данные билета не найдены. Пожалуйста, начните бронирование заново.');
        window.location.href = 'index.html';
        return;
    }
    
    document.getElementById('paymentFilm').textContent = ticketData.film || 'Не указано';
    document.getElementById('paymentSeats').textContent = ticketData.seats?.replace(/,/g, ', ') || 'Не указано';
    document.getElementById('paymentHall').textContent = ticketData.hall || 'Не указано';
    document.getElementById('paymentTime').textContent = ticketData.time || 'Не указано';
    document.getElementById('paymentPrice').textContent = ticketData.price || '0';
    
    confirmButton.addEventListener('click', function() {
        window.location.href = 'ticket.html';
    });
});