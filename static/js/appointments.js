// Initialize Bootstrap modal
let appointmentModal = null;

// Function to open the appointment modal
function openAppointmentModal() {
    const modalElement = document.getElementById('appointmentModal');
    if (modalElement) {
        appointmentModal = new bootstrap.Modal(modalElement);
        appointmentModal.show();
    }
}

// Function to close the appointment modal
function closeAppointmentModal() {
    if (appointmentModal) {
        appointmentModal.hide();
    }
}

// Function to submit appointment
function submitAppointment() {
    const form = document.getElementById('appointmentForm');
    const errorDiv = document.getElementById('appointmentError');
    
    if (!form) {
        console.error('Appointment form not found');
        return;
    }

    // Clear previous error
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }

    // Get form data
    const appointmentType = document.getElementById('appointmentType').value;
    const appointmentDate = document.getElementById('appointmentDate').value;
    const appointmentTime = document.getElementById('appointmentTime').value;
    const appointmentNotes = document.getElementById('appointmentNotes').value;

    // Validate required fields
    if (!appointmentType || !appointmentDate || !appointmentTime) {
        const errorMessage = 'Please fill in all required fields.';
        if (errorDiv) {
            errorDiv.textContent = errorMessage;
            errorDiv.style.display = 'block';
        } else {
            alert(errorMessage);
        }
        return;
    }

    // Prepare form data
    const formData = {
        appointmentType: appointmentType,
        appointmentDate: appointmentDate,
        appointmentTime: appointmentTime,
        appointmentNotes: appointmentNotes
    };

    console.log('Sending request with data:', formData);

    // Get CSRF token
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

    // Send request
    fetch('/book_appointment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify(formData),
        credentials: 'same-origin'
    })
    .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Response data:', data);
        if (data.status === 'success') {
            // Hide modal
            const modalElement = document.getElementById('appointmentModal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                console.log('Hiding modal');
                modal.hide();
                // Reset form
                form.reset();
                // Show success message
                alert(data.message);
            } else {
                console.error('Modal instance not found');
            }
        } else {
            // Show error message
            const message = data.message || 'An error occurred while scheduling the appointment.';
            if (errorDiv) {
                errorDiv.textContent = message;
                errorDiv.style.display = 'block';
            } else {
                alert(message);
            }
        }
    })
    .catch(error => {
        console.error('Fetch error:', error);
        const errorMessage = 'An error occurred while scheduling the appointment. Please try again.';
        if (errorDiv) {
            errorDiv.textContent = errorMessage;
            errorDiv.style.display = 'block';
        } else {
            alert(errorMessage);
        }
    });
}

// Initialize form handlers when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set minimum date to today for the date input
    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
    }

    // Add form submit handler
    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', function(event) {
            event.preventDefault();
            console.log('Form submitted');
            submitAppointment();
        });
    }
});
