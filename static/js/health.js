// Handle health metrics form submission
function handleHealthMetricsSubmit(event) {
    event.preventDefault();
    const form = event.target;
    
    const formData = {
        weight: parseFloat(form.querySelector('[name="weight"]').value),
        height: parseInt(form.querySelector('[name="height"]').value),
        systolic: parseInt(form.querySelector('[name="systolic"]').value),
        diastolic: parseInt(form.querySelector('[name="diastolic"]').value),
        heart_rate: parseInt(form.querySelector('[name="heart_rate"]').value)
    };

    fetch('/log_health_metrics', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess(form, data.message);
            form.reset();
            setTimeout(() => {
                closeModal();
            }, 2000);
        } else {
            throw new Error(data.message || 'Failed to log health metrics');
        }
    })
    .catch(error => {
        showError(form, error.message || 'An error occurred while logging health metrics');
    });
}

// Helper functions for showing messages
function showSuccess(form, message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'alert alert-success mt-3';
    messageDiv.textContent = message;
    form.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}

function showError(form, message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger mt-3';
    errorDiv.textContent = message;
    form.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

// BMI Calculator Functions
function calculateBMI(event) {
    event.preventDefault();
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value) / 100;
    const bmi = weight / (height * height);
    
    const resultDiv = document.getElementById('bmiResult');
    resultDiv.innerHTML = `
        <h3>Your BMI Result</h3>
        <div class="bmi-value">BMI: ${bmi.toFixed(1)}</div>
        <div class="bmi-category">Category: ${getBMICategory(bmi)}</div>
        <div class="bmi-info mt-3">${getBMIAdvice(bmi)}</div>
    `;
    resultDiv.style.display = 'block';
}

function getBMICategory(bmi) {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
}

function getBMIAdvice(bmi) {
    if (bmi < 18.5) return 'You may need to gain some weight. Consult with a healthcare provider.';
    if (bmi < 25) return 'You are at a healthy weight. Keep up the good work!';
    if (bmi < 30) return 'You may need to lose some weight. Consider diet and exercise changes.';
    return 'For your health, you should consider weight loss. Consult with a healthcare provider.';
}

// Calorie Calculator Functions
function calculateCalories(event) {
    event.preventDefault();
    
    // Get form values
    const age = parseInt(document.getElementById('age').value);
    const gender = document.querySelector('input[name="gender"]:checked').value;
    const weight = parseFloat(document.getElementById('calorieWeight').value);
    const height = parseFloat(document.getElementById('calorieHeight').value);
    const activityLevel = parseFloat(document.getElementById('activity').value);
    
    // Calculate BMR using Mifflin-St Jeor Equation
    let bmr;
    if (gender === 'male') {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
    
    // Calculate TDEE (Total Daily Energy Expenditure)
    const tdee = bmr * activityLevel;
    
    // Display results
    const resultDiv = document.getElementById('calorieResult');
    const maintainDiv = resultDiv.querySelector('.calorie-maintain');
    const loseDiv = resultDiv.querySelector('.calorie-lose');
    const gainDiv = resultDiv.querySelector('.calorie-gain');
    
    maintainDiv.textContent = `Maintenance: ${Math.round(tdee)} calories/day`;
    loseDiv.textContent = `Weight Loss: ${Math.round(tdee - 500)} calories/day`;
    gainDiv.textContent = `Weight Gain: ${Math.round(tdee + 500)} calories/day`;
    
    resultDiv.style.display = 'block';
}

// Settings form handling
document.addEventListener('DOMContentLoaded', function() {
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        // Load current settings when modal opens
        document.getElementById('settingsModal').addEventListener('show.bs.modal', function() {
            fetch('/get_settings')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('daily_water_goal').value = data.daily_water_goal || '';
                    document.getElementById('daily_calorie_goal').value = data.daily_calorie_goal || '';
                    document.getElementById('daily_exercise_goal').value = data.daily_exercise_goal || '';
                    document.getElementById('daily_sleep_goal').value = data.daily_sleep_goal || '';
                })
                .catch(error => console.error('Error loading settings:', error));
        });

        // Handle settings form submission
        settingsForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const formData = {
                daily_water_goal: parseInt(document.getElementById('daily_water_goal').value),
                daily_calorie_goal: parseInt(document.getElementById('daily_calorie_goal').value),
                daily_exercise_goal: parseInt(document.getElementById('daily_exercise_goal').value),
                daily_sleep_goal: parseInt(document.getElementById('daily_sleep_goal').value)
            };

            fetch('/update_settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(formData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Close modal and show success message
                    const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
                    modal.hide();
                    showAlert('Settings updated successfully!', 'success');
                    // Update any displayed values that depend on settings
                    updateHealthSummary();
                } else {
                    showAlert('Error updating settings. Please try again.', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert('Error updating settings. Please try again.', 'error');
            });
        });
    }
});

// Modal handling
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all modals
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        new bootstrap.Modal(modal);
    });

    // Add click handlers for modal triggers
    document.querySelectorAll('[data-bs-toggle="modal"]').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-bs-target').replace('#', '');
            const targetModal = document.getElementById(targetId);
            if (targetModal) {
                const modal = new bootstrap.Modal(targetModal);
                modal.show();
            }
        });
    });

    // Add click handlers for modal close buttons
    document.querySelectorAll('[data-bs-dismiss="modal"]').forEach(button => {
        button.addEventListener('click', function() {
            const modal = bootstrap.Modal.getInstance(this.closest('.modal'));
            if (modal) modal.hide();
        });
    });

    // Handle appointment form submission
    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', function(event) {
            event.preventDefault();
            submitAppointment();
        });
    }
});

// Function to submit appointment
function submitAppointment() {
    const formData = {
        appointmentType: document.getElementById('appointmentType').value,
        appointmentDate: document.getElementById('appointmentDate').value,
        appointmentTime: document.getElementById('appointmentTime').value,
        appointmentNotes: document.getElementById('appointmentNotes')?.value || ''
    };

    // Validate form data
    if (!formData.appointmentType || !formData.appointmentDate || !formData.appointmentTime) {
        const errorDiv = document.getElementById('appointmentError');
        errorDiv.textContent = 'Please fill in all required fields';
        errorDiv.style.display = 'block';
        return;
    }

    fetch('/book_appointment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success || data.status === 'success') {
            showAlert('Appointment booked successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('appointmentModal'));
            if (modal) {
                modal.hide();
                document.getElementById('appointmentForm').reset();
            }
        } else {
            throw new Error(data.message || 'Failed to book appointment');
        }
    })
    .catch(error => {
        const errorDiv = document.getElementById('appointmentError');
        errorDiv.textContent = error.message || 'An error occurred while booking the appointment';
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    });
}

// Helper function to show alerts
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(alertDiv);
    
    // Auto dismiss after 3 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}
