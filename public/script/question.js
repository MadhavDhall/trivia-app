const updateProfile = (data) => {
    document.getElementById("username").innerText = data.username
    document.getElementById("avatar").innerText = data.username.charAt(0).toUpperCase();

    document.getElementById("score").innerText = data.score ? data.score : "0"
    document.getElementById("currentStreak").innerText = data.currentStreak ? data.currentStreak : "0"
    document.getElementById("highestStreak").innerText = data.highestStreak ? data.highestStreak : "0"

    const accuracyPercentage = data.accuracy ? `${data.accuracy}%` : "0%"

    document.getElementById("progessPercentage").style.width = accuracyPercentage;
    document.getElementById('accuracy').innerText = accuracyPercentage;

    document.getElementById("correctAnswer").innerHTML = data.correctAnswers ? data.correctAnswers : "0"
    document.getElementById("wrongAnswer").innerHTML = data.wrongAnswers ? data.wrongAnswers : "0"

    document.getElementById("rank").innerText = data.rank > 0 ? data.rank : "NA"
}

// when the page loads first of all make a request to /api/question to check is user is logged in and is question available
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/question', { credentials: 'same-origin' });

        const status = response.status
        const data = await response.json();

        if (status === 200) {
            // Handle the question data as needed
            console.log('Question data:', data);
            // You can update the DOM here to show the question
            document.getElementById("question").innerText = data.question
            data.options.map((value) => {
                return document.getElementById("options").outerHTML += `
            <label class="cursor-pointer">
                                    <input type="radio" name="answer" value="${value}" class="peer sr-only" required>
                                    <div
                                        class="w-full rounded-lg border border-gray-700 bg-gray-900/60 px-4 py-3 text-white transition-all duration-200 peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-purple-500 peer-checked:text-white peer-checked:border-cyan-400 hover:border-cyan-400">
                                        ${value}
                                    </div>
                                </label>
            `
            })

            const clearBtn = document.getElementById('clearSelection');
            clearBtn.addEventListener('click', () => {
                radios.forEach(radio => radio.checked = false);
                submitBtn.classList.add('hidden');
                clearBtn.classList.add('hidden');
            });

            const form = document.getElementById('triviaForm');
            const radios = form.querySelectorAll('input[type="radio"]');
            const submitBtn = document.getElementById('submitBtn');

            radios.forEach(radio => {
                radio.addEventListener('change', () => {
                    submitBtn.classList.remove('hidden');
                    clearBtn.classList.remove('hidden');
                });
            });

            updateProfile(data)
        }
        else if (status === 403) {
            // Convert server time to user's local time and display it
            const utcDate = new Date(data.canBeAttemptedAt);
            const localString = utcDate.toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                // second: '2-digit',
                // hour12: false,
                // timeZoneName: 'short'
            });
            document.getElementById("question").innerText = "You can attempt the next question after: " + localString;
            document.getElementById('triviaForm').classList.add("hidden")

            updateProfile(data)
        }
        else {
            // redirect to home page to login
            return window.location.href = '/#play';
        }
    } catch (error) {
        console.error('Error fetching question:', error);
        alert('An error occurred while fetching the question.');
    }
});

// when question is submitted send a post request to /api/question to submit the answer 
document.getElementById('triviaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const selected = form.querySelector('input[type="radio"]:checked');
    if (!selected) return;

    try {
        const response = await fetch('/api/question', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ answer: selected.value })
        });

        if (response.status === 200) {
            const data = await response.json();

            // remove the submit answer and clear selection button 
            document.getElementById('submitBtn').classList.add('hidden');
            document.getElementById('clearSelection').classList.add('hidden');

            // Highlight the correct answer
            const correctValue = data.correctAnswer;
            const options = document.querySelectorAll('input[name="answer"]');
            options.forEach(option => {
                const label = option.closest('label');
                if (option.value === correctValue) {
                    const div = label.querySelector('div');
                    div.classList.add('bg-gradient-to-r', 'from-green-500', 'to-emerald-600', 'text-gray-200');
                    div.innerHTML += `<span class="ml-2 font-bold text-white">(Correct Answer)</span>`;
                }
            });

            // if selected answer is wrong highligh just like correct one is but with red style 
            if (selected.value !== correctValue) {
                const wrongLabel = selected.closest('label');
                if (wrongLabel) {
                    const div = wrongLabel.querySelector('div');
                    wrongLabel.querySelector('input').checked = false;
                    wrongLabel.querySelector('input').disabled = true;
                    div.classList.add('bg-gradient-to-r', 'from-red-500', 'to-red-700', 'text-gray-200');
                    div.innerHTML += `<span class="ml-2 font-bold text-white">(Your Answer)</span>`;
                }
            }

            // deselect the chosen option so that new style can be applied and now disable the option selection
            // Deselect and disable all radio options after submission
            const allOptions = document.querySelectorAll('input[name="answer"]');
            allOptions.forEach(option => {
                option.checked = false;
                option.disabled = true;
            });

            const resp = await fetch('/api/question', { credentials: 'same-origin' });
            const getData = await resp.json()
            updateProfile(getData)

        } else if (response.status === 400) {
            const data = await response.json();
            alert(data.message || 'Invalid answer.');
        } else if (response.status === 401) {
            window.location.href = '/#play';
        } else {
            alert('An error occurred while submitting your answer.');
        }
    } catch (error) {
        console.error('Error submitting answer:', error);
        alert('An error occurred while submitting your answer.');
    }
});

// logout when logout button is clicked
document.getElementById("logoutBtn").onclick = async () => {
    try {
        await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
        window.location.href = '/#play';
    } catch (error) {

    }
}