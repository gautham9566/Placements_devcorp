# Generated manually to remove college fields

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0022_auto_20251003_2335'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='studentprofile',
            name='college',
        ),
        migrations.RemoveField(
            model_name='user',
            name='college',
        ),
    ]