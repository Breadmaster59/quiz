console.log("load");

let quizData = [];
let shuffledQuizData = [];
let currentQuestion = 0;
let correctAnswers = 0;
let wrongAnswers = [];
let isEditingQuestions = false;


// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getDatabase, ref, push, onValue, set, remove } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js";


// Firebase config and initialization
const firebaseConfig = {
  apiKey: "AIzaSyCe0p8slJ9fIj0xX7jBXKQ9TdGCaWUXG0g",
  authDomain: "quizquestionstorage.firebaseapp.com",
  projectId: "quizquestionstorage",
  storageBucket: "quizquestionstorage.appspot.com",
  messagingSenderId: "449470008189",
  appId: "1:449470008189:web:695d9c2c09bda45f0f1a14",
  databaseURL: "https://quizquestionstorage-default-rtdb.europe-west1.firebasedatabase.app" // Updated to the correct region
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);  // Initialize the Realtime Database
console.log("Firebase app and database initialized");

// Function to add a new question to Firebase
function addNewQuestionToFirebase(newQuizItem) {
    console.log("Adding new question to Firebase:", newQuizItem);
    const quizDataRef = ref(db, 'quizData');
    push(quizDataRef, newQuizItem)
        .then(() => console.log("New question successfully added to Firebase"))
        .catch(error => console.error("Error adding question to Firebase:", error));
}

// Function to load quiz data from Firebase and display the menu after loading
function loadQuizDataFromFirebase() {
    console.log("Loading quiz data from Firebase...");
    const quizDataRef = ref(db, 'quizData');
    onValue(quizDataRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            quizData = [];
            for (let key in data) {
                quizData.push({
                    key: key,
                    ...data[key]
                });
            }
            shuffledQuizData = shuffle([...quizData]);
            console.log("Quiz data loaded:", quizData);  // Debug: log the loaded quiz data
        } else {
            console.log("No quiz data found in Firebase.");
            quizData = []; // Ensure quizData is empty if no data is found
        }
        // Display the appropriate view after data is loaded
        if (isEditingQuestions) {
            displayEditQuestions();
        } else {
            displayMenu();
        }
    });
}


// Function to shuffle an array (Fisher-Yates shuffle algorithm)
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
}

// Load the quiz data from Firebase when the page loads
console.log("Initializing app...");
loadQuizDataFromFirebase();

function loadQuiz() {
    console.log("Loading quiz question...");
    const questionEl = document.getElementById('question');
    const choiceButtons = document.querySelectorAll('.choice');

    // Clear the next button container before loading a new question
    document.getElementById('next-btn-container').innerHTML = "";

    const currentQuiz = shuffledQuizData[currentQuestion];
    console.log("Current quiz question:", currentQuiz);  // Debug: log the current question data

    const shuffledOptions = shuffle([...currentQuiz.options]);

    choiceButtons.forEach((btn) => {
        btn.style.backgroundColor = "";
        btn.style.color = "";
        btn.disabled = false;
    });

    // Update question text
    questionEl.textContent = currentQuiz.question;

    // Create or update the question counter element
    let counterEl = document.getElementById('question-counter');
    if (!counterEl) {
        counterEl = document.createElement('div');
        counterEl.id = 'question-counter';
        questionEl.parentNode.insertBefore(counterEl, questionEl.nextSibling); // Append after the question
    }

    // Update the counter text
    const remainingQuestions = shuffledQuizData.length - currentQuestion;
    counterEl.textContent = `${remainingQuestions} question${remainingQuestions > 1 ? 's' : ''} left`;

    choiceButtons.forEach((btn, index) => {
        btn.textContent = shuffledOptions[index];
        btn.onclick = function() {
            checkAnswer(btn, currentQuiz.correct, currentQuiz);
        };
    });
}




function checkAnswer(selectedButton, correctAnswer, currentQuiz) {
    console.log("Selected answer:", selectedButton.textContent);  // Debug: log selected answer
    const choiceButtons = document.querySelectorAll('.choice');

    choiceButtons.forEach(btn => {
        btn.disabled = true;
        if (btn.textContent === correctAnswer) {
            btn.style.backgroundColor = "#2ecc71"; // Green for correct answer
            btn.style.color = "white";
        } else {
            btn.style.backgroundColor = "#dc3545"; // Red for incorrect answers
            btn.style.color = "white";
        }
    });

    if (selectedButton.textContent === correctAnswer) {
        correctAnswers++;
        console.log("Correct answer selected.");
    } else {
        wrongAnswers.push({
            question: currentQuiz.question,
            userAnswer: selectedButton.textContent,
            correctAnswer: correctAnswer
        });
        console.log("Incorrect answer. Correct answer is:", correctAnswer);
    }

    // Show "Next" button after the question is answered
    document.getElementById('next-btn-container').innerHTML = `
        <button id="next-btn" class="styled-btn">Next</button>
    `;

    document.getElementById('next-btn').addEventListener('click', () => {
        currentQuestion++;
        if (currentQuestion < shuffledQuizData.length) {
            loadQuiz(); // Load the next question
        } else {
            showSummary(); // Show the summary at the end of the quiz
        }
    });
}


