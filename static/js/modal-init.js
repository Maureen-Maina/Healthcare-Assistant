// Initialize all modals and their functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get all modal triggers
    const modalTriggers = document.querySelectorAll('[data-bs-toggle="modal"]');
    
    // Add click event listeners to all modal triggers
    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', function(e) {
            e.preventDefault();
            const targetModal = document.querySelector(this.getAttribute('data-bs-target'));
            if (targetModal) {
                const modal = new bootstrap.Modal(targetModal);
                modal.show();
            }
        });
    });

    // Get all close buttons
    const closeButtons = document.querySelectorAll('[data-bs-dismiss="modal"]');
    
    // Add click event listeners to all close buttons
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = bootstrap.Modal.getInstance(this.closest('.modal'));
            if (modal) {
                modal.hide();
            }
        });
    });

    // Initialize form handlers
    initializeFormHandlers();
});

function initializeFormHandlers() {
    // BMI Calculator
    const bmiForm = document.getElementById('bmiForm');
    if (bmiForm) {
        bmiForm.addEventListener('submit', function(e) {
            e.preventDefault();
            calculateBMI();
        });
    }

    // Calorie Calculator
    const calorieForm = document.getElementById('calorieForm');
    if (calorieForm) {
        calorieForm.addEventListener('submit', function(e) {
            e.preventDefault();
            calculateCalories();
        });
    }

    // Health Metrics
    const healthForm = document.getElementById('healthMetricsForm');
    if (healthForm) {
        healthForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleHealthMetricsSubmit();
        });
    }

    // Water Intake
    const waterForm = document.getElementById('waterForm');
    if (waterForm) {
        waterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleWaterSubmit();
        });
    }

    // Exercise
    const exerciseForm = document.getElementById('exerciseForm');
    if (exerciseForm) {
        exerciseForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleExerciseSubmit();
        });
    }

    // Goals
    const goalForm = document.getElementById('goalForm');
    if (goalForm) {
        goalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleGoalSubmit();
        });
    }
}
