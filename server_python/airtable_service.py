from pyairtable import Api
import os

AIRTABLE_API_KEY = os.environ.get('AIRTABLE_API_KEY')
AIRTABLE_BASE_ID = os.environ.get('AIRTABLE_BASE_ID')

TABLE_NAME = 'Scooters'

def get_airtable_table():
    if not AIRTABLE_API_KEY or not AIRTABLE_BASE_ID:
        raise Exception("Airtable credentials not configured")
    
    api = Api(AIRTABLE_API_KEY)
    table = api.table(AIRTABLE_BASE_ID, TABLE_NAME)
    return table

def fetch_scooters_from_airtable():
    table = get_airtable_table()
    records = table.all()
    
    scooters = []
    for record in records:
        fields = record.get('fields', {})
        scooters.append({
            'airtable_id': record.get('id'),
            'modelo': fields.get('Modelo', fields.get('modelo', '')),
            'bateria': fields.get('Bateria', fields.get('bateria', 100)),
            'status': fields.get('Status', fields.get('status', 'livre')),
            'localizacao': fields.get('Localizacao', fields.get('localizacao', '')),
            'id': fields.get('ID', fields.get('id', None))
        })
    
    return scooters

def sync_scooter_to_airtable(scooter_data):
    table = get_airtable_table()
    
    fields = {
        'ID': scooter_data.get('id'),
        'Modelo': scooter_data.get('modelo'),
        'Bateria': scooter_data.get('bateria'),
        'Status': scooter_data.get('status'),
        'Localizacao': scooter_data.get('localizacao')
    }
    
    existing = table.all(formula=f"{{ID}}='{scooter_data.get('id')}'")
    
    if existing:
        record_id = existing[0]['id']
        return table.update(record_id, fields)
    else:
        return table.create(fields)

def sync_all_scooters_to_airtable(scooters_list):
    results = []
    for scooter in scooters_list:
        try:
            result = sync_scooter_to_airtable(scooter)
            results.append({'success': True, 'id': scooter.get('id'), 'airtable_id': result.get('id')})
        except Exception as e:
            results.append({'success': False, 'id': scooter.get('id'), 'error': str(e)})
    return results

def delete_scooter_from_airtable(scooter_id):
    table = get_airtable_table()
    
    existing = table.all(formula=f"{{ID}}='{scooter_id}'")
    
    if existing:
        record_id = existing[0]['id']
        table.delete(record_id)
        return True
    return False

def import_scooters_from_airtable():
    return fetch_scooters_from_airtable()