// Function to store quiz results in Firebase
function storeQuizResultInFirebase(correctAnswers, totalQuestions) {
    const quizResultsRef = ref(db, 'quizResults');
    const timestamp = new Date().toISOString();
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);
    
    const result = {
        timestamp: timestamp,
        correctAnswers: correctAnswers,
        totalQuestions: totalQuestions,
        percentage: percentage
    };

    push(quizResultsRef, result)
        .then(() => console.log("Quiz result successfully stored in Firebase"))
        .catch(error => console.error("Error storing quiz result in Firebase:", error));
}


function showSummary() {
    console.log("Showing quiz summary...");
    const quizContainer = document.getElementById('quiz-container');
    
    let summaryHTML = `
        <h2>Quiz Over!</h2>
        <p>You answered ${correctAnswers} out of ${shuffledQuizData.length} questions correctly.</p>
        <button id="restart-btn" class="styled-btn">Restart Quiz</button>
    `;

    if (wrongAnswers.length > 0) {
        summaryHTML += `<h3>Questions You Got Wrong:</h3>`;
        wrongAnswers.forEach((wrong) => {
            summaryHTML += `
                <div class="review-item">
                    <p class="review-question"><strong>Question:</strong> ${wrong.question}</p>
                    <p><strong>Your Answer:</strong> <span class="wrong-answer">${wrong.userAnswer}</span></p>
                    <p><strong>Correct Answer:</strong> <span class="correct-answer">${wrong.correctAnswer}</span></p>
                </div>
            `;
        });
    }

    quizContainer.innerHTML = summaryHTML;

    // Store the quiz result in Firebase
    storeQuizResultInFirebase(correctAnswers, shuffledQuizData.length);

    document.getElementById('restart-btn').addEventListener('click', restartQuiz);
}


function restartQuiz() {
    console.log("Restarting quiz...");
    currentQuestion = 0;
    correctAnswers = 0;
    wrongAnswers = [];
    shuffledQuizData = shuffle([...quizData]);
    document.getElementById('quiz-container').innerHTML = `
        <div id="question">Question will go here</div>
        <div id="choices">
            <button class="choice">Option 1</button>
            <button class="choice">Option 2</button>
            <button class="choice">Option 3</button>
            <button class="choice">Option 4</button>
        </div>
        <div id="next-btn-container"></div>
    `;
    loadQuiz();
}



// Function to load quiz logs from Firebase and display them in the main menu
function loadQuizLogsFromFirebase() {
    const quizResultsRef = ref(db, 'quizResults');
    const logsContainer = document.getElementById('quiz-results-container');

    // Add a title to the quiz results container, like "Previous Games"
    logsContainer.innerHTML = `
        <h2>Previous Games</h2>
        <div id="quiz-logs"></div>
    `;

    onValue(quizResultsRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            console.log("No quiz logs found in Firebase.");
            return;
        }

        const results = Object.values(data);

        // Sort results by timestamp in descending order (most recent first)
        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const quizLogs = document.getElementById('quiz-logs');
        quizLogs.innerHTML = ''; // Clear previous logs

        // Display the top 5 most recent results
        results.slice(0, 5).forEach((result) => {
            const percentage = result.percentage;
            const incorrectPercentage = 100 - percentage;

            // Use gradients for the progress bars
            const correctGradient = `linear-gradient(90deg, #32CD32, #3CB371)`; // Green gradient
            const incorrectGradient = `linear-gradient(90deg, #FF6347, #FF4500)`; // Red gradient

            quizLogs.innerHTML += `
                <div class="quiz-log">
                    <p class="log-title"><strong>Quiz Date:</strong> ${new Date(result.timestamp).toLocaleString()}</p>
                    <div class="progress-bar-wrapper">
                        <div class="progress-bar correct" style="background: ${correctGradient}; width: ${percentage}%;"></div>
                        <div class="progress-bar incorrect" style="background: ${incorrectGradient}; width: ${incorrectPercentage}%;"></div>
                    </div>
                    <p class="log-stats">
                        <span class="correct-answer-text">${percentage}% Correct</span> 
                        <span class="divider">|</span> 
                        <span class="wrong-answer-text">${incorrectPercentage}% Wrong</span>
                    </p>
                </div>
            `;
        });
    });
}







