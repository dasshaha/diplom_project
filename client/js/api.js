const API_BASE_URL = 'https://shfe-diplom.neto-server.ru';

class ApiService {
  
  // Главный метод для всех запросов
  async _request(url, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Ошибка сервера');
      }

      return data.result;
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка: ' + error.message);
      throw error;
    }
  }

  // ======= ОСНОВНЫЕ МЕТОДЫ =======

  // Получить все данные (залы, фильмы, сеансы)
  async getAllData() {
    return this._request('/alldata');
  }

  // Войти в админку
  async login(login, password) {
    const formData = new FormData();
    formData.append('login', login);
    formData.append('password', password);

    return this._request('/login', {
      method: 'POST',
      body: formData,
    });
  }

  // Получить схему зала для сеанса
  async getHallConfig(seanceId, date) {
    const params = new URLSearchParams({ seanceId, date });
    return this._request(`/hallconfig?${params}`);
  }

  // Купить билеты
  async buyTickets(seanceId, ticketDate, tickets) {
    const formData = new FormData();
    formData.append('seanceId', seanceId);
    formData.append('ticketDate', ticketDate);
    formData.append('tickets', JSON.stringify(tickets));

    return this._request('/ticket', {
      method: 'POST',
      body: formData,
    });
  }

  // ======= МЕТОДЫ ДЛЯ АДМИНКИ (ЗАЛЫ) =======

  async hallAdd(hallName) {
    const formData = new FormData();
    formData.append('hallName', hallName);
    return this._request('/hall', { method: 'POST', body: formData });
  }

  async hallDelete(hallId) {
    return this._request(`/hall/${hallId}`, { method: 'DELETE' });
  }

  async hallConfig(hallId, rowCount, placeCount, config) {
    const formData = new FormData();
    formData.append('rowCount', rowCount);
    formData.append('placeCount', placeCount);
    formData.append('config', JSON.stringify(config));
    return this._request(`/hall/${hallId}`, { method: 'POST', body: formData });
  }

  async hallSetPrice(hallId, priceStandart, priceVip) {
    const formData = new FormData();
    formData.append('priceStandart', priceStandart);
    formData.append('priceVip', priceVip);
    return this._request(`/price/${hallId}`, { method: 'POST', body: formData });
  }

  async hallSetOpen(hallId, hallOpen) {
    const formData = new FormData();
    formData.append('hallOpen', hallOpen);
    return this._request(`/open/${hallId}`, { method: 'POST', body: formData });
  }

  // ======= МЕТОДЫ ДЛЯ АДМИНКИ (ФИЛЬМЫ) =======

  async filmAdd(filmData, posterFile) {
    const formData = new FormData();
    formData.append('filmName', filmData.name);
    formData.append('filmDuration', filmData.duration);
    formData.append('filmDescription', filmData.description);
    formData.append('filmOrigin', filmData.origin);
    formData.append('filePoster', posterFile);
    return this._request('/film', { method: 'POST', body: formData });
  }

  async filmDelete(filmId) {
    return this._request(`/film/${filmId}`, { method: 'DELETE' });
  }

  // ======= МЕТОДЫ ДЛЯ АДМИНКИ (СЕАНСЫ) =======

  async seanceAdd(seanceHallid, seanceFilmid, seanceTime) {
    const formData = new FormData();
    formData.append('seanceHallid', seanceHallid);
    formData.append('seanceFilmid', seanceFilmid);
    formData.append('seanceTime', seanceTime);
    return this._request('/seance', { method: 'POST', body: formData });
  }

  async seanceDelete(seanceId) {
    return this._request(`/seance/${seanceId}`, { method: 'DELETE' });
  }
}

// Глобальный объект api
window.api = new ApiService();