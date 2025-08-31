const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const aiOutput = document.getElementById('aiOutput');

// Handle send button click
sendButton.addEventListener('click', sendMessage);

// Handle Enter key press
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // Disable input while processing
    sendButton.disabled = true;
    userInput.disabled = true;
    aiOutput.textContent = 'thinking...';

    try {
        // Send message to server
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        // Display AI response
        aiOutput.textContent = data.text;

        // Play audio
        if (data.audioUrl) {
            const audio = new Audio(data.audioUrl);
            audio.play().catch(e => console.log('Audio play failed:', e));
        }

    } catch (error) {
        aiOutput.textContent = 'Sorry, something went wrong. Please try again.';
        console.error('Error:', error);
    } finally {
        sendButton.disabled = false;
        userInput.disabled = false;
        userInput.value = '';
        userInput.focus();
    }
}

// Focus input on page load
userInput.focus();