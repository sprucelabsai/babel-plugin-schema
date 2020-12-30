import { exec } from 'child_process'
import os from 'os'
import pathUtil from 'path'
import AbstractSpruceTest, { test, assert } from '@sprucelabs/test'
import fsUtil from 'fs-extra'
import rimraf from 'rimraf'
import { copy, IResolvePathAliasOptions, resolvePathAliases } from '../../index'

const isDebug = false && process.debugPort > 0

export default class SchemaBuildsAndMapsPathsTest extends AbstractSpruceTest {
	protected static testDirsToDelete: string[] = []

	protected static async afterAll() {
		await super.afterAll()

		for (const dir of this.testDirsToDelete) {
			rimraf.sync(dir)
		}

		this.testDirsToDelete = []
	}

	protected static async afterEach() {
		await super.afterEach()

		for (const dir of this.testDirsToDelete) {
			rimraf.sync(dir)
		}

		this.testDirsToDelete = []
	}

	private static async copyAndResolvePaths(
		cwd: string,
		options: IResolvePathAliasOptions & { useCommandLine?: boolean } = {}
	) {
		const { useCommandLine = false, ...resolveOptions } = options

		copy({
			cwd,
			destination: cwd,
			shouldResolvePathAliases: !options.useCommandLine,
			resolveOptions,
		})

		const schemaPath = this.resolvePath(
			cwd,
			'node_modules',
			'@sprucelabs',
			'schema'
		)

		const srcPath = this.resolvePath(cwd, 'src')
		const srcExists = fsUtil.existsSync(srcPath)

		if (useCommandLine) {
			const promise1 = this.resolvePathAliasesUsingCommandLine(
				schemaPath,
				resolveOptions
			)
			const promise2 = srcExists
				? this.resolvePathAliasesUsingCommandLine(srcPath, resolveOptions)
				: Promise.resolve(undefined)

			await Promise.all([promise1, promise2])
		} else {
			resolvePathAliases(schemaPath, resolveOptions)
			srcExists && resolvePathAliases(srcPath, resolveOptions)
		}
	}

	private static async resolvePathAliasesUsingCommandLine(
		cwd: string,
		resolveOptions: {
			patterns?: string[] | undefined
			absoluteOrRelative?: 'absolute' | 'relative' | undefined
		}
	) {
		const fullOptions = { target: cwd, ...resolveOptions }

		const args = Object.keys(fullOptions).reduce((args, key) => {
			args += ` --${key} ${fullOptions[key as keyof typeof fullOptions]}`
			return args
		}, '')

		const command = `node${
			isDebug ? ' --inspect-brk=9230' : ''
		} ${this.resolvePath('build', 'resolve-path-aliases.js')} ./ ${args}`

		await this.executeCommand(cwd, command)
	}

	@test(
		'resolve paths relatively',
		'test-import.d.ts',
		{
			patterns: ['**/*.d.ts'],
		},
		'relative-paths.ts'
	)
	@test(
		'resolve paths relatively (command line)',
		'test-import.d.ts',
		{
			patterns: ['**/*.d.ts'],
			useCommandLine: true,
		},
		'relative-paths.ts'
	)
	@test(
		'skips files based on pattern',
		'test-import.d.ts',
		{ patterns: ['**/*.js'] },
		'skipped-paths.ts'
	)
	@test(
		'skips files based on pattern (command line)',
		'test-import.d.ts',
		{ patterns: ['**/*.js'], useCommandLine: true },
		'skipped-paths.ts'
	)
	@test(
		'resolve paths absolutely',
		'test-import.js',
		{
			absoluteOrRelative: 'absolute',
		},
		'absolute-paths.ts'
	)
	@test(
		'resolve paths absolutely (command line)',
		'test-import.js',
		{
			absoluteOrRelative: 'absolute',
			useCommandLine: true,
		},
		'absolute-paths.ts'
	)
	protected static async testVariousMatches(
		importFileName: string,
		options: IResolvePathAliasOptions & { useCommandLine?: boolean } = {},
		expectedFileMatch: string
	) {
		const cwd = await this.setupNewPackage()

		const importFileTarget = this.resolvePath(
			'src',
			'__tests__',
			'files',
			'import-test.ts'
		)

		const importFileContents = fsUtil.readFileSync(importFileTarget)
		const destination = this.resolvePath(cwd, 'src', importFileName)

		fsUtil.ensureDirSync(pathUtil.dirname(destination))
		fsUtil.writeFileSync(destination, importFileContents)

		await this.copyAndResolvePaths(cwd, options)

		const updatedContents = fsUtil.readFileSync(destination).toString()
		const expectedPath = this.resolvePath(
			'src',
			'__tests__',
			'files',
			'expected',
			expectedFileMatch
		)

		const expectedContents = fsUtil
			.readFileSync(expectedPath)
			.toString()
			.replace(/{{cwd}}/gis, cwd)

		assert.isEqual(updatedContents.trim(), expectedContents.trim())
	}

	private static async setupNewPackage() {
		const cwd = await this.setupNewCwd()

		await this.invokeYarnCommands(cwd)

		this.copyTsConfig(cwd)

		return cwd
	}

	private static async setupNewCwd() {
		const today = new Date()

		const cwd = this.resolvePath(
			os.tmpdir(),
			'babel-plugin-schema',
			`${today.getTime()}`
		)

		await fsUtil.ensureDir(cwd)

		this.testDirsToDelete.push(cwd)

		return cwd
	}

	private static copyTsConfig(cwd: string) {
		const tsConfigContents = fsUtil.readFileSync(
			this.resolvePath('src', '__tests__', 'files', 'test-tsconfig.json')
		)

		fsUtil.writeFileSync(
			this.resolvePath(cwd, 'tsconfig.json'),
			tsConfigContents
		)
	}

	private static async invokeYarnCommands(cwd: string) {
		await this.executeCommand(
			cwd,
			`yarn init --yes && yarn add @sprucelabs/schema`
		)
	}

	private static async executeCommand(cwd: string, command: string) {
		await new Promise((resolve, reject) => {
			exec(
				command,
				{
					cwd,
					env: {
						PATH: process.env.PATH,
					},
				},
				(err) => {
					if (err) {
						reject(err)
					} else {
						resolve(undefined)
					}
				}
			)
		})
	}
}
