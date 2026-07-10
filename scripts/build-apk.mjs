import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const jdk = path.join(root, '.tools', 'jdk-21')
const android = path.join(root, 'apps', 'web', 'android')
const gradlew = path.join(android, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')
const apkOut = path.join(android, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
const apkDest = path.join(root, 'ProjectLab-debug.apk')

const env = {
  ...process.env,
  ANDROID_HOME: process.env.ANDROID_HOME || path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
  JAVA_HOME: existsSync(jdk) ? jdk : process.env.JAVA_HOME,
}

const build = spawnSync(`"${gradlew}"`, ['assembleDebug', '--no-daemon'], { cwd: android, env, stdio: 'inherit', shell: true })
if (build.status !== 0) process.exit(build.status ?? 1)

copyFileSync(apkOut, apkDest)
console.log(`\nAPK ready: ${apkDest}`)
