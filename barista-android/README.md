# Barista Android App

This Android Studio project is for turning the barista screen into an installable Android app (`.apk`).

## Important Architecture

If you want this to be truly standalone from your PC, the Android app should **not** connect directly to Neon using raw database credentials.

The safe setup is:

1. Deploy the existing Node/Express app online
2. Keep Neon connected only to that backend
3. Point the Android app to the hosted barista URL

That way:
- the APK works without your PC being on
- your Neon connection string stays private
- all barista devices use the same live data

## Current Android App Type

This app is a `WebView` wrapper for the barista page:

```text
https://yooo-7rk5.onrender.com/barista
```

So once your backend is hosted online, the APK can load that screen directly.

## What I Changed For Online Use

- the Android app now uses a hosted URL placeholder instead of your local PC IP
- the Node server now supports hosted deployment more cleanly
- a `render.yaml` file is included for easier Render deployment
- a `/health` route is included for server health checks

## Files To Configure

### Android app URL

Edit:

[`app/src/main/res/values/strings.xml`](</c:/Users/Prince Joshner/Downloads/praf-pos/barista-android/app/src/main/res/values/strings.xml:1>)

Change:

```xml
<string name="barista_url">https://yooo-7rk5.onrender.com/barista</string>
```

to your real deployed URL if it ever changes, for example:

```xml
<string name="barista_url">https://praf-pos.onrender.com/barista</string>
```

### Backend environment variables

For your hosted backend, you need:

- `DATABASE_URL`
- `PORT`
- `HOST`

Reference file:

[`../.env.example`](</c:/Users/Prince Joshner/Downloads/praf-pos/.env.example:1>)

## Recommended Deployment Path

The easiest path is to deploy the root Node app to Render.

This repo now includes:

[`../render.yaml`](</c:/Users/Prince Joshner/Downloads/praf-pos/render.yaml:1>)

### On Render

1. Push the project to GitHub
2. Create a new Render web service
3. Point it to this repo
4. Add your `DATABASE_URL`
5. Deploy

After deploy, your app URL should look like:

```text
https://yooo-7rk5.onrender.com
```

Then the barista page will be:

```text
https://yooo-7rk5.onrender.com/barista
```

## Build APK

1. Open `barista-android` in Android Studio
2. Wait for Gradle sync
3. Confirm `barista_url` in `strings.xml` is correct
4. Go to `Build`
5. Choose `Build APK(s)`

Typical debug APK output:

```text
barista-android\app\build\outputs\apk\debug\app-debug.apk
```

## Install On Android Phone

You can:
- run directly from Android Studio
- or copy the generated APK to the phone and install it

## When This Will Be Fully Standalone

It becomes effectively standalone once:
- the Node app is deployed online
- Neon is connected to that hosted backend
- the Android app uses the hosted `/barista` URL

At that point:
- no local `localhost`
- no PC required
- APK works from anywhere with internet

## Future Improvement

If you want later, I can also convert the Android app from a WebView wrapper into a more native Android app that talks to your hosted API directly.
