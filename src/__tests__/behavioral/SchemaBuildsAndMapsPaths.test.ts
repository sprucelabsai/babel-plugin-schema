import { exec } from 'child_process'
import os from 'os'
import pathUtil from 'path'
import AbstractSpruceTest, { test, assert } from '@sprucelabs/test'
import fsUtil from 'fs-extra'
import { copyAndMap } from '../../index'

export default class SchemaBuildsAndMapsPathsTest extends AbstractSpruceTest {
	@test()
	protected static async buildsSchemaWithoutError() {
		const cwd = await this.setupNewPackage()

		const fieldFactoryFile = pathUtil.join(
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

	private static async setupNewPackage() {
		const today = new Date()
		const cwd = pathUtil.join(
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
			pathUtil.join(__dirname, '..', '..', '..', 'tsconfig.json')
		)
		fsUtil.writeFileSync(pathUtil.join(cwd, 'tsconfig.json'), tsConfigContents)
		return cwd
	}
}
