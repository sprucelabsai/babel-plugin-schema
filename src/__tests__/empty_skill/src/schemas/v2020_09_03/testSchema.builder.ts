import  { buildSchema } from '@sprucelabs/schema'
import FieldType from '#spruce/schemas/fields/fieldTypeEnum'

export default buildSchema({
	id: 'testSchema',
	name: 'Test Schema',
    description: '',
	fields: {
		fieldName1: {
			type: FieldType.Text,
			label: 'First Field',
			isRequired: true
		},
		fieldName2: {
			type: FieldType.Number,
			label: 'Second Field',
			isRequired: true,
			hint:
				'A hint'
		}
	}
})

