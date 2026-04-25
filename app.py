import os
from datetime import datetime, timezone, timedelta
from functools import wraps
from flask import Flask, jsonify, request, send_from_directory, session, redirect, render_template
from sqlalchemy import text, inspect as sa_inspect
from models import db, Category, Revenue, User, ExpenseCategory, Expense, Invoice, InvoiceItem, ShoppingList, ShoppingListItem, InventoryItem, InventoryLocation, Store, PriceRecord, gen_id

# ─── App setup ────────────────────────────────────────────────
app = Flask(__name__, static_folder='.', static_url_path='')

# ─── Database config ──────────────────────────────────────────
basedir = os.path.abspath(os.path.dirname(__file__))
database_url = os.environ.get(
    'DATABASE_URL',
    f'sqlite:///{os.path.join(basedir, "instance", "revenues.db")}'
)
# Render fournit postgres:// mais SQLAlchemy requiert postgresql://
if database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql+psycopg://', 1)
elif database_url.startswith('postgresql://'):
    database_url = database_url.replace('postgresql://', 'postgresql+psycopg://', 1)

app.config['SQLALCHEMY_DATABASE_URI']        = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY']                     = os.environ.get('SECRET_KEY', 'dev-secret-key')

# Sessions persistantes : l'utilisateur reste connecté 30 jours sur le même appareil
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)
app.config['SESSION_COOKIE_HTTPONLY']    = True
app.config['SESSION_COOKIE_SAMESITE']    = 'Lax'
# Cookie "Secure" activé en production (HTTPS) uniquement
app.config['SESSION_COOKIE_SECURE']      = os.environ.get('FLASK_ENV') != 'development' and bool(os.environ.get('DATABASE_URL'))

db.init_app(app)

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect('/register')
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect('/register')
        if not session.get('is_admin'):
            return jsonify({'error': 'Accès réservé à l\'administrateur.'}), 403
        return f(*args, **kwargs)
    return decorated

def _seed_default_categories(user_id):
    for c in DEFAULT_CATEGORIES:
        db.session.add(Category(id=gen_id(), name=c['name'], color=c['color'], icon=c['icon'], user_id=user_id))

DEFAULT_INVENTORY_LOCATIONS = [
    {'key': 'fridge',  'name': 'Frigo',        'icon': '🧊'},
    {'key': 'freezer', 'name': 'Congélateur',  'icon': '❄️'},
    {'key': 'pantry',  'name': 'Garde-manger', 'icon': '🥫'},
]

def _seed_default_inventory_locations(user_id):
    """Returns dict {keyword: new_uuid_id} so callers can migrate legacy keyword-based item.location values."""
    mapping = {}
    for loc in DEFAULT_INVENTORY_LOCATIONS:
        new_id = gen_id()
        db.session.add(InventoryLocation(id=new_id, name=loc['name'], icon=loc['icon'], user_id=user_id))
        mapping[loc['key']] = new_id
    return mapping

# ─── Default categories ───────────────────────────────────────
DEFAULT_CATEGORIES = []

