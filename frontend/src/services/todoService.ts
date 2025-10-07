import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4080/api';

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
}

export interface CreateTodoRequest {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: Date;
  supporting_artifact?: string;
  spreadsheet_id: string;
  row_id?: string;
}

export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  completed?: boolean;
  due_date?: Date;
  supporting_artifact?: string;
}

export interface TodoStats {
  total: number;
  completed: number;
  pending: number;
  high_priority: number;
  medium_priority: number;
  low_priority: number;
}

class TodoService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    };
  }

  // Create a new todo
  async createTodo(request: CreateTodoRequest): Promise<Todo> {
    const response = await axios.post(
      `${API_BASE_URL}/todos`,
      request,
      this.getAuthHeaders()
    );
    return response.data.data;
  }

  // Get todos for a spreadsheet (pipeline-level)
  async getTodosBySpreadsheet(spreadsheetId: string): Promise<Todo[]> {
    const response = await axios.get(
      `${API_BASE_URL}/spreadsheets/${spreadsheetId}/todos`,
      this.getAuthHeaders()
    );
    return response.data.data;
  }

  // Get todos for a specific row
  async getTodosByRow(spreadsheetId: string, rowId: string): Promise<Todo[]> {
    const response = await axios.get(
      `${API_BASE_URL}/spreadsheets/${spreadsheetId}/rows/${rowId}/todos`,
      this.getAuthHeaders()
    );
    return response.data.data;
  }

  // Get todo statistics for a spreadsheet
  async getTodoStats(spreadsheetId: string): Promise<TodoStats> {
    const response = await axios.get(
      `${API_BASE_URL}/spreadsheets/${spreadsheetId}/todos/stats`,
      this.getAuthHeaders()
    );
    return response.data.data;
  }

  // Get a specific todo by ID
  async getTodoById(todoId: string): Promise<Todo> {
    const response = await axios.get(
      `${API_BASE_URL}/todos/${todoId}`,
      this.getAuthHeaders()
    );
    return response.data.data;
  }

  // Update a todo
  async updateTodo(todoId: string, request: UpdateTodoRequest): Promise<Todo> {
    const response = await axios.put(
      `${API_BASE_URL}/todos/${todoId}`,
      request,
      this.getAuthHeaders()
    );
    return response.data.data;
  }

  // Delete a todo
  async deleteTodo(todoId: string): Promise<void> {
    await axios.delete(
      `${API_BASE_URL}/todos/${todoId}`,
      this.getAuthHeaders()
    );
  }

  // Mark a todo as completed
  async completeTodo(todoId: string): Promise<Todo> {
    const response = await axios.put(
      `${API_BASE_URL}/todos/${todoId}/complete`,
      {},
      this.getAuthHeaders()
    );
    return response.data.data;
  }

  // Mark a todo as not completed
  async uncompleteTodo(todoId: string): Promise<Todo> {
    const response = await axios.put(
      `${API_BASE_URL}/todos/${todoId}/uncomplete`,
      {},
      this.getAuthHeaders()
    );
    return response.data.data;
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