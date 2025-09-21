import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler

# Create logs directory if it doesn't exist
logs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
os.makedirs(logs_dir, exist_ok=True)

# Configure logging
logger = logging.getLogger('support_flow_nexus')
logger.setLevel(logging.DEBUG)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_format = logging.Formatter('%(levelname)s: %(message)s')
console_handler.setFormatter(console_format)
logger.addHandler(console_handler)

# File handler
log_file = os.path.join(logs_dir, f'app_{datetime.now().strftime("%Y%m%d")}.log')
file_handler = RotatingFileHandler(log_file, maxBytes=10485760, backupCount=5)  # 10MB per file, keep 5 files
file_handler.setLevel(logging.DEBUG)
file_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(file_format)
logger.addHandler(file_handler)

def log_error(error, context=None):
    """
    Log an error with optional context information
    """
    logger.error("=== Error Details ===")
    logger.error(f"Type: {type(error).__name__}")
    logger.error(f"Message: {str(error)}")
    
    if hasattr(error, '__traceback__'):
        import traceback
        logger.error("Traceback:")
        logger.error(traceback.format_exc())
    
    if context:
        logger.error("Context:")
        for key, value in context.items():
            logger.error(f"{key}: {value}")
    
    logger.error("===================")

__all__ = ['logger', 'log_error'] 