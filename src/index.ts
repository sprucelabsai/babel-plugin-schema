import fs from 'fs'
import pathUtil from 'path'
import fsExtra from 'fs-extra'
import globby from 'globby'
import rimRaf from 'rimraf'
import { loadConfig, createMatchPath } from 'tsconfig-paths'

function assert(truthy: any, message: string) {
	if (!truthy) {
		throw new Error(message)
	}
}

export interface PluginOptions {
	cwd: string
	destination: string
}

// const DIVIDER = "\n\n\n************************************************\n\n\n";
export function copyAndMap(options: PluginOptions) {
	assert(
		options.cwd,
		"You must pass options.cwd. This is where I'll look for the schema module (root of workspace if in monorepo)"
	)
	assert(
		options.destination,
		'You need to pass a options.destination (sub project if mono repo)'
	)

	// places to look for schema
	const target = pathUtil.join(
		options.cwd,
		'node_modules',
		'@sprucelabs',
		'schema'
	)

	const destination = pathUtil.join(
		options.destination,
		'node_modules',
		'@sprucelabs',
		'schema'
	)

	const schemaNodeModules = pathUtil.join(destination, 'node_modules')

	// clear out destination if it exists (and does not match the target)
	if (target !== destination) {
		if (fs.existsSync(destination)) {
			rimRaf.sync(schemaNodeModules)
		}

		// copy schema over
		fsExtra.copySync(target, destination)
	}

	// clear out schemas' node_modules
	if (fs.existsSync(schemaNodeModules)) {
		rimRaf.sync(schemaNodeModules)
	}

	// now map paths to the new schema using the config of the destination
	const config = loadConfig(options.destination)
	if (config.resultType === 'failed') {
		throw new Error(config.message)
	}

	const { absoluteBaseUrl, paths } = config
	const resolver = createMatchPath(absoluteBaseUrl, paths)
	const files = globby.sync(pathUtil.join(destination, '**/*.js'))

	files.forEach((file) => {
		let contents = fs.readFileSync(file).toString()
		let found = false

		contents = `${contents}`.replace(/"#spruce\/(.*?)"/gi, (match) => {
			found = true
			const search = match.replace(/"/g, '')
			const resolved = resolver(search + '.js')
			if (!resolved) {
				throw new Error(`Could not map ${search}.`)
			}
			return `"${resolved}"`
		})

		if (found) {
			fs.writeFileSync(file, contents)
		}
	})
}

export default function (_: any, options: PluginOptions) {
	copyAndMap(options)
	return {}
}
