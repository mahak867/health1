package com.healthsphere.mobile

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/**
 * HealthSphere Android home-screen widget.
 *
 * Data is written by Flutter via the [home_widget] package into a
 * SharedPreferences file named "HomeWidgetPreferences".  This provider reads
 * those values and builds the RemoteViews that Android displays.
 *
 * AndroidManifest.xml registration (add inside <application>):
 *
 *   <receiver
 *     android:name=".HealthSphereWidgetProvider"
 *     android:exported="true">
 *     <intent-filter>
 *       <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
 *     </intent-filter>
 *     <meta-data
 *       android:name="android.appwidget.provider"
 *       android:resource="@xml/healthsphere_widget_info" />
 *   </receiver>
 */
class HealthSphereWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    companion object {
        /** SharedPreferences file written by the home_widget Flutter package. */
        private const val PREFS_NAME = "HomeWidgetPreferences"

        fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            widgetId: Int
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            val heartRate   = prefs.getInt("heartRate", 0)
            val calBurned   = prefs.getInt("calBurned", 0)
            val calEaten    = prefs.getInt("calEaten",  0)
            val waterMl     = prefs.getInt("waterMl",   0)
            val steps       = prefs.getInt("steps",     0)
            val sleepHrs    = prefs.getFloat("sleepHrs", 0f)
            val lastUpdated = prefs.getString("lastUpdated", "--:--") ?: "--:--"

            val views = RemoteViews(context.packageName, R.layout.healthsphere_widget)

            // Vital tiles
            views.setTextViewText(R.id.widget_heart_rate,
                if (heartRate > 0) "$heartRate bpm" else "— bpm")
            views.setTextViewText(R.id.widget_cal_burned,
                if (calBurned > 0) "$calBurned kcal" else "— kcal")
            views.setTextViewText(R.id.widget_cal_eaten,
                if (calEaten > 0) "$calEaten kcal" else "— kcal")
            views.setTextViewText(R.id.widget_water,
                if (waterMl > 0) "${"%.1f".format(waterMl / 1000.0)} L" else "— L")
            views.setTextViewText(R.id.widget_steps,
                if (steps > 0) steps.toString() else "—")
            views.setTextViewText(R.id.widget_sleep,
                if (sleepHrs > 0) "${"%.1f".format(sleepHrs)} h" else "— h")
            views.setTextViewText(R.id.widget_last_updated, "Updated $lastUpdated")

            // Tap → open the app
            val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (intent != null) {
                val pendingIntent = PendingIntent.getActivity(
                    context, 0, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
            }

            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }
}
