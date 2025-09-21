from django.db import migrations, models
from django.utils.text import slugify

def populate_slug(apps, schema_editor):
    Company = apps.get_model('companies', 'Company')
    for company in Company.objects.all():
        company.slug = slugify(company.name)
        company.save()

class Migration(migrations.Migration):

    dependencies = [
        ('companies', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='company',
            name='slug',
            field=models.SlugField(blank=True, max_length=255, null=True, unique=True),
        ),
        migrations.RunPython(populate_slug),
    ]
