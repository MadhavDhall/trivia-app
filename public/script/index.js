// function to toggle login and register tabs 
function showTab(tab) {
    document.getElementById('loginContent').classList.toggle('hidden', tab !== 'login');
    document.getElementById('registerContent').classList.toggle('hidden', tab !== 'register');
    document.getElementById('loginTab').classList.toggle('bg-gradient-to-r', tab === 'login');
    document.getElementById('loginTab').classList.toggle('from-cyan-500', tab === 'login');
    document.getElementById('loginTab').classList.toggle('to-purple-500', tab === 'login');
    document.getElementById('loginTab').classList.toggle('text-white', tab === 'login');
    document.getElementById('registerTab').classList.toggle('bg-gradient-to-r', tab === 'register');
    document.getElementById('registerTab').classList.toggle('from-cyan-500', tab === 'register');
    document.getElementById('registerTab').classList.toggle('to-purple-500', tab === 'register');
    document.getElementById('registerTab').classList.toggle('text-white', tab === 'register');
    document.getElementById('loginTab').classList.toggle('text-gray-300', tab !== 'login');
    document.getElementById('registerTab').classList.toggle('text-gray-300', tab !== 'register');
}

// when the form is filled, post data and fetch the result

// register form 
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(registerForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            // handle result (e.g., show message)
            if (response.status === 401) {
                return alert("Username already exists. Try another.")
            }
            else if (response.status === 201) {
                alert("Registration successful.")
                return window.location.href = "/question"
            }
            else {
                return alert("Server error. Try again later.")
            }
        } catch (error) {
            alert('Registration failed!');
        }
    });
}

// login form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(loginForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            // handle result (e.g., show message)
            if (response.status === 401) {
                return alert("Wrong Credentials. Try again.")
            }
            else if (response.status === 200) {
                const result = await response.json();
                return window.location.href = "/question"
            }
            else {
                return alert("Server error. Try again later.")
            }
        } catch (error) {
            alert('Login failed!');
        }
    });
}
