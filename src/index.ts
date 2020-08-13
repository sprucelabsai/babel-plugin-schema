import fs from 'fs'
import pathUtil from 'path'
import fsExtra from 'fs-extra'
import globby from 'globby'
import rimRaf from 'rimraf'
import {
	loadConfig,
	createMatchPath,
	MatchPath,
	ConfigLoaderSuccessResult,
} from 'tsconfig-paths'

function assert(truthy: any, message: string) {
	if (!truthy) {
		throw new Error(message)
	}
}

export interface PluginOptions {
	cwd: string
	destination: string
}

export function copyAndMap(options: PluginOptions) {
	assert(
		options.cwd,
		"You must pass options.cwd. This is where I'll look for the schema module (root of workspace if in monorepo)"
	)
	assert(
		options.destination,
		'You need to pass a options.destination (sub project if mono repo)'
	)

	const destination = ensureDirsAndResolveDestination(options)

	let { outResolver, srcResolver } = buildResolvers(destination)

	const files = globby.sync(pathUtil.join(destination, '**/*.js'))

	files.forEach((file) => {
		let contents = fs.readFileSync(file).toString()
		let found = false

		contents = `${contents}`.replace(/"#spruce\/(.*?)"/gi, (match) => {
			found = true
			const search = match.replace(/"/g, '')
			let resolved: string | undefined

			if (outResolver) {
				resolved = outResolver(search, undefined, undefined, ['.js'])
			}

			if (!resolved) {
				resolved = srcResolver(search, undefined, undefined, ['.ts', '.js'])
			}

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

function buildResolvers(
	destination: string
): {
	outResolver: MatchPath | undefined
	srcResolver: MatchPath
} {
	const config = loadConfig(destination)

	if (config.resultType === 'failed') {
		throw new Error(config.message)
	}

	const { paths, absoluteBaseUrl } = config
	const srcResolver = createMatchPath(absoluteBaseUrl, paths)

	const outResolver = buildOutResolver(config)

	return { outResolver, srcResolver }
}

function buildOutResolver(
	config: ConfigLoaderSuccessResult
): MatchPath | undefined {
	const fullTsConfig = JSON.parse(
		fs.readFileSync(config.configFileAbsolutePath).toString()
	)

	const {
		compilerOptions: { outDir },
	} = fullTsConfig

	let outResolver: MatchPath | undefined

	if (outDir) {
		const resolvedOutDir = pathUtil.join(
			pathUtil.dirname(config.configFileAbsolutePath),
			outDir
		)

		outResolver = createMatchPath(resolvedOutDir, config.paths)
	}

	return outResolver
}

function ensureDirsAndResolveDestination(options: PluginOptions) {
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
	return destination
}

export default function (_: any, options: PluginOptions) {
	copyAndMap(options)
	return {}
}
