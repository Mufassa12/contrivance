package main

import (
    "net/http"
    "strconv"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
)

// Todo represents a todo item in the system
type Todo struct {
    ID                string     `json:"id" db:"id"`
    Title             string     `json:"title" db:"title" binding:"required"`
    Description       string     `json:"description" db:"description"`
    Priority          string     `json:"priority" db:"priority" binding:"required"`
    Completed         bool       `json:"completed" db:"completed"`
    CreatedAt         time.Time  `json:"created_at" db:"created_at"`
    UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
    DueDate          *time.Time `json:"due_date" db:"due_date"`
    SupportingArtifact string   `json:"supporting_artifact" db:"supporting_artifact"`
    SpreadsheetID    string     `json:"spreadsheet_id" db:"spreadsheet_id" binding:"required"`
    RowID            *string    `json:"row_id" db:"row_id"`
    UserID           string     `json:"user_id" db:"user_id"`
}

// CreateTodoRequest represents the request body for creating todos
type CreateTodoRequest struct {
    Title             string     `json:"title" binding:"required"`
    Description       string     `json:"description"`
    Priority          string     `json:"priority" binding:"required"`
    DueDate          *time.Time `json:"due_date"`
    SupportingArtifact string   `json:"supporting_artifact"`
    SpreadsheetID    string     `json:"spreadsheet_id" binding:"required"`
    RowID            *string    `json:"row_id"`
}

// UpdateTodoRequest represents the request body for updating todos
type UpdateTodoRequest struct {
    Title             *string    `json:"title"`
    Description       *string    `json:"description"`
    Priority          *string    `json:"priority"`
    Completed         *bool      `json:"completed"`
    DueDate          *time.Time `json:"due_date"`
    SupportingArtifact *string   `json:"supporting_artifact"`
}

// TodoStats represents aggregated todo statistics
type TodoStats struct {
    Total     int `json:"total"`
    Completed int `json:"completed"`
    Pending   int `json:"pending"`
    High      int `json:"high_priority"`
    Medium    int `json:"medium_priority"`
    Low       int `json:"low_priority"`
}

// setupTodoRoutes sets up all todo-related routes
func setupTodoRoutes(r *gin.RouterGroup) {
    todos := r.Group("/todos")
    {
        todos.POST("/", createTodo)
        todos.GET("/spreadsheet/:spreadsheet_id", getTodosBySpreadsheet)
        todos.GET("/spreadsheet/:spreadsheet_id/row/:row_id", getTodosByRow)
        todos.GET("/spreadsheet/:spreadsheet_id/stats", getTodoStats)
        todos.GET("/:id", getTodoByID)
        todos.PUT("/:id", updateTodo)
        todos.DELETE("/:id", deleteTodo)
        todos.PUT("/:id/complete", completeTodo)
        todos.PUT("/:id/uncomplete", uncompleteTodo)
    }
}

// createTodo creates a new todo
func createTodo(c *gin.Context) {
    var req CreateTodoRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Get user ID from context
    userID, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
        return
    }

    // Validate priority
    if req.Priority != "low" && req.Priority != "medium" && req.Priority != "high" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Priority must be 'low', 'medium', or 'high'"})
        return
    }

    todo := Todo{
        ID:                uuid.New().String(),
        Title:             req.Title,
        Description:       req.Description,
        Priority:          req.Priority,
        Completed:         false,
        CreatedAt:         time.Now(),
        UpdatedAt:         time.Now(),
        DueDate:          req.DueDate,
        SupportingArtifact: req.SupportingArtifact,
        SpreadsheetID:    req.SpreadsheetID,
        RowID:            req.RowID,
        UserID:           userID.(string),
    }

    query := `
        INSERT INTO todos (id, title, description, priority, completed, created_at, updated_at, due_date, supporting_artifact, spreadsheet_id, row_id, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`

    var createdTodo Todo
    err := db.Get(&createdTodo, query, 
        todo.ID, todo.Title, todo.Description, todo.Priority, todo.Completed,
        todo.CreatedAt, todo.UpdatedAt, todo.DueDate, todo.SupportingArtifact,
        todo.SpreadsheetID, todo.RowID, todo.UserID)

    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create todo"})
        return
    }

    c.JSON(http.StatusCreated, createdTodo)
}

// getTodosBySpreadsheet gets all todos for a spreadsheet
func getTodosBySpreadsheet(c *gin.Context) {
    spreadsheetID := c.Param("spreadsheet_id")
    userID, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
        return
    }

    var todos []Todo
    query := `
        SELECT * FROM todos 
        WHERE spreadsheet_id = $1 AND user_id = $2 AND row_id IS NULL
        ORDER BY created_at DESC`

    err := db.Select(&todos, query, spreadsheetID, userID.(string))
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch todos"})
        return
    }

    if todos == nil {
        todos = []Todo{}
    }

    c.JSON(http.StatusOK, todos)
}

