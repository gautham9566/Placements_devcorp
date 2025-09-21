

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='jobapplication',
            options={},
        ),
        migrations.AlterModelOptions(
            name='jobposting',
            options={},
        ),
        migrations.AddField(
            model_name='jobapplication',
            name='resume',
            field=models.FileField(blank=True, null=True, upload_to='application_resumes/'),
        ),
    ]
