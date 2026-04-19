from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone
import uuid

db = SQLAlchemy()


def gen_id():
    return uuid.uuid4().hex[:12]


class User(db.Model):
    __tablename__ = 'users'

    id              = db.Column(db.String(36),  primary_key=True, default=gen_id)
    username        = db.Column(db.String(80),  unique=True, nullable=False)
    password_hash   = db.Column(db.String(256), nullable=False)
    is_admin        = db.Column(db.Boolean,     default=False, nullable=False)
    initial_balance = db.Column(db.Float,       default=0.0,   nullable=False)
    created_at      = db.Column(db.DateTime,    default=lambda: datetime.now(timezone.utc))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Category(db.Model):
    __tablename__ = 'categories'

    id      = db.Column(db.String(36), primary_key=True, default=gen_id)
    name    = db.Column(db.String(100), nullable=False)
    color   = db.Column(db.String(7),   nullable=False, default='#6366f1')
    icon    = db.Column(db.String(10),  nullable=False, default='📦')
    user_id = db.Column(db.String(36),  db.ForeignKey('users.id'), nullable=True)

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
    user_id     = db.Column(db.String(36),  db.ForeignKey('users.id'), nullable=True)

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


class ExpenseCategory(db.Model):
    __tablename__ = 'expense_categories'

    id      = db.Column(db.String(36), primary_key=True, default=gen_id)
    name    = db.Column(db.String(100), nullable=False)
    color   = db.Column(db.String(7),   nullable=False, default='#ef4444')
    icon    = db.Column(db.String(10),  nullable=False, default='💸')
    user_id = db.Column(db.String(36),  db.ForeignKey('users.id'), nullable=True)

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'color': self.color, 'icon': self.icon}


class Expense(db.Model):
    __tablename__ = 'expenses'

    id          = db.Column(db.String(36),  primary_key=True, default=gen_id)
    amount      = db.Column(db.Float,       nullable=False)
    description = db.Column(db.String(200), nullable=False)
    category    = db.Column(db.String(36),  nullable=False)
    date        = db.Column(db.String(10),  nullable=False)
    notes       = db.Column(db.String(500), default='')
    user_id     = db.Column(db.String(36),  db.ForeignKey('users.id'), nullable=True)
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


class Invoice(db.Model):
    __tablename__ = 'invoices'

    id         = db.Column(db.String(36),  primary_key=True, default=gen_id)
    title      = db.Column(db.String(200), nullable=False)
    date       = db.Column(db.String(10),  nullable=False)
    user_id    = db.Column(db.String(36),  db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime,    default=lambda: datetime.now(timezone.utc))
    items      = db.relationship('InvoiceItem', backref='invoice', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id':        self.id,
            'title':     self.title,
            'date':      self.date,
            'items':     [i.to_dict() for i in self.items],
            'total':     round(sum(i.quantity * i.unit_price for i in self.items), 2),
            'createdAt': self.created_at.isoformat(),
        }


class InvoiceItem(db.Model):
    __tablename__ = 'invoice_items'

    id           = db.Column(db.String(36),  primary_key=True, default=gen_id)
    invoice_id   = db.Column(db.String(36),  db.ForeignKey('invoices.id'), nullable=False)
    product_name = db.Column(db.String(200), nullable=False)
    quantity     = db.Column(db.Float,       nullable=False, default=1)
    unit_price   = db.Column(db.Float,       nullable=False)

    def to_dict(self):
        return {
            'id':           self.id,
            'invoice_id':   self.invoice_id,
            'product_name': self.product_name,
            'quantity':     self.quantity,
            'unit_price':   self.unit_price,
            'total':        round(self.quantity * self.unit_price, 2),
        }
