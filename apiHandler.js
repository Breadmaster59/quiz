document.getElementById('camera-btn').addEventListener('click', async () => {
    try {
        const imageFile = await captureImage();
        const base64Image = await convertImageToBase64(imageFile);
        
        // Send to Firebase Function
        const detectedText = await analyzeImage(base64Image);
        console.log('Detected Text:', detectedText);
    } catch (error) {
        console.error('Error capturing or processing the image:', error);
    }
});

// Function to send the base64 image to Firebase Function for analysis
async function analyzeImage(base64Image) {
    const functionUrl = 'https://europe-west1-quizquestionstorage.cloudfunctions.net/analyzeImage'; // Replace with your actual URL

    const requestBody = {
        base64Image: base64Image
    };

    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            body: JSON.stringify(requestBody),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        console.log('Detected Text:', result.detectedText);
        return result.detectedText; // Return the detected text
    } catch (error) {
        console.error('Error with Vision API:', error);
    }
}

// Function to capture an image using the device's camera
async function captureImage() {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment'; // Opens the camera

        input.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                resolve(file);
            } else {
                reject(new Error('No image captured'));
            }
        };

        input.click(); // Programmatically click the input to open the camera
    });
}

// Function to convert an image file to base64 format
function convertImageToBase64(imageFile) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            resolve(reader.result.split(',')[1]); // Get the base64 part of the image
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
    });
}