# ─── Create tables + migrate + assign orphaned data to admin ─
with app.app_context():
    os.makedirs(os.path.join(basedir, 'instance'), exist_ok=True)
    db.create_all()

    # Add missing columns to existing tables
    inspector = sa_inspect(db.engine)
    with db.engine.connect() as conn:
        user_cols = [c['name'] for c in inspector.get_columns('users')]
        if 'initial_balance' in user_cols:
            conn.execute(text("ALTER TABLE users DROP COLUMN initial_balance"))
            conn.commit()
        if 'grocery_budget' not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN grocery_budget FLOAT DEFAULT 0.0 NOT NULL"))
            conn.commit()

        cat_cols = [c['name'] for c in inspector.get_columns('categories')]
        rev_cols = [c['name'] for c in inspector.get_columns('revenues')]
        if 'user_id' not in cat_cols:
            conn.execute(text("ALTER TABLE categories ADD COLUMN user_id VARCHAR(36)"))
            conn.commit()
        if 'user_id' not in rev_cols:
            conn.execute(text("ALTER TABLE revenues ADD COLUMN user_id VARCHAR(36)"))
            conn.commit()

    # Add user_id to expense_categories / expenses / invoices / invoice_items if missing
    inspector = sa_inspect(db.engine)
    existing_tables = inspector.get_table_names()
    with db.engine.connect() as conn:
        for tbl, col, typ in [
            ('expense_categories', 'user_id', 'VARCHAR(36)'),
            ('expenses',           'user_id', 'VARCHAR(36)'),
            ('invoices',           'user_id', 'VARCHAR(36)'),
        ]:
            if tbl in existing_tables:
                cols = [c['name'] for c in inspector.get_columns(tbl)]
                if col not in cols:
                    conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} {typ}"))
                    conn.commit()

    # Assign any orphaned records to the admin user
    admin = User.query.filter_by(is_admin=True).first()
    if admin:
        Category.query.filter_by(user_id=None).update({'user_id': admin.id})
        Revenue.query.filter_by(user_id=None).update({'user_id': admin.id})
        db.session.commit()

    # Seed default inventory locations for every user that has none,
    # then migrate legacy keyword values in inventory_items.location → new uuid ids
    for u in User.query.all():
        has_locations = InventoryLocation.query.filter_by(user_id=u.id).first() is not None
        if has_locations:
            continue
        mapping = _seed_default_inventory_locations(u.id)
        db.session.flush()
        for item in InventoryItem.query.filter_by(user_id=u.id).all():
            if item.location in mapping:
                item.location = mapping[item.location]
    db.session.commit()

# ═══════════════════════════════════════════════════════════════
# STATIC FILES (frontend)
# ═══════════════════════════════════════════════════════════════

@app.route('/login', methods=['GET'])
def login_page():
    return render_template('login.html', error=None)

@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username', '').strip()
    password = request.form.get('password', '')
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        session.permanent = True
        session['logged_in'] = True
        session['username']  = user.username
        session['is_admin']  = user.is_admin
        session['user_id']   = user.id
        return redirect('/')
    return render_template('login.html', error='Nom d\'utilisateur ou mot de passe incorrect.')

@app.route('/register', methods=['GET'])
def register_page():
    return render_template('register.html', error=None)

@app.route('/register', methods=['POST'])
def register():
    username  = request.form.get('username', '').strip()
    password  = request.form.get('password', '')
    password2 = request.form.get('password2', '')
    lang      = request.form.get('lang', 'en')

    errors = {
        'en': {
            'required':   'All fields are required.',
            'min_pwd':    'Password must be at least 6 characters.',
            'no_match':   'Passwords do not match.',
            'taken':      'This username is already taken.',
        },
        'fr': {
            'required':   'Tous les champs sont obligatoires.',
            'min_pwd':    'Le mot de passe doit contenir au moins 6 caractères.',
            'no_match':   'Les mots de passe ne correspondent pas.',
            'taken':      'Ce nom d\'utilisateur est déjà pris.',
        },
    }
    e = errors.get(lang, errors['en'])

    if not username or not password:
        return render_template('register.html', error=e['required'])
    if len(password) < 6:
        return render_template('register.html', error=e['min_pwd'])
    if password != password2:
        return render_template('register.html', error=e['no_match'])
    if User.query.filter_by(username=username).first():
        return render_template('register.html', error=e['taken'])
    # Le premier compte créé devient automatiquement admin
    is_first = User.query.count() == 0
    user = User(username=username, is_admin=is_first)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()  # get user.id before commit
    _seed_default_categories(user.id)
    _seed_default_inventory_locations(user.id)
    db.session.commit()
    session.permanent = True
    session['logged_in'] = True
    session['username']  = user.username
    session['is_admin']  = user.is_admin
    session['user_id']   = user.id
    return redirect('/')

@app.route('/forgot-password', methods=['GET'])
def forgot_password_page():
    return render_template('forgot-password.html', step=1, error=None)

