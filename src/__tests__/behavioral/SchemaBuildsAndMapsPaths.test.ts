import { exec } from 'child_process'
import os from 'os'
import AbstractSpruceTest, { test, assert } from '@sprucelabs/test'
import fsUtil from 'fs-extra'
import rimraf from 'rimraf'
import { copyAndMap } from '../../index'

export default class SchemaBuildsAndMapsPathsTest extends AbstractSpruceTest {
	protected static testDirsToDelete: string[] = []

	protected static async afterAll() {
		await super.afterAll()
		for (const dir of this.testDirsToDelete) {
			rimraf.sync(dir)
		}
	}

	@test()
	protected static async buildsSchemaWithoutErrorWithoutLocalHashSpruce() {
		const cwd = await this.setupNewPackage()

		const fieldFactoryFile = this.fieldFactoryFilepath(cwd)
		const contents = fsUtil.readFileSync(fieldFactoryFile).toString()

		assert.doesInclude(contents, '#spruce')

		copyAndMap({ cwd, destination: cwd })

		const afterMapContents = fsUtil.readFileSync(fieldFactoryFile).toString()

		assert.doesNotInclude(afterMapContents, cwd)
		assert.doesNotInclude(afterMapContents, '#spruce')
		assert.doesInclude(
			afterMapContents,
			'./../.spruce/schemas/fields/fieldClassMap'
		)
	}

	private static fieldFactoryFilepath(cwd: string) {
		return this.resolvePath(
			cwd,
			'node_modules/@sprucelabs/schema',
			'build/factories/FieldFactory.js'
		)
	}

	@test()
	protected static async buildsSchemaAndUsesTheLocalHashSpruceVersionOfFiles() {
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

		copyAndMap({ cwd, destination: cwd })

		const fieldFactoryFile = this.fieldFactoryFilepath(cwd)
		const afterMapContents = fsUtil.readFileSync(fieldFactoryFile).toString()

		assert.doesNotInclude(afterMapContents, '#spruce')
		assert.doesInclude(
			afterMapContents,
			'./../../../../../build/.spruce/schemas/fields/fieldClassMap'
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

		await this.runCommand(cwd, 'yarn')
		await this.runCommand(cwd, 'yarn build')

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
		await this.runCommand(cwd, `yarn init --yes && yarn add @sprucelabs/schema`)
	}

	private static async runCommand(cwd: string, command: string) {
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
