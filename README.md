
# TriviaPur- Trivia App
Built a secure and gamified trivia leaderboard system where users can answer one trivia question every 6 hours to earn points. The score is updated only on correct answers and users can never manually access or modify their scores directly.

## Key Features

### User System
- Users can register and log in using a username and password.
- Authentication is handled via JWT (JSON Web Tokens).
- Users are restricted to one trivia attempt every 6 hours.

### Trivia Challenge
- The questions are fetched from The Trivia API
- If the answer is correct → +10 points added to their leaderboard score.
- Incorrect answers yield 0 points.
- Answers are submitted securely via a protected endpoint.

### Leaderboard
- Publicly accessible leaderboard showing top 10 users.
- Users cannot view or edit their scores manually.
- Scores are only updated when a correct answer is submitted.


## Tech Stack

#### Backend: Node.js + Express
#### Auth: JWT (jsonwebtoken) (stored in cookies)
#### Trivia API: The Trivia API- https://the-trivia-api.com
#### Frontend: HTML + Tailwind CSS + JS (Fetch API)
#### Database: MongoDB (for storing players data) + Redis (for storing leaderboard, ranking and user stats data)

## Live Demo
#### https://trivia-app-teal.vercel.app/
