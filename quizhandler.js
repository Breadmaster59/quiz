console.log("load");

// Global Variables
let quizData = [];
let shuffledQuizData = [];
let currentQuestion = 0;
let correctAnswers = 0;
let wrongAnswers = [];
let isEditingQuestions = false;
let quizDataRef = null;
let quizDataListener = null;
let quizLogsRef = null;
let quizLogsListener = null;
let currentQuizId = null;      // Quiz ID of the currently selected quiz
let quizNames = {};            // Object to store quiz names

let currentUser = null; // Holds the UID of the currently authenticated user

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getDatabase, ref, push, onValue, off, set, remove } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";


// Firebase config and initialization
const firebaseConfig = {
    apiKey: "AIzaSyAfG-L_fgyuOpYV3__RZrRM3pliaUA4xh8",  // Add this line
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

// Initialize Firebase Authentication
const auth = getAuth(app);


document.getElementById('logout-btn').addEventListener('click', resetApp);


function resetApp() {
    signOut(auth)
        .then(() => {
            console.log("User signed out");

            // Hide the logout button after sign out
            document.getElementById('logout-btn').style.display = 'none';

            // The rest of the cleanup is handled in onAuthStateChanged
        })
        .catch((error) => {
            console.error("Error signing out:", error);
        });
}


function displayQuizSelectionMenu() {
    console.log("Displaying quiz selection menu...");
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.style.display = 'block';

    quizContainer.innerHTML = `
        <h2>Select a Quiz</h2>
        <button id="create-new-quiz-btn" class="styled-btn">QUIZ+</button>
        <div id="existing-quizzes-container"></div>
    `;

    document.getElementById('create-new-quiz-btn').addEventListener('click', displayCreateNewQuizForm);

    loadExistingQuizzes();
}


function displayCreateNewQuizForm() {
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.innerHTML = `
        <h2>Create New Quiz</h2>
        <form id="create-quiz-form">
            <label for="quiz-name">Quiz Name:</label>
            <input type="text" id="quiz-name" required>
            <button type="submit" class="styled-btn">Create Quiz</button>
        </form>
        <button id="back-to-quiz-selection-btn" class="styled-btn">Tilbake</button>
    `;

    document.getElementById('back-to-quiz-selection-btn').addEventListener('click', displayQuizSelectionMenu);

    document.getElementById('create-quiz-form').addEventListener('submit', function(event) {
        event.preventDefault();
        createNewQuiz();
    });
}

function createNewQuiz() {
    const quizName = document.getElementById('quiz-name').value;
    const quizzesRef = ref(db, `users/${currentUser}/quizzes`);
    const newQuizRef = push(quizzesRef);

    const newQuiz = {
        name: quizName,
        createdAt: Date.now()
    };

    set(newQuizRef, newQuiz)
        .then(() => {
            console.log("New quiz created successfully");
            currentQuizId = newQuizRef.key; // Set the current quiz ID
            loadQuizDataFromFirebase(); // Load quiz data for the new quiz
        })
        .catch(error => console.error("Error creating new quiz:", error));
}

function loadExistingQuizzes() {
    const existingQuizzesContainer = document.getElementById('existing-quizzes-container');
    existingQuizzesContainer.innerHTML = `<p>Loading existing quizzes...</p>`;

    const quizzesRef = ref(db, `users/${currentUser}/quizzes`);

    onValue(quizzesRef, (snapshot) => {
        const data = snapshot.val();
        existingQuizzesContainer.innerHTML = ''; // Clear previous content
        quizNames = {}; // Reset quiz names

        if (data) {
            const table = document.createElement('table');
            table.className = 'quiz-table'; // Add a class for styling

            for (let quizId in data) {
                const quiz = data[quizId];
                quizNames[quizId] = quiz.name; // Store the quiz name

                const row = document.createElement('tr'); // Create a new row
                row.innerHTML = `
                    <td><strong>${quiz.name}</strong></td>
                    <td>
                        <button class="small-btn2 select-quiz-btn" data-quiz-id="${quizId}">Select</button>
                        <button class="small-btn2 delete-quiz-btn" data-quiz-id="${quizId}">Delete</button>
                    </td>
                `;
                table.appendChild(row); // Append the row to the table
            }

            existingQuizzesContainer.appendChild(table);

            // Attach event listeners to the select buttons
            document.querySelectorAll('.select-quiz-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    currentQuizId = this.getAttribute('data-quiz-id');
                    loadQuizDataFromFirebase(); // Load quiz data for the selected quiz
                });
            });

            // Attach event listeners to the delete buttons
            document.querySelectorAll('.delete-quiz-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const quizIdToDelete = this.getAttribute('data-quiz-id');
                    deleteQuiz(quizIdToDelete);
                });
            });
        } else {
            existingQuizzesContainer.innerHTML = `<p>No quizzes found. Create a new one!</p>`;
        }
    }, (error) => {
        console.error("Error loading existing quizzes:", error);
    });
}


