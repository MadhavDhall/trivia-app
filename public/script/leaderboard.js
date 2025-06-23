// fetch all details from api/leaderboard and then manipulate the dom according to that 
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/leaderboard');
        const data = await response.json();

        // insert the data for rank1 
        if (data.length) {
            document.getElementById("avatar-1").innerText = data[0].username.charAt(0).toUpperCase();
            document.getElementById("username-1").innerText = data[0].username;
            document.getElementById("name-1").innerText = data[0].name;
            document.getElementById("score-1").innerText = data[0].score;
            document.getElementById("currentStreak-1").innerText = data[0].currentStreak;
            document.getElementById("accuracy-1").innerText = data[0].accuracy + "%";
        }

        // insert the data for rank2
        if (data.length > 1) {
            document.getElementById("avatar-2").innerText = data[1].username.charAt(0).toUpperCase();
            document.getElementById("username-2").innerText = data[1].username;
            document.getElementById("name-2").innerText = data[1].name;
            document.getElementById("score-2").innerText = data[1].score;
            document.getElementById("currentStreak-2").innerText = data[1].currentStreak;
            document.getElementById("accuracy-2").innerText = data[1].accuracy + "%";
        }
        // insert the data for rank3
        if (data.length > 2) {
            document.getElementById("avatar-3").innerText = data[2].username.charAt(0).toUpperCase();
            document.getElementById("username-3").innerText = data[2].username;
            document.getElementById("name-3").innerText = data[2].name;
            document.getElementById("score-3").innerText = data[2].score;
            document.getElementById("currentStreak-3").innerText = data[2].currentStreak;
            document.getElementById("accuracy-3").innerText = data[2].accuracy + "%";
        }
        // now inserting other ranks data 
        if (data.length > 3) {
            for (let i = 3; i < data.length; i++) {
                const user = data[i];

                document.getElementById("rest-leaderboard").innerHTML += `
            <div
                        class="p-8 hover:bg-gradient-to-r hover:from-slate-900/50 hover:to-slate-800/50 transition-all duration-300 group">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-6">
                                <div
                                    class="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/50 group-hover:border-purple-500/30 transition-colors">
                                    <span class="text-xl font-bold text-slate-300">#${i + 1}</span>
                                </div>
                               <div
                                    class="w-16 h-16 rounded-full border-4 border-gradient-to-r from-cyan-400 to-purple-400 shadow-xl overflow-hidden flex items-center justify-center bg-gray-800">
                                    <div id="avatar"
                                        class="flex w-full h-full items-center justify-center bg-gradient-to-br from-cyan-500 to-purple-600 text-white text-xl font-black">
                                        ${user.username.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                                <div>
                                    <h3 class="text-xl font-bold text-white mb-1">${user.name}</h3>
                                    <p class="text-slate-400">@${user.username}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-8">
                                <div class="flex items-center gap-6 text-sm">
                                    <div class="text-center">
                                        <div class="flex items-center gap-2 text-yellow-400 mb-1">
                                            <i class="fa-solid fa-bolt h-4 w-4"></i>
                                            <span class="font-bold">${user.currentStreak}</span>
                                        </div>
                                        <div class="text-slate-500 text-xs">STREAK</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="text-green-400 font-bold mb-1">${user.accuracy}%</div>
                                        <div class="text-slate-500 text-xs">ACCURACY</div>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-3xl font-black text-white mb-1">${user.score}</div>
                                    <div class="text-slate-400 text-sm">POINTS</div>
                                </div>
                            </div>
                        </div>
                    </div>
            `
            }
        }

        // now fetching other stats from /leaderboard/stats 
        try {
            const statsResponse = await fetch('/api/leaderboard/stats');
            const stats = await statsResponse.json();

            document.getElementById("totalPlayers").innerText = stats.totalPlayers;
            document.getElementById("totalQuestionsSolved").innerText = stats.totalQuestionsSolved;
            document.getElementById("highestStreakEver").innerText = stats.highestStreakEver;
            document.getElementById("averageScore").innerText = stats.averageScore;
        } catch (statsError) {
            console.error('Error fetching leaderboard stats:', statsError);
        }
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
    }
});