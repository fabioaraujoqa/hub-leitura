// Configuração da API - CORRIGIDA!
const API_BASE_URL = 'http://localhost:3000/api';

class ApiService {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.token = localStorage.getItem('authToken');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            console.log(`🔄 Fazendo requisição: ${config.method || 'GET'} ${url}`);
            
            const response = await fetch(url, config);
            const data = await response.json();

            console.log(`✅ Resposta recebida:`, data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Erro na requisição');
            }

            return data;
        } catch (error) {
            console.error('❌ Erro na API:', error);
            
            // Se for erro de conexão, mostrar mensagem específica
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
            }
            
            throw error;
        }
    }

    // Métodos de autenticação
    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.token) {
            this.token = data.token;
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        return data;
    }

    async register(name, email, password) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });

        if (data.token) {
            this.token = data.token;
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        return data;
    }

    async getBooks(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/books?${queryString}` : '/books';
        return await this.request(endpoint);
    }

    async getBook(id) {
        return await this.request(`/books/${id}`);
    }

    logout() {
        this.token = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }

    isAuthenticated() {
        return !!this.token;
    }

    getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }

    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    }
}

// Instância global
const api = new ApiService();

// Função para mostrar notificações
function showNotification(message, type = 'info') {
    console.log(`📢 Notificação: ${message} (${type})`);
    
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full`;
    
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    
    notification.classList.add(colors[type] || colors.info);
    notification.innerHTML = `
        
${message}

    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.remove('translate-x-full'), 100);
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.add('translate-x-full');
            setTimeout(() => notification.remove(), 300);
        }
    }, 4000);
}

// Verificar se backend está rodando
async function checkBackendHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        console.log('✅ Backend conectado:', data.message);
        return true;
    } catch (error) {
        console.error('❌ Backend não está rodando!');
        showNotification('Backend não está rodando! Execute: npm start', 'error');
        return false;
    }
}

// Verificar conexão quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    checkBackendHealth();
});