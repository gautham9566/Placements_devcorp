# Import and setup custom admin site
default_app_config = 'onelast.apps.OnelastConfig'

# Setup custom admin site early
def setup_admin():
    """Setup custom admin site before Django loads admin"""
    from django.contrib import admin
    from .admin import DevCorpAdminSite
    
    # Replace the default admin site
    admin.site = DevCorpAdminSite()
    admin.site.__class__ = DevCorpAdminSite

# Call setup immediately
try:
    setup_admin()
except Exception:
    # If admin is not yet ready, it will be setup in admin.py
    pass
