import client from './client';

// Register new student
export function signup(data) {
  return client.post('/api/auth/register/student/', data);
}

// Login and get tokens
export function login(data) {
  return client.post('/api/auth/login/', data);
}

// Upload Resume
export function uploadResume(file, accessToken) {
  const formData = new FormData();
  formData.append('resume', file);

  return client.patch('/api/auth/profile/', formData, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'multipart/form-data',
    }
  });
}

export const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
};

export const setAuthToken = (token) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', token);
  }
};

export const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
};

export const getRefreshToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('refresh_token');
  }
  return null;
};

export const setRefreshToken = (token) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('refresh_token', token);
  }
};
