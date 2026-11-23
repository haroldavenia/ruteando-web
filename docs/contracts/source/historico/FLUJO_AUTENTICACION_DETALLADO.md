> [!WARNING]
> **Documento histórico (2026-11-17).** Describe rutas retiradas y sus ejemplos **no son ejecutables**:
> la superficie real es `/api/v1/auth/*` y `/api/v1/users/*`. Para el contrato vigente usar
> [`AUTHENTICATION_ENDPOINTS.md`](AUTHENTICATION_ENDPOINTS.md) y [`../api/endpoints.md`](../api/endpoints.md).

> **Estado: Parcialmente legacy** | Última revisión: 2026-04-23 (post-F4)
>
> [!IMPORTANT]
> El **catálogo y semántica canónica** de auth a partir de Fase 4 viven en:
> - [`docs/auth/AUTHENTICATION_ENDPOINTS.md`](AUTHENTICATION_ENDPOINTS.md) — endpoints `/api/auth/*` actualizados (incluye F4-08 lockout/rate limit)
> - [`docs/flows/TENANT_ONBOARDING_FLOW.md`](../flows/TENANT_ONBOARDING_FLOW.md) — flujo completo de registro, verificación, login, recuperación, lockout, invitaciones
> - [`docs/api/endpoints.md`](../api/endpoints.md) — referencia y error codes
>
> Este documento es histórico. El JWT ejemplificado más abajo (`sub` = email, `roles[]` arrays) refleja el modelo OAuth **legacy**; el modelo Fase 1+4 usa `sub` = `userId` (ObjectId), `tenantId`, `role` (singular). Los ejemplos de `/auth/login` (form-urlencoded) son legacy: la ruta canónica es `POST /api/auth/login` con JSON `{ email, password }`. Logout devuelve `200 {"message":"Logout exitoso"}`, no `204`. Las nuevas respuestas de error (401 `INVALID_CREDENTIALS`/`ACCOUNT_DISABLED`, 423 `ACCOUNT_LOCKED`, 429 `RATE_LIMIT_EXCEEDED`, 410 `OTP_EXPIRED`, 422 `MAX_ATTEMPTS_EXCEEDED`/`MAX_RESENDS`/`SEAT_LIMIT_EXCEEDED`/`ENTERPRISE_PLAN_SELF_SERVICE`) están listadas en `endpoints.md`.

# 🔐 HanoIT API - Flujo Detallado de Autenticación y Renovación de Tokens

