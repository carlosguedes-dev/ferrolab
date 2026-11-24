/**
 * Aplica ícones nativos, tema escuro nativo (#07080B na status bar, nav bar e splash)
 * e versão sincronizada no projeto Android gerado pelo Capacitor.
 */
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const appVersion = pkg.version || '2.0.0';
const [major = 2, minor = 0, patch = 0] = appVersion
  .split('.')
  .map((n) => parseInt(n, 10) || 0);
const versionCode = major * 100 + minor * 10 + patch;

const androidResTarget = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');
const androidIconsSrc = path.join(rootDir, 'resources', 'native-icons', 'android');

if (!fs.existsSync(androidResTarget)) {
  console.log('Pasta android/ não encontrada ainda; rode npx cap add android primeiro.');
  process.exit(0);
}

if (fs.existsSync(androidIconsSrc)) {
  const entries = fs.readdirSync(androidIconsSrc, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const srcDir = path.join(androidIconsSrc, entry.name);
    const destDir = path.join(androidResTarget, entry.name);
    fs.mkdirSync(destDir, { recursive: true });
    for (const file of fs.readdirSync(srcDir)) {
      fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
    }
  }
}

const valuesDir = path.join(androidResTarget, 'values');
fs.mkdirSync(valuesDir, { recursive: true });

// Fundo escuro do Adaptive Icon
fs.writeFileSync(
  path.join(valuesDir, 'ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#07080B</color>
</resources>
`,
  'utf8',
);

// Cores do tema escuro nativo Android (zero flash branco!)
fs.writeFileSync(
  path.join(valuesDir, 'colors.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#111319</color>
    <color name="colorPrimaryDark">#07080B</color>
    <color name="colorAccent">#CCFF00</color>
</resources>
`,
  'utf8',
);

// Status bar, navigation bar e splash escuros nativos
fs.writeFileSync(
  path.join(valuesDir, 'styles.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
        <item name="android:windowBackground">#07080B</item>
        <item name="android:statusBarColor">#07080B</item>
        <item name="android:navigationBarColor">#07080B</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:windowBackground">#07080B</item>
        <item name="android:statusBarColor">#07080B</item>
        <item name="android:navigationBarColor">#07080B</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">#07080B</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
    </style>
</resources>
`,
  'utf8',
);

// Sincronizar versionCode e versionName em android/app/build.gradle
const gradlePath = path.join(rootDir, 'android', 'app', 'build.gradle');
if (fs.existsSync(gradlePath)) {
  let gradle = fs.readFileSync(gradlePath, 'utf8');
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${appVersion}"`);
  fs.writeFileSync(gradlePath, gradle, 'utf8');
}

console.log(`✓ Ícones nativos Android, tema escuro #07080B e versão ${appVersion} (code ${versionCode}) aplicados.`);
