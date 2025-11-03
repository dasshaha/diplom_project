document.addEventListener('DOMContentLoaded', function() {
    const loginButton = document.getElementById('loginButton');
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');

    loginButton.addEventListener('click', async function(e) {
        e.preventDefault(); // Предотвращаем перезагрузку страницы

        const email = emailInput.value;
        const password = passwordInput.value;

        // Проверяем, что поля заполнены
        if (!email || !password) {
            alert('Пожалуйста, заполните все поля');
            return;
        }

        // Идет загрузка
        loginButton.textContent = 'ЗАГРУЗКА...';
        loginButton.disabled = true;

        try {
            // Вход через API
            await api.login(email, password);
            
            // Переходим в админку
            alert('Авторизация успешна!');
            window.location.href = 'index.html';
            
        } catch (error) {
            alert('Ошибка авторизации: ' + error.message);
            
            // Возвращаем кнопку в исходное состояние
            loginButton.textContent = 'АВТОРИЗОВАТЬСЯ';
            loginButton.disabled = false;
        }
    });

    // Возможность нажимать Enter для авторизации
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginButton.click();
        }
    });
});