function displayMenu() {
    if (isEditingQuestions) {
        displayEditQuestions();
        return;
    }
    console.log("Displaying menu...");
    const quizContainer = document.getElementById('quiz-container');
    const questionCount = quizData.length; // Get the number of questions

    quizContainer.innerHTML = `
        <h2>Quiz Menu</h2>
        <p>Number of questions in the quiz: ${questionCount}</p>
        <div class="button-container">
            <button id="start-quiz-btn" class="styled-btn">Start Quiz</button>
            <button id="add-question-btn" class="styled-btn">Add Question</button>
            <button id="edit-questions-btn" class="styled-btn">Edit Existing Questions</button>
        </div>
    `;

    document.getElementById('start-quiz-btn').addEventListener('click', startQuiz);
    document.getElementById('add-question-btn').addEventListener('click', displayAddQuestionForm);
    document.getElementById('edit-questions-btn').addEventListener('click', displayEditQuestions);
    loadQuizLogsFromFirebase()
}

function displayEditQuestions() {
    isEditingQuestions = true; // Set edit mode
    console.log("Displaying existing questions for editing...");

    const quizContainer = document.getElementById('quiz-container');
    let contentHTML = `<h2>Edit Existing Questions</h2>`;

    if (quizData.length === 0) {
        contentHTML += `<p>No questions available to edit.</p>`;
    } else {
        quizData.forEach((quizItem) => {
            contentHTML += `
                <div class="edit-question-item">
                    <p><strong>Question:</strong> ${quizItem.question}</p>
                    <p><strong>Options:</strong> ${quizItem.options.join(', ')}</p>
                    <button class="styled-btn edit-btn" data-key="${quizItem.key}">Edit</button>
                    <button class="styled-btn remove-btn" data-key="${quizItem.key}">Remove</button>
                </div>
            `;
        });
    }

    contentHTML += `<button id="back-menu-btn" class="styled-btn">Back to Menu</button>`;
    quizContainer.innerHTML = contentHTML;

    document.getElementById('main-menu-btn').addEventListener('click', () => {
        isEditingQuestions = false;
        displayMenu();
    });

    // Attach event listeners
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const key = this.getAttribute('data-key');
            editQuestion(key);
        });
    });

    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const key = this.getAttribute('data-key');
            removeQuestion(key);
        });
    });

    document.getElementById('back-menu-btn').addEventListener('click', () => {
        isEditingQuestions = false; // Exit edit mode
        displayMenu();
    });
}




function editQuestion(key) {
    const quizItem = quizData.find(item => item.key === key);
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.innerHTML = `
        <h2>Edit Question</h2>
        <form id="edit-question-form">
            <label for="edit-question">Question:</label>
            <input type="text" id="edit-question" value="${quizItem.question}" required>

            <label for="edit-correct-answer">Correct Answer:</label>
            <input type="text" id="edit-correct-answer" value="${quizItem.correct}" required>

            <label for="edit-wrong-answers">Wrong Answers (separated by commas):</label>
            <input type="text" id="edit-wrong-answers" value="${quizItem.options.filter(opt => opt !== quizItem.correct).join(', ')}" required>

            <div class="center-button">
                <button type="submit" class="styled-btn">Save Changes</button>
            </div>
        </form>
        <button id="back-edit-questions-btn" class="styled-btn">Back to Edit Questions</button>
    `;

    document.getElementById('back-edit-questions-btn').addEventListener('click', displayEditQuestions);

    const form = document.getElementById('edit-question-form');
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        saveQuestionChanges(key);
    });
}



function removeQuestion(key) {
    // Show the confirmation modal
    showConfirmationModal("Are you sure you want to delete this question?", () => {
        // User clicked "Yes"
        const quizDataRef = ref(db, `quizData/${key}`);
        remove(quizDataRef)
            .then(() => {
                console.log("Question removed successfully from Firebase");
                // The data will be reloaded automatically due to the onValue listener
            })
            .catch(error => console.error("Error removing question:", error));
    });
}


function showConfirmationModal(message, onConfirm) {
    // Update the modal message
    document.getElementById('modal-message').textContent = message;

    // Show the modal
    const modal = document.getElementById('confirmation-modal');
    modal.style.display = 'flex';

    // Attach event listeners to the buttons
    const yesButton = document.getElementById('modal-yes-btn');
    const noButton = document.getElementById('modal-no-btn');

    // Remove any existing event listeners to prevent duplicate handlers
    yesButton.onclick = null;
    noButton.onclick = null;

    yesButton.addEventListener('click', () => {
        // Hide the modal
        modal.style.display = 'none';
        // Execute the confirmation callback
        onConfirm();
    });

    noButton.addEventListener('click', () => {
        // Hide the modal
        modal.style.display = 'none';
        // Optional: Execute any additional logic for "No" response
    });
}



