document.addEventListener('DOMContentLoaded', function() {

    if (typeof QRCreator === 'undefined') {
        console.error('QRCreator не загружен!');
        const qrContainer = document.getElementById('qrCodeContainer');
        qrContainer.innerHTML = `
            <div class="qr-error">
                <p>Не удалось загрузить QR-код.</p>
                <p>Номер бронирования: ${Math.random().toString(36).substr(2, 8).toUpperCase()}</p>
            </div>
        `;
        return;
    }
    
    const ticketData = JSON.parse(localStorage.getItem('ticketData'));
    if (!ticketData) {
        document.querySelector('.ticket-info').innerHTML = `
            <p class="error">Билет не найден.</p>
        `;
        return;
    }
    
    document.getElementById('ticketFilm').textContent = ticketData.film || 'Не указано';
    document.getElementById('ticketSeats').textContent = ticketData.seats?.replace(/,/g, ', ') || 'Не указано';
    document.getElementById('ticketHall').textContent = ticketData.hall || 'Не указано';
    document.getElementById('ticketTime').textContent = ticketData.time || 'Не указано';

    const qrContent = [
        `Кинотеатр: ИДЁМВКИНО`,
        `Фильм: ${ticketData.film}`,
        `Места: ${ticketData.seats}`,
        `Зал: ${ticketData.hall}`,
        `Время: ${ticketData.time}`,
        `Стоимость: ${ticketData.price} руб`
    ].join('\n');
    
    try {

        const config = {
            text: qrContent,
            mode: 4,
            eccl: 0,
            version: -1,
            image: 'SVG',
            modsize: 3,
            margin: 4
        };
        
        const qr = QRCreator(qrContent, config);
        const qrContainer = document.getElementById('qrCodeContainer');
        qrContainer.innerHTML = '';
        
        qrContainer.style.textAlign = 'center';
        qrContainer.style.padding = '0px';
        qrContainer.style.backgroundColor = '#fff';
        qrContainer.style.borderRadius = '5px';
        qrContainer.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
        qrContainer.style.margin = '30px auto';
        qrContainer.style.maxWidth = '250px';
        
        if (qr.result) {
            if (qr.result instanceof HTMLCanvasElement) {
                qrContainer.appendChild(qr.result);
                qr.result.style.display = 'block';
                qr.result.style.margin = '0 auto';
                qr.result.style.width = '100%';
                qr.result.style.height = 'auto';
                qr.result.style.maxWidth = '200px';
            } 

            else if (qr.result instanceof SVGElement) {
                qrContainer.appendChild(qr.result);
                qr.result.style.width = '100%';
                qr.result.style.height = 'auto';
                qr.result.style.maxWidth = '200px';
            } 

            else if (qr.result instanceof HTMLElement) {
                qrContainer.appendChild(qr.result);
            }
        } else {
            throw new Error('Не удалось сгенерировать QR-код');
        }
    } catch (error) {
        console.error('Ошибка генерации QR-кода:', error);
        const qrContainer = document.getElementById('qrCodeContainer');
        qrContainer.innerHTML = `
            <div class="qr-error">
                <p>Ошибка генерации QR-кода</p>
                <p>${error.message}</p>
                <p>Номер бронирования: ${Math.random().toString(36).substr(2, 8).toUpperCase()}</p>
            </div>
        `;
    }
});