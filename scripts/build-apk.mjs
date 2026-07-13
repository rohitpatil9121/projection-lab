import { spawnSync } from 'node:child_process'
import { copyFileSync } from 'node:fs'
import path from 'node:path'
import { androidBuildEnv, paths } from './android-env.mjs'

const apkOut = path.join(paths.android, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
const apkDest = path.join(paths.root, 'FinancialBlueprint-debug.apk')

const build = spawnSync(`"${paths.gradlew}"`, ['assembleDebug', '--no-daemon'], {
  cwd: paths.android,
  env: androidBuildEnv(),
  stdio: 'inherit',
  shell: true,
})
if (build.status !== 0) process.exit(build.status ?? 1)

copyFileSync(apkOut, apkDest)
console.log(`\nAPK ready: ${apkDest}`)
