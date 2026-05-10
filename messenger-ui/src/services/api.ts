import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

export interface RegisterData {
    name: string;
    email: string;
    password: string;
}

export interface LoginData {
    email: string;
    password: string;
}

export interface UserResponse {
    id: number;
    name: string;
    email: string;
    createdAt?: string;
}

export const registerUser = async (data: RegisterData): Promise<UserResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
};

export const loginUser = async (data: LoginData): Promise<UserResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
};

export default api;