@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    step = request.form.get('step', '1')
    if step == '1':
        username = request.form.get('username', '').strip()
        user = User.query.filter_by(username=username).first()
        if not user:
            return render_template('forgot-password.html', step=1, error='Aucun compte trouvé avec ce nom d\'utilisateur.')
        return render_template('forgot-password.html', step=2, username=username, error=None)
    elif step == '2':
        username  = request.form.get('username', '').strip()
        password  = request.form.get('password', '')
        password2 = request.form.get('password2', '')
        user = User.query.filter_by(username=username).first()
        if not user:
            return render_template('forgot-password.html', step=1, error='Session expirée, recommence.')
        if len(password) < 6:
            return render_template('forgot-password.html', step=2, username=username, error='Le mot de passe doit contenir au moins 6 caractères.')
        if password != password2:
            return render_template('forgot-password.html', step=2, username=username, error='Les mots de passe ne correspondent pas.')
        user.set_password(password)
        db.session.commit()
        return redirect('/login?reset=1')
    return redirect('/forgot-password')

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/login')

@app.route('/')
@login_required
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
@login_required
def static_files(path):
    if path == 'login':
        return redirect('/login')
    return send_from_directory('.', path)

# ═══════════════════════════════════════════════════════════════
# API — REVENUES
# ═══════════════════════════════════════════════════════════════

@app.route('/api/revenues', methods=['GET'])
@login_required
def get_revenues():
    uid = session['user_id']
    revenues = Revenue.query.filter_by(user_id=uid).order_by(Revenue.date.desc()).all()
    return jsonify([r.to_dict() for r in revenues])


@app.route('/api/revenues', methods=['POST'])
@login_required
def create_revenue():
    data = request.get_json()
    rev = Revenue(
        amount      = float(data['amount']),
        description = data['description'],
        category    = data['category'],
        date        = data['date'],
        notes       = data.get('notes', ''),
        user_id     = session['user_id'],
    )
    db.session.add(rev)
    db.session.commit()
    return jsonify(rev.to_dict()), 201


@app.route('/api/revenues/<id>', methods=['PUT'])
@login_required
def update_revenue(id):
    rev  = Revenue.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    data = request.get_json()
    rev.amount      = float(data.get('amount',      rev.amount))
    rev.description = data.get('description', rev.description)
    rev.category    = data.get('category',    rev.category)
    rev.date        = data.get('date',        rev.date)
    rev.notes       = data.get('notes',       rev.notes)
    db.session.commit()
    return jsonify(rev.to_dict())


@app.route('/api/revenues/<id>', methods=['DELETE'])
@login_required
def delete_revenue(id):
    rev = Revenue.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    db.session.delete(rev)
    db.session.commit()
    return '', 204

# ═══════════════════════════════════════════════════════════════
# API — CATEGORIES
# ═══════════════════════════════════════════════════════════════

@app.route('/api/categories', methods=['GET'])
@login_required
def get_categories():
    uid = session['user_id']
    cats = Category.query.filter_by(user_id=uid).all()
    return jsonify([c.to_dict() for c in cats])


@app.route('/api/categories', methods=['POST'])
@login_required
def create_category():
    data = request.get_json()
    cat  = Category(
        id      = gen_id(),
        name    = data['name'],
        color   = data.get('color', '#10b981'),
        icon    = data.get('icon',  '📦'),
        user_id = session['user_id'],
    )
    db.session.add(cat)
    db.session.commit()
    return jsonify(cat.to_dict()), 201


@app.route('/api/categories/<id>', methods=['PUT'])
@login_required
def update_category(id):
    cat  = Category.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    data = request.get_json()
    cat.name  = data.get('name',  cat.name)
    cat.color = data.get('color', cat.color)
    cat.icon  = data.get('icon',  cat.icon)
    db.session.commit()
    return jsonify(cat.to_dict())


@app.route('/api/categories/<id>', methods=['DELETE'])
@login_required
def delete_category(id):
    cat = Category.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    db.session.delete(cat)
    db.session.commit()
    return '', 204

# ═══════════════════════════════════════════════════════════════
# API — RESET (page Paramètres)
# ═══════════════════════════════════════════════════════════════

@app.route('/api/reset', methods=['POST'])
@login_required
def reset_data():
    uid = session['user_id']
    Revenue.query.filter_by(user_id=uid).delete()
    Category.query.filter_by(user_id=uid).delete()
    _seed_default_categories(uid)
    db.session.commit()
    return '', 204


# ═══════════════════════════════════════════════════════════════
# API — USERS (gestion des comptes)
# ═══════════════════════════════════════════════════════════════

