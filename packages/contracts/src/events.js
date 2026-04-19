/**
 * WebSocket event type contracts.
 * All events follow: { type: string, channel: string, payload: Object }
 */

export const WS_CHANNELS = {
  VITALS: 'vitals',
  FITNESS: 'fitness',
  NUTRITION: 'nutrition',
  NOTIFICATIONS: 'notifications',
  SOCIAL: 'social'
};

export const WS_EVENT_TYPES = {
  VITAL_LOGGED: 'vital_logged',
  WORKOUT_CREATED: 'workout_created',
  MEAL_LOGGED: 'meal_logged',
  NOTIFICATION_DELIVERED: 'notification_delivered',
  LEADERBOARD_UPDATED: 'leaderboard_updated',
  RANKING_UPDATED: 'ranking_updated'
};
