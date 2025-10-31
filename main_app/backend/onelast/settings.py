import os
from pathlib import Path
from datetime import timedelta
from django.templatetags.static import static
from django.urls import reverse_lazy
from django.utils.translation import gettext_lazy as _

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-change-me-in-production'

DEBUG = True

ALLOWED_HOSTS = ["*"]

# Azure Blob Storage Configuration
AZURE_ACCOUNT_NAME = 'devcorpdocstorage'
AZURE_ACCOUNT_KEY = ''
AZURE_CONTAINER = 'media'
AZURE_CUSTOM_DOMAIN = f'{AZURE_ACCOUNT_NAME}.blob.core.windows.net'

# Storage settings - Use Azure Blob Storage for media files
STORAGES = {
    "default": {
        "BACKEND": "onelast.storage_backends.AzureMediaStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

AZURE_SSL = True
AZURE_AUTO_SIGN = True  # Automatically sign URLs for private containers
AZURE_ACCESS_KEY = AZURE_ACCOUNT_KEY
AZURE_URL_EXPIRATION_SECS = 3600  # URL signature expiration time (1 hour)

# Media URL configuration for Azure
MEDIA_URL = f'https://{AZURE_CUSTOM_DOMAIN}/{AZURE_CONTAINER}/'
MEDIA_ROOT = ''  # Not used with Azure Storage

# Local media settings (keep as fallback/reference)
# MEDIA_URL = '/media/'
# MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Application definition
INSTALLED_APPS = [
    # Unfold must be before django.contrib.admin
    'unfold',
    'unfold.contrib.filters',  # optional, if special filters are needed
    'unfold.contrib.forms',    # optional, if special form elements are needed
    
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'storages',

    # Custom apps
    'accounts',
    'jobs',
    'companies',
    'metrics',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'onelast.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'onelast.wsgi.application'

# Database configuration for PostgreSQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'placements',
        'USER': 'devcorp_user',
        'PASSWORD': 'devcorp#5177',
        'HOST': '20.193.130.70',
        'PORT': '5432',
    }
}

# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.sqlite3',
#         'NAME': BASE_DIR / 'db.sqlite3',
#     }
# }

# Authentication settings
LOGIN_REDIRECT_URL = '/admin/'
LOGOUT_REDIRECT_URL = '/admin/login/'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

AUTH_USER_MODEL = 'accounts.User'

# JWT settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
}

CORS_ALLOW_ALL_ORIGINS = True

# Frontend URL for generating shareable links
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'accounts': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Django Unfold Configuration
UNFOLD = {
    "SITE_TITLE": "DevCorp Placements",
    "SITE_HEADER": "DevCorp Placement Management System",
    "SITE_URL": "/",
    "SITE_SYMBOL": "school",  # Material icon name
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": True,
    "THEME": None,
    "COLORS": {
        "primary": {
            "50": "250 245 255",
            "100": "243 232 255",
            "200": "233 213 255",
            "300": "216 180 254",
            "400": "192 132 252",
            "500": "168 85 247",
            "600": "147 51 234",
            "700": "126 34 206",
            "800": "107 33 168",
            "900": "88 28 135",
            "950": "59 7 100",
        },
    },
    "SIDEBAR": {
        "show_search": True,
        # Avoid overlay/drawer; keep navigation simple and page-based
        "show_all_applications": False,
        "navigation": [
            {
                "title": _("Dashboard"),
                "separator": False,
                "icon": "dashboard",
                "items": [
                    {
                        "title": _("Overview"),
                        "icon": "analytics",
                        "link": reverse_lazy("admin:index"),
                    },
                ],
            },
            {
                # Single-page site administration link (no dropdown)
                "title": _("Site administration"),
                "separator": True,
                "collapsible": False,
                "icon": "settings",
                "items": [
                    {
                        "title": _("All apps & models"),
                        "icon": "view_list",
                        "link": reverse_lazy("admin_site_admin"),
                    }
                ],
            },
            {
                "title": _("User Management"),
                "separator": True,
                "collapsible": True,
                "icon": "people",
                "items": [
                    {
                        "title": _("Users"),
                        "icon": "person",
                        "link": reverse_lazy("admin:accounts_user_changelist"),
                    },
                    {
                        "title": _("Student Profiles"),
                        "icon": "school",
                        "link": reverse_lazy("admin:accounts_studentprofile_changelist"),
                    },
                    {
                        "title": _("Year Management"),
                        "icon": "calendar_today",
                        "link": reverse_lazy("admin:accounts_yearmanagement_changelist"),
                    },
                    {
                        "title": _("Branch Management"),
                        "icon": "account_tree",
                        "link": reverse_lazy("admin:accounts_branchmanagement_changelist"),
                    },
                ],
            },
            {
                "title": _("Jobs & Applications"),
                "separator": True,
                "collapsible": True,
                "icon": "work",
                "items": [
                    {
                        "title": _("Job Postings"),
                        "icon": "work_outline",
                        "link": reverse_lazy("admin:jobs_jobposting_changelist"),
                    },
                    {
                        "title": _("Applications"),
                        "icon": "assignment",
                        "link": reverse_lazy("admin:jobs_jobapplication_changelist"),
                    },
                ],
            },
            {
                "title": _("Companies"),
                "separator": True,
                "collapsible": True,
                "icon": "business",
                "items": [
                    {
                        "title": _("Companies"),
                        "icon": "business_center",
                        "link": reverse_lazy("admin:companies_company_changelist"),
                    },
                ],
            },
        ],
    },
}

# Callback function for environment badge
def environment_callback(request):
    """Return environment name for display in admin header."""
    if DEBUG:
        return ["Development", "info"]
    return ["Production", "danger"]
