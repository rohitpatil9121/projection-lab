import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function androidBuildEnv() {
  const jdk = path.join(root, '.tools', 'jdk-21')
  const gradleHome = process.env.GRADLE_USER_HOME || path.join(root, '.gradle')
  return {
    ...process.env,
    GRADLE_USER_HOME: gradleHome,
    ANDROID_HOME: process.env.ANDROID_HOME || path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
    JAVA_HOME: existsSync(jdk) ? jdk : process.env.JAVA_HOME,
  }
}

export const paths = {
  root,
  android: path.join(root, 'apps', 'web', 'android'),
  gradlew: path.join(root, 'apps', 'web', 'android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew'),
}
