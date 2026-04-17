import os
from functools import wraps
from flask import Flask, jsonify, request, send_from_directory, session, redirect, render_template
from models import db, Category, Revenue, User, gen_id

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
            return redirect('/login')
        return f(*args, **kwargs)
    return decorated

# ─── Default categories ───────────────────────────────────────
DEFAULT_CATEGORIES = [
    {'id': 'salary',     'name': 'Salaire',         'color': '#6366f1', 'icon': '💼'},
    {'id': 'freelance',  'name': 'Freelance',        'color': '#8b5cf6', 'icon': '💻'},
    {'id': 'investment', 'name': 'Investissements',  'color': '#10b981', 'icon': '📈'},
    {'id': 'rental',     'name': 'Loyer reçu',       'color': '#f59e0b', 'icon': '🏠'},
    {'id': 'bonus',      'name': 'Bonus / Prime',    'color': '#ef4444', 'icon': '🎁'},
    {'id': 'other',      'name': 'Autre',            'color': '#6b7280', 'icon': '📦'},
]

# ─── Create tables + seed on first launch ────────────────────
with app.app_context():
    os.makedirs(os.path.join(basedir, 'instance'), exist_ok=True)
    db.create_all()
    if Category.query.count() == 0:
        for c in DEFAULT_CATEGORIES:
            db.session.add(Category(**c))
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
        session['username']   = user.username
        return redirect('/')
    return render_template('login.html', error='Nom d\'utilisateur ou mot de passe incorrect.')

@app.route('/register', methods=['GET'])
def register_page():
    # Si un compte existe déjà, rediriger vers login
    if User.query.count() > 0:
        return redirect('/login')
    return render_template('register.html', error=None)

@app.route('/register', methods=['POST'])
def register():
    if User.query.count() > 0:
        return redirect('/login')
    username  = request.form.get('username', '').strip()
    password  = request.form.get('password', '')
    password2 = request.form.get('password2', '')
    if not username or not password:
        return render_template('register.html', error='Tous les champs sont obligatoires.')
    if len(password) < 6:
        return render_template('register.html', error='Le mot de passe doit contenir au moins 6 caractères.')
    if password != password2:
        return render_template('register.html', error='Les mots de passe ne correspondent pas.')
    user = User(username=username)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    session['logged_in'] = True
    session['username']   = user.username
    return redirect('/')

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
    revenues = Revenue.query.order_by(Revenue.date.desc()).all()
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
    )
    db.session.add(rev)
    db.session.commit()
    return jsonify(rev.to_dict()), 201


@app.route('/api/revenues/<id>', methods=['PUT'])
@login_required
def update_revenue(id):
    rev  = Revenue.query.get_or_404(id)
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
    rev = Revenue.query.get_or_404(id)
    db.session.delete(rev)
    db.session.commit()
    return '', 204

# ═══════════════════════════════════════════════════════════════
# API — CATEGORIES
# ═══════════════════════════════════════════════════════════════

@app.route('/api/categories', methods=['GET'])
@login_required
def get_categories():
    cats = Category.query.all()
    return jsonify([c.to_dict() for c in cats])


@app.route('/api/categories', methods=['POST'])
@login_required
def create_category():
    data = request.get_json()
    cat  = Category(
        id    = gen_id(),
        name  = data['name'],
        color = data.get('color', '#6366f1'),
        icon  = data.get('icon',  '📦'),
    )
    db.session.add(cat)
    db.session.commit()
    return jsonify(cat.to_dict()), 201


@app.route('/api/categories/<id>', methods=['PUT'])
@login_required
def update_category(id):
    cat  = Category.query.get_or_404(id)
    data = request.get_json()
    cat.name  = data.get('name',  cat.name)
    cat.color = data.get('color', cat.color)
    cat.icon  = data.get('icon',  cat.icon)
    db.session.commit()
    return jsonify(cat.to_dict())


@app.route('/api/categories/<id>', methods=['DELETE'])
@login_required
def delete_category(id):
    cat = Category.query.get_or_404(id)
    db.session.delete(cat)
    db.session.commit()
    return '', 204

# ═══════════════════════════════════════════════════════════════
# API — RESET (page Paramètres)
# ═══════════════════════════════════════════════════════════════

@app.route('/api/reset', methods=['POST'])
@login_required
def reset_data():
    Revenue.query.delete()
    Category.query.delete()
    for c in DEFAULT_CATEGORIES:
        db.session.add(Category(**c))
    db.session.commit()
    return '', 204


# ─── Run ──────────────────────────────────────────────────────
if __name__ == '__main__':
    app.run(debug=True, port=5000)