function deleteQuiz(quizId) {
    // Show confirmation modal before deleting
    showConfirmationModal("Are you sure you want to delete this quiz?", () => {
        const quizRef = ref(db, `users/${currentUser}/quizzes/${quizId}`);
        remove(quizRef)
            .then(() => {
                console.log("Quiz deleted successfully");
                if (quizId === currentQuizId) {
                    currentQuizId = null;
                    quizData = [];
                }
                // Refresh the quiz selection menu
                displayQuizSelectionMenu();
            })
            .catch(error => console.error("Error deleting quiz:", error));
    });
}

// Function to handle user sign-up
function handleSignUp(event) {
    event.preventDefault();
    const email = document.getElementById('sign-up-email').value;
    const password = document.getElementById('sign-up-password').value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Sign-up successful
            const user = userCredential.user;
            console.log("User signed up:", user.uid);
            currentUser = user.uid;
            // Load user data
            loadUserData();
        })
        .catch((error) => {
            console.error("Error signing up:", error);
            alert(error.message);
        });
}

// Event listener for sign-up form submission
document.getElementById('sign-up-form').addEventListener('submit', handleSignUp);

// Function to handle user login
function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Login successful
            const user = userCredential.user;
            console.log("User logged in:", user.uid);
            currentUser = user.uid;
            // Load user data
            loadUserData();
        })
        .catch((error) => {
            console.error("Error logging in:", error);
            alert(error.message);
        });
}

// Event listener for login form submission
document.getElementById('login-form').addEventListener('submit', handleLogin);


onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        currentUser = user.uid;
        console.log("User ID:", currentUser);

        // Hide login/sign-up forms
        document.getElementById('sign-up-container').style.display = 'none';
        document.getElementById('login-container').style.display = 'none';

        // Show the logout button
        document.getElementById('logout-btn').style.display = 'inline-block';

        // Load user data
        loadUserData();
    } else {
        // User is signed out
        console.log("User is signed out");

        // Hide the logout button when the user is logged out
        document.getElementById('logout-btn').style.display = 'none';

        // Remove database listeners before setting currentUser to null
        if (quizDataListener && quizDataRef) {
            off(quizDataRef, 'value', quizDataListener);
            quizDataListener = null;
            quizDataRef = null;
        }

        if (quizLogsListener && quizLogsRef) {
            off(quizLogsRef, 'value', quizLogsListener);
            quizLogsListener = null;
            quizLogsRef = null;
        }

        // Clear local variables
        currentUser = null;
        currentQuizId = null; // Reset current quiz ID
        quizData = [];
        shuffledQuizData = [];
        currentQuestion = 0;
        correctAnswers = 0;
        wrongAnswers = [];
        isEditingQuestions = false;

        // Clear UI elements
        document.getElementById('quiz-container').innerHTML = '';
        document.getElementById('quiz-results-container').innerHTML = '';
        document.getElementById('quiz-container').style.display = 'none';
        document.getElementById('quiz-results-container').style.display = 'none';

        // Show the login form
        document.getElementById('sign-up-container').style.display = 'none';
        document.getElementById('login-container').style.display = 'block';

        // Clear the password field
        document.getElementById('login-password').value = '';
    }
});






