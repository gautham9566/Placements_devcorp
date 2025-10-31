"""
Custom storage backends for Azure Blob Storage
"""
from storages.backends.azure_storage import AzureStorage
from django.conf import settings


class AzureMediaStorage(AzureStorage):
    """
    Custom Azure Storage backend for media files with private access.
    This backend generates signed URLs for private blob access.
    """
    account_name = settings.AZURE_ACCOUNT_NAME
    account_key = settings.AZURE_ACCOUNT_KEY
    azure_container = settings.AZURE_CONTAINER
    expiration_secs = settings.AZURE_URL_EXPIRATION_SECS
    overwrite_files = False  # Don't overwrite existing files
    location = ''  # Store files at the root of the container
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Ensure settings are properly loaded
        self.account_name = settings.AZURE_ACCOUNT_NAME
        self.account_key = settings.AZURE_ACCOUNT_KEY
        self.azure_container = settings.AZURE_CONTAINER
        self.expiration_secs = settings.AZURE_URL_EXPIRATION_SECS