// getTodosByRow gets all todos for a specific row
func getTodosByRow(c *gin.Context) {
    spreadsheetID := c.Param("spreadsheet_id")
    rowID := c.Param("row_id")
    userID, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
        return
    }

    var todos []Todo
    query := `
        SELECT * FROM todos 
        WHERE spreadsheet_id = $1 AND row_id = $2 AND user_id = $3
        ORDER BY created_at DESC`

    err := db.Select(&todos, query, spreadsheetID, rowID, userID.(string))
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch todos"})
        return
    }

    if todos == nil {
        todos = []Todo{}
    }

    c.JSON(http.StatusOK, todos)
}

// getTodoStats gets aggregated todo statistics for a spreadsheet
func getTodoStats(c *gin.Context) {
    spreadsheetID := c.Param("spreadsheet_id")
    userID, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
        return
    }

    var stats TodoStats
    query := `
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN completed = true THEN 1 END) as completed,
            COUNT(CASE WHEN completed = false THEN 1 END) as pending,
            COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
            COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority,
            COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority
        FROM todos 
        WHERE spreadsheet_id = $1 AND user_id = $2`

    err := db.Get(&stats, query, spreadsheetID, userID.(string))
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch todo statistics"})
        return
    }

    c.JSON(http.StatusOK, stats)
}

// getTodoByID gets a specific todo by ID
func getTodoByID(c *gin.Context) {
    todoID := c.Param("id")
    userID, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
        return
    }

    var todo Todo
    query := `SELECT * FROM todos WHERE id = $1 AND user_id = $2`

    err := db.Get(&todo, query, todoID, userID.(string))
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Todo not found"})
        return
    }

    c.JSON(http.StatusOK, todo)
}

// updateTodo updates a specific todo
func updateTodo(c *gin.Context) {
    todoID := c.Param("id")
    userID, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
        return
    }

    var req UpdateTodoRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Validate priority if provided
    if req.Priority != nil && *req.Priority != "low" && *req.Priority != "medium" && *req.Priority != "high" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Priority must be 'low', 'medium', or 'high'"})
        return
    }

    // Build dynamic update query
    updates := []string{}
    args := []interface{}{todoID, userID.(string)}
    argIndex := 3

    if req.Title != nil {
        updates = append(updates, "title = $"+strconv.Itoa(argIndex))
        args = append(args, *req.Title)
        argIndex++
    }
    if req.Description != nil {
        updates = append(updates, "description = $"+strconv.Itoa(argIndex))
        args = append(args, *req.Description)
        argIndex++
    }
    if req.Priority != nil {
        updates = append(updates, "priority = $"+strconv.Itoa(argIndex))
        args = append(args, *req.Priority)
        argIndex++
    }
    if req.Completed != nil {
        updates = append(updates, "completed = $"+strconv.Itoa(argIndex))
        args = append(args, *req.Completed)
        argIndex++
    }
    if req.DueDate != nil {
        updates = append(updates, "due_date = $"+strconv.Itoa(argIndex))
        args = append(args, *req.DueDate)
        argIndex++
    }
    if req.SupportingArtifact != nil {
        updates = append(updates, "supporting_artifact = $"+strconv.Itoa(argIndex))
        args = append(args, *req.SupportingArtifact)
        argIndex++
    }

    if len(updates) == 0 {
        c.JSON(http.StatusBadRequest, gin.H{"error": "No fields to update"})
        return
    }

    // Always update the updated_at timestamp
    updates = append(updates, "updated_at = CURRENT_TIMESTAMP")

    query := `
        UPDATE todos 
        SET ` + strings.Join(updates, ", ") + `
        WHERE id = $1 AND user_id = $2
        RETURNING *`

    var updatedTodo Todo
    err := db.Get(&updatedTodo, query, args...)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Todo not found"})
        return
    }

    c.JSON(http.StatusOK, updatedTodo)
}

// deleteTodo deletes a specific todo
func deleteTodo(c *gin.Context) {
    todoID := c.Param("id")
    userID, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
        return
    }

    query := `DELETE FROM todos WHERE id = $1 AND user_id = $2`
    result, err := db.Exec(query, todoID, userID.(string))
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete todo"})
        return
    }

    rowsAffected, _ := result.RowsAffected()
    if rowsAffected == 0 {
        c.JSON(http.StatusNotFound, gin.H{"error": "Todo not found"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Todo deleted successfully"})
}

// completeTodo marks a todo as completed
func completeTodo(c *gin.Context) {
    todoID := c.Param("id")
    userID, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
        return
    }

    query := `
        UPDATE todos 
        SET completed = true, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1 AND user_id = $2
        RETURNING *`

    var todo Todo
    err := db.Get(&todo, query, todoID, userID.(string))
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Todo not found"})
        return
    }

    c.JSON(http.StatusOK, todo)
}

// uncompleteTodo marks a todo as not completed
func uncompleteTodo(c *gin.Context) {
    todoID := c.Param("id")
    userID, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
        return
    }

    query := `
        UPDATE todos 
        SET completed = false, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1 AND user_id = $2
        RETURNING *`

    var todo Todo
    err := db.Get(&todo, query, todoID, userID.(string))
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Todo not found"})
        return
    }

    c.JSON(http.StatusOK, todo)
}