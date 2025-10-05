from django.db import models
from django.utils.text import slugify
from django.contrib.auth import get_user_model

User = get_user_model()

class Company(models.Model):
    TIER_CHOICES = [
        ('Tier 1', 'Tier 1'),
        ('Tier 2', 'Tier 2'),
        ('Tier 3', 'Tier 3'),
    ]
    
    name = models.CharField(max_length=255)
    # Make slug field optional with null=True to handle existing records
    slug = models.SlugField(max_length=255, unique=True, blank=True, null=True)
    logo = models.ImageField(upload_to='company_logos/', null=True, blank=True)
    description = models.TextField()
    industry = models.CharField(max_length=100)
    size = models.CharField(max_length=100)  # e.g., "100,000+ employees"
    founded = models.CharField(max_length=4)  # Year founded
    location = models.CharField(max_length=255)
    website = models.URLField(max_length=255)
    tier = models.CharField(max_length=10, choices=TIER_CHOICES, default='Tier 3')
    campus_recruiting = models.BooleanField(default=False)
    
    # Metrics
    total_active_jobs = models.IntegerField(default=0)
    total_applicants = models.IntegerField(default=0)
    total_hired = models.IntegerField(default=0)
    awaited_approval = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.slug and self.name:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = "Company"
        verbose_name_plural = "Companies"
        ordering = ['name']

class CompanyFollower(models.Model):
    company = models.ForeignKey('Company', on_delete=models.CASCADE, related_name='followers')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followed_companies')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('company', 'user')
        verbose_name = 'Company Follower'
        verbose_name_plural = 'Company Followers'

    def __str__(self):
        return f"{self.user.email} follows {self.company.name}"
