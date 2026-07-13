import { spawnSync } from 'node:child_process'
import { copyFileSync } from 'node:fs'
import path from 'node:path'
import { androidBuildEnv, paths } from './android-env.mjs'

const aabOut = path.join(paths.android, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab')
const aabDest = path.join(paths.root, 'FinancialBlueprint-release.aab')

const build = spawnSync(`"${paths.gradlew}"`, ['bundleRelease', '--no-daemon'], {
  cwd: paths.android,
  env: androidBuildEnv(),
  stdio: 'inherit',
  shell: true,
})
if (build.status !== 0) process.exit(build.status ?? 1)

copyFileSync(aabOut, aabDest)
console.log(`\nAAB ready: ${aabDest}`)
console.log('Upload this file to Google Play Console.')
