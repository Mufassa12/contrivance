import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Snackbar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Checkbox,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress as MuiCircularProgress,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRowsProp,
  GridActionsCellItem,
  GridEventListener,
  GridRowId,
  GridRowModel,
  GridRowEditStopReasons,
  GridRowModes,
  GridRowModesModel,
  GridSlots,
  GridToolbarContainer
} from '@mui/x-data-grid';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import SaveIcon from '@mui/icons-material/Save';
import { todoService } from '../services/todoService';
import CancelIcon from '@mui/icons-material/Close';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import HighPriorityIcon from '@mui/icons-material/PriorityHigh';
import LowPriorityIcon from '@mui/icons-material/LowPriority';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import LinkIcon from '@mui/icons-material/Link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { spreadsheetService } from '../services/spreadsheet';
import { SpreadsheetColumn, SpreadsheetRow } from '../types';

interface SpreadsheetData {
  id: string;
  name: string;
  description: string;
  columns: SpreadsheetColumn[];
  rows: SpreadsheetRow[];
  created_at: string;
  updated_at: string;
}

interface TodoItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: string;
  dueDate?: string;
  supportingArtifact?: string;
}

interface NewTodoForm {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  supportingArtifact: string;
}

interface EditToolbarProps {
  setRows: (newRows: (oldRows: GridRowsProp) => GridRowsProp) => void;
  setRowModesModel: (newModel: (oldModel: GridRowModesModel) => GridRowModesModel) => void;
  columns: SpreadsheetColumn[];
}

function EditToolbar(props: EditToolbarProps) {
  const { setRows, setRowModesModel, columns } = props;

  const handleClick = () => {
    const id = Math.random().toString(36).substr(2, 9);
    const defaultRowData: Record<string, any> = {};
    
    // Initialize with empty values based on column types
    columns.forEach(col => {
      defaultRowData[col.name] = col.default_value || '';
    });

    setRows((oldRows) => [...oldRows, { 
      id, 
      ...defaultRowData,
      isNew: true 
    }]);
    setRowModesModel((oldModel) => ({
      ...oldModel,
      [id]: { mode: GridRowModes.Edit, fieldToFocus: columns[0]?.name },
    }));
  };

  return (
    <GridToolbarContainer>
      <Button color="primary" startIcon={<AddIcon />} onClick={handleClick}>
        Add Row
      </Button>
    </GridToolbarContainer>
  );
}

