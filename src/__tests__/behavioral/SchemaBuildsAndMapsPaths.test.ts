import { exec } from 'child_process'
import os from 'os'
import AbstractSpruceTest, { test, assert } from '@sprucelabs/test'
import fsUtil from 'fs-extra'
import { copyAndMap } from '../../index'

export default class SchemaBuildsAndMapsPathsTest extends AbstractSpruceTest {
	protected static testDirsToDelete: string[] = []

	@test()
	protected static async buildsSchemaWithoutError() {
		const cwd = await this.setupNewPackage()

		const fieldFactoryFile = this.resolvePath(
			cwd,
			'node_modules/@sprucelabs/schema',
			'build/factories/FieldFactory.js'
		)
		const contents = fsUtil.readFileSync(fieldFactoryFile).toString()
		assert.doesInclude(contents, '#spruce')

		copyAndMap({ cwd, destination: cwd })

		const afterMapContents = fsUtil.readFileSync(fieldFactoryFile).toString()
		assert.doesNotInclude(afterMapContents, '#spruce')
	}

	@test()
	protected static async buildsSchemaAndUsesTheHashSpruceVersionOfFiles() {
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

		// copy ts config
		const sourceTsConfig = this.resolvePath(
			'build',
			'__tests__',
			'files',
			'test-tsconfig.json'
		)
		const tsConfigContents = fsUtil.readFileSync(sourceTsConfig)
		const destinationTsConfig = this.resolvePath(cwd, 'tsconfig.json')

		fsUtil.writeFileSync(destinationTsConfig, tsConfigContents)

		copyAndMap({ cwd, destination: cwd })
	}

	private static async copyDir(source: string, destination: string) {
		fsUtil.ensureDir(destination)
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
		const today = new Date()
		const cwd = this.resolvePath(
			os.tmpdir(),
			'babel-plugin-schema',
			`${today.getTime()}`
		)

		await fsUtil.ensureDir(cwd)

		await new Promise((resolve, reject) => {
			exec(
				`yarn init --yes && yarn add @sprucelabs/schema`,
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

		const tsConfigContents = fsUtil.readFileSync(
			this.resolvePath(__dirname, '..', '..', '..', 'tsconfig.json')
		)
		fsUtil.writeFileSync(
			this.resolvePath(cwd, 'tsconfig.json'),
			tsConfigContents
		)
		return cwd
	}
}