## 📋 Tabla de Contenido
1. [Arquitectura General](#arquitectura-general)
2. [Tipos de Tokens](#tipos-de-tokens)
3. [Flujo Completo de Autenticación](#flujo-completo-de-autenticación)
4. [Renovación Automática de Tokens](#renovación-automática-de-tokens)
5. [Implementación Frontend](#implementación-frontend)
6. [Implementación Backend](#implementación-backend)
7. [Manejo de Errores](#manejo-de-errores)
8. [Mejores Prácticas](#mejores-prácticas)

---

## 🏗️ Arquitectura General

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Cliente   │         │   HanoIT    │         │   Base de   │
│  (Frontend/ │ ←────→  │     API     │ ←────→  │    Datos    │
│   Backend)  │         │   (OAuth2)  │         │   (MongoDB) │
└─────────────┘         └─────────────┘         └─────────────┘
```

### Componentes Principales

| Componente | Responsabilidad |
|------------|-----------------|
| **AuthController** | Gestión de autenticación OAuth2, tokens y perfil |
| **UserController** | Registro, activación y administración de usuarios |
| **JWT Service** | Generación y validación de tokens JWT |
| **Security Filter** | Intercepta y valida tokens en cada request |
| **MongoDB** | Almacena usuarios, roles y refresh tokens |

---

## 🎫 Tipos de Tokens

### Access Token (JWT)
```json
{
  "sub": "usuario@ejemplo.com",
  "roles": ["ROLE_USER", "ROLE_BASIC"],
  "iat": 1640000000,
  "exp": 1640003600
}
```

| Propiedad | Valor | Descripción |
|-----------|-------|-------------|
| **Duración** | 1 hora (3600s) | Tiempo de vida del token |
| **Uso** | Cada request a la API | Se envía en header `Authorization: Bearer` |
| **Almacenamiento** | Memoria o sessionStorage | NO usar localStorage por seguridad |
| **Renovación** | Mediante refresh token | Cuando expira o está por expirar |

### Refresh Token (Opaco)
```
a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

| Propiedad | Valor | Descripción |
|-----------|-------|-------------|
| **Duración** | 30 días | Más largo que access token |
| **Uso** | Obtener nuevo access token | Solo para endpoint `/auth/refresh` |
| **Almacenamiento** | httpOnly cookie o memoria | NUNCA localStorage |
| **Revocación** | Manual via `/auth/logout` | Invalida el refresh token |

---

## 🔄 Flujo Completo de Autenticación

### 1️⃣ Registro de Nuevo Usuario

```mermaid
sequenceDiagram
    participant C as Cliente
    participant API as HanoIT API
    participant DB as MongoDB
    participant Email as Servicio Email

    C->>API: POST /hanoit/api/v1/user/signup
    Note over C,API: username, password, password-repeat
    
    API->>DB: Verificar si usuario existe
    alt Usuario ya existe
        DB-->>API: Usuario encontrado
        API-->>C: 409 Conflict
    else Usuario nuevo
        DB-->>API: Usuario no existe
        API->>DB: Crear usuario (inactive)
        API->>DB: Generar token de activación
        API->>Email: Enviar email con token
        Email-->>C: Email de verificación
        API-->>C: 200 OK - Verificar email
    end
```

**Request:**
```bash
POST /hanoit/api/v1/user/signup
Content-Type: application/x-www-form-urlencoded

username=usuario@ejemplo.com
password=Password123
password-repeat=Password123
```

**Response:**
```json
{
  "message": "Usuario registrado exitosamente. Verifique su email para activar la cuenta."
}
```

---

### 2️⃣ Activación de Cuenta

```mermaid
sequenceDiagram
    participant C as Cliente
    participant API as HanoIT API
    participant DB as MongoDB

    C->>API: POST /hanoit/api/v1/user/signup/activate
    Note over C,API: token (del email)
    
    API->>DB: Buscar token de activación
    alt Token válido
        DB-->>API: Usuario encontrado
        API->>DB: Marcar usuario como activo
        API->>DB: Eliminar token usado
        API-->>C: 200 OK - Cuenta activada
    else Token inválido/expirado
        DB-->>API: Token no encontrado
        API-->>C: 400 Bad Request
    end
```

**Request:**
```bash
POST /hanoit/api/v1/user/signup/activate
Content-Type: application/x-www-form-urlencoded

token=abc123def456
```

**Response:**
```json
{
  "message": "Cuenta activada exitosamente"
}
```

---

### 3️⃣ Login (Obtener Tokens)

```mermaid
sequenceDiagram
    participant C as Cliente
    participant API as HanoIT API
    participant JWT as JWT Service
    participant DB as MongoDB

    C->>API: POST /auth/login
    Note over C,API: username, password
    
    API->>DB: Buscar usuario
    alt Usuario no existe o inactivo
        DB-->>API: Usuario no encontrado/inactivo
        API-->>C: 401 Unauthorized
    else Usuario válido
        DB-->>API: Usuario encontrado
        API->>API: Verificar contraseña (bcrypt)
        alt Contraseña incorrecta
            API-->>C: 401 Unauthorized
        else Contraseña correcta
            API->>JWT: Generar access token
            JWT-->>API: JWT token
            API->>DB: Generar y guardar refresh token
            DB-->>API: Refresh token UUID
            API-->>C: 200 OK + Tokens
            Note over C: Guardar tokens en memoria
        end
    end
```

**Request:**
```bash
POST /auth/login
Content-Type: application/json

{
  "username": "usuario@ejemplo.com",
  "password": "Password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3VhcmlvQGVqZW1wbG8uY29tIiwicm9sZXMiOlsiUk9MRV9VU0VSIl0sImlhdCI6MTY0MDAwMDAwMCwiZXhwIjoxNjQwMDAzNjAwfQ...",
  "refreshToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "expiresIn": 3600
}
```

---

### 4️⃣ Consumo de APIs Protegidas

```mermaid
sequenceDiagram
    participant C as Cliente
    participant Filter as Security Filter
    participant JWT as JWT Service
    participant API as Controller
    participant DB as MongoDB

    C->>Filter: GET /auth/me
    Note over C,Filter: Authorization: Bearer {accessToken}
    
    Filter->>Filter: Extraer token del header
    Filter->>JWT: Validar token
    
    alt Token inválido/expirado
        JWT-->>Filter: Token inválido
        Filter-->>C: 401 Unauthorized
        Note over C: Renovar token con refresh token
    else Token válido
        JWT-->>Filter: Token válido + Claims
        Filter->>DB: Cargar detalles del usuario
        DB-->>Filter: Usuario + Roles
        Filter->>API: Request con SecurityContext
        API->>API: Procesar request
        API-->>C: 200 OK + Datos
    end
```

**Request:**
```bash
GET /auth/me
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "username": "usuario@ejemplo.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "active": true,
  "roles": ["ROLE_USER", "ROLE_BASIC"]
}
```

---

### 5️⃣ Renovación de Token (Refresh)

```mermaid
sequenceDiagram
    participant C as Cliente
    participant API as HanoIT API
    participant JWT as JWT Service
    participant DB as MongoDB

    Note over C: Access token expiró
    
    C->>API: POST /auth/refresh
    Note over C,API: refreshToken
    
    API->>DB: Buscar refresh token
    alt Refresh token inválido/revocado
        DB-->>API: Token no encontrado
        API-->>C: 401 Unauthorized
        Note over C: Usuario debe hacer login nuevamente
    else Refresh token válido
        DB-->>API: Token encontrado + Usuario
        API->>API: Verificar expiración
        alt Refresh token expirado
            API->>DB: Eliminar refresh token
            API-->>C: 401 Unauthorized
        else Refresh token válido
            API->>JWT: Generar nuevo access token
            JWT-->>API: Nuevo JWT
            API->>DB: Actualizar última fecha de uso
            API-->>C: 200 OK + Nuevo access token
            Note over C: Actualizar access token en memoria
        end
    end
```

**Request:**
```bash
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.NEW_TOKEN...",
  "refreshToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "expiresIn": 3600
}
```

---

### 6️⃣ Logout (Revocar Tokens)

```mermaid
sequenceDiagram
    participant C as Cliente
    participant API as HanoIT API
    participant DB as MongoDB

    C->>API: POST /auth/logout
    Note over C,API: Authorization: Bearer {accessToken}<br/>refreshToken
    
    API->>DB: Buscar y eliminar refresh token
    DB-->>API: Token eliminado
    API-->>C: 200 OK
    Note over C: Eliminar tokens de memoria<br/>Redirigir a login
```

**Request:**
```bash
POST /auth/logout
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response:**
```json
{
  "message": "Logout exitoso"
}
```

---

## 🔄 Renovación Automática de Tokens

### Estrategia: Renovación Proactiva

```
Timeline de Access Token (1 hora de vida):

0min                    45min                  60min
│────────────────────────│──────────────────────│
│    Token válido        │   Zona de renovación │  Token expirado
│                        │   (15 min antes)     │
│                        │                      │
│                        └──→ Renovar aquí      │
│                                               │
└───────────────────────────────────────────────┘
```

### Cuándo Renovar

| Estrategia | Descripción | Ventaja | Desventaja |
|------------|-------------|---------|------------|
| **Proactiva** | Renovar 15 min antes de expirar | Usuario no experimenta interrupciones | Más requests al servidor |
| **Reactiva** | Renovar cuando el servidor devuelve 401 | Menos requests | Usuario puede ver errores momentáneos |
| **Híbrida** | Combinar ambas estrategias | Balance óptimo | Más compleja de implementar |

**Recomendación:** Estrategia **Híbrida**

---

## 💻 Implementación Frontend

### JavaScript/TypeScript Puro

```typescript
// auth-service.ts
class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(private baseUrl: string = 'http://localhost:8000') {}

  /**
   * Login del usuario
   */
  async login(username: string, password: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      throw new Error('Login fallido');
    }

    const data = await response.json();
    this.setTokens(data.accessToken, data.refreshToken, data.expiresIn);
  }

  /**
   * Almacenar tokens y configurar renovación automática
   */
  private setTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiresAt = Date.now() + (expiresIn * 1000);

    // Renovar 15 minutos antes de que expire (o 75% del tiempo)
    const renewTime = Math.max((expiresIn * 0.75) * 1000, (expiresIn - 900) * 1000);
    
    this.scheduleTokenRenewal(renewTime);
  }

  /**
   * Programar renovación automática del token
   */
  private scheduleTokenRenewal(delay: number): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(async () => {
      try {
        await this.renewToken();
      } catch (error) {
        console.error('Error renovando token automáticamente:', error);
        this.logout();
      }
    }, delay);
  }

  /**
   * Renovar access token usando refresh token
   */
  async renewToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No hay refresh token disponible');
    }

    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    if (!response.ok) {
      throw new Error('Renovación fallida');
    }

    const data = await response.json();
    this.setTokens(data.accessToken, data.refreshToken, data.expiresIn);
  }

  /**
   * Realizar request autenticado con renovación automática en caso de 401
   */
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    // Verificar si el token está por expirar
    if (this.isTokenExpiringSoon()) {
      await this.renewToken();
    }

    // Agregar token al header
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${this.accessToken}`);

    let response = await fetch(url, { ...options, headers });

    // Si recibimos 401, intentar renovar el token y reintentar
    if (response.status === 401 && this.refreshToken) {
      try {
        await this.renewToken();
        
        // Reintentar con nuevo token
        headers.set('Authorization', `Bearer ${this.accessToken}`);
        response = await fetch(url, { ...options, headers });
      } catch (error) {
        this.logout();
        throw new Error('Sesión expirada. Por favor inicie sesión nuevamente.');
      }
    }

    return response;
  }

  /**
   * Verificar si el token está por expirar (en los próximos 5 minutos)
   */
  private isTokenExpiringSoon(): boolean {
    if (!this.tokenExpiresAt) return false;
    return Date.now() >= (this.tokenExpiresAt - 300000); // 5 minutos
  }

  /**
   * Logout del usuario
   */
  async logout(): Promise<void> {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (this.refreshToken && this.accessToken) {
      try {
        await fetch(`${this.baseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken: this.refreshToken })
        });
      } catch (error) {
        console.error('Error en logout:', error);
      }
    }

    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null && this.tokenExpiresAt !== null && Date.now() < this.tokenExpiresAt;
  }

  /**
   * Obtener access token actual
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }
}

// Uso
const authService = new AuthService('http://localhost:8000');

// Login
await authService.login('usuario@ejemplo.com', 'Password123');

// Hacer request autenticado (con renovación automática)
const response = await authService.authenticatedFetch('http://localhost:8000/auth/me');
const profile = await response.json();

// Logout
await authService.logout();
```

---

### React + Context API

```typescript
// AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  const BASE_URL = 'http://localhost:8000';

  // Renovar token automáticamente
  useEffect(() => {
    if (!expiresAt) return;

    const timeUntilExpiry = expiresAt - Date.now();
    const renewTime = Math.max(timeUntilExpiry * 0.75, timeUntilExpiry - 900000); // 75% o 15min antes

    const timer = setTimeout(async () => {
      try {
        await renewTokenInternal();
      } catch (error) {
        console.error('Error renovando token:', error);
        logout();
      }
    }, renewTime);

    return () => clearTimeout(timer);
  }, [expiresAt]);

  const setTokens = useCallback((access: string, refresh: string, expiresIn: number) => {
    setAccessToken(access);
    setRefreshToken(refresh);
    setExpiresAt(Date.now() + (expiresIn * 1000));
  }, []);

  const renewTokenInternal = async () => {
    if (!refreshToken) throw new Error('No refresh token');

    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) throw new Error('Renovación fallida');

    const data = await response.json();
    setTokens(data.accessToken, data.refreshToken, data.expiresIn);
  };

  const login = async (username: string, password: string) => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) throw new Error('Login fallido');

    const data = await response.json();
    setTokens(data.accessToken, data.refreshToken, data.expiresIn);
  };

  const logout = async () => {
    if (refreshToken && accessToken) {
      try {
        await fetch(`${BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken })
        });
      } catch (error) {
        console.error('Error en logout:', error);
      }
    }

    setAccessToken(null);
    setRefreshToken(null);
    setExpiresAt(null);
  };

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    // Renovar si está por expirar
    if (expiresAt && Date.now() >= (expiresAt - 300000)) {
      await renewTokenInternal();
    }

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${accessToken}`);

    let response = await fetch(url, { ...options, headers });

    // Reintentar en caso de 401
    if (response.status === 401 && refreshToken) {
      try {
        await renewTokenInternal();
        headers.set('Authorization', `Bearer ${accessToken}`);
        response = await fetch(url, { ...options, headers });
      } catch (error) {
        logout();
        throw new Error('Sesión expirada');
      }
    }

    return response;
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!accessToken,
      login,
      logout,
      authenticatedFetch
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};

// Uso en componentes
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login('usuario@ejemplo.com', 'Password123');
      navigate('/dashboard');
    } catch (error) {
      alert('Login fallido');
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}

function Dashboard() {
  const { authenticatedFetch } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      const response = await authenticatedFetch('http://localhost:8000/auth/me');
      const data = await response.json();
      setProfile(data);
    };
    loadProfile();
  }, []);

  return <div>Dashboard: {profile?.username}</div>;
}
```

---

## 🖥️ Implementación Backend (Node.js)

```typescript
// auth-client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export class HanoitAuthClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number | null = null;
  private axiosInstance: AxiosInstance;

  constructor(private baseUrl: string = 'http://localhost:8000') {
    this.axiosInstance = axios.create({ baseURL: baseUrl });
    this.setupInterceptors();
  }

  /**
   * Configurar interceptors de Axios
   */
  private setupInterceptors(): void {
    // Request interceptor: Agregar token automáticamente
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Renovar si está por expirar
        if (this.isTokenExpiringSoon()) {
          await this.renewToken();
        }

        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: Renovar en caso de 401
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Si es 401 y no hemos reintentado aún
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.renewToken();
            originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.axiosInstance(originalRequest);
          } catch (renewError) {
            this.clearTokens();
            return Promise.reject(renewError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Login
   */
  async login(username: string, password: string): Promise<void> {
    const response = await axios.post(`${this.baseUrl}/auth/login`, {
      username,
      password
    });

    this.setTokens(
      response.data.accessToken,
      response.data.refreshToken,
      response.data.expiresIn
    );
  }

  /**
   * Almacenar tokens
   */
  private setTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresAt = Date.now() + (expiresIn * 1000);
  }

  /**
   * Renovar token
   */
  private async renewToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token disponible');
    }

    const response = await axios.post(`${this.baseUrl}/auth/refresh`, {
      refreshToken: this.refreshToken
    });

    this.setTokens(
      response.data.accessToken,
      response.data.refreshToken,
      response.data.expiresIn
    );
  }

  /**
   * Verificar si el token está por expirar
   */
  private isTokenExpiringSoon(): boolean {
    if (!this.expiresAt) return false;
    return Date.now() >= (this.expiresAt - 300000); // 5 minutos
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    if (this.refreshToken && this.accessToken) {
      try {
        await axios.post(
          `${this.baseUrl}/auth/logout`,
          { refreshToken: this.refreshToken },
          { headers: { Authorization: `Bearer ${this.accessToken}` } }
        );
      } catch (error) {
        console.error('Error en logout:', error);
      }
    }

    this.clearTokens();
  }

  /**
   * Limpiar tokens
   */
  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
  }

  /**
   * Obtener instancia de Axios configurada
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  /**
   * Verificar autenticación
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null && this.expiresAt !== null && Date.now() < this.expiresAt;
  }
}

// Uso
const client = new HanoitAuthClient('http://localhost:8000');

// Login
await client.login('usuario@ejemplo.com', 'Password123');

// Usar Axios configurado (renovación automática)
const axios = client.getAxiosInstance();
const response = await axios.get('/auth/me');
console.log(response.data);

// Logout
await client.logout();
```

---

## ⚠️ Manejo de Errores

### Tabla de Códigos de Error

| Código | Escenario | Acción |
|--------|-----------|--------|
| **401** | Token expirado o inválido | Renovar con refresh token |
| **401** | Refresh token inválido | Redirigir a login |
| **403** | Usuario sin permisos | Mostrar mensaje de acceso denegado |
| **409** | Usuario ya existe (registro) | Mostrar mensaje específico |
| **500** | Error del servidor | Reintentar o mostrar error genérico |

### Implementación de Manejo de Errores

```typescript
class ErrorHandler {
  static async handleAuthError(error: any, authService: AuthService): Promise<void> {
    if (error.response?.status === 401) {
      try {
        // Intentar renovar token
        await authService.renewToken();
        // Reintentar la operación original
      } catch (renewError) {
        // Renovación falló, redirigir a login
        authService.logout();
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      alert('No tienes permisos para realizar esta acción');
    } else if (error.response?.status === 500) {
      alert('Error del servidor. Por favor intenta más tarde.');
    } else {
      alert('Error inesperado');
    }
  }
}
```

---

## ✅ Mejores Prácticas

### Seguridad

1. **NUNCA guardar tokens en localStorage**
   ```typescript
   // ❌ MAL
   localStorage.setItem('accessToken', token);
   
   // ✅ BIEN
   // Mantener en memoria o sessionStorage si es absolutamente necesario
   ```

2. **Usar HTTPS en producción**
   ```typescript
   const BASE_URL = process.env.NODE_ENV === 'production' 
     ? 'https://api.hanoit.com' 
     : 'http://localhost:8000';
   ```

3. **Implementar CSRF protection**
   ```typescript
   // El backend debe validar tokens CSRF en requests de mutación
   ```

4. **Renovación proactiva de tokens**
   ```typescript
   // Renovar 15 minutos antes de que expire
   const renewTime = (expiresIn - 900) * 1000;
   ```

### Performance

1. **Evitar múltiples renovaciones simultáneas**
   ```typescript
   private renewPromise: Promise<void> | null = null;

   async renewToken(): Promise<void> {
     if (this.renewPromise) {
       return this.renewPromise;
     }

     this.renewPromise = this._doRenew();
     try {
       await this.renewPromise;
     } finally {
       this.renewPromise = null;
     }
   }
   ```

2. **Implementar retry con backoff exponencial**
   ```typescript
   async retryWithBackoff(fn: () => Promise<any>, maxRetries = 3): Promise<any> {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
       }
     }
   }
   ```

### Experiencia de Usuario

1. **Mostrar estados de carga**
   ```typescript
   const [isAuthenticating, setIsAuthenticating] = useState(false);
   ```

2. **Mensajes de error claros**
   ```typescript
   if (error.response?.status === 401) {
     setError('Credenciales inválidas. Por favor verifica tu usuario y contraseña.');
   }
   ```

3. **Persistir sesión entre recargas (con sessionStorage)**
   ```typescript
   // Solo si es aceptable en tu contexto de seguridad
   useEffect(() => {
     const saved = sessionStorage.getItem('auth');
     if (saved) {
       const { accessToken, refreshToken, expiresAt } = JSON.parse(saved);
       if (Date.now() < expiresAt) {
         setTokens(accessToken, refreshToken, expiresAt);
       }
     }
   }, []);
   ```

---

## 📊 Resumen de Endpoints

### Endpoints actuales (`/api/*`)

| Endpoint | Metodo | Uso | Auth |
|----------|--------|-----|------|
| `/api/auth/login` | POST | Login multitenant (JWT con tenantId + role) | No |
| `/api/auth/refresh` | POST | Renovar access token | No |
| `/api/auth/logout` | POST | Revocar refresh token | No |

### Endpoints legacy (deprecados)

| Endpoint | Metodo | Uso | Auth | Estado |
|----------|--------|-----|------|--------|
| `/hanoit/api/v1/user/signup` | POST | Registrar usuario | No | Deprecado |
| `/hanoit/api/v1/user/signup/activate` | POST | Activar cuenta | No | Deprecado |
| `/auth/login` | POST | Login legacy | No | Deprecado |
| `/auth/refresh` | POST | Renovar token legacy | No | Deprecado |
| `/auth/logout` | POST | Cerrar sesion legacy | Si | Deprecado |
| `/auth/me` | GET | Obtener perfil | Si | Deprecado |
| ~~`/auth/me`~~ | ~~PUT~~ | ~~Actualizar perfil~~ | — | **No existe en codigo** |
| ~~`/auth/change-password`~~ | ~~POST~~ | ~~Cambiar contrasena~~ | — | **No existe en codigo** |

---

## 🎯 Checklist de Implementación

### Frontend
- [ ] Implementar servicio de autenticación
- [ ] Configurar renovación automática de tokens
- [ ] Implementar interceptors HTTP
- [ ] Manejar errores 401 con renovación
- [ ] Implementar logout en todas las rutas protegidas
- [ ] Agregar loading states
- [ ] Implementar mensajes de error claros
- [ ] Proteger rutas que requieren autenticación

### Backend
- [ ] Configurar cliente HTTP con interceptors
- [ ] Implementar renovación automática de tokens
- [ ] Manejar reintentos con backoff
- [ ] Implementar logging de errores de autenticación
- [ ] Configurar timeouts apropiados
- [ ] Implementar circuit breaker para servicios externos

### Testing
- [ ] Probar flujo completo de login
- [ ] Probar renovación de tokens
- [ ] Probar expiración de tokens
- [ ] Probar logout
- [ ] Probar manejo de errores 401, 403, 500
- [ ] Probar requests concurrentes con renovación

---

## Fase 1 — Autenticacion Multitenant

### Cambios en JWT Claims

El access token JWT ahora incluye `tenantId` y `role` (singular) ademas de los claims legacy:

```json
{
  "sub": "ObjectId del usuario",
  "tenantId": "ObjectId del tenant",
  "role": "tenant_admin",
  "iat": 1640000000,
  "exp": 1640003600
}
```

### Componentes Nuevos

| Componente | Paquete | Responsabilidad |
|------------|---------|-----------------|
| `RoutingAuthController` | `com.hanoit.routing.controller` | Login/refresh/logout con JWT multitenant |
| `TenantInterceptor` | `com.hanoit.routing.security` | Extrae `tenantId` del JWT y lo inyecta en `TenantContext` |
| `TenantContext` | `com.hanoit.routing.security` | ThreadLocal que almacena el `tenantId` del request actual |
| `RoutingExceptionHandler` | `com.hanoit.routing.exception` | Manejo de excepciones para endpoints `/api/*` |
| `WebMvcConfig` | `com.hanoit.routing.config` | Registra `TenantInterceptor` en la cadena de interceptores |

### Flujo de Multitenancy

```mermaid
sequenceDiagram
    participant Client
    participant SecurityFilter
    participant TenantInterceptor
    participant TenantContext
    participant Controller
    participant Service
    participant MongoDB

    Client->>SecurityFilter: Request + Bearer JWT
    SecurityFilter->>SecurityFilter: Validate JWT signature
    SecurityFilter->>TenantInterceptor: preHandle()
    TenantInterceptor->>TenantInterceptor: Extract tenantId from JWT
    TenantInterceptor->>TenantContext: setTenantId(ObjectId)
    TenantInterceptor->>Controller: Forward request
    Controller->>TenantContext: getTenantId()
    Controller->>Service: operation(tenantId, ...)
    Service->>MongoDB: query with tenantId filter
    MongoDB-->>Service: tenant-scoped results
    Service-->>Controller: response
    Controller-->>Client: JSON response
    Note over TenantInterceptor: afterCompletion() -> TenantContext.clear()
```

### RBAC — Control de Acceso por Rol

```mermaid
flowchart TD
    A[Request /api/*] --> B{JWT valido?}
    B -->|No| C[401 Unauthorized]
    B -->|Si| D{Patron de URL}
    D -->|/api/auth/**| E[Publico - Permitir]
    D -->|/api/tenants/**| F{SUPER_ADMIN?}
    D -->|/api/admin/**| F
    D -->|/api/users/**| G{TENANT_ADMIN o SUPER_ADMIN?}
    D -->|/api/driver/**| H{DRIVER?}
    D -->|otro /api/**| I[Authenticated - Permitir]
    F -->|Si| J[Permitir]
    F -->|No| K[403 Forbidden]
    G -->|Si| J
    G -->|No| K
    H -->|Si| J
    H -->|No| K
```

### TenantContext — Detalles de Implementacion

`TenantContext` usa un `ThreadLocal<ObjectId>` para almacenar el tenant del request:

- **`setTenantId(ObjectId)`** — Se invoca en `TenantInterceptor.preHandle()` tras validar el JWT
- **`getTenantId()`** — Usado por controllers para obtener el tenant actual
- **`requireTenantId()`** — Lanza `IllegalStateException` si no hay tenant (para endpoints que lo requieren)
- **`clear()`** — Se invoca en `TenantInterceptor.afterCompletion()` para limpiar el ThreadLocal

### Endpoints de Autenticacion v2

| Metodo | Ruta | Request | Response |
|--------|------|---------|----------|
| POST | `/api/auth/login` | `{email, password}` | `{accessToken, refreshToken, expiresIn, user}` |
| POST | `/api/auth/refresh` | `{refreshToken}` | `{accessToken, refreshToken, expiresIn}` |
| POST | `/api/auth/logout` | `{refreshToken}` | `{message: "Logged out successfully"}` |

---

### Changelog

| Fecha | Cambio |
|-------|--------|
| 2026-04-14 | Agregadas secciones de multitenancy, TenantInterceptor, TenantContext, RBAC, diagramas Mermaid |
| 2026-03-30 | Version original con flujo OAuth2 legacy |
