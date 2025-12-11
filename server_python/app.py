from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from datetime import datetime
from decimal import Decimal
import os
import uuid

from models import Scooter, Viagem, SessionLocal, init_db

app = Flask(__name__, static_folder='../client/dist', static_url_path='')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='gevent')

def get_db():
    return SessionLocal()

def broadcast_event(event_type, data):
    socketio.emit(event_type, {
        "type": event_type,
        "payload": data,
        "timestamp": datetime.utcnow().isoformat()
    })

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
            return jsonify({"message": "Scooter não encontrada"}), 404
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
            return jsonify({"message": "Scooter não encontrada"}), 404
        
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

@app.route('/api/scooters/<scooter_id>/bateria', methods=['PATCH'])
def update_battery(scooter_id):
    db = get_db()
    try:
        scooter = db.query(Scooter).filter(Scooter.id == scooter_id).first()
        if not scooter:
            return jsonify({"message": "Scooter não encontrada"}), 404
        
        data = request.get_json()
        bateria = data.get('bateria')
        
        if bateria is None or not isinstance(bateria, int) or not (0 <= bateria <= 100):
            return jsonify({"message": "Nível de bateria inválido (0-100)"}), 400
        
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
            return jsonify({"message": "Dados inválidos"}), 400
        
        scooter = db.query(Scooter).filter(Scooter.id == scooter_id).first()
        if not scooter:
            return jsonify({"message": "Scooter não encontrada no banco de dados"}), 400
        
        if scooter.status != 'livre':
            return jsonify({"message": "Scooter não está disponível para aluguel"}), 400
        
        if scooter.bateria <= 20:
            return jsonify({"message": "Scooter com bateria insuficiente (mínimo 20%)"}), 400
        
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
            return jsonify({"message": "Viagem não encontrada"}), 404
        
        if viagem.data_fim:
            return jsonify({"message": "Viagem já foi finalizada"}), 400
        
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

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

@socketio.on('connect')
def handle_connect():
    print('WebSocket client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('WebSocket client disconnected')

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=True)
