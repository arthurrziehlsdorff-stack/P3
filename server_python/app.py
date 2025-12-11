from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO
from datetime import datetime
from decimal import Decimal
from dateutil import parser as date_parser
import os
import uuid

try:
    from airtable_service import (
        fetch_scooters_from_airtable,
        sync_scooter_to_airtable,
        sync_all_scooters_to_airtable,
        delete_scooter_from_airtable,
        import_scooters_from_airtable
    )
    AIRTABLE_AVAILABLE = True
except Exception as e:
    AIRTABLE_AVAILABLE = False
    print(f"Airtable service not available: {e}")

app = Flask(__name__, static_folder='../public', static_url_path='/static')
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='gevent')

DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from models import Base, Scooter, Viagem, Manutencao
    
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
else:
    engine = None
    SessionLocal = None

def get_db():
    if SessionLocal is None:
        raise Exception("Database not configured")
    return SessionLocal()

def broadcast_event(event_type, data):
    socketio.emit('update', {
        "type": event_type,
        "payload": data,
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/scooters', methods=['GET'])
def get_scooters():
    db = get_db()
    try:
        scooters = db.query(Scooter).order_by(Scooter.ultima_atualizacao.desc()).all()
        return jsonify([s.to_dict() for s in scooters]), 200
    finally:
        db.close()

@app.route('/api/scooters/disponiveis', methods=['GET'])
def get_available_scooters():
    db = get_db()
    try:
        scooters = db.query(Scooter).filter(
            Scooter.status == 'livre',
            Scooter.bateria > 20
        ).all()
        return jsonify([s.to_dict() for s in scooters]), 200
    finally:
        db.close()

@app.route('/api/scooters/<scooter_id>', methods=['GET'])
def get_scooter(scooter_id):
    db = get_db()
    try:
        scooter = db.query(Scooter).filter(Scooter.id == scooter_id).first()
        if not scooter:
            return jsonify({"message": "Scooter nao encontrada"}), 404
        return jsonify(scooter.to_dict()), 200
    finally:
        db.close()

@app.route('/api/scooters', methods=['POST'])
def create_scooter():
    db = get_db()
    try:
        data = request.get_json()
        scooter = Scooter(
            id=str(uuid.uuid4()),
            modelo=data.get('modelo'),
            bateria=data.get('bateria', 100),
            status=data.get('status', 'livre'),
            localizacao=data.get('localizacao')
        )
        db.add(scooter)
        db.commit()
        db.refresh(scooter)
        result = scooter.to_dict()
        broadcast_event('scooter:created', result)
        return jsonify(result), 201
    except Exception as e:
        db.rollback()
        return jsonify({"message": "Erro ao criar scooter", "error": str(e)}), 500
    finally:
        db.close()

@app.route('/api/scooters/<scooter_id>', methods=['PATCH'])
def update_scooter(scooter_id):
    db = get_db()
    try:
        scooter = db.query(Scooter).filter(Scooter.id == scooter_id).first()
        if not scooter:
            return jsonify({"message": "Scooter nao encontrada"}), 404
        
        data = request.get_json()
        if 'modelo' in data:
            scooter.modelo = data['modelo']
        if 'bateria' in data:
            scooter.bateria = data['bateria']
        if 'status' in data:
            scooter.status = data['status']
        if 'localizacao' in data:
            scooter.localizacao = data['localizacao']
        
        scooter.ultima_atualizacao = datetime.utcnow()
        db.commit()
        db.refresh(scooter)
        result = scooter.to_dict()
        broadcast_event('scooter:updated', result)
        return jsonify(result), 200
    except Exception as e:
        db.rollback()
        return jsonify({"message": "Erro ao atualizar scooter", "error": str(e)}), 500
    finally:
        db.close()

@app.route('/api/scooters/<scooter_id>', methods=['DELETE'])
def delete_scooter(scooter_id):
    db = get_db()
    try:
        scooter = db.query(Scooter).filter(Scooter.id == scooter_id).first()
        if not scooter:
            return jsonify({"message": "Scooter nao encontrada"}), 404
        
        active_viagem = db.query(Viagem).filter(
            Viagem.scooter_id == scooter_id,
            Viagem.data_fim == None
        ).first()
        if active_viagem:
            return jsonify({"message": "Scooter possui viagem ativa e nao pode ser removida"}), 400
        
        active_manutencao = db.query(Manutencao).filter(
            Manutencao.scooter_id == scooter_id,
            Manutencao.status.in_(['pendente', 'em_andamento'])
        ).first()
        if active_manutencao:
            return jsonify({"message": "Scooter possui manutencao pendente e nao pode ser removida"}), 400
        
        db.delete(scooter)
        db.commit()
        
        broadcast_event('scooter:deleted', {"id": scooter_id})
        
        return jsonify({"message": "Scooter removida com sucesso"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"message": "Erro ao remover scooter", "error": str(e)}), 500
    finally:
        db.close()

@app.route('/api/scooters/<scooter_id>/bateria', methods=['PATCH'])
def update_battery(scooter_id):
    db = get_db()
    try:
        scooter = db.query(Scooter).filter(Scooter.id == scooter_id).first()
        if not scooter:
            return jsonify({"message": "Scooter nao encontrada"}), 404
        
        data = request.get_json()
        bateria = data.get('bateria')
        
        if bateria is None or not isinstance(bateria, int) or not (0 <= bateria <= 100):
            return jsonify({"message": "Nivel de bateria invalido (0-100)"}), 400
        
        scooter.bateria = bateria
        scooter.ultima_atualizacao = datetime.utcnow()
        db.commit()
        db.refresh(scooter)
        result = scooter.to_dict()
        broadcast_event('scooter:updated', result)
        return jsonify(result), 200
    except Exception as e:
        db.rollback()
        return jsonify({"message": "Erro ao atualizar bateria", "error": str(e)}), 500
    finally:
        db.close()

@app.route('/api/alugar', methods=['POST'])
def alugar_scooter():
    db = get_db()
    try:
        data = request.get_json()
        scooter_id = data.get('scooterId')
        usuario_nome = data.get('usuarioNome')
        
        if not scooter_id or not usuario_nome:
            return jsonify({"message": "Dados invalidos"}), 400
        
        scooter = db.query(Scooter).filter(Scooter.id == scooter_id).first()
        if not scooter:
            return jsonify({"message": "Scooter nao encontrada no banco de dados"}), 400
        
        if scooter.status != 'livre':
            return jsonify({"message": "Scooter nao esta disponivel para aluguel"}), 400
        
        if scooter.bateria <= 20:
            return jsonify({"message": "Scooter com bateria insuficiente (minimo 20%)"}), 400
        
        viagem = Viagem(
            id=str(uuid.uuid4()),
            scooter_id=scooter_id,
            usuario_nome=usuario_nome
        )
        db.add(viagem)
        
        scooter.status = 'ocupado'
        scooter.ultima_atualizacao = datetime.utcnow()
        
        db.commit()
        db.refresh(viagem)
        db.refresh(scooter)
        
        viagem_result = viagem.to_dict()
        scooter_result = scooter.to_dict()
        
        broadcast_event('trip:created', viagem_result)
        broadcast_event('scooter:updated', scooter_result)
        
        return jsonify(viagem_result), 201
    except Exception as e:
        db.rollback()
        return jsonify({"message": "Erro ao processar aluguel", "error": str(e)}), 500
    finally:
        db.close()

@app.route('/api/viagens', methods=['GET'])
def get_viagens():
    db = get_db()
    try:
        viagens = db.query(Viagem).order_by(Viagem.data_inicio.desc()).all()
        return jsonify([v.to_dict() for v in viagens]), 200
    finally:
        db.close()

@app.route('/api/viagens/ativas', methods=['GET'])
def get_active_viagens():
    db = get_db()
    try:
        viagens = db.query(Viagem).filter(Viagem.data_fim == None).order_by(Viagem.data_inicio.desc()).all()
        return jsonify([v.to_dict() for v in viagens]), 200
    finally:
        db.close()

@app.route('/api/viagens/<viagem_id>/finalizar', methods=['PATCH'])
def finalizar_viagem(viagem_id):
    db = get_db()
    try:
        viagem = db.query(Viagem).filter(Viagem.id == viagem_id).first()
        if not viagem:
            return jsonify({"message": "Viagem nao encontrada"}), 404
        
        if viagem.data_fim:
            return jsonify({"message": "Viagem ja foi finalizada"}), 400
        
        data = request.get_json()
        distancia = data.get('distanciaKm', '0.00')
        
        viagem.data_fim = datetime.utcnow()
        viagem.distancia_km = Decimal(str(distancia))
        
        scooter = db.query(Scooter).filter(Scooter.id == viagem.scooter_id).first()
        if scooter:
            scooter.status = 'livre'
            scooter.ultima_atualizacao = datetime.utcnow()
        
        db.commit()
        db.refresh(viagem)
        if scooter:
            db.refresh(scooter)
        
        viagem_result = viagem.to_dict()
        
        broadcast_event('trip:finalized', viagem_result)
        if scooter:
            broadcast_event('scooter:updated', scooter.to_dict())
        
        return jsonify(viagem_result), 200
    except Exception as e:
        db.rollback()
        return jsonify({"message": "Erro ao finalizar viagem", "error": str(e)}), 500
    finally:
        db.close()

@app.route('/api/manutencoes', methods=['GET'])
def get_manutencoes():
    db = get_db()
    try:
        manutencoes = db.query(Manutencao).order_by(Manutencao.data_agendada.desc()).all()
        return jsonify([m.to_dict() for m in manutencoes]), 200
    finally:
        db.close()

@app.route('/api/manutencoes', methods=['POST'])
def create_manutencao():
    db = get_db()
    try:
        data = request.get_json()
        
        scooter_id = data.get('scooterId')
        scooter = db.query(Scooter).filter(Scooter.id == scooter_id).first()
        if not scooter:
            return jsonify({"message": "Scooter nao encontrada"}), 400
        
        data_agendada = date_parser.parse(data.get('dataAgendada'))
        
        manutencao = Manutencao(
            id=str(uuid.uuid4()),
            scooter_id=scooter_id,
            tecnico_nome=data.get('tecnicoNome'),
            descricao=data.get('descricao'),
            prioridade=data.get('prioridade', 'media'),
            status='pendente',
            data_agendada=data_agendada,
            observacoes=data.get('observacoes')
        )
        db.add(manutencao)
        
        scooter.status = 'manutencao'
        scooter.ultima_atualizacao = datetime.utcnow()
        
        db.commit()
        db.refresh(manutencao)
        
        result = manutencao.to_dict()
        broadcast_event('maintenance:created', result)
        broadcast_event('scooter:updated', scooter.to_dict())
        
        return jsonify(result), 201
    except Exception as e:
        db.rollback()
        return jsonify({"message": "Erro ao criar manutencao", "error": str(e)}), 500
    finally:
        db.close()

@app.route('/api/manutencoes/<manutencao_id>', methods=['PATCH'])
def update_manutencao(manutencao_id):
    db = get_db()
    try:
        manutencao = db.query(Manutencao).filter(Manutencao.id == manutencao_id).first()
        if not manutencao:
            return jsonify({"message": "Manutencao nao encontrada"}), 404
        
        data = request.get_json()
        
        if 'tecnicoNome' in data:
            manutencao.tecnico_nome = data['tecnicoNome']
        if 'descricao' in data:
            manutencao.descricao = data['descricao']
        if 'prioridade' in data:
            manutencao.prioridade = data['prioridade']
        if 'status' in data:
            manutencao.status = data['status']
        if 'dataAgendada' in data:
            manutencao.data_agendada = date_parser.parse(data['dataAgendada'])
        if 'observacoes' in data:
            manutencao.observacoes = data['observacoes']
        
        db.commit()
        db.refresh(manutencao)
        
        result = manutencao.to_dict()
        broadcast_event('maintenance:updated', result)
        
        return jsonify(result), 200
    except Exception as e:
        db.rollback()
        return jsonify({"message": "Erro ao atualizar manutencao", "error": str(e)}), 500
    finally:
        db.close()

@app.route('/api/manutencoes/<manutencao_id>/iniciar', methods=['PATCH'])
def iniciar_manutencao(manutencao_id):
    db = get_db()
    try:
        manutencao = db.query(Manutencao).filter(Manutencao.id == manutencao_id).first()
        if not manutencao:
            return jsonify({"message": "Manutencao nao encontrada"}), 404
        
        if manutencao.status != 'pendente':
            return jsonify({"message": "Manutencao nao pode ser iniciada"}), 400
        
        manutencao.status = 'em_andamento'
        
        db.commit()
        db.refresh(manutencao)
        
        result = manutencao.to_dict()
        broadcast_event('maintenance:updated', result)
        
        return jsonify(result), 200
    except Exception as e:
        db.rollback()
        return jsonify({"message": "Erro ao iniciar manutencao", "error": str(e)}), 500
    finally:
        db.close()

@app.route('/api/manutencoes/<manutencao_id>/concluir', methods=['PATCH'])
def concluir_manutencao(manutencao_id):
    db = get_db()
    try:
        manutencao = db.query(Manutencao).filter(Manutencao.id == manutencao_id).first()
        if not manutencao:
            return jsonify({"message": "Manutencao nao encontrada"}), 404
        
        data = request.get_json()
        
        manutencao.status = 'concluida'
        manutencao.data_conclusao = datetime.utcnow()
        if 'observacoes' in data:
            manutencao.observacoes = data['observacoes']
        
        scooter = db.query(Scooter).filter(Scooter.id == manutencao.scooter_id).first()
        if scooter:
            scooter.status = 'livre'
            scooter.ultima_atualizacao = datetime.utcnow()
        
        db.commit()
        db.refresh(manutencao)
        
        result = manutencao.to_dict()
        broadcast_event('maintenance:completed', result)
        if scooter:
            broadcast_event('scooter:updated', scooter.to_dict())
        
        return jsonify(result), 200
    except Exception as e:
        db.rollback()
        return jsonify({"message": "Erro ao concluir manutencao", "error": str(e)}), 500
    finally:
        db.close()

@app.route('/api/manutencoes/<manutencao_id>', methods=['DELETE'])
def delete_manutencao(manutencao_id):
    db = get_db()
    try:
        manutencao = db.query(Manutencao).filter(Manutencao.id == manutencao_id).first()
        if not manutencao:
            return jsonify({"message": "Manutencao nao encontrada"}), 404
        
        scooter = db.query(Scooter).filter(Scooter.id == manutencao.scooter_id).first()
        
        db.delete(manutencao)
        
        if scooter and scooter.status == 'manutencao':
            pending = db.query(Manutencao).filter(
                Manutencao.scooter_id == scooter.id,
                Manutencao.id != manutencao_id,
                Manutencao.status.in_(['pendente', 'em_andamento'])
            ).first()
            if not pending:
                scooter.status = 'livre'
                scooter.ultima_atualizacao = datetime.utcnow()
        
        db.commit()
        
        broadcast_event('maintenance:deleted', {"id": manutencao_id})
        if scooter:
            broadcast_event('scooter:updated', scooter.to_dict())
        
        return jsonify({"message": "Manutencao removida com sucesso"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"message": "Erro ao remover manutencao", "error": str(e)}), 500
    finally:
        db.close()

@app.route('/api/manutencoes/<manutencao_id>/cancelar', methods=['PATCH'])
def cancelar_manutencao(manutencao_id):
    db = get_db()
    try:
        manutencao = db.query(Manutencao).filter(Manutencao.id == manutencao_id).first()
        if not manutencao:
            return jsonify({"message": "Manutencao nao encontrada"}), 404
        
        if manutencao.status in ['concluida', 'cancelada']:
            return jsonify({"message": "Manutencao nao pode ser cancelada"}), 400
        
        manutencao.status = 'cancelada'
        
        scooter = db.query(Scooter).filter(Scooter.id == manutencao.scooter_id).first()
        scooter_updated = False
        if scooter and scooter.status == 'manutencao':
            pending = db.query(Manutencao).filter(
                Manutencao.scooter_id == scooter.id,
                Manutencao.id != manutencao_id,
                Manutencao.status.in_(['pendente', 'em_andamento'])
            ).first()
            if not pending:
                scooter.status = 'livre'
                scooter.ultima_atualizacao = datetime.utcnow()
                scooter_updated = True
        
        db.commit()
        db.refresh(manutencao)
        
        result = manutencao.to_dict()
        broadcast_event('maintenance:cancelled', result)
        if scooter_updated and scooter:
            db.refresh(scooter)
            broadcast_event('scooter:updated', scooter.to_dict())
        
        return jsonify(result), 200
    except Exception as e:
        db.rollback()
        return jsonify({"message": "Erro ao cancelar manutencao", "error": str(e)}), 500
    finally:
        db.close()

@app.route('/html')
def serve_html_frontend():
    return send_from_directory('../public', 'index.html')

@app.route('/api/airtable/status', methods=['GET'])
def airtable_status():
    airtable_key = os.environ.get('AIRTABLE_API_KEY')
    airtable_base = os.environ.get('AIRTABLE_BASE_ID')
    
    return jsonify({
        'available': AIRTABLE_AVAILABLE,
        'configured': bool(airtable_key and airtable_base)
    }), 200

@app.route('/api/airtable/sync', methods=['POST'])
def sync_to_airtable():
    if not AIRTABLE_AVAILABLE:
        return jsonify({"message": "Airtable service not available"}), 503
    
    db = get_db()
    try:
        scooters = db.query(Scooter).all()
        scooter_list = [s.to_dict() for s in scooters]
        
        results = sync_all_scooters_to_airtable(scooter_list)
        
        success_count = sum(1 for r in results if r.get('success'))
        error_count = len(results) - success_count
        
        return jsonify({
            "message": f"Sincronizado {success_count} scooters com sucesso, {error_count} erros",
            "results": results
        }), 200
    except Exception as e:
        return jsonify({"message": "Erro ao sincronizar com Airtable", "error": str(e)}), 500
    finally:
        db.close()

@app.route('/api/airtable/import', methods=['POST'])
def import_from_airtable():
    if not AIRTABLE_AVAILABLE:
        return jsonify({"message": "Airtable service not available"}), 503
    
    db = get_db()
    try:
        airtable_scooters = import_scooters_from_airtable()
        
        imported = 0
        updated = 0
        
        for at_scooter in airtable_scooters:
            local_id = at_scooter.get('id')
            
            if local_id:
                existing = db.query(Scooter).filter(Scooter.id == local_id).first()
                if existing:
                    existing.modelo = at_scooter.get('modelo', existing.modelo)
                    existing.bateria = at_scooter.get('bateria', existing.bateria)
                    existing.status = at_scooter.get('status', existing.status)
                    existing.localizacao = at_scooter.get('localizacao', existing.localizacao)
                    existing.ultima_atualizacao = datetime.utcnow()
                    updated += 1
                else:
                    new_scooter = Scooter(
                        id=local_id,
                        modelo=at_scooter.get('modelo'),
                        bateria=at_scooter.get('bateria', 100),
                        status=at_scooter.get('status', 'livre'),
                        localizacao=at_scooter.get('localizacao')
                    )
                    db.add(new_scooter)
                    imported += 1
            else:
                new_scooter = Scooter(
                    id=str(uuid.uuid4()),
                    modelo=at_scooter.get('modelo'),
                    bateria=at_scooter.get('bateria', 100),
                    status=at_scooter.get('status', 'livre'),
                    localizacao=at_scooter.get('localizacao')
                )
                db.add(new_scooter)
                imported += 1
        
        db.commit()
        
        broadcast_event('scooters:imported', {"imported": imported, "updated": updated})
        
        return jsonify({
            "message": f"Importados {imported} novos scooters, atualizados {updated}",
            "imported": imported,
            "updated": updated
        }), 200
    except Exception as e:
        db.rollback()
        return jsonify({"message": "Erro ao importar do Airtable", "error": str(e)}), 500
    finally:
        db.close()

@app.route('/api/airtable/fetch', methods=['GET'])
def fetch_from_airtable():
    if not AIRTABLE_AVAILABLE:
        return jsonify({"message": "Airtable service not available"}), 503
    
    try:
        scooters = fetch_scooters_from_airtable()
        return jsonify(scooters), 200
    except Exception as e:
        return jsonify({"message": "Erro ao buscar do Airtable", "error": str(e)}), 500

@app.route('/api/airtable/raw', methods=['GET'])
def fetch_raw_from_airtable():
    if not AIRTABLE_AVAILABLE:
        return jsonify({"message": "Airtable service not available"}), 503
    
    try:
        from airtable_service import get_airtable_table
        table = get_airtable_table()
        records = table.all()
        return jsonify(records), 200
    except Exception as e:
        return jsonify({"message": "Erro ao buscar do Airtable", "error": str(e)}), 500

@app.route('/api/airtable/schema', methods=['GET'])
def get_airtable_schema():
    if not AIRTABLE_AVAILABLE:
        return jsonify({"message": "Airtable service not available"}), 503
    
    try:
        from airtable_service import get_table_schema
        fields = get_table_schema()
        return jsonify({"fields": fields}), 200
    except Exception as e:
        return jsonify({"message": "Erro ao buscar schema", "error": str(e)}), 500

@socketio.on('connect')
def handle_connect():
    print('WebSocket client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('WebSocket client disconnected')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=True)
