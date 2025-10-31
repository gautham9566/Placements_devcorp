from rest_framework import serializers
from .models import Company

class CompanySerializer(serializers.ModelSerializer):
    """Serializer for the full Company model"""
    class Meta:
        model = Company
        fields = '__all__'
        read_only_fields = ['slug', 'created_at', 'updated_at']

class CompanyListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing companies"""
    class Meta:
        model = Company
        fields = ['id', 'name', 'logo', 'industry', 'location', 'tier', 
                  'campus_recruiting', 'total_active_jobs', 'total_applicants']

class CompanyCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating companies"""
    class Meta:
        model = Company
        exclude = ['slug', 'created_at', 'updated_at']
    
    def validate_founded(self, value):
        try:
            year = int(value)
            current_year = 2024  # Can use datetime.now().year in actual code
            if year < 1800 or year > current_year:
                raise serializers.ValidationError(f"Founded year must be between 1800 and {current_year}")
        except ValueError:
            raise serializers.ValidationError("Founded year must be a valid year (e.g., 1998)")
        return value

class CompanyStatsSerializer(serializers.ModelSerializer):
    """Serializer for company statistics"""
    class Meta:
        model = Company
        fields = ['id', 'name', 'total_active_jobs', 'total_applicants', 
                  'total_hired', 'awaited_approval']
