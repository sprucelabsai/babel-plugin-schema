#!/usr/bin/env node
import pathUtil from 'path'
import yargs from 'yargs'
import { resolvePathAliases } from './index'

const argv = yargs.options({
	target: {
		desc: "Where I'll look to begin mapping paths. Defaults to cwd.",
	},
	patterns: {
		desc: 'Comma separated list of globby patterns, default to **/*.js',
	},
	absoluteOrRelative: {
		valid: '',
		desc:
			'Should paths resolve relatively or absolutely, valid values are `absolute` or `relative`.',
	},
}).argv

const { patterns, target, absoluteOrRelative } = argv as {
	patterns?: string
	target?: string
	absoluteOrRelative?: 'relative' | 'absolute'
}
const cwd =
	target && target[0] === pathUtil.sep
		? target
		: pathUtil.join(process.cwd(), target ?? '')

console.log(`About to map tsconfig paths in ${cwd}`)
resolvePathAliases(cwd, {
	absoluteOrRelative,
	patterns: patterns ? patterns.split(',') : undefined,
})
console.log('Done!')
