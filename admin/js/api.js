const API_BASE_URL = 'https://shfe-diplom.neto-server.ru';

class ApiService {
  async _request(url, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      // ПРОВЕРЯЕМ HTTP СТАТУС
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // ПРОВЕРЯЕМ success: false ОТ СЕРВЕРА
      if (!data.success) {
        throw new Error(data.error || 'Ошибка сервера');
      }

      return data.result;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Остальные методы остаются без изменений
  async getAllData() {
    return this._request('/alldata');
  }

  async login(login, password) {
    const formData = new FormData();
    formData.append('login', login);
    formData.append('password', password);

    return this._request('/login', {
      method: 'POST',
      body: formData,
    });
  }


  // Получить схему зала
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



  async hallAdd(hallName) {
    const formData = new FormData();
    formData.append('hallName', hallName);
    return this._request('/hall', { method: 'POST', body: formData });
  }

  async hallDelete(hallId) {
    return this._request(`/hall/${hallId}`, { method: 'DELETE' });
  }

  // Фильмы
  async filmAdd(filmData, posterFile) {
      const formData = new FormData();
      formData.append('filmName', filmData.name);
      formData.append('filmDuration', filmData.duration);
      formData.append('filmDescription', filmData.description || '');
      formData.append('filmOrigin', filmData.origin || '');
      
      if (posterFile) {
          formData.append('filePoster', posterFile);
      }
      
      return this._request('/film', { 
          method: 'POST', 
          body: formData 
      });
  }

  async filmDelete(filmId) {
    return this._request(`/film/${filmId}`, { method: 'DELETE' });
  }

  // Сеансы
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


window.api = new ApiService();