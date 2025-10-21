import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'onelast.settings')
django.setup()

from accounts.models import StudentProfile
from django.conf import settings

print("=" * 60)
print("Fixing Resume Paths in Database")
print("=" * 60)

# Get all profiles with resumes
profiles = StudentProfile.objects.filter(resume__isnull=False).exclude(resume='')

for profile in profiles:
    old_path = profile.resume.name
    print(f"\nStudent: {profile.student_id} - {profile.first_name} {profile.last_name}")
    print(f"  Current DB path: {old_path}")
    
    # Check what files exist in the student's resume directory
    student_resume_dir = os.path.join(settings.MEDIA_ROOT, 'students', profile.student_id, 'resumes')
    
    if os.path.exists(student_resume_dir):
        files = os.listdir(student_resume_dir)
        if files:
            print(f"  Files in directory: {files}")
            
            # Use the first PDF file found
            pdf_files = [f for f in files if f.lower().endswith('.pdf')]
            if pdf_files:
                new_filename = pdf_files[0]
                new_path = f"students/{profile.student_id}/resumes/{new_filename}"
                new_full_path = os.path.join(settings.MEDIA_ROOT, new_path)
                
                if os.path.exists(new_full_path):
                    print(f"  New path: {new_path}")
                    print(f"  File exists: YES ✓")
                    
                    # Update the database
                    profile.resume.name = new_path
                    profile.save(update_fields=['resume'])
                    print(f"  ✓ UPDATED in database")
                else:
                    print(f"  ✗ File not found at: {new_full_path}")
            else:
                print(f"  ✗ No PDF files found in directory")
        else:
            print(f"  ✗ Directory is empty")
    else:
        print(f"  ✗ Directory does not exist: {student_resume_dir}")

print("\n" + "=" * 60)
print("VERIFICATION - Checking updated paths")
print("=" * 60)

# Verify the changes
profiles = StudentProfile.objects.filter(resume__isnull=False).exclude(resume='')
for profile in profiles:
    print(f"\n{profile.student_id}: {profile.resume.url}")
    full_path = profile.resume.path
    exists = os.path.exists(full_path)
    print(f"  File exists: {'YES ✓' if exists else 'NO ✗'}")

print("\n" + "=" * 60)
print("Done!")
print("=" * 60)
