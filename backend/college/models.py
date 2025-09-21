from django.db import models

class College(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)  # used in URLs like /college/<slug>/

    def __str__(self):
        return self.name
