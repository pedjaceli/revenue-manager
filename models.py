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


class ShoppingList(db.Model):
    __tablename__ = 'shopping_lists'

    id         = db.Column(db.String(36),  primary_key=True, default=gen_id)
    name       = db.Column(db.String(200), nullable=False)
    date       = db.Column(db.String(10))
    status     = db.Column(db.String(20),  default='active')
    user_id    = db.Column(db.String(36),  db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime,    default=lambda: datetime.now(timezone.utc))
    items      = db.relationship('ShoppingListItem', backref='shopping_list',
                                 cascade='all, delete-orphan',
                                 order_by='ShoppingListItem.checked, ShoppingListItem.id')

    def to_dict(self):
        return {
            'id':        self.id,
            'name':      self.name,
            'date':      self.date,
            'status':    self.status,
            'items':     [i.to_dict() for i in self.items],
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }


class ShoppingListItem(db.Model):
    __tablename__ = 'shopping_list_items'

    id         = db.Column(db.String(36),  primary_key=True, default=gen_id)
    list_id    = db.Column(db.String(36),  db.ForeignKey('shopping_lists.id'), nullable=False)
    name       = db.Column(db.String(200), nullable=False)
    quantity   = db.Column(db.Float,       default=1)
    unit       = db.Column(db.String(50),  default='')
    category   = db.Column(db.String(36))
    checked    = db.Column(db.Boolean,     default=False)
    note       = db.Column(db.Text,        default='')
    unit_price = db.Column(db.Float)
    barcode    = db.Column(db.String(100), default='')

    def to_dict(self):
        return {
            'id':         self.id,
            'list_id':    self.list_id,
            'name':       self.name,
            'quantity':   self.quantity,
            'unit':       self.unit or '',
            'category':   self.category,
            'checked':    self.checked,
            'note':       self.note or '',
            'unit_price': self.unit_price,
            'barcode':    self.barcode or '',
        }


class InventoryItem(db.Model):
    __tablename__ = 'inventory_items'

    id          = db.Column(db.String(36),  primary_key=True, default=gen_id)
    name        = db.Column(db.String(200), nullable=False)
    quantity    = db.Column(db.Float,       default=1)
    unit        = db.Column(db.String(50),  default='')
    category    = db.Column(db.String(36))
    location    = db.Column(db.String(20),  default='pantry')  # fridge | freezer | pantry
    expiry_date = db.Column(db.String(10))   # YYYY-MM-DD, nullable
    barcode     = db.Column(db.String(100),  default='')
    note        = db.Column(db.Text,         default='')
    user_id     = db.Column(db.String(36),   db.ForeignKey('users.id'), nullable=True)
    created_at  = db.Column(db.DateTime,     default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id':          self.id,
            'name':        self.name,
            'quantity':    self.quantity,
            'unit':        self.unit or '',
            'category':    self.category,
            'location':    self.location or 'pantry',
            'expiry_date': self.expiry_date,
            'barcode':     self.barcode or '',
            'note':        self.note or '',
            'createdAt':   self.created_at.isoformat() if self.created_at else None,
        }


class Store(db.Model):
    __tablename__ = 'stores'

    id         = db.Column(db.String(36),  primary_key=True, default=gen_id)
    name       = db.Column(db.String(200), nullable=False)
    user_id    = db.Column(db.String(36),  db.ForeignKey('users.id'), nullable=True)
    records    = db.relationship('PriceRecord', backref='store', cascade='all, delete-orphan')

    def to_dict(self):
        return {'id': self.id, 'name': self.name}


class PriceRecord(db.Model):
    __tablename__ = 'price_records'

    id           = db.Column(db.String(36),  primary_key=True, default=gen_id)
    product_name = db.Column(db.String(200), nullable=False)
    barcode      = db.Column(db.String(100), default='')
    store_id     = db.Column(db.String(36),  db.ForeignKey('stores.id'), nullable=False)
    price        = db.Column(db.Float,       nullable=False)
    unit         = db.Column(db.String(50),  default='')
    date         = db.Column(db.String(10),  nullable=False)
    user_id      = db.Column(db.String(36),  db.ForeignKey('users.id'), nullable=True)
    created_at   = db.Column(db.DateTime,    default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id':           self.id,
            'product_name': self.product_name,
            'barcode':      self.barcode or '',
            'store_id':     self.store_id,
            'store_name':   self.store.name if self.store else '',
            'price':        self.price,
            'unit':         self.unit or '',
            'date':         self.date,
            'createdAt':    self.created_at.isoformat() if self.created_at else None,
        }