function saveQuestionChanges(key) {
    const updatedQuestion = document.getElementById('edit-question').value;
    const updatedCorrectAnswer = document.getElementById('edit-correct-answer').value;
    const updatedWrongAnswers = document.getElementById('edit-wrong-answers').value.split(',').map(answer => answer.trim());

    const updatedQuizItem = {
        question: updatedQuestion,
        correct: updatedCorrectAnswer,
        options: [updatedCorrectAnswer, ...updatedWrongAnswers]
    };

    // Update the question in Firebase
    const quizDataRef = ref(db, `quizData/${key}`);
    set(quizDataRef, updatedQuizItem)
        .then(() => {
            console.log("Question updated successfully in Firebase");
            // UI will update automatically due to onValue listener
        })
        .catch(error => console.error("Error updating question:", error));
}



// Function to start the quiz
function startQuiz() {
    console.log("Starting quiz...");
    if (quizData.length === 0) {
        console.log("No questions available. Cannot start quiz.");
        // Display a message if no questions are added
        document.getElementById('quiz-container').innerHTML = `
            <h2>No questions added yet!</h2>
            <p>Please add questions to start the quiz.</p>
            <button id="back-menu-btn" class="styled-btn">Back to Menu</button>
        `;
        document.getElementById('back-menu-btn').addEventListener('click', displayMenu);
        return; // Exit the function, no quiz will be loaded
    }

    shuffledQuizData = shuffle([...quizData]);
    currentQuestion = 0;
    correctAnswers = 0;
    wrongAnswers = [];
    document.getElementById('quiz-container').innerHTML = `
        <div id="question">Question will go here</div>
        <div id="choices">
            <button class="choice">Option 1</button>
            <button class="choice">Option 2</button>
            <button class="choice">Option 3</button>
            <button class="choice">Option 4</button>
        </div>
        <div id="next-btn-container"></div>
    `;
    loadQuiz();
}

// Ensure the Main Menu button takes the user back to the main menu
document.getElementById('main-menu-btn').addEventListener('click', displayMenu);

function displayAddQuestionForm() {
    console.log("Displaying Add Question form...");
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.innerHTML = `
        <h2>Add a New Question</h2>
        <form id="add-question-form">
            <label for="new-question">Question:</label>
            <input type="text" id="new-question" placeholder="Enter the question" required>

            <label for="correct-answer">Correct Answer:</label>
            <input type="text" id="correct-answer" placeholder="Enter the correct answer" required>

            <label for="wrong-answers">Wrong Answers (separated by commas):</label>
            <input type="text" id="wrong-answers" placeholder="david, greg, daryll" required>

            <div class="center-button">
                <button type="submit" class="styled-btn">Add Question</button>
            </div>
        </form>
        <button id="back-menu-btn" class="styled-btn">Back to Menu</button>
    `;

    document.getElementById('back-menu-btn').addEventListener('click', displayMenu);

    const form = document.getElementById('add-question-form');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        addNewQuestion();
    });
}

// Add new question to Firebase
function addNewQuestion() {
    console.log("Adding new question...");
    const newQuestion = document.getElementById('new-question').value;
    const correctAnswer = document.getElementById('correct-answer').value;
    const wrongAnswersInput = document.getElementById('wrong-answers').value;

    const wrongAnswersArray = wrongAnswersInput.split(',').map(answer => answer.trim());

    if (wrongAnswersArray.length === 3) {
        const newQuizItem = {
            question: newQuestion,
            correct: correctAnswer,
            options: [correctAnswer, ...wrongAnswersArray]
        };

        // Add the new question to Firebase
        addNewQuestionToFirebase(newQuizItem);

        // Confirmation message
        const confirmationMessage = document.createElement('p');
        confirmationMessage.textContent = "New question added successfully!";
        confirmationMessage.style.color = "green";
        document.getElementById('quiz-container').appendChild(confirmationMessage);

        // Clear the form inputs
        document.getElementById('new-question').value = '';
        document.getElementById('correct-answer').value = '';
        document.getElementById('wrong-answers').value = '';

        // Remove the message after 3 seconds
        setTimeout(() => {
            confirmationMessage.remove();
        }, 3000);
    } else {
        console.log("Invalid input. Three wrong answers are required.");
        alert("Please enter exactly three wrong answers separated by commas.");
    }
}

// Call displayMenu when the page loads
displayMenu();
