/**
 * Shared API DTO type definitions (JSDoc contracts).
 * These mirror backend validation schemas and can be used by web / admin / mobile.
 */

/**
 * @typedef {Object} AuthLoginRequest
 * @property {string} email
 * @property {string} password
 */

/**
 * @typedef {Object} AuthSignupRequest
 * @property {string} email
 * @property {string} password - min 8 characters
 * @property {string} name
 * @property {'user'|'doctor'|'trainer'|'nutritionist'|'admin'} [role]
 */

/**
 * @typedef {Object} AuthTokenResponse
 * @property {{ id: string, email: string, full_name: string, role: string }} user
 * @property {string} accessToken
 * @property {string} refreshToken
 */

/**
 * @typedef {Object} HealthProfile
 * @property {string} user_id
 * @property {number|null} age
 * @property {number|null} height_cm
 * @property {number|null} weight_kg
 * @property {string|null} blood_group
 * @property {string[]} medical_conditions
 * @property {string[]} allergies
 * @property {Object} emergency_contacts
 */

/**
 * @typedef {Object} VitalEntry
 * @property {string} id
 * @property {string} user_id
 * @property {string} recorded_at
 * @property {number|null} heart_rate
 * @property {number|null} systolic_bp
 * @property {number|null} diastolic_bp
 * @property {number|null} spo2
 * @property {number|null} temperature_c
 * @property {number|null} sleep_hours
 * @property {number|null} stress_level
 * @property {number|null} calories_burned
 */

/**
 * @typedef {Object} Workout
 * @property {string} id
 * @property {string} user_id
 * @property {string} title
 * @property {number|null} duration_seconds
 * @property {number|null} calories_burned
 * @property {string|null} started_at
 * @property {string|null} completed_at
 */

/**
 * @typedef {Object} WorkoutExercise
 * @property {string} id
 * @property {string} workout_id
 * @property {string} muscle_group
 * @property {string} exercise_name
 * @property {number} sets
 * @property {number} reps
 * @property {number} weight_kg
 * @property {number} rest_seconds
 */

/**
 * @typedef {Object} NutritionLog
 * @property {string} id
 * @property {string} user_id
 * @property {string} meal_type
 * @property {string} meal_name
 * @property {string} consumed_at
 * @property {number|null} calories
 * @property {number|null} protein_g
 * @property {number|null} carbs_g
 * @property {number|null} fat_g
 */

/**
 * @typedef {Object} Appointment
 * @property {string} id
 * @property {string} user_id
 * @property {string} provider_user_id
 * @property {string} starts_at
 * @property {string} ends_at
 * @property {string} status
 * @property {string|null} meeting_url
 */

/**
 * @typedef {Object} Report
 * @property {string} id
 * @property {string} user_id
 * @property {'health'|'fitness'|'nutrition'|'combined'} report_type
 * @property {'pdf'|'csv'} format
 * @property {'queued'|'processing'|'completed'|'failed'} status
 * @property {Object} filters
 * @property {string|null} file_url
 * @property {string} requested_at
 */

export {};