@app.route('/api/me', methods=['GET'])
@login_required
def get_me():
    user = User.query.filter_by(username=session['username']).first()
    if not user:
        return jsonify({'username': session.get('username', ''), 'is_admin': False}), 200
    return jsonify({'id': user.id, 'username': user.username, 'is_admin': user.is_admin})

@app.route('/api/grocery-budget', methods=['GET'])
@login_required
def get_grocery_budget():
    user = User.query.filter_by(id=session['user_id']).first()
    return jsonify({'grocery_budget': user.grocery_budget or 0.0})

@app.route('/api/grocery-budget', methods=['PUT'])
@login_required
def update_grocery_budget():
    data = request.get_json()
    try:
        amount = float(data.get('grocery_budget', 0))
    except (TypeError, ValueError):
        return jsonify({'error': 'Montant invalide.'}), 400
    user = User.query.filter_by(id=session['user_id']).first()
    user.grocery_budget = amount
    db.session.commit()
    return jsonify({'grocery_budget': user.grocery_budget})

@app.route('/api/me/password', methods=['PUT'])
@login_required
def change_my_password():
    data     = request.get_json()
    password = data.get('password', '')
    if len(password) < 6:
        return jsonify({'error': 'Le mot de passe doit contenir au moins 6 caractères.'}), 400
    user = User.query.filter_by(username=session['username']).first()
    if not user:
        return jsonify({'error': 'Utilisateur introuvable.'}), 404
    user.set_password(password)
    db.session.commit()
    return '', 204

@app.route('/api/users', methods=['GET'])
@admin_required
def list_users():
    users = User.query.order_by(User.created_at).all()
    me    = session.get('username')
    return jsonify([{
        'id':         u.id,
        'username':   u.username,
        'is_admin':   u.is_admin,
        'created_at': u.created_at.isoformat() if u.created_at else None,
        'is_me':      u.username == me,
    } for u in users])

@app.route('/api/users', methods=['POST'])
@admin_required
def create_user():
    data     = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    if not username or not password:
        return jsonify({'error': 'Champs obligatoires manquants.'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Le mot de passe doit contenir au moins 6 caractères.'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Ce nom d\'utilisateur est déjà pris.'}), 409
    user = User(username=username, is_admin=False)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()
    _seed_default_categories(user.id)
    _seed_default_inventory_locations(user.id)
    db.session.commit()
    return jsonify({'id': user.id, 'username': user.username}), 201

@app.route('/api/users/<id>', methods=['DELETE'])
@admin_required
def delete_user(id):
    user = User.query.get_or_404(id)
    if user.username == session.get('username'):
        return jsonify({'error': 'Vous ne pouvez pas supprimer votre propre compte.'}), 403

    # Supprimer toutes les données appartenant à l'utilisateur (pas de ON DELETE CASCADE en DB)
    PriceRecord.query.filter_by(user_id=id).delete(synchronize_session=False)
    Store.query.filter_by(user_id=id).delete(synchronize_session=False)
    InventoryItem.query.filter_by(user_id=id).delete(synchronize_session=False)
    InventoryLocation.query.filter_by(user_id=id).delete(synchronize_session=False)
    for sl in ShoppingList.query.filter_by(user_id=id).all():
        db.session.delete(sl)  # cascade vers ShoppingListItem
    for inv in Invoice.query.filter_by(user_id=id).all():
        db.session.delete(inv)  # cascade vers InvoiceItem
    Expense.query.filter_by(user_id=id).delete(synchronize_session=False)
    ExpenseCategory.query.filter_by(user_id=id).delete(synchronize_session=False)
    Revenue.query.filter_by(user_id=id).delete(synchronize_session=False)
    Category.query.filter_by(user_id=id).delete(synchronize_session=False)

    db.session.delete(user)
    db.session.commit()
    return '', 204


# ═══════════════════════════════════════════════════════════════
# API — EXPENSE CATEGORIES
# ═══════════════════════════════════════════════════════════════

@app.route('/api/expense-categories', methods=['GET'])
@login_required
def get_expense_categories():
    cats = ExpenseCategory.query.filter_by(user_id=session['user_id']).all()
    return jsonify([c.to_dict() for c in cats])

