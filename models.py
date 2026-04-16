from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone
import uuid

db = SQLAlchemy()


def gen_id():
    return uuid.uuid4().hex[:12]


class Category(db.Model):
    __tablename__ = 'categories'

    id    = db.Column(db.String(36), primary_key=True, default=gen_id)
    name  = db.Column(db.String(100), nullable=False)
    color = db.Column(db.String(7),   nullable=False, default='#6366f1')
    icon  = db.Column(db.String(10),  nullable=False, default='📦')

    def to_dict(self):
        return {
            'id':    self.id,
            'name':  self.name,
            'color': self.color,
            'icon':  self.icon,
        }


class Revenue(db.Model):
    __tablename__ = 'revenues'

    id          = db.Column(db.String(36),  primary_key=True, default=gen_id)
    amount      = db.Column(db.Float,       nullable=False)
    description = db.Column(db.String(200), nullable=False)
    category    = db.Column(db.String(36),  nullable=False)
    date        = db.Column(db.String(10),  nullable=False)   # YYYY-MM-DD
    notes       = db.Column(db.String(500), default='')
    created_at  = db.Column(db.DateTime,    default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id':          self.id,
            'amount':      self.amount,
            'description': self.description,
            'category':    self.category,
            'date':        self.date,
            'notes':       self.notes or '',
            'createdAt':   self.created_at.isoformat(),
        }
