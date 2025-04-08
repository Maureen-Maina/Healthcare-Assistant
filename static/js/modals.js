// Initialize all modals when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap modals
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modalEl => {
        new bootstrap.Modal(modalEl);
    });

    // Settings Modal Initialization
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
        const modal = new bootstrap.Modal(settingsModal);
        
        // Load current settings when modal opens
        settingsModal.addEventListener('show.bs.modal', function() {
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
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
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
                        'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').content
                    },
                    body: JSON.stringify(formData)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        modal.hide();
                        showAlert('Settings updated successfully!', 'success');
                        // Update any displayed values
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
    }

    // Help Modal Initialization
    const helpModal = document.getElementById('helpModal');
    if (helpModal) {
        new bootstrap.Modal(helpModal);
        
        // Initialize Bootstrap's collapse for accordion
        const accordionItems = helpModal.querySelectorAll('.accordion-collapse');
        accordionItems.forEach(item => {
            new bootstrap.Collapse(item, {
                toggle: false
            });
        });
    }
});

// Helper function to show alerts
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}