@app.route('/api/expense-categories', methods=['POST'])
@login_required
def create_expense_category():
    data = request.get_json()
    cat  = ExpenseCategory(
        id      = gen_id(),
        name    = data['name'],
        color   = data.get('color', '#ef4444'),
        icon    = data.get('icon',  '💸'),
        user_id = session['user_id'],
    )
    db.session.add(cat)
    db.session.commit()
    return jsonify(cat.to_dict()), 201

@app.route('/api/expense-categories/<id>', methods=['PUT'])
@login_required
def update_expense_category(id):
    cat  = ExpenseCategory.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    data = request.get_json()
    cat.name  = data.get('name',  cat.name)
    cat.color = data.get('color', cat.color)
    cat.icon  = data.get('icon',  cat.icon)
    db.session.commit()
    return jsonify(cat.to_dict())

@app.route('/api/expense-categories/<id>', methods=['DELETE'])
@login_required
def delete_expense_category(id):
    cat = ExpenseCategory.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    db.session.delete(cat)
    db.session.commit()
    return '', 204

# ═══════════════════════════════════════════════════════════════
# API — EXPENSES
# ═══════════════════════════════════════════════════════════════

@app.route('/api/expenses', methods=['GET'])
@login_required
def get_expenses():
    uid      = session['user_id']
    expenses = Expense.query.filter_by(user_id=uid).order_by(Expense.date.desc()).all()
    return jsonify([e.to_dict() for e in expenses])

@app.route('/api/expenses', methods=['POST'])
@login_required
def create_expense():
    data = request.get_json()
    exp  = Expense(
        amount      = float(data['amount']),
        description = data['description'],
        category    = data['category'],
        date        = data['date'],
        notes       = data.get('notes', ''),
        user_id     = session['user_id'],
    )
    db.session.add(exp)
    db.session.commit()
    return jsonify(exp.to_dict()), 201

@app.route('/api/expenses/<id>', methods=['PUT'])
@login_required
def update_expense(id):
    exp  = Expense.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    data = request.get_json()
    exp.amount      = float(data.get('amount',      exp.amount))
    exp.description = data.get('description', exp.description)
    exp.category    = data.get('category',    exp.category)
    exp.date        = data.get('date',        exp.date)
    exp.notes       = data.get('notes',       exp.notes)
    db.session.commit()
    return jsonify(exp.to_dict())

@app.route('/api/expenses/<id>', methods=['DELETE'])
@login_required
def delete_expense(id):
    exp = Expense.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    db.session.delete(exp)
    db.session.commit()
    return '', 204

# ═══════════════════════════════════════════════════════════════
# API — INVOICES
# ═══════════════════════════════════════════════════════════════

@app.route('/api/invoices', methods=['GET'])
@login_required
def get_invoices():
    uid      = session['user_id']
    invoices = Invoice.query.filter_by(user_id=uid).order_by(Invoice.date.desc()).all()
    return jsonify([inv.to_dict() for inv in invoices])

@app.route('/api/invoices', methods=['POST'])
@login_required
def create_invoice():
    data    = request.get_json()
    invoice = Invoice(
        title   = data['title'],
        date    = data['date'],
        user_id = session['user_id'],
    )
    db.session.add(invoice)
    db.session.flush()
    for item in data.get('items', []):
        db.session.add(InvoiceItem(
            invoice_id   = invoice.id,
            product_name = item['product_name'],
            quantity     = float(item['quantity']),
            unit_price   = float(item['unit_price']),
        ))
    db.session.commit()
    return jsonify(invoice.to_dict()), 201

