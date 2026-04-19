import os
from functools import wraps
from flask import Flask, jsonify, request, send_from_directory, session, redirect, render_template
from sqlalchemy import text, inspect as sa_inspect
from models import db, Category, Revenue, User, ExpenseCategory, Expense, Invoice, InvoiceItem, gen_id

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
        if 'initial_balance' not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN initial_balance FLOAT DEFAULT 0.0"))
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
    db.session.commit()
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
        color   = data.get('color', '#6366f1'),
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

@app.route('/api/balance', methods=['GET'])
@login_required
def get_balance():
    user = User.query.filter_by(username=session['username']).first()
    return jsonify({'initial_balance': user.initial_balance or 0.0})

@app.route('/api/balance', methods=['PUT'])
@login_required
def update_balance():
    data = request.get_json()
    try:
        amount = float(data.get('initial_balance', 0))
    except (TypeError, ValueError):
        return jsonify({'error': 'Montant invalide.'}), 400
    user = User.query.filter_by(username=session['username']).first()
    user.initial_balance = amount
    db.session.commit()
    return jsonify({'initial_balance': user.initial_balance})

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
    db.session.commit()
    return jsonify({'id': user.id, 'username': user.username}), 201

@app.route('/api/users/<id>', methods=['DELETE'])
@admin_required
def delete_user(id):
    user = User.query.get_or_404(id)
    if user.username == session.get('username'):
        return jsonify({'error': 'Tu ne peux pas supprimer ton propre compte.'}), 403
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

# ─── Run ──────────────────────────────────────────────────────
if __name__ == '__main__':
    app.run(debug=True, port=5000)
