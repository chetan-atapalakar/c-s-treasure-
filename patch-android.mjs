import fs from 'node:fs';
const f = 'android/app/src/main/AndroidManifest.xml';
let s = fs.readFileSync(f, 'utf8');
s = s.replace(/android:allowBackup="true"/, 'android:allowBackup="false"');
if (!s.includes('screenOrientation')) s = s.replace('<activity', '<activity\n            android:screenOrientation="portrait"');
fs.writeFileSync(f, s);
console.log('AndroidManifest patched');