// Function to shuffle an array (Fisher-Yates shuffle algorithm)
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
}

// Function to load user data
function loadUserData() {
    console.log(`Loading data for user: ${currentUser}...`);
    displayQuizSelectionMenu();
}


// Function to load quiz data from Firebase and display the menu after loading
function loadQuizDataFromFirebase() {
    if (!currentUser || !currentQuizId) {
        console.log("No user or quiz selected. Cannot load quiz data.");
        return; // Ensure a user and quiz are selected
    }
    console.log(`Loading quiz data from Firebase for user: ${currentUser}, quiz: ${currentQuizId}`);

    // If a previous listener exists, remove it
    if (quizDataListener && quizDataRef) {
        off(quizDataRef, 'value', quizDataListener);
    }

    quizDataRef = ref(db, `users/${currentUser}/quizzes/${currentQuizId}/questions`);

    // Use 'onValue' to listen for real-time updates
    quizDataListener = onValue(quizDataRef, (snapshot) => {
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
            console.log("Quiz data loaded:", quizData);
        } else {
            console.log("No quiz data found for the selected quiz.");
            quizData = [];
        }
        // Update the question count in the menu if necessary
        updateQuestionCount();
        // Call displayMenu() after data is loaded
        displayMenu();
    }, (error) => {
        console.error("Error loading quiz data:", error);
    });
}

// Function to toggle the visibility of the motivation text
function toggleMotivationText() {
    const motivationText = document.getElementById('motivation-text');
    const toggleButton = document.getElementById('toggle-motivation-btn');

    if (motivationText.style.display === 'none') {
        motivationText.style.display = 'inline';
        toggleButton.textContent = 'Skjul';
    } else {
        motivationText.style.display = 'none';
        toggleButton.textContent = 'Vis';
    }
}

