from sqlalchemy import Column, String, Integer, Text, TIMESTAMP, DECIMAL, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class Scooter(Base):
    __tablename__ = "scooters"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    modelo = Column(Text, nullable=False)
    bateria = Column(Integer, nullable=False, default=100)
    status = Column(String, nullable=False, default="livre")
    localizacao = Column(Text, nullable=False)
    ultima_atualizacao = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    
    viagens = relationship("Viagem", back_populates="scooter")
    
    def to_dict(self):
        return {
            "id": self.id,
            "modelo": self.modelo,
            "bateria": self.bateria,
            "status": self.status,
            "localizacao": self.localizacao,
            "ultimaAtualizacao": self.ultima_atualizacao.isoformat() if self.ultima_atualizacao else None
        }

class Viagem(Base):
    __tablename__ = "viagens"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scooter_id = Column(String, ForeignKey("scooters.id"), nullable=False)
    usuario_nome = Column(Text, nullable=False)
    data_inicio = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    data_fim = Column(TIMESTAMP, nullable=True)
    distancia_km = Column(DECIMAL(10, 2), nullable=True)
    
    scooter = relationship("Scooter", back_populates="viagens")
    
    def to_dict(self):
        return {
            "id": self.id,
            "scooterId": self.scooter_id,
            "usuarioNome": self.usuario_nome,
            "dataInicio": self.data_inicio.isoformat() if self.data_inicio else None,
            "dataFim": self.data_fim.isoformat() if self.data_fim else None,
            "distanciaKm": str(self.distancia_km) if self.distancia_km else None
        }
