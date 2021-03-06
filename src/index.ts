import fs from 'fs'
import pathUtil from 'path'
import chalk from 'chalk'
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
	shouldResolvePathAliases?: boolean
	resolveOptions?: IResolvePathAliasOptions
}

export interface IResolvePathAliasOptions {
	patterns?: string[]
	absoluteOrRelative?: 'relative' | 'absolute'
	beVerbose?: boolean
}

export function copy(options: PluginOptions) {
	assert(
		options.cwd,
		"You must pass options.cwd. This is where I'll look for the schema module (root of workspace if in monorepo)"
	)
	assert(
		options.destination,
		'You need to pass a options.destination (sub project if mono repo)'
	)

	const destination = ensureDirsAndResolveDestination(options)

	if (options.shouldResolvePathAliases !== false) {
		resolvePathAliases(destination, options.resolveOptions)
	}
}

const logStub = {
	info: () => {},
	warning: () => {},
	error: () => {},
}

const logLive = {
	info: (...message: string[]) => console.log(chalk.italic(...message)),
	warning: (...message: string[]) => console.log(chalk.yellow(...message)),
	error: (...message: string[]) => console.log(chalk.red(...message)),
}

export function resolvePathAliases(
	destination: string,
	options: IResolvePathAliasOptions = {}
) {
	let { outResolver, srcResolver } = buildResolvers(destination)

	const {
		patterns = ['**/*.js'],
		absoluteOrRelative = 'relative',
		beVerbose: isVerbose = false,
	} = options

	const log = isVerbose ? logLive : logStub
	let totalMappedPaths = 0
	let totalFilesWithMappedPaths = 0

	const files = globby.sync(
		patterns.map((pattern) => pathUtil.join(destination, '/', pattern)),
		{
			dot: true,
		}
	)

	log.info(`Checking ${files.length} files for path aliases...`)

	files.forEach((file) => {
		let contents = fs.readFileSync(file).toString()
		let found = false

		contents = `${contents}`.replace(
			/(from |import |require\()['"](#spruce\/(.*?))['"]/gi,
			(_, requireOrImport, match) => {
				found = true
				const search = match
				let resolved: string | undefined

				log.info('Found', search, 'in', file)

				if (outResolver) {
					resolved = outResolver(search, undefined, undefined, ['.ts', '.js'])
				}

				if (!resolved) {
					resolved = srcResolver(search, undefined, undefined, ['.ts', '.js'])
				}

				if (!resolved) {
					throw new Error(`Could not map ${search} in ${file}.`)
				}

				totalMappedPaths++

				const relative =
					absoluteOrRelative === 'relative'
						? './' + pathUtil.relative(pathUtil.dirname(file), resolved)
						: resolved
				return `${requireOrImport}"${relative}"`
			}
		)

		if (found) {
			totalFilesWithMappedPaths++
			fs.writeFileSync(file, contents)
		}
	})

	return {
		totalMappedPaths,
		totalFilesWithMappedPaths,
	}
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
		compilerOptions: { baseUrl, outDir },
	} = fullTsConfig

	let outResolver: MatchPath | undefined

	if (outDir) {
		const resolver = createMatchPath(config.absoluteBaseUrl, config.paths)
		outResolver = (
			requested: string,
			readJson?: any,
			fileExists?: any,
			extensions?: readonly string[]
		) => {
			let resolved = resolver(requested, readJson, fileExists, extensions)
			resolved = resolved?.replace(
				`${pathUtil.sep}${baseUrl}${pathUtil.sep}`,
				`${pathUtil.sep}${outDir}${pathUtil.sep}`
			)

			return resolved
		}
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

	return pathUtil.join(destination, 'build')
}

export default function (_: any, options: PluginOptions) {
	copy(options)
	return {}
}
