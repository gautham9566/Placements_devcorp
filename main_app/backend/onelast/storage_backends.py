"""
Custom storage backends for Azure Blob Storage
"""
from storages.backends.azure_storage import AzureStorage
from django.conf import settings
from datetime import datetime, timedelta
from azure.storage.blob import BlobSasPermissions, generate_blob_sas


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
    
    def url(self, name, expire=None, parameters=None):
        """
        Generate a signed URL with SAS token for private blob access.
        This allows secure, time-limited access to private blobs.
        """
        if not name:
            return None
            
        # Use the expiration from settings if not provided
        if expire is None:
            expire = self.expiration_secs
        
        try:
            # Generate SAS token for the blob
            sas_token = generate_blob_sas(
                account_name=self.account_name,
                container_name=self.azure_container,
                blob_name=name,
                account_key=self.account_key,
                permission=BlobSasPermissions(read=True),
                expiry=datetime.utcnow() + timedelta(seconds=expire)
            )
            
            # Construct the full URL with SAS token
            blob_url = f"https://{self.account_name}.blob.core.windows.net/{self.azure_container}/{name}?{sas_token}"
            
            return blob_url
            
        except Exception as e:
            print(f"Error generating signed URL: {e}")
            # Fallback to default URL generation
            return super().url(name)
