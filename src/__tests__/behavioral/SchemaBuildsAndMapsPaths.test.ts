import { exec } from 'child_process'
import os from 'os'
import pathUtil from 'path'
import AbstractSpruceTest, { test, assert } from '@sprucelabs/test'
import fsUtil from 'fs-extra'
import rimraf from 'rimraf'
import { copy, resolvePathAliases, IResolvePathAliasOptions } from '../../index'

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

	@test('builds and resolves without local hash spruce (direct command)')
	@test('builds and resolves without local hash spruce (command line)', true)
	protected static async buildsSchemaWithoutErrorWithoutLocalHashSpruce(
		useCommandLine?: boolean
	) {
		const cwd = await this.setupNewPackage()

		const fieldFactoryFile = this.fieldFactoryFilepath(cwd)
		const contents = fsUtil.readFileSync(fieldFactoryFile).toString()

		assert.doesInclude(contents, '#spruce')

		await this.copyAndMap(cwd, { useCommandLine })

		const afterMapContents = fsUtil.readFileSync(fieldFactoryFile).toString()

		assert.doesNotInclude(afterMapContents, cwd)
		assert.doesNotInclude(afterMapContents, '#spruce')
		assert.doesInclude(
			afterMapContents,
			'./../.spruce/schemas/fields/fieldClassMap'
		)
	}

	private static async copyAndMap(
		cwd: string,
		options: IResolvePathAliasOptions & { useCommandLine?: boolean } = {}
	) {
		copy({ cwd, destination: cwd })
		const { useCommandLine = false, ...resolveOptions } = options

		if (useCommandLine) {
			await this.resolvePathAliasesUsingCommandLine(cwd, resolveOptions)
		} else {
			resolvePathAliases(cwd, resolveOptions)
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
		$importFileName: string,
		options: IResolvePathAliasOptions = {},
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
		const destination = this.resolvePath(cwd, 'src', $importFileName)

		fsUtil.ensureDirSync(pathUtil.dirname(destination))
		fsUtil.writeFileSync(destination, importFileContents)

		await this.copyAndMap(cwd, options)

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

	private static fieldFactoryFilepath(cwd: string) {
		return this.resolvePath(
			cwd,
			'node_modules/@sprucelabs/schema',
			'build/factories/FieldFactory.js'
		)
	}

	@test('build schema and use local hash spruce version of files', false)
	@test(
		'build schema and use local hash spruce version of files (command line)',
		true
	)
	protected static async buildsSchemaAndUsesTheLocalHashSpruceVersionOfFiles(
		useCommandLine?: boolean
	) {
		const cwd = await this.setupNewPackage()

		// copy schema files
		const sourceHashSpruce = this.resolvePath(
			cwd,
			'node_modules',
			'@sprucelabs/schema',
			'build',
			'.spruce'
		)

		const destinationHashSpruce = this.resolvePath(cwd, 'src', '.spruce')
		await this.copyDir(sourceHashSpruce, destinationHashSpruce)

		// copy schema.types example
		const sourceSchemaTypes = this.resolvePath('src', '__tests__', 'files')

		const schemaTypesDestination = this.resolvePath(
			destinationHashSpruce,
			'schemas'
		)

		await this.copyDir(sourceSchemaTypes, schemaTypesDestination)

		await this.copyAndMap(cwd, {
			useCommandLine,
			patterns: ['**/*.js', '**/*.d.ts'],
		})

		const fieldFactoryFile = this.fieldFactoryFilepath(cwd)
		const afterMapContents = fsUtil.readFileSync(fieldFactoryFile).toString()

		assert.doesNotInclude(afterMapContents, '#spruce')
		assert.doesInclude(
			afterMapContents,
			'./../../../../../build/.spruce/schemas/fields/fieldClassMap'
		)

		const schemaTypesFile = this.resolvePath(
			schemaTypesDestination,
			'schemas.types.d.ts'
		)
		const schemaTypesContent = fsUtil.readFileSync(schemaTypesFile).toString()
		assert.doesNotInclude(schemaTypesContent, '#spruce')
		assert.doesInclude(
			schemaTypesContent,
			'./../../../build/.spruce/schemas/fields/fieldTypeEnum'
		)
	}

	@test()
	protected static async testBuildingFullSkillWithBabel() {
		const cwd = await this.setupNewCwd()

		const sourceDir = this.resolvePath('src', '__tests__', 'empty_skill')
		await this.copyDir(sourceDir, cwd)

		const buildIndex = this.resolvePath('build', 'index.js')
		const babelFile = this.resolvePath(cwd, 'babel.config.js')

		let babelContents = fsUtil
			.readFileSync(babelFile)
			.toString()
			.replace('{{schema-plugin}}', buildIndex)

		fsUtil.writeFileSync(babelFile, babelContents)

		await this.executeCommand(cwd, 'yarn')
		await this.executeCommand(cwd, 'yarn build')

		const checkFile = this.fieldFactoryFilepath(cwd)
		const checkFileContents = fsUtil.readFileSync(checkFile).toString()

		assert.doesNotInclude(checkFileContents, 'src/.spruce')
		assert.doesInclude(
			checkFileContents,
			'./../../../../../build/.spruce/schemas/fields/fieldClassMap'
		)
	}

	private static async copyDir(source: string, destination: string) {
		await fsUtil.ensureDir(destination)
		return new Promise((resolve) => {
			exec(
				`cd ${source} && tar cf - . | (cd ${destination}; tar xf -)`,
				{ maxBuffer: 1024 * 1024 * 5 },
				(err, stdout) => {
					if (err) {
						throw err
					}
					resolve(stdout)
				}
			)
		})
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
						resolve()
					}
				}
			)
		})
	}
}
