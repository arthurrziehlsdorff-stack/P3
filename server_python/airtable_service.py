from pyairtable import Api
import os

AIRTABLE_API_KEY = os.environ.get('AIRTABLE_API_KEY')
AIRTABLE_BASE_ID = os.environ.get('AIRTABLE_BASE_ID')
TABLE_ID = os.environ.get('AIRTABLE_TABLE_ID', 'tblpKvuMzRSp2mrYZ')

FIELD_MODELO = os.environ.get('AIRTABLE_FIELD_MODELO', 'Name')
FIELD_BATERIA = os.environ.get('AIRTABLE_FIELD_BATERIA', 'Bateria')
FIELD_STATUS = os.environ.get('AIRTABLE_FIELD_STATUS', 'Status')
FIELD_LOCALIZACAO = os.environ.get('AIRTABLE_FIELD_LOCALIZACAO', 'Localizacao')

def get_airtable_table():
    if not AIRTABLE_API_KEY or not AIRTABLE_BASE_ID:
        raise Exception("Airtable credentials not configured")
    
    api = Api(AIRTABLE_API_KEY)
    table = api.table(AIRTABLE_BASE_ID, TABLE_ID)
    return table

def fetch_scooters_from_airtable():
    table = get_airtable_table()
    records = table.all()
    
    scooters = []
    for record in records:
        fields = record.get('fields', {})
        scooters.append({
            'airtable_id': record.get('id'),
            'modelo': fields.get(FIELD_MODELO, fields.get('Modelo', fields.get('modelo', ''))),
            'bateria': fields.get(FIELD_BATERIA, fields.get('bateria', 100)),
            'status': fields.get(FIELD_STATUS, fields.get('status', 'livre')),
            'localizacao': fields.get(FIELD_LOCALIZACAO, fields.get('localizacao', '')),
            'id': fields.get('ID', fields.get('id', None))
        })
    
    return scooters

def sync_scooter_to_airtable(scooter_data):
    table = get_airtable_table()
    
    fields = {
        FIELD_MODELO: scooter_data.get('modelo', ''),
    }
    
    if FIELD_BATERIA != 'Bateria':
        fields[FIELD_BATERIA] = scooter_data.get('bateria', 100)
    
    if FIELD_STATUS != 'Status':
        fields[FIELD_STATUS] = scooter_data.get('status', 'livre')
    
    if FIELD_LOCALIZACAO != 'Localizacao':
        fields[FIELD_LOCALIZACAO] = scooter_data.get('localizacao', '')
    
    return table.create(fields)

def sync_scooter_to_airtable_simple(scooter_data):
    table = get_airtable_table()
    
    fields = {
        'Name': scooter_data.get('modelo', ''),
    }
    
    return table.create(fields)

def sync_all_scooters_to_airtable(scooters_list):
    results = []
    for scooter in scooters_list:
        try:
            result = sync_scooter_to_airtable_simple(scooter)
            results.append({'success': True, 'id': scooter.get('id'), 'airtable_id': result.get('id')})
        except Exception as e:
            results.append({'success': False, 'id': scooter.get('id'), 'error': str(e)})
    return results

def delete_scooter_from_airtable(airtable_id):
    table = get_airtable_table()
    
    if airtable_id:
        table.delete(airtable_id)
        return True
    return False

def import_scooters_from_airtable():
    return fetch_scooters_from_airtable()

def get_table_schema():
    table = get_airtable_table()
    records = table.all()
    
    all_fields = set()
    for record in records:
        fields = record.get('fields', {})
        all_fields.update(fields.keys())
    
    return list(all_fields)