@app.route('/api/invoices/scan-receipt', methods=['POST'])
@login_required
def scan_receipt():
    import base64, json, re
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        return jsonify({'error': 'ANTHROPIC_API_KEY not configured on server'}), 500

    f = request.files['image']
    raw = f.read()
    if len(raw) > 8 * 1024 * 1024:
        return jsonify({'error': 'Image too large (max 8MB)'}), 400

    mime = f.mimetype or 'image/jpeg'
    if mime not in ('image/jpeg', 'image/png', 'image/webp', 'image/gif'):
        mime = 'image/jpeg'
    b64 = base64.standard_b64encode(raw).decode('utf-8')

    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=api_key)
        prompt = (
            "Analyze this receipt image. Extract: a short title (store/merchant name), "
            "the purchase date in YYYY-MM-DD, and the list of purchased items. "
            "For each item extract product_name (clean label), quantity (1 if unknown), "
            "and total_price (the line total paid). Skip subtotals, taxes, totals, discounts. "
            "Respond with ONLY a JSON object (no prose, no markdown) with keys: "
            'title (string), date (string, YYYY-MM-DD or empty), '
            'items (array of {product_name, quantity, total_price}).'
        )
        msg = client.messages.create(
            model='claude-sonnet-4-6',
            max_tokens=2048,
            messages=[{
                'role': 'user',
                'content': [
                    {'type': 'image', 'source': {'type': 'base64', 'media_type': mime, 'data': b64}},
                    {'type': 'text', 'text': prompt},
                ],
            }],
        )
        text_out = ''.join(block.text for block in msg.content if getattr(block, 'type', '') == 'text').strip()
        m = re.search(r'\{.*\}', text_out, re.DOTALL)
        if not m:
            return jsonify({'error': 'Could not parse receipt', 'raw': text_out}), 422
        parsed = json.loads(m.group(0))
        return jsonify({
            'title': parsed.get('title', '') or '',
            'date':  parsed.get('date', '')  or '',
            'items': parsed.get('items', []) or [],
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/invoices/<id>', methods=['PUT'])
@login_required
def update_invoice(id):
    invoice = Invoice.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    data    = request.get_json()
    invoice.title = data.get('title', invoice.title)
    invoice.date  = data.get('date',  invoice.date)
    InvoiceItem.query.filter_by(invoice_id=id).delete()
    for item in data.get('items', []):
        db.session.add(InvoiceItem(
            invoice_id   = id,
            product_name = item['product_name'],
            quantity     = float(item['quantity']),
            unit_price   = float(item['unit_price']),
        ))
    db.session.commit()
    return jsonify(invoice.to_dict())

@app.route('/api/invoices/<id>', methods=['DELETE'])
@login_required
def delete_invoice(id):
    invoice = Invoice.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    db.session.delete(invoice)
    db.session.commit()
    return '', 204

# ─── Shopping Lists ───────────────────────────────────────────
@app.route('/api/shopping-lists', methods=['GET'])
@login_required
def get_shopping_lists():
    lists = ShoppingList.query.filter_by(user_id=session['user_id'])\
                .order_by(ShoppingList.created_at.desc()).all()
    return jsonify([sl.to_dict() for sl in lists])

@app.route('/api/shopping-lists', methods=['POST'])
@login_required
def create_shopping_list():
    data = request.get_json()
    if not data.get('name', '').strip():
        return jsonify({'error': 'Name required'}), 400
    sl = ShoppingList(
        name    = data['name'].strip(),
        date    = data.get('date', datetime.now(timezone.utc).strftime('%Y-%m-%d')),
        status  = data.get('status', 'active'),
        user_id = session['user_id'],
    )
    db.session.add(sl)
    db.session.commit()
    return jsonify(sl.to_dict()), 201

@app.route('/api/shopping-lists/<id>', methods=['PUT'])
@login_required
def update_shopping_list(id):
    sl   = ShoppingList.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    data = request.get_json()
    if 'name'   in data: sl.name   = data['name'].strip()
    if 'date'   in data: sl.date   = data['date']
    if 'status' in data: sl.status = data['status']
    db.session.commit()
    return jsonify(sl.to_dict())

@app.route('/api/shopping-lists/<id>', methods=['DELETE'])
@login_required
def delete_shopping_list(id):
    sl = ShoppingList.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    db.session.delete(sl)
    db.session.commit()
    return '', 204

# ─── Shopping List Items ──────────────────────────────────────
@app.route('/api/shopping-lists/<list_id>/items', methods=['POST'])
@login_required
def add_shopping_list_item(list_id):
    sl   = ShoppingList.query.filter_by(id=list_id, user_id=session['user_id']).first_or_404()
    data = request.get_json()
    if not data.get('name', '').strip():
        return jsonify({'error': 'Name required'}), 400
    item = ShoppingListItem(
        list_id    = sl.id,
        name       = data['name'].strip(),
        quantity   = float(data.get('quantity') or 1),
        unit       = data.get('unit', ''),
        category   = data.get('category'),
        checked    = bool(data.get('checked', False)),
        note       = data.get('note', ''),
        unit_price = float(data['unit_price']) if data.get('unit_price') else None,
        barcode    = data.get('barcode', ''),
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

@app.route('/api/shopping-list-items/<id>', methods=['PUT'])
@login_required
def update_shopping_list_item(id):
    item = ShoppingListItem.query\
        .join(ShoppingList)\
        .filter(ShoppingListItem.id == id, ShoppingList.user_id == session['user_id'])\
        .first_or_404()
    data = request.get_json()
    if 'name'       in data: item.name       = data['name'].strip()
    if 'quantity'   in data: item.quantity   = float(data['quantity'] or 1)
    if 'unit'       in data: item.unit       = data['unit']
    if 'category'   in data: item.category   = data['category']
    if 'checked'    in data: item.checked    = bool(data['checked'])
    if 'note'       in data: item.note       = data['note']
    if 'unit_price' in data: item.unit_price = float(data['unit_price']) if data['unit_price'] else None
    if 'barcode'    in data: item.barcode    = data['barcode']
    db.session.commit()
    return jsonify(item.to_dict())

@app.route('/api/shopping-list-items/<id>', methods=['DELETE'])
@login_required
def delete_shopping_list_item(id):
    item = ShoppingListItem.query\
        .join(ShoppingList)\
        .filter(ShoppingListItem.id == id, ShoppingList.user_id == session['user_id'])\
        .first_or_404()
    db.session.delete(item)
    db.session.commit()
    return '', 204

# ─── Inventory ────────────────────────────────────────────────
@app.route('/api/inventory', methods=['GET'])
@login_required
def get_inventory():
    items = InventoryItem.query.filter_by(user_id=session['user_id'])\
                .order_by(InventoryItem.expiry_date.asc().nulls_last(), InventoryItem.name.asc()).all()
    return jsonify([i.to_dict() for i in items])

@app.route('/api/inventory', methods=['POST'])
@login_required
def create_inventory_item():
    data = request.get_json()
    if not data.get('name', '').strip():
        return jsonify({'error': 'Name required'}), 400
    item = InventoryItem(
        name        = data['name'].strip(),
        quantity    = float(data.get('quantity') or 1),
        unit        = data.get('unit', ''),
        category    = data.get('category'),
        location    = data.get('location', 'pantry'),
        expiry_date = data.get('expiry_date') or None,
        barcode     = data.get('barcode', ''),
        note        = data.get('note', ''),
        user_id     = session['user_id'],
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

@app.route('/api/inventory/<id>', methods=['PUT'])
@login_required
def update_inventory_item(id):
    item = InventoryItem.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    data = request.get_json()
    if 'name'        in data: item.name        = data['name'].strip()
    if 'quantity'    in data: item.quantity     = float(data['quantity'] or 1)
    if 'unit'        in data: item.unit         = data['unit']
    if 'category'    in data: item.category     = data['category']
    if 'location'    in data: item.location     = data['location']
    if 'expiry_date' in data: item.expiry_date  = data['expiry_date'] or None
    if 'barcode'     in data: item.barcode      = data['barcode']
    if 'note'        in data: item.note         = data['note']
    db.session.commit()
    return jsonify(item.to_dict())

@app.route('/api/inventory/<id>', methods=['DELETE'])
@login_required
def delete_inventory_item(id):
    item = InventoryItem.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    db.session.delete(item)
    db.session.commit()
    return '', 204

# ─── Inventory locations ──────────────────────────────────────
@app.route('/api/inventory-locations', methods=['GET'])
@login_required
def get_inventory_locations():
    locs = InventoryLocation.query.filter_by(user_id=session['user_id']).order_by(InventoryLocation.name).all()
    return jsonify([l.to_dict() for l in locs])

@app.route('/api/inventory-locations', methods=['POST'])
@login_required
def create_inventory_location():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Le nom est requis.'}), 400
    loc = InventoryLocation(
        id      = gen_id(),
        name    = name,
        icon    = data.get('icon') or '📦',
        user_id = session['user_id'],
    )
    db.session.add(loc)
    db.session.commit()
    return jsonify(loc.to_dict()), 201

@app.route('/api/inventory-locations/<id>', methods=['PUT'])
@login_required
def update_inventory_location(id):
    loc  = InventoryLocation.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Le nom est requis.'}), 400
    loc.name = name
    loc.icon = data.get('icon') or loc.icon
    db.session.commit()
    return jsonify(loc.to_dict())

@app.route('/api/inventory-locations/<id>', methods=['DELETE'])
@login_required
def delete_inventory_location(id):
    loc = InventoryLocation.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    in_use = InventoryItem.query.filter_by(user_id=session['user_id'], location=id).count()
    if in_use:
        return jsonify({'error': f'{in_use} produit(s) utilisent cet emplacement. Déplace-les d\'abord.'}), 409
    db.session.delete(loc)
    db.session.commit()
    return '', 204

# ─── Stores ───────────────────────────────────────────────────
@app.route('/api/stores', methods=['GET'])
@login_required
def get_stores():
    stores = Store.query.filter_by(user_id=session['user_id']).order_by(Store.name).all()
    return jsonify([s.to_dict() for s in stores])

@app.route('/api/stores', methods=['POST'])
@login_required
def create_store():
    data = request.get_json()
    if not data.get('name', '').strip():
        return jsonify({'error': 'Name required'}), 400
    store = Store(name=data['name'].strip(), user_id=session['user_id'])
    db.session.add(store)
    db.session.commit()
    return jsonify(store.to_dict()), 201

@app.route('/api/stores/<id>', methods=['PUT'])
@login_required
def update_store(id):
    store = Store.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    data  = request.get_json()
    if 'name' in data: store.name = data['name'].strip()
    db.session.commit()
    return jsonify(store.to_dict())

@app.route('/api/stores/<id>', methods=['DELETE'])
@login_required
def delete_store(id):
    store = Store.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    db.session.delete(store)
    db.session.commit()
    return '', 204

# ─── Price Records ────────────────────────────────────────────
@app.route('/api/price-records', methods=['GET'])
@login_required
def get_price_records():
    records = PriceRecord.query.filter_by(user_id=session['user_id'])\
                  .order_by(PriceRecord.date.desc()).all()
    return jsonify([r.to_dict() for r in records])

@app.route('/api/price-records', methods=['POST'])
@login_required
def create_price_record():
    data = request.get_json()
    if not data.get('product_name', '').strip():
        return jsonify({'error': 'Product name required'}), 400
    if not data.get('store_id'):
        return jsonify({'error': 'Store required'}), 400
    store = Store.query.filter_by(id=data['store_id'], user_id=session['user_id']).first_or_404()
    rec = PriceRecord(
        product_name = data['product_name'].strip(),
        barcode      = data.get('barcode', ''),
        store_id     = store.id,
        price        = float(data['price']),
        unit         = data.get('unit', ''),
        date         = data.get('date', datetime.now(timezone.utc).strftime('%Y-%m-%d')),
        user_id      = session['user_id'],
    )
    db.session.add(rec)
    db.session.commit()
    return jsonify(rec.to_dict()), 201

@app.route('/api/price-records/<id>', methods=['PUT'])
@login_required
def update_price_record(id):
    rec  = PriceRecord.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    data = request.get_json()
    if 'product_name' in data: rec.product_name = data['product_name'].strip()
    if 'barcode'      in data: rec.barcode       = data['barcode']
    if 'store_id'     in data: rec.store_id      = data['store_id']
    if 'price'        in data: rec.price         = float(data['price'])
    if 'unit'         in data: rec.unit          = data['unit']
    if 'date'         in data: rec.date          = data['date']
    db.session.commit()
    return jsonify(rec.to_dict())

@app.route('/api/price-records/<id>', methods=['DELETE'])
@login_required
def delete_price_record(id):
    rec = PriceRecord.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    db.session.delete(rec)
    db.session.commit()
    return '', 204

# ─── Run ──────────────────────────────────────────────────────
if __name__ == '__main__':
    app.run(debug=True, port=5000)