// Function to display the main quiz menu
function displayMenu() {
    if (!currentUser || !currentQuizId) {
        console.log("No user or quiz selected. Cannot display menu.");
        return;
    }

    isEditingQuestions = false; // Ensure editing mode is off

    console.log("Displaying menu...");
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.style.display = 'block';

    const questionCount = quizData.length; // Get the number of questions
    const quizName = quizNames[currentQuizId] || "Quiz";

    quizContainer.innerHTML = `
        <h2>${quizName} - Quiz Menu</h2>
        <div id="motivation-container" style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
            <p id="motivation-text" style="font-size: 0.9rem; margin-right: 1px;">Du er flink som jobber med skole:)</p>
            <button id="toggle-motivation-btn" class="small-btn">Skjul</button>
        </div>
        <p id="question-count-text">Antall spørsmål i quizzen: ${questionCount}</p>
        <div class="button-container">
            <button id="start-quiz-btn" class="styled-btn">Start Quiz</button>
            <button id="add-question-btn" class="styled-btn">Legg til spørsmål</button>
            <button id="edit-questions-btn" class="styled-btn">Rediger Spørsmål</button>
            <button id="switch-quiz-btn" class="styled-btn">Bytt Quiz</button>
            <button id="camera-btn">Capture Image</button>
        </div>
    `;

    document.getElementById('quiz-results-container').style.display = 'block';
    // Attach event listeners to the menu buttons
    document.getElementById('start-quiz-btn').addEventListener('click', startQuiz);
    document.getElementById('add-question-btn').addEventListener('click', displayAddQuestionForm);
    document.getElementById('edit-questions-btn').addEventListener('click', displayEditQuestions);
    document.getElementById('switch-quiz-btn').addEventListener('click', displayQuizSelectionMenu);

    // Event listener for the toggle button
    document.getElementById('toggle-motivation-btn').addEventListener('click', toggleMotivationText);

    // Ensure the "Main Menu" button is visible here
    document.getElementById('main-menu-btn').style.display = 'block';

    // Optionally, load quiz logs
    loadQuizLogsFromFirebase();
}




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

            <label for="wrong-answers">Wrong Answers (one per line):</label>
            <textarea id="wrong-answers" placeholder="Enter one wrong answer per line" required></textarea>

            <div class="center-button">
                <button type="submit" class="styled-btn">Legg til:)</button>
            </div>
        </form>
        <button id="back-menu-btn" class="styled-btn">Tilbake til Meny</button>
        <button id="generate-options-btn" class="styled-btn">Generer 3 Feil Options fra ChatGpt</button>

        <!-- Spinner will be added here dynamically -->
        <div id="spinner-container" style="text-align:center;">
            <div class="spinner" id="loading-spinner"></div>
        </div>
    `;

    // Attach event listeners after rendering the HTML
    document.getElementById('back-menu-btn').addEventListener('click', displayMenu);

    const form = document.getElementById('add-question-form');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        addNewQuestion();
    });

    // Add event listener to the "Generate 3 Options" button after it's rendered
    const generateOptionsButton = document.getElementById('generate-options-btn');
    if (generateOptionsButton) {
        generateOptionsButton.addEventListener('click', async function() {
            const question = document.getElementById('new-question').value.trim();
            const correctAnswer = document.getElementById('correct-answer').value.trim(); // Retrieve the correct answer

            // Log the values to check if they're correctly retrieved
            console.log('Question:', question);
            console.log('Correct Answer:', correctAnswer);

            if (!question || !correctAnswer) {
                alert('Please enter both a question and a correct answer!');
                return;
            }

            // Show the spinner
            document.getElementById('loading-spinner').style.display = 'block';

            // Call generateWrongOptions with both the question and correct answer
            const wrongOptions = await generateWrongOptions(question, correctAnswer);

            // Hide the spinner when the options are generated
            document.getElementById('loading-spinner').style.display = 'none';

            if (wrongOptions && wrongOptions.length === 3) {
                document.getElementById('wrong-answers').value = wrongOptions.join('\n');
            } else {
                alert('Failed to generate enough wrong options.');
            }
        });
    }
}



// Function to add a new question to Firebase under the current user
function addNewQuestion() {
    console.log("Adding new question...");
    const newQuestion = document.getElementById('new-question').value;
    const correctAnswer = document.getElementById('correct-answer').value;
    const wrongAnswersInput = document.getElementById('wrong-answers').value;

    const wrongAnswersArray = wrongAnswersInput
    .split('\n')
    .map(answer => answer.trim())
    .filter(answer => answer.length > 0);


    if (wrongAnswersArray.length === 3) {
        const newQuizItem = {
            question: newQuestion,
            correct: correctAnswer,
            options: [correctAnswer, ...wrongAnswersArray]
        
        };

        // Add the new question to Firebase under the current user
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

// Function to add a new question to Firebase under the current user
function addNewQuestionToFirebase(newQuizItem) {
    if (!currentUser || !currentQuizId) return; // Ensure a user and quiz are selected
    console.log(`Adding new question to Firebase for user: ${currentUser}, quiz: ${currentQuizId}`);
    const questionsRef = ref(db, `users/${currentUser}/quizzes/${currentQuizId}/questions`);
    const newQuestionRef = push(questionsRef);
    set(newQuestionRef, newQuizItem)
        .then(() => {
            console.log("New question successfully added to Firebase");
            // No need to call loadQuizDataFromFirebase() as the listener will update
        })
        .catch(error => console.error("Error adding question to Firebase:", error));
}


function updateQuestionCount() {
    const questionCount = quizData.length;
    const questionCountText = document.getElementById('question-count-text');
    if (questionCountText) {
        questionCountText.textContent = `Number of questions in your quiz: ${questionCount}`;
    }
}

// Function to display existing questions for editing
// Function to display existing questions for editing
function displayEditQuestions() {
    isEditingQuestions = true; // Set edit mode
    console.log("Displaying existing questions for editing...");

    const quizContainer = document.getElementById('quiz-container');
    
    // Clear the content of the container to ensure it displays only the edit page
    quizContainer.innerHTML = ''; 
    
    // Add the title and the back button above the table
    let contentHTML = `
        <h2>Edit Existing Questions</h2>
        <button id="back-menu-btn" class="styled-btn">Tilbake til Meny</button>
    `;
    
    if (quizData.length === 0) {
        contentHTML += `<p>No questions available to edit.</p>`;
        quizContainer.innerHTML = contentHTML;
    } else {
        // Add the content to the container
        quizContainer.innerHTML = contentHTML;

        // Create a table for questions
        const table = document.createElement('table');
        table.className = 'quiz-table2 edit-questions-table'; // Add a class for the edit questions table
        
        // Loop through quizData to create rows for each question
        quizData.forEach((quizItem) => {
            const row = document.createElement('tr');
            row.className = "edit-question-row"; // Add class to target rows specifically
            row.innerHTML = `
                <td class="question-text"><strong>${quizItem.question}</strong></td>
                <td class="edit-buttons-cell">
                    <button class="small-btn2 edit-btn new-edit-btn" data-key="${quizItem.key}">Rediger</button>
                    <button class="small-btn2 remove-btn new-delete-btn" data-key="${quizItem.key}">Delete</button>
                </td>
            `;
            table.appendChild(row); // Append the row to the table
        });

        // Append the table to the content
        quizContainer.appendChild(table);
    }

    // Attach event listeners to the Edit and Delete buttons
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

    // Attach event listener to the back button
    document.getElementById('back-menu-btn').addEventListener('click', () => {
        isEditingQuestions = false; // Reset editing mode
        displayMenu(); // Return to the main menu
    });
}




// Function to edit a question
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
                <button type="submit" id="save-changes-btn" class="styled-btn">Save Changes</button>
            </div>
        </form>
        <button id="back-edit-questions-btn" class="styled-btn">Tilbake til redigering</button>
    `;

    document.getElementById('back-edit-questions-btn').addEventListener('click', displayEditQuestions);
    document.getElementById('save-changes-btn').addEventListener('click', () => saveQuestionChanges(key));
    document.getElementById('main-menu-btn').addEventListener('click', () => {
        isEditingQuestions = false; // Reset editing mode
        displayMenu();
    });

    const form = document.getElementById('edit-question-form');
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        saveQuestionChanges(key);
    });
}

