from college.models import College
from django.http import JsonResponse

class CollegeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path_parts = request.path.split('/')
        if 'api' in path_parts and 'college' in path_parts:
            try:
                slug_index = path_parts.index('college') + 1
                slug = path_parts[slug_index]
                college = College.objects.get(slug=slug)
                request.college = college
            except (IndexError, College.DoesNotExist):
                return JsonResponse({'error': 'Invalid college slug.'}, status=404)
        return self.get_response(request)
