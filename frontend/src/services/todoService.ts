import { apiService } from './api';

export interface Todo {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  created_at: Date;
  updated_at: Date;
  due_date?: Date;
  supporting_artifact?: string;
  spreadsheet_id: string;
  row_id?: string;
  user_id: string;
  assigned_to?: string;
}

export interface CreateTodoRequest {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: Date;
  supporting_artifact?: string;
  spreadsheet_id: string;
  row_id?: string;
  assigned_to?: string;
}

export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  completed?: boolean;
  due_date?: Date;
  supporting_artifact?: string;
  assigned_to?: string;
}

export interface TodoStats {
  total: number;
  completed: number;
  pending: number;
  high_priority: number;
  medium_priority: number;
  low_priority: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

class TodoService {
  // Create a new todo
  async createTodo(request: CreateTodoRequest): Promise<Todo> {
    return await apiService.post<Todo>('/api/todos', request);
  }

  // Get todos for a spreadsheet (pipeline-level)
  async getTodosBySpreadsheet(spreadsheetId: string): Promise<Todo[]> {
    return await apiService.get<Todo[]>(`/api/spreadsheets/${spreadsheetId}/todos`);
  }

  // Get todos for a specific row
  async getTodosByRow(spreadsheetId: string, rowId: string): Promise<Todo[]> {
    return await apiService.get<Todo[]>(`/api/spreadsheets/${spreadsheetId}/rows/${rowId}/todos`);
  }

  // Get todo statistics for a spreadsheet
  async getTodoStats(spreadsheetId: string): Promise<TodoStats> {
    return await apiService.get<TodoStats>(`/api/spreadsheets/${spreadsheetId}/todos/stats`);
  }

  // Get a specific todo by ID
  async getTodoById(todoId: string): Promise<Todo> {
    return await apiService.get<Todo>(`/api/todos/${todoId}`);
  }

  // Update a todo
  async updateTodo(todoId: string, request: UpdateTodoRequest): Promise<Todo> {
    return await apiService.put<Todo>(`/api/todos/${todoId}`, request);
  }

  // Delete a todo
  async deleteTodo(todoId: string): Promise<void> {
    await apiService.delete<void>(`/api/todos/${todoId}`);
  }

  // Mark a todo as completed
  async completeTodo(todoId: string): Promise<Todo> {
    return await apiService.put<Todo>(`/api/todos/${todoId}/complete`, {});
  }

  // Mark a todo as not completed
  async uncompleteTodo(todoId: string): Promise<Todo> {
    return await apiService.put<Todo>(`/api/todos/${todoId}/uncomplete`, {});
  }

  // Get users for assignment dropdown
  async getUsersForAssignment(): Promise<User[]> {
    try {
      const paginatedResponse = await apiService.get<{
        data: User[];
        total: number;
        page: number;
        limit: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
      }>('/api/users?page=1&limit=100');
      
      // Ensure we have a valid array
      return Array.isArray(paginatedResponse?.data) ? paginatedResponse.data : [];
    } catch (error) {
      console.error('Failed to fetch users for assignment:', error);
      return [];
    }
  }

  // Fallback methods using localStorage for now (until backend is ready)
  private getLocalStorageKey(spreadsheetId: string, rowId?: string): string {
    return rowId 
      ? `row_todos_${spreadsheetId}_${rowId}`
      : `todos-${spreadsheetId}`;
  }

  // Get todos from localStorage
  getLocalTodos(spreadsheetId: string, rowId?: string): Todo[] {
    try {
      const key = this.getLocalStorageKey(spreadsheetId, rowId);
      const todos = localStorage.getItem(key);
      return todos ? JSON.parse(todos) : [];
    } catch {
      return [];
    }
  }

  // Save todos to localStorage
  saveLocalTodos(spreadsheetId: string, todos: Todo[], rowId?: string): void {
    try {
      const key = this.getLocalStorageKey(spreadsheetId, rowId);
      localStorage.setItem(key, JSON.stringify(todos));
    } catch (error) {
      console.error('Failed to save todos to localStorage:', error);
    }
  }

  // Create todo locally
  createLocalTodo(request: CreateTodoRequest): Todo {
    const todo: Todo = {
      id: Math.random().toString(36).substr(2, 9),
      title: request.title,
      description: request.description,
      priority: request.priority,
      completed: false,
      created_at: new Date(),
      updated_at: new Date(),
      due_date: request.due_date,
      supporting_artifact: request.supporting_artifact,
      spreadsheet_id: request.spreadsheet_id,
      row_id: request.row_id,
      user_id: 'current-user', // This should come from auth context
      assigned_to: request.assigned_to,
    };

    const existingTodos = this.getLocalTodos(request.spreadsheet_id, request.row_id);
    existingTodos.push(todo);
    this.saveLocalTodos(request.spreadsheet_id, existingTodos, request.row_id);

    return todo;
  }

  // Update todo locally
  updateLocalTodo(spreadsheetId: string, todoId: string, updates: UpdateTodoRequest, rowId?: string): Todo | null {
    const todos = this.getLocalTodos(spreadsheetId, rowId);
    const todoIndex = todos.findIndex(t => t.id === todoId);
    
    if (todoIndex === -1) return null;

    const updatedTodo = {
      ...todos[todoIndex],
      ...updates,
      updated_at: new Date(),
    };

    todos[todoIndex] = updatedTodo;
    this.saveLocalTodos(spreadsheetId, todos, rowId);

    return updatedTodo;
  }

  // Delete todo locally
  deleteLocalTodo(spreadsheetId: string, todoId: string, rowId?: string): boolean {
    const todos = this.getLocalTodos(spreadsheetId, rowId);
    const filteredTodos = todos.filter(t => t.id !== todoId);
    
    if (filteredTodos.length === todos.length) return false;

    this.saveLocalTodos(spreadsheetId, filteredTodos, rowId);
    return true;
  }

  // Get local todo statistics
  getLocalTodoStats(spreadsheetId: string): TodoStats {
    const pipelineTodos = this.getLocalTodos(spreadsheetId);
    
    // Get all row todos for this spreadsheet
    const allKeys = Object.keys(localStorage);
    const rowTodoKeys = allKeys.filter(key => 
      key.startsWith(`row_todos_${spreadsheetId}_`)
    );
    
    let allTodos = [...pipelineTodos];
    rowTodoKeys.forEach(key => {
      const rowTodos = JSON.parse(localStorage.getItem(key) || '[]');
      allTodos = [...allTodos, ...rowTodos];
    });

    return {
      total: allTodos.length,
      completed: allTodos.filter(t => t.completed).length,
      pending: allTodos.filter(t => !t.completed).length,
      high_priority: allTodos.filter(t => t.priority === 'high').length,
      medium_priority: allTodos.filter(t => t.priority === 'medium').length,
      low_priority: allTodos.filter(t => t.priority === 'low').length,
    };
  }
}

export const todoService = new TodoService();