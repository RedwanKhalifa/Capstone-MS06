# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app on a physical Android phone with Expo Go

   ```bash
   # recommended (works across different networks)
   npm run start
   ```

   If you still get cache/update errors, run:

   ```bash
   npm run start:clear
   ```

   > Note: BLE scanning is disabled in Expo Go because it requires a custom native build.

## If you see "Failed to download remote update"

Use this exact recovery order:

1. Update **Expo Go** from the Play Store (updating npm on your laptop does not update Expo Go).
2. Force stop Expo Go and clear its app cache/storage.
3. Start Metro with a clean cache:

   ```bash
   npm run start:clear
   ```

4. Scan the new QR code from the terminal.
5. Keep phone + laptop on stable internet and disable VPN/proxy while testing.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
