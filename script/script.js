// Get a reference to the body element
const body = document.body;

// Create the input and submit elements
const inputElement = document.createElement('input');
inputElement.type = 'text';
inputElement.placeholder = 'Enter email...';

const submitButton = document.createElement('button');
submitButton.type = 'submit';
submitButton.textContent = 'Submit';

// Create a container for the input and button
const inputContainer = document.createElement('div');
inputContainer.appendChild(inputElement);
inputContainer.appendChild(submitButton);

// Append the container to the top of the body
body.insertBefore(inputContainer, body.firstChild);

// Add an event listener to the submit button
submitButton.addEventListener('click', (event) => {
    event.preventDefault(); // Prevent default form submission

    const userInput = inputElement.value;
    const outputElement = document.createElement('p');
    outputElement.textContent = `Registered email: ${userInput}`;

    // Append the output below the input container
    body.insertBefore(outputElement, inputContainer.nextSibling);

    // Clear the input field for the next entry
    inputElement.value = '';
    // Register email in nosto
    if (nostojs){
        console.log("Registering email")
        nostojs(api => {
            api.customer({email: userInput});
        })
    } else {
        console.log("Nosto not found")
    }
});