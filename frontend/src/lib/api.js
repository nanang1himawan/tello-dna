import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/project-gemini/project-03/backend';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (refreshToken) {
                    const response = await axios.post(`${API_URL}/api/auth/refresh.php`, {
                        refresh_token: refreshToken,
                    });

                    const { access_token, refresh_token } = response.data.data;
                    localStorage.setItem('access_token', access_token);
                    localStorage.setItem('refresh_token', refresh_token);

                    originalRequest.headers.Authorization = `Bearer ${access_token}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed, clear tokens and redirect to login
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default api;

// Auth API
export const authApi = {
    login: (email, password) => api.post('/api/auth/login.php', { email, password }),
    register: (data) => api.post('/api/auth/register.php', data),
    logout: () => api.post('/api/auth/logout.php'),
    refresh: (refreshToken) => api.post('/api/auth/refresh.php', { refresh_token: refreshToken }),
    me: () => api.get('/api/auth/me.php'),
};

// Users API
export const usersApi = {
    getAll: (params) => api.get('/api/users/index.php', { params }),
    getBasicList: (search = '') => api.get('/api/users/list-basic.php', { params: { search } }),
    getById: (id) => api.get('/api/users/show.php', { params: { id } }),
    create: (data) => api.post('/api/users/create.php', data),
    update: (id, data) => api.put(`/api/users/update.php?id=${id}`, data),
    delete: (id) => api.delete(`/api/users/delete.php?id=${id}`),
};

// Projects API (Phase 2)
export const projectsApi = {
    getAll: (params) => api.get('/api/projects/index.php', { params }),
    getById: (id) => api.get('/api/projects/show.php', { params: { id } }),
    create: (data) => api.post('/api/projects/create.php', data),
    update: (id, data) => api.put(`/api/projects/update.php?id=${id}`, data),
    delete: (id) => api.delete(`/api/projects/delete.php?id=${id}`),
};

// Boards API (Phase 2)
export const boardsApi = {
    getByProject: (projectId) => api.get('/api/boards/index.php', { params: { project_id: projectId } }),
    getById: (id) => api.get('/api/boards/show.php', { params: { id } }),
    create: (data) => api.post('/api/boards/create.php', data),
    update: (id, data) => api.put(`/api/boards/update.php?id=${id}`, data),
    delete: (id) => api.delete(`/api/boards/delete.php?id=${id}`),
    getTemplates: () => api.get('/api/boards/templates.php'),
    clone: (boardId, name, includeTasks = false) => api.post('/api/boards/clone.php', { board_id: boardId, name, include_tasks: includeTasks }),
    export: (id, format = 'json') => `${api.defaults.baseURL}/api/boards/export.php?id=${id}&format=${format}`,
    import: (projectId, data) => api.post('/api/boards/import.php', { project_id: projectId, data }),
    reorderColumns: (boardId, columnIds) => api.post('/api/boards/reorder_columns.php', { board_id: boardId, column_ids: columnIds }),
    addColumn: (boardId, name, color = '#6366f1') => api.post('/api/boards/add_column.php', { board_id: boardId, name, color }),
};

// Tasks API (Phase 2)
export const tasksApi = {
    getByColumn: (columnId) => api.get('/api/tasks/index.php', { params: { column_id: columnId } }),
    getById: (id) => api.get('/api/tasks/show.php', { params: { id } }),
    create: (data) => api.post('/api/tasks/create.php', data),
    update: (id, data) => api.put(`/api/tasks/update.php?id=${id}`, data),
    delete: (id) => api.delete(`/api/tasks/delete.php?id=${id}`),
    move: (id, data) => api.post('/api/tasks/move.php', { task_id: id, ...data }),
    assign: (taskId, assigneeId) => api.post('/api/tasks/assign.php', { task_id: taskId, assignee_id: assigneeId }),
};

// Departments API
export const departmentsApi = {
    getAll: () => api.get('/api/departments/index.php'),
    create: (data) => api.post('/api/departments/create.php', data),
    update: (id, data) => api.put(`/api/departments/update.php?id=${id}`, data),
    delete: (id) => api.delete(`/api/departments/delete.php?id=${id}`),
};

// Audit API
export const auditApi = {
    getForEntity: (entityType, entityId) => api.get('/api/audit/index.php', { params: { entity_type: entityType, entity_id: entityId } }),
    getRecent: (userId = null, limit = 20) => api.get('/api/audit/index.php', { params: { user_id: userId, limit } }),
};

// Attachments API
export const attachmentsApi = {
    getByTask: (taskId) => api.get('/api/attachments/index.php', { params: { task_id: taskId } }),
    upload: (taskId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('task_id', taskId);
        return api.post('/api/attachments/upload.php', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    delete: (id) => api.delete('/api/attachments/delete.php', { params: { id } }),
};

// Calendar API
export const calendarApi = {
    getEvents: (start, end, projectId = null) => api.get('/api/tasks/calendar.php', {
        params: { start, end, project_id: projectId }
    }),
};

// Comments API
export const commentsApi = {
    getByTask: (taskId) => api.get('/api/comments/index.php', { params: { task_id: taskId } }),
    create: (data) => api.post('/api/comments/create.php', data),
    update: (id, data) => api.put(`/api/comments/update.php?id=${id}`, data),
    delete: (id) => api.delete('/api/comments/delete.php', { params: { id } }),
};

// Notifications API
export const notificationsApi = {
    getAll: (unreadOnly = false, limit = 20) => api.get('/api/notifications/index.php', {
        params: { unread_only: unreadOnly ? '1' : '0', limit }
    }),
    markAsRead: (id) => api.post('/api/notifications/read.php', { id }),
    markAllAsRead: () => api.post('/api/notifications/read.php', { all: true }),
};

// Dashboard API
export const dashboardApi = {
    getStats: () => api.get('/api/dashboard/stats.php'),
};

// Task Members API (Multiple Assignees)
export const taskMembersApi = {
    getByTask: (taskId) => api.get('/api/tasks/members.php', { params: { task_id: taskId } }),
    add: (taskId, userId) => api.post('/api/tasks/members.php', { task_id: taskId, user_id: userId }),
    remove: (taskId, userId) => api.delete(`/api/tasks/members.php?task_id=${taskId}&user_id=${userId}`),
};

// Favorites API
export const favoritesApi = {
    getAll: (type = null) => api.get('/api/favorites/index.php', { params: { type } }),
    toggle: (entityType, entityId) => api.post('/api/favorites/toggle.php', { entity_type: entityType, entity_id: entityId }),
};

// Watchers API
export const watchersApi = {
    getByTask: (taskId) => api.get('/api/tasks/watchers.php', { params: { task_id: taskId } }),
    toggle: (taskId) => api.post('/api/tasks/watchers.php', { task_id: taskId }),
};

// Votes API
export const votesApi = {
    getByTask: (taskId) => api.get('/api/tasks/votes.php', { params: { task_id: taskId } }),
    toggle: (taskId, voteType = 'up') => api.post('/api/tasks/votes.php', { task_id: taskId, vote_type: voteType }),
};

// Card Templates API
export const cardTemplatesApi = {
    getByBoard: (boardId) => api.get('/api/tasks/templates.php', { params: { board_id: boardId } }),
    create: (data) => api.post('/api/tasks/templates.php', data),
    delete: (id) => api.delete(`/api/tasks/templates.php?id=${id}`),
};

// Custom Fields API
export const customFieldsApi = {
    getDefinitions: (boardId) => api.get('/api/custom-fields/index.php', { params: { board_id: boardId } }),
    createDefinition: (data) => api.post('/api/custom-fields/index.php', data),
    updateDefinition: (id, data) => api.put(`/api/custom-fields/index.php?id=${id}`, data),
    deleteDefinition: (id) => api.delete(`/api/custom-fields/index.php?id=${id}`),
    getValues: (taskId) => api.get('/api/custom-fields/values.php', { params: { task_id: taskId } }),
    setValue: (taskId, fieldId, value) => api.post('/api/custom-fields/values.php', { task_id: taskId, field_id: fieldId, value }),
};

// Automations API
export const automationsApi = {
    getByBoard: (boardId) => api.get('/api/automations/index.php', { params: { board_id: boardId } }),
    create: (data) => api.post('/api/automations/index.php', data),
    update: (id, data) => api.put(`/api/automations/index.php?id=${id}`, data),
    delete: (id) => api.delete(`/api/automations/index.php?id=${id}`),
};

// Projects invite API
export const projectInviteApi = {
    invite: (projectId, email, role = 'member') => api.post('/api/projects/invite.php', { project_id: projectId, email, role }),
};

// Labels API
export const labelsApi = {
    getByBoard: (boardId) => api.get('/api/labels/index.php', { params: { board_id: boardId } }),
    create: (data) => api.post('/api/labels/index.php', data),
    update: (id, data) => api.put(`/api/labels/index.php?id=${id}`, data),
    delete: (id) => api.delete(`/api/labels/index.php?id=${id}`),
    getByTask: (taskId) => api.get('/api/labels/task.php', { params: { task_id: taskId } }),
    addToTask: (taskId, labelId) => api.post('/api/labels/task.php', { task_id: taskId, label_id: labelId }),
    removeFromTask: (taskId, labelId) => api.delete(`/api/labels/task.php?task_id=${taskId}&label_id=${labelId}`),
};