export function SpreadsheetView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetData | null>(null);
  const [rows, setRows] = useState<GridRowsProp>([]);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  
  // Todo state
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoDialogOpen, setTodoDialogOpen] = useState(false);
  const [rowTodoDialogOpen, setRowTodoDialogOpen] = useState<string | null>(null);
  const [selectedRowTodos, setSelectedRowTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState<NewTodoForm>({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    supportingArtifact: '',
  });

  // Event handlers for DataGrid
  const handleRowEditStop: GridEventListener<'rowEditStop'> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const handleEditClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  };

  const handleSaveClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleDeleteClick = (id: GridRowId) => async () => {
    if (!spreadsheet?.id) return;
    
    try {
      await spreadsheetService.deleteRow(spreadsheet.id, id.toString());
      setRows(rows.filter((row) => row.id !== id));
      setSnackbar({ message: 'Row deleted successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ message: 'Failed to delete row', severity: 'error' });
    }
  };

  const handleCancelClick = (id: GridRowId) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    });

    const editedRow = rows.find((row) => row.id === id);
    if (editedRow!.isNew) {
      setRows(rows.filter((row) => row.id !== id));
    }
  };

  const processRowUpdate = async (newRow: GridRowModel) => {
    if (!spreadsheet?.id) return newRow;

    try {
      const rowData = {
        Company: newRow.Company || '',
        'Primary Contact': newRow['Primary Contact'] || '',
        'Deal Value': newRow['Deal Value'] || 0,
        'Next Steps': newRow['Next Steps'] || '',
      };

      if (newRow.isNew) {
        // Create new row
        const createdRow = await spreadsheetService.createRow(spreadsheet.id, { row_data: rowData });
        const updatedRow = { 
          id: createdRow.id, 
          Company: rowData.Company,
          'Primary Contact': rowData['Primary Contact'],
          'Deal Value': rowData['Deal Value'],
          'Next Steps': rowData['Next Steps']
        };
        setRows(rows.map((row) => (row.id === newRow.id ? updatedRow : row)));
        setSnackbar({ message: 'Row created successfully', severity: 'success' });
        return updatedRow;
      } else {
        // Update existing row
        await spreadsheetService.updateRow(spreadsheet.id, newRow.id.toString(), { row_data: rowData });
        const updatedRow = { ...newRow, isNew: false };
        setRows(rows.map((row) => (row.id === newRow.id ? updatedRow : row)));
        setSnackbar({ message: 'Row updated successfully', severity: 'success' });
        return updatedRow;
      }
    } catch (error) {
      setSnackbar({ message: 'Failed to save row', severity: 'error' });
      throw error;
    }
  };

  useEffect(() => {
    const fetchSpreadsheet = async () => {
      if (!id) {
        setError('No spreadsheet ID provided');
        setLoading(false);
        return;
      }

      try {
        // Get spreadsheet details (this endpoint might not exist yet, so let's use a basic fetch)
        const spreadsheetResponse = await fetch(`http://localhost:8080/api/spreadsheets/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!spreadsheetResponse.ok) {
          throw new Error('Failed to fetch spreadsheet');
        }
        
        const spreadsheetData = await spreadsheetResponse.json();
        
        // Get rows
        const rowsData = await spreadsheetService.getRows(id);
        
        // Create mock columns for now since we have the basic structure
        const mockColumns: SpreadsheetColumn[] = [
          {
            id: '1',
            spreadsheet_id: id,
            name: 'Company',
            column_type: 'text',
            position: 1,
            is_required: false,
            validation_rules: {},
            display_options: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '2',
            spreadsheet_id: id,
            name: 'Primary Contact',
            column_type: 'text',
            position: 2,
            is_required: false,
            validation_rules: {},
            display_options: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '3',
            spreadsheet_id: id,
            name: 'Deal Value',
            column_type: 'number',
            position: 3,
            is_required: false,
            validation_rules: {},
            display_options: { format: 'currency' },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];

        setSpreadsheet({
          id,
          name: spreadsheetData.data?.name || `Spreadsheet ${id}`,
          description: spreadsheetData.data?.description || 'Sales Engineering Pipeline',
          columns: mockColumns,
          rows: rowsData || [],
          created_at: spreadsheetData.data?.created_at || new Date().toISOString(),
          updated_at: spreadsheetData.data?.updated_at || new Date().toISOString()
        });

        // Convert rows to DataGrid format
        const gridRows = (rowsData || []).map(row => ({
          id: row.id,
          Company: row.row_data.Company || '',
          'Primary Contact': row.row_data['Primary Contact'] || '',
          'Deal Value': row.row_data['Deal Value'] || 0,
          'Next Steps': row.row_data['Next Steps'] || '',
        }));
        setRows(gridRows);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load spreadsheet');
        setLoading(false);
      }
    };

    fetchSpreadsheet();
    loadTodos();
  }, [id]);

  // Todo management functions
  const loadTodos = () => {
    if (id) {
      const savedTodos = todoService.getLocalTodos(id);
      const mappedTodos = savedTodos.map(todo => ({
        id: todo.id,
        title: todo.title,
        description: todo.description || '',
        priority: todo.priority,
        completed: todo.completed,
        createdAt: todo.created_at.toString(),
        dueDate: todo.due_date?.toString() || '',
        supportingArtifact: todo.supporting_artifact || '',
      }));
      setTodos(mappedTodos);
    }
  };

  const loadRowTodos = (rowId: string) => {
    if (id) {
      const savedTodos = todoService.getLocalTodos(id, rowId);
      const mappedTodos = savedTodos.map(todo => ({
        id: todo.id,
        title: todo.title,
        description: todo.description || '',
        priority: todo.priority,
        completed: todo.completed,
        createdAt: todo.created_at.toString(),
        dueDate: todo.due_date?.toString() || '',
        supportingArtifact: todo.supporting_artifact || '',
      }));
      setSelectedRowTodos(mappedTodos);
    }
  };

  const saveRowTodos = (rowId: string, updatedTodos: TodoItem[]) => {
    if (id) {
      const serviceTodos = updatedTodos.map(todo => ({
        id: todo.id,
        title: todo.title,
        description: todo.description,
        priority: todo.priority as 'low' | 'medium' | 'high',
        completed: todo.completed,
        created_at: new Date(todo.createdAt),
        updated_at: new Date(),
        due_date: todo.dueDate ? new Date(todo.dueDate) : undefined,
        supporting_artifact: todo.supportingArtifact,
        spreadsheet_id: id,
        row_id: rowId,
        user_id: 'current-user',
      }));
      todoService.saveLocalTodos(id, serviceTodos, rowId);
      setSelectedRowTodos(updatedTodos);
      // Force DataGrid re-render to update progress indicators
      setRows(prevRows => [...prevRows]);
    }
  };

  const saveTodos = (updatedTodos: TodoItem[]) => {
    if (id) {
      const serviceTodos = updatedTodos.map(todo => ({
        id: todo.id,
        title: todo.title,
        description: todo.description,
        priority: todo.priority as 'low' | 'medium' | 'high',
        completed: todo.completed,
        created_at: new Date(todo.createdAt),
        updated_at: new Date(),
        due_date: todo.dueDate ? new Date(todo.dueDate) : undefined,
        supporting_artifact: todo.supportingArtifact,
        spreadsheet_id: id,
        row_id: undefined,
        user_id: 'current-user',
      }));
      todoService.saveLocalTodos(id, serviceTodos);
      setTodos(updatedTodos);
    }
  };

  const handleAddTodo = () => {
    if (!newTodo.title.trim()) return;

    const todo: TodoItem = {
      id: Date.now().toString(),
      title: newTodo.title,
      description: newTodo.description,
      priority: newTodo.priority,
      completed: false,
      createdAt: new Date().toISOString(),
      dueDate: newTodo.dueDate || undefined,
    };

    const updatedTodos = [...todos, todo];
    saveTodos(updatedTodos);

    // Reset form
    setNewTodo({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
      supportingArtifact: '',
    });
    setTodoDialogOpen(false);
  };

  const handleToggleTodo = (todoId: string) => {
    const updatedTodos = todos.map(todo =>
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    );
    saveTodos(updatedTodos);
  };

  const handleDeleteTodo = (todoId: string) => {
    const updatedTodos = todos.filter(todo => todo.id !== todoId);
    saveTodos(updatedTodos);
  };

  const getPriorityColor = (priority: 'low' | 'medium' | 'high'): 'default' | 'warning' | 'error' => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'default';
    }
  };

  const handleOpenRowTodos = (rowId: string) => {
    loadRowTodos(rowId);
    setRowTodoDialogOpen(rowId);
  };

  const handleAddRowTodo = (rowId: string) => {
    if (!newTodo.title.trim()) return;

    const todo: TodoItem = {
      id: Date.now().toString(),
      title: newTodo.title,
      description: newTodo.description,
      priority: newTodo.priority,
      completed: false,
      createdAt: new Date().toISOString(),
      dueDate: newTodo.dueDate || undefined,
    };

    const updatedTodos = [...selectedRowTodos, todo];
    saveRowTodos(rowId, updatedTodos);

    // Reset form
    setNewTodo({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
      supportingArtifact: '',
    });
  };

  const handleToggleRowTodo = (rowId: string, todoId: string) => {
    const updatedTodos = selectedRowTodos.map(todo =>
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    );
    saveRowTodos(rowId, updatedTodos);
  };

  const handleDeleteRowTodo = (rowId: string, todoId: string) => {
    const updatedTodos = selectedRowTodos.filter(todo => todo.id !== todoId);
    saveRowTodos(rowId, updatedTodos);
  };

  const getRowTodoCount = (rowId: string): number => {
    const savedTodos = localStorage.getItem(`row_todos_${id}_${rowId}`);
    if (savedTodos) {
      const todos: TodoItem[] = JSON.parse(savedTodos);
      return todos.filter(t => !t.completed).length;
    }
    return 0;
  };

  const getRowTodoStats = (rowId: string): { total: number; completed: number; percentage: number } => {
    const savedTodos = localStorage.getItem(`row_todos_${id}_${rowId}`);
    if (savedTodos) {
      const todos: TodoItem[] = JSON.parse(savedTodos);
      const total = todos.length;
      const completed = todos.filter(t => t.completed).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { total, completed, percentage };
    }
    return { total: 0, completed: 0, percentage: 0 };
  };

  const getTechnicalWinStatus = (rowId: string): { status: string; color: string } => {
    const savedTodos = localStorage.getItem(`row_todos_${id}_${rowId}`);
    if (!savedTodos) {
      return { status: 'No Todos', color: '#9e9e9e' };
    }
    
    const todos: TodoItem[] = JSON.parse(savedTodos);
    if (todos.length === 0) {
      return { status: 'No Todos', color: '#9e9e9e' };
    }
    
    const allCompleted = todos.every(todo => todo.completed);
    return allCompleted 
      ? { status: 'Completed', color: '#4caf50' }
      : { status: 'In Progress', color: '#ff9800' };
  };

  // Custom Radial Progress Component
  const RadialProgress = ({ rowId }: { rowId: string }) => {
    const stats = getRowTodoStats(rowId);
    const { total, completed, percentage } = stats;
    
    const getProgressColor = (percentage: number) => {
      if (percentage === 100) return '#4caf50'; // Green for complete
      if (percentage >= 75) return '#8bc34a'; // Light green
      if (percentage >= 50) return '#ff9800'; // Orange
      if (percentage >= 25) return '#ff5722'; // Red-orange
      return '#f44336'; // Red for low completion
    };

    return (
      <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', minWidth: 44, minHeight: 44 }}>
        {/* Background circle */}
        <MuiCircularProgress
          variant="determinate"
          value={100}
          size={36}
          thickness={3}
          sx={{ 
            color: '#e0e0e0',
            position: 'absolute'
          }}
        />
        {/* Progress circle */}
        <MuiCircularProgress
          variant="determinate"
          value={percentage}
          size={36}
          thickness={3}
          sx={{ 
            color: total === 0 ? '#e0e0e0' : getProgressColor(percentage),
            position: 'absolute'
          }}
        />
        {/* Percentage text */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography 
            variant="caption" 
            component="div" 
            sx={{ 
              fontSize: '0.65rem', 
              fontWeight: 'bold',
              lineHeight: 1,
              color: total === 0 ? 'text.disabled' : 'text.primary'
            }}
          >
            {`${percentage}%`}
          </Typography>
        </Box>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={() => navigate('/')} startIcon={<ArrowBackIcon />}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  if (!spreadsheet) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Spreadsheet not found
        </Alert>
        <Button onClick={() => navigate('/')} startIcon={<ArrowBackIcon />}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button 
          onClick={() => navigate('/')} 
          startIcon={<ArrowBackIcon />}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1">
          {spreadsheet.name}
        </Typography>
      </Box>

      {/* Spreadsheet Info */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Spreadsheet Details
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {spreadsheet.description}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Created: {new Date(spreadsheet.created_at).toLocaleDateString()}
        </Typography>
      </Paper>

      {/* Column Structure */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Column Structure
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {spreadsheet.columns
            .sort((a, b) => a.position - b.position)
            .map((column) => (
              <Box
                key={column.id}
                sx={{
                  p: 1,
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  minWidth: 120
                }}
              >
                <Typography variant="body2" fontWeight="bold">
                  {column.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {column.column_type}
                </Typography>
              </Box>
            ))}
        </Box>
      </Paper>

      {/* DataGrid for spreadsheet data */}
      <Paper sx={{ p: 2, height: 500 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Spreadsheet Data
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => {
              const id = Math.random().toString(36).substr(2, 9);
              const newRow = { 
                id, 
                Company: '',
                'Primary Contact': '',
                'Deal Value': 0,
                'Next Steps': '',
                isNew: true 
              };
              setRows((oldRows) => [...oldRows, newRow]);
              setRowModesModel((oldModel) => ({
                ...oldModel,
                [id]: { mode: GridRowModes.Edit, fieldToFocus: 'Company' },
              }));
            }}
          >
            Add Row
          </Button>
        </Box>
        {spreadsheet && (
          <DataGrid
            rows={rows}
            columns={[
              {
                field: 'Company',
                headerName: 'Company',
                width: 200,
                editable: true,
              },
              {
                field: 'Primary Contact',
                headerName: 'Primary Contact',
                width: 200,
                editable: true,
              },
              {
                field: 'Deal Value',
                headerName: 'Deal Value',
                width: 150,
                editable: true,
                type: 'number',
                valueFormatter: (value: any) => {
                  if (value == null) return '';
                  return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(value);
                },
              },
              {
                field: 'technicalWin',
                headerName: 'Technical Win',
                width: 150,
                sortable: false,
                disableColumnMenu: true,
                renderCell: (params) => {
                  const { status, color } = getTechnicalWinStatus(params.id.toString());
                  
                  return (
                    <Chip
                      label={status}
                      size="small"
                      sx={{
                        backgroundColor: color,
                        color: 'white',
                        fontWeight: 'bold',
                        '&:hover': {
                          backgroundColor: color,
                          filter: 'brightness(1.1)',
                        },
                      }}
                    />
                  );
                },
              },
              {
                field: 'Next Steps',
                headerName: 'Next Steps',
                width: 200,
                editable: true,
              },
              {
                field: 'todos',
                headerName: 'Todos',
                width: 200,
                sortable: false,
                disableColumnMenu: true,
                renderCell: (params) => {
                  const stats = getRowTodoStats(params.id.toString());
                  
                  return (
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1.5,
                        width: '100%',
                        height: '100%',
                        py: 0.5
                      }}
                    >
                      <RadialProgress rowId={params.id.toString()} />
                      <Button
                        size="small"
                        startIcon={<AssignmentIcon />}
                        onClick={() => handleOpenRowTodos(params.id.toString())}
                        variant="outlined"
                        sx={{ 
                          minWidth: 'auto',
                          fontSize: '0.75rem',
                          px: 1
                        }}
                      >
                        {stats.total > 0 ? `${stats.completed}/${stats.total}` : 'Add'}
                      </Button>
                    </Box>
                  );
                },
              },
              {
                field: 'actions',
                type: 'actions',
                headerName: 'Actions',
                width: 100,
                cellClassName: 'actions',
                getActions: ({ id }) => {
                  const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;

                  if (isInEditMode) {
                    return [
                      <GridActionsCellItem
                        icon={<SaveIcon />}
                        label="Save"
                        onClick={handleSaveClick(id)}
                      />,
                      <GridActionsCellItem
                        icon={<CancelIcon />}
                        label="Cancel"
                        onClick={handleCancelClick(id)}
                        color="inherit"
                      />,
                    ];
                  }

                  return [
                    <GridActionsCellItem
                      icon={<EditIcon />}
                      label="Edit"
                      className="textPrimary"
                      onClick={handleEditClick(id)}
                      color="inherit"
                    />,
                    <GridActionsCellItem
                      icon={<DeleteIcon />}
                      label="Delete"
                      onClick={handleDeleteClick(id)}
                      color="inherit"
                    />,
                  ];
                },
              },
            ]}
            editMode="row"
            rowModesModel={rowModesModel}
            onRowModesModelChange={setRowModesModel}
            onRowEditStop={handleRowEditStop}
            processRowUpdate={processRowUpdate}

            sx={{
              '& .actions': {
                color: 'text.secondary',
              },
              '& .actions:hover': {
                color: 'primary.main',
              },
            }}
          />
        )}
      </Paper>

      {/* Todo List Section */}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentIcon />
            Pipeline Todo List ({todos.filter(t => !t.completed).length} pending)
          </Typography>
          <Button
            variant="contained"
            startIcon={<PlaylistAddIcon />}
            onClick={() => setTodoDialogOpen(true)}
          >
            Add Todo
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
              Pending Tasks
            </Typography>
            <List>
              {todos.filter(todo => !todo.completed).map((todo) => (
                <ListItem
                  key={todo.id}
                  sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    mb: 1,
                    backgroundColor: '#fafafa'
                  }}
                >
                  <Checkbox
                    checked={todo.completed}
                    onChange={() => handleToggleTodo(todo.id)}
                  />
                  <Box sx={{ flexGrow: 1, ml: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {todo.title}
                    </Typography>
                    {todo.description && (
                      <Typography variant="body2" color="textSecondary">
                        {todo.description}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <Chip
                        size="small"
                        label={todo.priority}
                        color={getPriorityColor(todo.priority)}
                        variant="outlined"
                      />
                      {todo.dueDate && (
                        <Typography variant="caption" color="textSecondary">
                          Due: {new Date(todo.dueDate).toLocaleDateString()}
                        </Typography>
                      )}
                      {todo.supportingArtifact && (
                        <Button
                          size="small"
                          startIcon={<OpenInNewIcon />}
                          onClick={() => window.open(todo.supportingArtifact, '_blank')}
                          sx={{ minWidth: 'auto', fontSize: '0.7rem' }}
                        >
                          Link
                        </Button>
                      )}
                    </Box>
                  </Box>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => handleDeleteTodo(todo.id)}
                  >
                    Delete
                  </Button>
                </ListItem>
              ))}
              {todos.filter(todo => !todo.completed).length === 0 && (
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
                  No pending tasks. Great job! 🎉
                </Typography>
              )}
            </List>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon color="success" />
              Completed Tasks ({todos.filter(t => t.completed).length})
            </Typography>
            <List>
              {todos.filter(todo => todo.completed).map((todo) => (
                <ListItem
                  key={todo.id}
                  sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    mb: 1,
                    backgroundColor: '#f5f5f5',
                    opacity: 0.7
                  }}
                >
                  <Checkbox
                    checked={todo.completed}
                    onChange={() => handleToggleTodo(todo.id)}
                  />
                  <Box sx={{ flexGrow: 1, ml: 1 }}>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 'bold',
                        textDecoration: 'line-through'
                      }}
                    >
                      {todo.title}
                    </Typography>
                    {todo.description && (
                      <Typography variant="body2" color="textSecondary" sx={{ textDecoration: 'line-through' }}>
                        {todo.description}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <Chip
                        size="small"
                        label={todo.priority}
                        color={getPriorityColor(todo.priority)}
                        variant="outlined"
                      />
                      {todo.supportingArtifact && (
                        <Button
                          size="small"
                          startIcon={<OpenInNewIcon />}
                          onClick={() => window.open(todo.supportingArtifact, '_blank')}
                          sx={{ minWidth: 'auto', fontSize: '0.7rem', opacity: 0.7 }}
                        >
                          Link
                        </Button>
                      )}
                    </Box>
                  </Box>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => handleDeleteTodo(todo.id)}
                  >
                    Delete
                  </Button>
                </ListItem>
              ))}
              {todos.filter(todo => todo.completed).length === 0 && (
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
                  No completed tasks yet.
                </Typography>
              )}
            </List>
          </Box>
        </Box>
      </Paper>

      {/* Add Todo Dialog */}
      <Dialog open={todoDialogOpen} onClose={() => setTodoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Todo</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Title"
              value={newTodo.title}
              onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={newTodo.description}
              onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <Select
              value={newTodo.priority}
              onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value as 'low' | 'medium' | 'high' })}
              fullWidth
            >
              <MenuItem value="low">Low Priority</MenuItem>
              <MenuItem value="medium">Medium Priority</MenuItem>
              <MenuItem value="high">High Priority</MenuItem>
            </Select>
            <TextField
              label="Due Date"
              type="date"
              value={newTodo.dueDate}
              onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              label="Supporting Artifact (URL)"
              value={newTodo.supportingArtifact}
              onChange={(e) => setNewTodo({ ...newTodo, supportingArtifact: e.target.value })}
              fullWidth
              placeholder="https://drive.google.com/... or https://..."
              InputProps={{
                startAdornment: <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              helperText="Add links to Google Drive documents, websites, or other resources"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTodoDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddTodo} variant="contained">
            Add Todo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Row-specific Todo Dialog */}
      <Dialog 
        open={!!rowTodoDialogOpen} 
        onClose={() => setRowTodoDialogOpen(null)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Todo List for Row {rowTodoDialogOpen}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {/* Add new todo form */}
            <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
              <Typography variant="subtitle1" gutterBottom>
                Add New Todo
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Title"
                  value={newTodo.title}
                  onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                  fullWidth
                  required
                  size="small"
                />
                <TextField
                  label="Description"
                  value={newTodo.description}
                  onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Select
                    value={newTodo.priority}
                    onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    size="small"
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                  <TextField
                    label="Due Date"
                    type="date"
                    value={newTodo.dueDate}
                    onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
                    size="small"
                    sx={{ minWidth: 150 }}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={() => rowTodoDialogOpen && handleAddRowTodo(rowTodoDialogOpen)}
                    startIcon={<PlaylistAddIcon />}
                  >
                    Add
                  </Button>
                </Box>
                <TextField
                  label="Supporting Artifact (URL)"
                  value={newTodo.supportingArtifact}
                  onChange={(e) => setNewTodo({ ...newTodo, supportingArtifact: e.target.value })}
                  fullWidth
                  placeholder="https://drive.google.com/... or https://..."
                  size="small"
                  InputProps={{
                    startAdornment: <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                  helperText="Add links to Google Drive docs, websites, or other resources"
                />
              </Box>
            </Paper>

            {/* Todo list */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Pending ({selectedRowTodos.filter(t => !t.completed).length})
                </Typography>
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {selectedRowTodos.filter(todo => !todo.completed).map((todo) => (
                    <ListItem
                      key={todo.id}
                      sx={{
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        mb: 1,
                        backgroundColor: '#fafafa'
                      }}
                    >
                      <Checkbox
                        checked={todo.completed}
                        onChange={() => rowTodoDialogOpen && handleToggleRowTodo(rowTodoDialogOpen, todo.id)}
                      />
                      <Box sx={{ flexGrow: 1, ml: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {todo.title}
                        </Typography>
                        {todo.description && (
                          <Typography variant="caption" color="textSecondary">
                            {todo.description}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip
                            size="small"
                            label={todo.priority}
                            color={getPriorityColor(todo.priority)}
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                          {todo.dueDate && (
                            <Typography variant="caption" color="textSecondary">
                              Due: {new Date(todo.dueDate).toLocaleDateString()}
                            </Typography>
                          )}
                          {todo.supportingArtifact && (
                            <Button
                              size="small"
                              startIcon={<OpenInNewIcon />}
                              onClick={() => window.open(todo.supportingArtifact, '_blank')}
                              sx={{ minWidth: 'auto', fontSize: '0.65rem' }}
                            >
                              Link
                            </Button>
                          )}
                        </Box>
                      </Box>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => rowTodoDialogOpen && handleDeleteRowTodo(rowTodoDialogOpen, todo.id)}
                      >
                        Delete
                      </Button>
                    </ListItem>
                  ))}
                  {selectedRowTodos.filter(todo => !todo.completed).length === 0 && (
                    <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
                      No pending tasks
                    </Typography>
                  )}
                </List>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon color="success" />
                  Completed ({selectedRowTodos.filter(t => t.completed).length})
                </Typography>
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {selectedRowTodos.filter(todo => todo.completed).map((todo) => (
                    <ListItem
                      key={todo.id}
                      sx={{
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        mb: 1,
                        backgroundColor: '#f5f5f5',
                        opacity: 0.7
                      }}
                    >
                      <Checkbox
                        checked={todo.completed}
                        onChange={() => rowTodoDialogOpen && handleToggleRowTodo(rowTodoDialogOpen, todo.id)}
                      />
                      <Box sx={{ flexGrow: 1, ml: 1 }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 'bold',
                            textDecoration: 'line-through'
                          }}
                        >
                          {todo.title}
                        </Typography>
                        {todo.description && (
                          <Typography variant="caption" color="textSecondary" sx={{ textDecoration: 'line-through' }}>
                            {todo.description}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip
                            size="small"
                            label={todo.priority}
                            color={getPriorityColor(todo.priority)}
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                          {todo.supportingArtifact && (
                            <Button
                              size="small"
                              startIcon={<OpenInNewIcon />}
                              onClick={() => window.open(todo.supportingArtifact, '_blank')}
                              sx={{ minWidth: 'auto', fontSize: '0.65rem', opacity: 0.7 }}
                            >
                              Link
                            </Button>
                          )}
                        </Box>
                      </Box>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => rowTodoDialogOpen && handleDeleteRowTodo(rowTodoDialogOpen, todo.id)}
                      >
                        Delete
                      </Button>
                    </ListItem>
                  ))}
                  {selectedRowTodos.filter(todo => todo.completed).length === 0 && (
                    <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
                      No completed tasks
                    </Typography>
                  )}
                </List>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRowTodoDialogOpen(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message}
      />
    </Box>
  );
}