import { SpruceSchemas } from '../../schemas.types'
import FieldType from '#spruce/schemas/fields/fieldTypeEnum'



const testSchemaSchema: SpruceSchemas.Local.v2020_09_03.ITestSchemaSchema  = {
	id: 'testSchema',
	name: 'Test Schema',
	    fields: {
	            /** First Field. */
	            'fieldName1': {
	                label: 'First Field',
	                type: FieldType.Text,
	                isRequired: true,
	                options: undefined
	            },
	            /** Second Field. A hint */
	            'fieldName2': {
	                label: 'Second Field',
	                type: FieldType.Number,
	                isRequired: true,
	                hint: 'A hint',
	                options: undefined
	            },
	    }
}

export default testSchemaSchema
