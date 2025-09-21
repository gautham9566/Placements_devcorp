from flask import jsonify
from werkzeug.exceptions import HTTPException
from app.utils.logger import log_error

def register_error_handlers(app):
    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        log_error(error, {
            'code': error.code,
            'name': error.name,
            'description': error.description
        })
        response = jsonify({
            'error': error.description,
            'status_code': error.code
        })
        response.status_code = error.code
        return response

    @app.errorhandler(Exception)
    def handle_generic_error(error):
        log_error(error, {
            'type': type(error).__name__,
            'message': str(error)
        })
        response = jsonify({
            'error': 'An unexpected error occurred',
            'status_code': 500
        })
        response.status_code = 500
        return response 