// Function to save question changes to Firebase under the current user
function saveQuestionChanges(key) {
    if (!currentUser || !currentQuizId) return; // Ensure a user and quiz are selected
    const updatedQuestion = document.getElementById('edit-question').value;
    const updatedCorrectAnswer = document.getElementById('edit-correct-answer').value;
    const updatedWrongAnswers = document.getElementById('edit-wrong-answers').value.split(',').map(answer => answer.trim());

    const updatedQuizItem = {
        question: updatedQuestion,
        correct: updatedCorrectAnswer,
        options: [updatedCorrectAnswer, ...updatedWrongAnswers]
    };

    // Update the question in Firebase under the current user and current quiz
    const questionRef = ref(db, `users/${currentUser}/quizzes/${currentQuizId}/questions/${key}`);
    set(questionRef, updatedQuizItem)
        .then(() => {
            console.log("Question updated successfully in Firebase");
            // Navigate back to the edit questions screen
            displayEditQuestions();
        })
        .catch(error => console.error("Error updating question:", error));
}


// Function to remove a question from Firebase under the current user
function removeQuestion(key) {
    if (!currentUser) return; // Ensure a user is signed in

    // Show the confirmation modal
    showConfirmationModal("Are you sure you want to delete this question?", () => {
        // User clicked "Yes"
        const questionRef = ref(db, `users/${currentUser}/quizzes/${currentQuizId}/questions/${key}`);
        remove(questionRef)
            .then(() => {
                console.log("Question removed successfully from Firebase");

                // Optionally reload quiz data or stay in the current quiz menu
                loadQuizDataFromFirebase(); // Reload data to reflect the removal
            })
            .catch(error => console.error("Error removing question:", error));
    });
}



