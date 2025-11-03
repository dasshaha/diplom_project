document.addEventListener('DOMContentLoaded', function() {

    const savedDay = localStorage.getItem('activeDay') || 'today';
    
    document.querySelector(`.schedule__day[data-day="${savedDay}"]`)?.classList.add('active');

    document.querySelectorAll('.schedule__day__num').forEach(day => {
        day.addEventListener('click', function(e) {
            e.preventDefault();

            

            const dayBlock = this.closest('.schedule__day');
            const dayId = dayBlock.dataset.day;
            
            localStorage.setItem('activeDay', dayId);
            
            document.querySelectorAll('.schedule__day').forEach(d => {
                d.classList.remove('active');
            });
            dayBlock.classList.add('active');

            loadDayContent(dayId);
        });
    });
    
    function loadDayContent(dayId) {
        console.log(`Загружаем контент для дня: ${dayId}`);
    }


});


async function loadSchedule(date) {
  try {
    const data = await api.getAllData();
    // Обновить расписание на странице
    updateScheduleUI(data.seances, data.films);
  } catch (error) {
    console.error('Ошибка загрузки расписания:', error);
  }
}
