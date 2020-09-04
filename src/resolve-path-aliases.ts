#!/usr/bin/env node
import pathUtil from 'path'
import { resolveHashSpruceAliases } from './index'

const [, , buildPath] = process.argv
const cwd = pathUtil.join(process.cwd(), buildPath ?? '')

console.log(`About to map tsconfig paths in ${cwd}`)
resolveHashSpruceAliases(cwd)
console.log('Done!')
