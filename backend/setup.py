"""
Job Portal Setup Script

This script sets up the Django project, applies migrations, and seeds the database with dummy data.
"""
import os
import subprocess
import sys

def run_command(command):
    print(f"Running: {command}")
    process = subprocess.run(command, shell=True)
    if process.returncode != 0:
        print(f"Command failed with exit code {process.returncode}")
        sys.exit(1)

def main():
    
    run_command("python manage.py makemigrations accounts")
    run_command("python manage.py makemigrations jobs")
    
    
    run_command("python manage.py migrate")
    
    
    run_command("python manage.py seed_data")
    
    
    print("Do you want to create a superuser? (y/n)")
    create_superuser = input().lower().strip()
    if create_superuser == 'y':
        run_command("python manage.py createsuperuser")
    
    
    print("Setup complete! Starting the development server...")
    run_command("python manage.py runserver")

if __name__ == "__main__":
    main()