// Function to show a confirmation modal
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

// Function to start the quiz
function startQuiz() {
    console.log("Starting quiz...");

    // Hide the previous quizzes container
    document.getElementById('quiz-results-container').style.display = 'none';

    if (quizData.length === 0) {
        console.log("No questions available. Cannot start quiz.");
        document.getElementById('quiz-container').innerHTML = `
            <h2>No questions added yet!</h2>
            <p>Please add questions to start the quiz.</p>
            <button id="back-menu-btn" class="styled-btn">Tilbake til Meny</button>
        `;
        document.getElementById('back-menu-btn').addEventListener('click', displayMenu);
        return;
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


// Function to load the quiz question
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

// Function to check the selected answer
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
        <button id="next-btn" class="styled-btn">Neste</button>
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

// Function to show the quiz summary
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
    saveQuizResult(correctAnswers, shuffledQuizData.length);

    document.getElementById('restart-btn').addEventListener('click', restartQuiz);
}

// Function to restart the quiz
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

// Function to save quiz result to Firebase under the current user
function saveQuizResult(score, totalQuestions) {
    if (!currentUser) return; // Ensure a user is signed in
    const quizLogsRef = ref(db, `users/${currentUser}/quizLogs`);
    const newLogRef = push(quizLogsRef);
    set(newLogRef, {
        timestamp: Date.now(),
        score: score,
        totalQuestions: totalQuestions
    })
    .then(() => console.log("Quiz result saved successfully in Firebase"))
    .catch(error => console.error("Error saving quiz result:", error));
}

// Function to load quiz logs from Firebase and display them in the main menu
function loadQuizLogsFromFirebase() {
    if (!currentUser) return; // Ensure a user is signed in
    console.log("Loading quiz logs from Firebase for user:", currentUser);

    // If a previous listener exists, remove it
    if (quizLogsListener && quizLogsRef) {
        off(quizLogsRef, 'value', quizLogsListener);
    }

    quizLogsRef = ref(db, `users/${currentUser}/quizLogs`);
    const logsContainer = document.getElementById('quiz-results-container');

    // Add a title to the quiz results container, like "Previous Games"
    logsContainer.innerHTML = `
        <h2>Previous Games</h2>
        <div id="quiz-logs"></div>
    `;

    const quizLogsDiv = document.getElementById('quiz-logs'); // This div will contain the logs

    quizLogsListener = onValue(quizLogsRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            console.log("No quiz logs found in Firebase.");
            quizLogsDiv.innerHTML = `<p>No previous games found.</p>`;
            return;
        }

        const logEntries = Object.entries(data);
        const sortedLogs = logEntries.sort((a, b) => b[1].timestamp - a[1].timestamp); // Sort by latest first

        // Display only the latest 10 logs
        const latestLogs = sortedLogs.slice(0, 10);

        quizLogsDiv.innerHTML = ''; // Clear existing logs

        latestLogs.forEach(([logId, log]) => {
            const logElement = document.createElement('div');
            logElement.classList.add('quiz-log');
            
            logElement.innerHTML = `
                <p>Date: ${new Date(log.timestamp).toLocaleString()}</p>
                <p>Score: ${log.score} / ${log.totalQuestions}</p>
                <div class="progress-bar-wrapper">
                    <div class="progress-bar correct" style="width: ${(log.score / log.totalQuestions) * 100}%;">
                        ${Math.round((log.score / log.totalQuestions) * 100)}%
                    </div>
                    <div class="progress-bar incorrect" style="width: ${(1 - log.score / log.totalQuestions) * 100}%;">
                        ${Math.round((1 - log.score / log.totalQuestions) * 100)}%
                    </div>
                </div>
            `;
            quizLogsDiv.appendChild(logElement);
        });

        // If more than 10 logs exist, delete the oldest ones
        if (sortedLogs.length > 10) {
            const logsToDelete = sortedLogs.slice(10); // Get logs older than the 10 most recent

            logsToDelete.forEach(([logId]) => {
                const logRef = ref(db, `users/${currentUser}/quizLogs/${logId}`);
                remove(logRef).then(() => {
                    console.log(`Deleted old log: ${logId}`);
                }).catch((error) => {
                    console.error(`Error deleting old log: ${logId}`, error);
                });
            });
        }
    }, (error) => {
        if (error.code === 'PERMISSION_DENIED') {
            console.warn("Permission denied when accessing quiz logs. User may have signed out.");
        } else {
            console.error("Error loading quiz logs:", error);
        }
    });
}



