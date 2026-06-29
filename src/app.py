"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
import os
from datetime import timedelta
from flask import Flask, request, jsonify, url_for, send_from_directory
from flask_migrate import Migrate
from flask_swagger import swagger
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from api.utils import APIException, generate_sitemap
from api.models import db
from api.routes import api
from api.admin import setup_admin
from api.commands import setup_commands

# from models import Person

ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(
    os.path.realpath(__file__)), '../dist/')


def _require_jwt_secret():
    jwt_secret = os.getenv('JWT_SECRET_KEY', '').strip()
    legacy_secret = os.getenv('FLASK_APP_KEY', '').strip()
    secret = jwt_secret or legacy_secret

    if not secret:
        raise RuntimeError(
            "Falta configurar JWT_SECRET_KEY (o FLASK_APP_KEY legacy). "
            "Define una clave secreta fuerte antes de iniciar el backend."
        )

    insecure_values = {
        'change-me-in-production',
        'any key works',
        'changeme',
        'secret',
    }
    if secret.lower() in insecure_values:
        raise RuntimeError(
            "JWT_SECRET_KEY/FLASK_APP_KEY tiene un valor inseguro. "
            "Usa una clave secreta fuerte y única."
        )

    return secret


app = Flask(__name__)
app.url_map.strict_slashes = False
app.config['JWT_SECRET_KEY'] = _require_jwt_secret()
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(
    minutes=int(os.getenv('JWT_ACCESS_TOKEN_MINUTES', '30')))
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(
    days=int(os.getenv('JWT_REFRESH_TOKEN_DAYS', '7')))


def _build_cors_origins():
    configured = os.getenv("CORS_ALLOWED_ORIGINS", "").strip()
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]
    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        r"https://.*\.app\.github\.dev",
        r"https://.*\.githubpreview\.dev",
    ]


# database condiguration
db_url = os.getenv("DATABASE_URL")
if db_url is not None:
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace(
        "postgres://", "postgresql://")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:////tmp/test.db"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)
jwt = JWTManager(app)


@jwt.unauthorized_loader
def handle_missing_token(reason):
    return jsonify({"error": "Token de acceso requerido", "details": reason}), 401


@jwt.expired_token_loader
def handle_expired_token(jwt_header, jwt_payload):
    return jsonify({"error": "Token expirado", "details": "Inicia sesión o renueva tu sesión"}), 401


@jwt.invalid_token_loader
def handle_invalid_token(reason):
    return jsonify({"error": "Token inválido", "details": reason}), 401


@jwt.revoked_token_loader
def handle_revoked_token(jwt_header, jwt_payload):
    return jsonify({"error": "Token revocado"}), 401


# add the admin
setup_admin(app)

# add the admin
setup_commands(app)

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": _build_cors_origins(),
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
        }
    },
)

# Add all endpoints form the API with a "api" prefix
app.register_blueprint(api, url_prefix='/api')

# Handle/serialize errors like a JSON object


@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

# generate sitemap with all your endpoints


@app.route('/')
def sitemap():
    if ENV == "development":
        return generate_sitemap(app)
    return send_from_directory(static_file_dir, 'index.html')

# any other endpoint will try to serve it like a static file


@app.route('/<path:path>', methods=['GET'])
def serve_any_other_file(path):
    if not os.path.isfile(os.path.join(static_file_dir, path)):
        path = 'index.html'
    response = send_from_directory(static_file_dir, path)
    response.cache_control.max_age = 0  # avoid cache memory
    return response


# this only runs if `$ python src/main.py` is executed
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    app.run(host='0.0.0.0', port=PORT, debug=True)