// Initialize the confirmation modal in your HTML
// Make sure you have the modal structure in your HTML file

document.getElementById('show-login-form').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('sign-up-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'block';
});

document.getElementById('show-sign-up-form').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('sign-up-container').style.display = 'block';
});

// Attach event listener after DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    // Attach event listener to the Main Menu button
document.getElementById('main-menu-btn').addEventListener('click', () => {
    // Reset any state variables affecting navigation
    isEditingQuestions = false; // Reset editing mode
    // Navigate to the main menu
    displayMenu();
});

});

async function generateWrongOptions(question, correctAnswer) {
    // Function to make the API call
    async function callFirebaseFunction(prompt) {
        try {
            const response = await fetch('https://europe-west1-quizquestionstorage.cloudfunctions.net/callOpenAI', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt
                })
            });

            if (!response.ok) {
                throw new Error('API call failed');
            }

            const data = await response.json();
            return data.result;  // This should be the wrong options array
        } catch (error) {
            console.error('Error calling Firebase function:', error);
            throw error;
        }
    }

    // Create the prompt for the OpenAI API
    const prompt = `You're helping to create a multiple-choice quiz question. 
    Given the question and the correct answer, generate three plausible and similar but incorrect options that seem factual correct.

Question: ${question}
Correct Answer: ${correctAnswer}

Please provide the incorrect options in a numbered JSON array without any additional text. The output should be in the following format:

[
"Wrong answer one.",
"Wrong answer two.",
"Wrong answer three."
]`;

    try {
        console.log('Calling Firebase function with prompt:', prompt);  // Log the prompt for debugging
        const apiResponse = await callFirebaseFunction(prompt);
        
        console.log('API Response:', apiResponse);  // Log the full API response
        let wrongOptions = [];

        try {
            // Parse the incorrect options from the API response
            wrongOptions = JSON.parse(apiResponse);
        } catch (parseError) {
            console.error('Error parsing wrong options from API response:', parseError);
            alert('Failed to parse wrong options from the API response.');
            return;
        }

        // Ensure there are exactly 3 wrong options
        if (wrongOptions.length === 3) {
            console.log('Generated Wrong Options:', wrongOptions);  // Log the options for debugging
            return wrongOptions;
        } else {
            console.error('Failed to generate enough wrong options.');
            alert('API did not return exactly three wrong options.');
        }
    } catch (error) {
        console.error('Error generating wrong options:', error);
        alert('Failed to generate wrong options.');
    }
}

// Event listener for the "Generate 3 Options" button
document.getElementById('generate-options-btn').addEventListener('click', async function() {
    const question = document.getElementById('new-question').value;  // Get the user’s question
    const correctAnswer = document.getElementById('correct-answer').value;  // Get the user’s correct answer

    if (!question || !correctAnswer) {
        alert('Please enter both a question and a correct answer!');
        return;
    }

    // Call generateWrongOptions with both the question and correct answer
    const wrongOptions = await generateWrongOptions(question, correctAnswer); 
    if (wrongOptions && wrongOptions.length === 3) {
        console.log('Setting wrong options in the textbox:', wrongOptions);  // Log the wrong options
        document.getElementById('wrong-answers').value = wrongOptions.join(', ');
    }
});
