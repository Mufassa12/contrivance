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
  Tabs,
  Tab,
  Autocomplete,
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
import { todoService, User } from '../services/todoService';
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
import { salesforceService, SalesforceAccount } from '../services/salesforce';
import { SpreadsheetColumn, SpreadsheetRow } from '../types';

// Salesforce Account Type options
const SALESFORCE_ACCOUNT_TYPES = [
  'Prospect',
  'Customer - Direct',
  'Customer - Channel',
  'Channel Partner / Reseller',
  'Installation Partner',
  'Technology Partner',
  'Other'
];

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
  assignedTo?: string;
}

interface NewTodoForm {
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';  // Keep UI form as title case for display
  dueDate: string;
  supportingArtifact: string;
  assignedTo: string;
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
  console.log('🎯 COMPONENT MOUNT: SpreadsheetView component is rendering!');
  
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();



  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetData | null>(null);
  const [rows, setRows] = useState<GridRowsProp>([]);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  
  // Salesforce state
  const [salesforceAccounts, setSalesforceAccounts] = useState<SalesforceAccount[]>([]);
  
  // Debug log whenever salesforceAccounts state changes
  useEffect(() => {
    console.log('🎯 salesforceAccounts state changed:', salesforceAccounts?.length, 'accounts');
    console.log('🎯 salesforceAccounts content:', salesforceAccounts);
  }, [salesforceAccounts]);
  
  // Todo state
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoDialogOpen, setTodoDialogOpen] = useState(false);
  const [rowTodoDialogOpen, setRowTodoDialogOpen] = useState<string | null>(null);
  const [selectedRowTodos, setSelectedRowTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState<NewTodoForm>({
    title: '',
    description: '',
    priority: 'Medium',
    dueDate: '',
    supportingArtifact: '',
    assignedTo: '',
  });
  const [users, setUsers] = useState<User[]>([]);
  const [rowTodoStats, setRowTodoStats] = useState<Record<string, { total: number; completed: number; percentage: number }>>({});
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  
  // Quarterly filtering state
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all');
  const [filteredRows, setFilteredRows] = useState<GridRowsProp>([]);
  
  // Salesforce sync state
  const [isSyncingSalesforce, setIsSyncingSalesforce] = useState(false);
  const [salesforceConnectionStatus, setSalesforceConnectionStatus] = useState<boolean>(false);


  // Function to determine quarter from date
  const getQuarter = (dateString: string): string => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1; // getMonth() returns 0-11, we want 1-12
    if (month >= 1 && month <= 3) return 'Q1';
    if (month >= 4 && month <= 6) return 'Q2';  
    if (month >= 7 && month <= 9) return 'Q3';
    return 'Q4';
  };

  // Function to filter rows by quarter
  const filterRowsByQuarter = (rows: GridRowsProp, quarter: string): GridRowsProp => {
    if (quarter === 'all') return rows;
    
    return rows.filter(row => {
      // Check if there's a date field in the row data
      // Look for common date field names or use created_at from the row metadata
      const rowData = row as any;
      
      // First check if there's a date-related column in the row data
      let dateToCheck: string | null = null;
      
      // Look for common date field names
      const dateFields = ['date', 'created_date', 'deal_date', 'close_date', 'created_at'];
      for (const field of dateFields) {
        if (rowData[field]) {
          dateToCheck = rowData[field];
          break;
        }
      }
      
      // If no date field found in row data, we'll need to use metadata or default to current quarter
      if (!dateToCheck) {
        // For now, default to current date so all rows show up
        dateToCheck = new Date().toISOString();
      }
      
      const rowQuarter = getQuarter(dateToCheck);
      return rowQuarter === quarter;
    });
  };

  // Handle quarter tab change
  const handleQuarterChange = (event: React.SyntheticEvent, newValue: string) => {
    setSelectedQuarter(newValue);
  };

  // Update filtered rows whenever rows or selectedQuarter changes
  useEffect(() => {
    console.log('🔄 Filtering rows - Input rows:', rows.length, 'Selected quarter:', selectedQuarter);
    const filtered = filterRowsByQuarter(rows, selectedQuarter);
    console.log('🔄 Filtered result:', filtered.length, 'rows');
    console.log('🔄 Filtered row IDs:', filtered.map(r => r.id));
    setFilteredRows(filtered);
  }, [rows, selectedQuarter]);

  // Event handlers for DataGrid
  const handleRowEditStop: GridEventListener<'rowEditStop'> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const handleEditClick = (id: GridRowId) => () => {
    if (filteredRows.find(row => row.id === id)) {
      setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
    }
  };

  const handleSaveClick = (id: GridRowId) => () => {
    if (filteredRows.find(row => row.id === id)) {
      setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
    }
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
      // Dynamically build row_data from all columns
      const rowData: Record<string, any> = {};
      
      spreadsheet.columns.forEach(col => {
        const value = newRow[col.name];
        
        // Handle different column types
        switch (col.column_type.toLowerCase()) {
          case 'number':
          case 'currency':
            rowData[col.name] = value ? Number(value) : null;
            break;
          case 'boolean':
            rowData[col.name] = Boolean(value);
            break;
          case 'select':
            // For multi-select, ensure it's an array
            if (col.validation_rules?.multiple) {
              rowData[col.name] = Array.isArray(value) ? value : (value ? [value] : []);
            } else {
              rowData[col.name] = value || null;
            }
            break;
          default:
            rowData[col.name] = value || '';
        }
      });

      if (newRow.isNew) {
        // Create new row
        const createdRow = await spreadsheetService.createRow(spreadsheet.id, { row_data: rowData });
        const updatedRow = { 
          id: createdRow.id, 
          ...rowData
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
    // Reset all grid state when changing spreadsheets
    setRowModesModel({});
    setRows([]);
    setFilteredRows([]);
    setLoading(true);
    setError(null);
    
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
        
        // Get columns and rows
        const columnsData = await spreadsheetService.getColumns(id);
        const rowsData = await spreadsheetService.getRows(id);

        setSpreadsheet({
          id,
          name: spreadsheetData.data?.name || `Spreadsheet ${id}`,
          description: spreadsheetData.data?.description || 'Sales Engineering Pipeline',
          columns: columnsData || [],
          rows: rowsData || [],
          created_at: spreadsheetData.data?.created_at || new Date().toISOString(),
          updated_at: spreadsheetData.data?.updated_at || new Date().toISOString()
        });

        // Initialize all columns as visible by default
        const initialVisibleColumns: Record<string, boolean> = {};
        columnsData?.forEach(col => {
          initialVisibleColumns[col.name] = true;
        });
        setVisibleColumns(initialVisibleColumns);

        // Convert rows to DataGrid format - dynamically map all columns
        const gridRows = (rowsData || []).map(row => {
          const gridRow: any = { id: row.id };
          
          // Map all column values from row_data
          columnsData?.forEach(col => {
            gridRow[col.name] = row.row_data[col.name] || (
              col.column_type.toLowerCase() === 'select' && col.validation_rules?.multiple ? [] : ''
            );
          });
          
          return gridRow;
        });
        setRows(gridRows);

        // Update todo stats for all rows
        if (rowsData && rowsData.length > 0) {
          rowsData.forEach(row => {
            updateRowTodoStats(row.id);
          });
        }

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load spreadsheet');
        setLoading(false);
      }
    };

    fetchSpreadsheet();
    loadTodos();
  }, [id]);

  // CRITICAL DEBUG: Test useEffect execution
  useEffect(() => {
    console.log('🔥 CRITICAL: ANY useEffect is running - this should always appear!');
  }, []);

  // Fetch Salesforce accounts for Account autocomplete  
  useEffect(() => {
    console.log('🚀 SALESFORCE useEffect starting...');
    console.log('🚀 This is the Salesforce accounts useEffect');
    
    const fetchSalesforceAccounts = async () => {
      try {
        console.log('🔄 Starting Salesforce accounts fetch...');
        console.log('🔍 Current salesforceService:', salesforceService);
        
        const accounts = await salesforceService.getAccounts();
        console.log('✅ Salesforce accounts fetched successfully:', accounts?.length, 'accounts');
        console.log('📋 First few accounts:', accounts?.slice(0, 3));
        console.log('🔧 Setting accounts in state...');
        setSalesforceAccounts(accounts);
        console.log('✅ Accounts set in state');
      } catch (error) {
        console.error('❌ Failed to fetch Salesforce accounts:', error);
        console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
        // Don't show error to user as this is optional functionality
      }
    };

    console.log('📞 About to call fetchSalesforceAccounts...');
    fetchSalesforceAccounts();
    console.log('📞 Called fetchSalesforceAccounts');
  }, []);
  
  // Check Salesforce connection status
  useEffect(() => {
    const checkConnectionStatus = async () => {
      try {
        const status = await salesforceService.getConnectionStatus();
        setSalesforceConnectionStatus(status.connected);
      } catch (error) {
        console.error('Failed to check Salesforce connection status:', error);
        setSalesforceConnectionStatus(false);
      }
    };
    checkConnectionStatus();
  }, []);

  // Handler to sync Salesforce opportunities to spreadsheet
  const handleSyncSalesforceOpportunities = async () => {
    if (!id || !spreadsheet) return;
    
    setIsSyncingSalesforce(true);
    try {
      console.log('🔄 Step 1: Syncing Salesforce columns...');
      
      // First, sync the columns to ensure all Salesforce fields have corresponding columns
      const columnsResult = await spreadsheetService.syncSalesforceColumns(id);
      console.log('✅ Columns synced:', columnsResult);
      
      if (columnsResult.added_columns.length > 0) {
        console.log(`📋 Added ${columnsResult.added_columns.length} new columns:`, 
          columnsResult.added_columns.map(c => c.name));
        
        // Reload spreadsheet to get updated columns
        const updatedDetails = await spreadsheetService.getSpreadsheet(id);
        setSpreadsheet({
          ...spreadsheet,
          columns: updatedDetails.columns,
        });
      }
      
      console.log('� Step 2: Syncing Salesforce opportunities data...');
      const result = await salesforceService.syncOpportunitiesToSpreadsheet(id);
      console.log('✅ Sync result:', result);
      
      // Transform the opportunities data into rows and save them to database
      if (result.opportunities && result.opportunities.length > 0) {
        console.log('🔄 Step 3: Saving synced opportunities to database...');
        const savedRows: any[] = [];
        
        for (const [index, opp] of result.opportunities.entries()) {
          console.log(`🔄 Processing opportunity ${index + 1}/${result.opportunities.length}:`, opp);
          
          // Create row data from opportunity fields
          const rowData: any = {};
          
          // Map all opportunity fields to the row, using exact field names from backend
          Object.keys(opp).forEach(key => {
            rowData[key] = opp[key];
          });
          
          // Also map to legacy column names for backward compatibility
          if (opp['Account']) rowData['Account'] = opp['Account'];
          if (opp['Type']) rowData['Type'] = opp['Type'];
          if (opp['Owner']) rowData['Primary Contact'] = opp['Owner'];
          if (opp['Amount'] !== undefined) rowData['Deal Value'] = opp['Amount'];
          
          try {
            // Save row to database
            const savedRow = await spreadsheetService.createRow(id, { row_data: rowData });
            console.log(`✅ Saved opportunity ${index + 1} to database:`, savedRow);
            
            // Transform to grid row format
            const gridRow: any = {
              id: savedRow.id,
              ...savedRow.row_data,
            };
            
            savedRows.push(gridRow);
            
            // 📌 Step 4: Create a todo for this opportunity
            try {
              const todoTitle = `Follow up: ${opp['Opportunity Name'] || opp['Account'] || 'Opportunity'}`;
              const todoDescription = `Salesforce Opportunity - Account: ${opp['Account']}, Stage: ${opp['Stage']}, Amount: $${opp['Amount']}`;
              
              const todoRequest = {
                title: todoTitle,
                description: todoDescription,
                priority: 'medium' as const,
                due_date: opp['Close Date'] ? new Date(opp['Close Date']) : undefined,
                supporting_artifact: `Salesforce: ${opp['Account']}`,
                spreadsheet_id: id,
                row_id: savedRow.id,
                assigned_to: undefined,
              };
              
              console.log(`📝 Creating todo for opportunity ${index + 1}:`, todoRequest);
              await todoService.createTodo(todoRequest);
              console.log(`✅ Created todo for opportunity ${index + 1}`);
            } catch (todoError) {
              console.warn(`⚠️ Failed to create todo for opportunity ${index + 1}:`, todoError);
              // Don't fail the entire sync if todo creation fails
            }
          } catch (error) {
            console.error(`❌ Failed to save opportunity ${index + 1}:`, error);
          }
        }
        
        // Add the saved rows to existing rows
        setRows(prevRows => [...prevRows, ...savedRows]);
        
        const message = columnsResult.added_columns.length > 0
          ? `Successfully synced ${result.count} opportunities and added ${columnsResult.added_columns.length} new columns from Salesforce`
          : `Successfully synced ${result.count} opportunities from Salesforce`;
        
        setSnackbar({ 
          message, 
          severity: 'success' 
        });
      } else {
        setSnackbar({ 
          message: 'No opportunities found in Salesforce', 
          severity: 'success' 
        });
      }
    } catch (error) {
      console.error('❌ Failed to sync Salesforce opportunities:', error);
      setSnackbar({ 
        message: error instanceof Error ? error.message : 'Failed to sync Salesforce opportunities', 
        severity: 'error' 
      });
    } finally {
      setIsSyncingSalesforce(false);
    }
  };

  // Clear row editing state when there are no rows to prevent DataGrid errors
  useEffect(() => {
    if (filteredRows.length === 0) {
      setRowModesModel({});
    }
  }, [filteredRows.length]);

  // Put new rows in edit mode after DataGrid renders
  useEffect(() => {
    if (rows.length > 0) {
      const newRows = rows.filter(row => row.isNew);
      if (newRows.length > 0) {
        setRowModesModel(prevModel => {
          const newModel = { ...prevModel };
          newRows.forEach(row => {
            if (!newModel[row.id]) {  // Only set if not already in edit mode
              newModel[row.id] = {
                mode: GridRowModes.Edit,
                fieldToFocus: spreadsheet?.columns.sort((a, b) => a.position - b.position)[0]?.name
              };
            }
          });
          return newModel;
        });
      }
    }
  }, [rows, spreadsheet?.columns]);

  // Load users for assignment when todo dialog opens
  useEffect(() => {
    if (todoDialogOpen || rowTodoDialogOpen) {
      const loadUsers = async () => {
        try {
          console.log('Loading users for assignment...');
          const usersData = await todoService.getUsersForAssignment();
          console.log('Users loaded:', usersData, 'Array?', Array.isArray(usersData));
          setUsers(usersData);
        } catch (error) {
          console.error('Failed to load users:', error);
          // Set empty users array to allow todo creation without assignment
          setUsers([]);
        }
      };
      loadUsers();
    }
  }, [todoDialogOpen, rowTodoDialogOpen]);

  // Todo management functions
  const loadTodos = async () => {
    if (id) {
      try {
        console.log('Loading todos from database for spreadsheet:', id);
        const dbTodos = await todoService.getTodosBySpreadsheet(id);
        console.log('Loaded todos from database:', dbTodos);
        
        const mappedTodos = dbTodos.map(todo => ({
          id: todo.id,
          title: todo.title || '',
          description: todo.description || '',
          priority: todo.priority || 'medium',
          completed: todo.completed || false,
          createdAt: todo.created_at ? new Date(todo.created_at).toISOString() : new Date().toISOString(),
          dueDate: todo.due_date ? new Date(todo.due_date).toISOString().split('T')[0] : '',
          supportingArtifact: todo.supporting_artifact || '',
          assignedTo: todo.assigned_to || undefined,
        }));
        
        setTodos(mappedTodos);
      } catch (error) {
        console.error('Error loading todos from database:', error);
        setTodos([]);
      }
    }
  };

  const loadRowTodos = async (rowId: string) => {
    if (id) {
      try {
        console.log('Loading row todos from database for row:', rowId);
        const dbTodos = await todoService.getTodosByRow(id, rowId);
        console.log('Loaded row todos from database:', dbTodos);
        
        const mappedTodos = dbTodos.map(todo => ({
          id: todo.id,
          title: todo.title || '',
          description: todo.description || '',
          priority: todo.priority || 'medium',
          completed: todo.completed || false,
          createdAt: todo.created_at ? new Date(todo.created_at).toISOString() : new Date().toISOString(),
          dueDate: todo.due_date ? new Date(todo.due_date).toISOString().split('T')[0] : '',
          supportingArtifact: todo.supporting_artifact || '',
          assignedTo: todo.assigned_to || undefined,
        }));
        
        setSelectedRowTodos(mappedTodos);
        
        // Update row todo stats after loading
        await updateRowTodoStats(rowId);
      } catch (error) {
        console.error('Error loading row todos from database:', error);
        setSelectedRowTodos([]);
      }
    }
  };



  const handleAddTodo = async () => {
    if (!newTodo.title.trim() || !id) return;

    try {
      const createRequest = {
        title: newTodo.title,
        description: newTodo.description && newTodo.description.trim() !== '' ? newTodo.description : undefined,
        priority: newTodo.priority.toLowerCase() as 'low' | 'medium' | 'high',
        due_date: newTodo.dueDate ? new Date(newTodo.dueDate) : undefined,
        supporting_artifact: newTodo.supportingArtifact && newTodo.supportingArtifact.trim() !== '' ? newTodo.supportingArtifact : undefined,
        spreadsheet_id: id,
        assigned_to: newTodo.assignedTo && newTodo.assignedTo.trim() !== '' ? newTodo.assignedTo : undefined,
      };

      console.log('Creating todo:', createRequest);
      await todoService.createTodo(createRequest);
      
      // Reload todos from database
      await loadTodos();

      // Reset form
      setNewTodo({
        title: '',
        description: '',
        priority: 'Medium',
        dueDate: '',
        supportingArtifact: '',
        assignedTo: '',
      });
      setTodoDialogOpen(false);
    } catch (error) {
      console.error('Error creating todo:', error);
    }
  };

  const handleToggleTodo = async (todoId: string) => {
    try {
      const todo = todos.find(t => t.id === todoId);
      if (!todo) return;

      if (todo.completed) {
        await todoService.uncompleteTodo(todoId);
      } else {
        await todoService.completeTodo(todoId);
      }
      
      // Reload todos from database
      await loadTodos();
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    try {
      await todoService.deleteTodo(todoId);
      // Reload todos from database
      await loadTodos();
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const getPriorityColor = (priority: 'low' | 'medium' | 'high'): 'default' | 'warning' | 'error' => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'default';
    }
  };

  const getPriorityDisplayText = (priority: 'low' | 'medium' | 'high'): string => {
    switch (priority) {
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
    }
  };

  const getUserName = (userId?: string): string => {
    if (!userId) return '';
    if (!Array.isArray(users)) return 'Unknown User';
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown User';
  };

  const handleOpenRowTodos = async (rowId: string) => {
    await loadRowTodos(rowId);
    setRowTodoDialogOpen(rowId);
  };

  const handleAddRowTodo = async (rowId: string) => {
    if (!newTodo.title.trim() || !id) return;

    try {
      // Parse rowId - handle both UUID format and temp IDs (sf-31-1760562777973)
      let parsedRowId: string | undefined = undefined;
      try {
        // If it's a valid UUID, use it
        if (rowId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          parsedRowId = rowId;
        } else {
          console.warn('Row ID is not a valid UUID, will not associate with row:', rowId);
        }
      } catch (e) {
        console.warn('Could not parse row ID:', rowId);
      }

      const createRequest = {
        title: newTodo.title,
        description: newTodo.description && newTodo.description.trim() !== '' ? newTodo.description : undefined,
        priority: newTodo.priority.toLowerCase() as 'low' | 'medium' | 'high',
        due_date: newTodo.dueDate ? new Date(newTodo.dueDate) : undefined,
        supporting_artifact: newTodo.supportingArtifact && newTodo.supportingArtifact.trim() !== '' ? newTodo.supportingArtifact : undefined,
        spreadsheet_id: id,
        row_id: parsedRowId,
        assigned_to: newTodo.assignedTo && newTodo.assignedTo.trim() !== '' ? newTodo.assignedTo : undefined,
      };

      console.log('Creating row todo:', createRequest, 'rowId:', rowId, 'parsedRowId:', parsedRowId);
      await todoService.createTodo(createRequest);
      
      // Reload row todos from database
      await loadRowTodos(rowId);

      // Reset form
      setNewTodo({
        title: '',
        description: '',
        priority: 'Medium',
        dueDate: '',
        supportingArtifact: '',
        assignedTo: '',
      });
    } catch (error) {
      console.error('Error creating row todo:', error);
    }
  };

  const handleToggleRowTodo = async (rowId: string, todoId: string) => {
    try {
      const todo = selectedRowTodos.find(t => t.id === todoId);
      if (!todo) return;

      if (todo.completed) {
        await todoService.uncompleteTodo(todoId);
      } else {
        await todoService.completeTodo(todoId);
      }
      
      // Reload row todos from database
      await loadRowTodos(rowId);
    } catch (error) {
      console.error('Error toggling row todo:', error);
    }
  };

  const handleDeleteRowTodo = async (rowId: string, todoId: string) => {
    try {
      await todoService.deleteTodo(todoId);
      // Reload row todos from database
      await loadRowTodos(rowId);
    } catch (error) {
      console.error('Error deleting row todo:', error);
    }
  };

  const getRowTodoCount = async (rowId: string): Promise<number> => {
    try {
      if (!id) return 0;
      const dbTodos = await todoService.getTodosByRow(id, rowId);
      return dbTodos.filter(t => !t.completed).length;
    } catch (error) {
      console.error('Error getting row todo count:', error);
      return 0;
    }
  };

  const getRowTodoStats = (rowId: string): { total: number; completed: number; percentage: number } => {
    return rowTodoStats[rowId] || { total: 0, completed: 0, percentage: 0 };
  };

  const updateRowTodoStats = async (rowId: string) => {
    try {
      if (!id) return;
      const dbTodos = await todoService.getTodosByRow(id, rowId);
      const total = dbTodos.length;
      const completed = dbTodos.filter(t => t.completed).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      console.log(`Row ${rowId} stats: ${completed}/${total} (${percentage}%) completed`);
      console.log('Todos:', dbTodos.map(t => ({ id: t.id, title: t.title, completed: t.completed })));
      
      setRowTodoStats(prev => ({
        ...prev,
        [rowId]: { total, completed, percentage }
      }));

      // Update row status based on todo completion
      if (total > 0) {
        const allCompleted = completed === total;
        const technicalWinStatus = allCompleted ? 'Technical Win Completed' : 'In Progress';
        
        try {
          // Find the current row to get its existing data
          const currentRow = rows.find(row => row.id === rowId);
          if (currentRow) {
            // Update the row with the new status
            const updatedRowData = {
              ...currentRow,
              'Technical Win': technicalWinStatus,
              'Status': technicalWinStatus
            };
            
            console.log(`Updating row ${rowId} Technical Win status to: ${technicalWinStatus}`);
            await spreadsheetService.updateRow(id, rowId, { row_data: updatedRowData });
            
            // Update local state
            setRows(prevRows => 
              prevRows.map(row => 
                row.id === rowId 
                  ? { ...row, 'Technical Win': technicalWinStatus, 'Status': technicalWinStatus }
                  : row
              )
            );
          }
        } catch (updateError) {
          console.error('Error updating row Technical Win status:', updateError);
        }
      }
    } catch (error) {
      console.error('Error updating row todo stats:', error);
    }
  };

  const getTechnicalWinStatus = (rowId: string): { status: string; color: string } => {
    const stats = getRowTodoStats(rowId);
    const { total, completed } = stats;
    
    if (total === 0) {
      return { status: 'No Todos', color: '#9e9e9e' };
    }
    
    const allCompleted = completed === total;
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
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
        
        {/* Salesforce Sync Button */}
        {salesforceConnectionStatus && (
          <Button 
            variant="contained"
            color="primary"
            onClick={handleSyncSalesforceOpportunities}
            disabled={isSyncingSalesforce}
            startIcon={isSyncingSalesforce ? <CircularProgress size={20} /> : null}
          >
            {isSyncingSalesforce ? 'Syncing...' : 'Sync Salesforce Opportunities'}
          </Button>
        )}

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
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Click columns to show/hide them in the data grid
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {spreadsheet.columns
            .sort((a, b) => a.position - b.position)
            .map((column) => {
              const isVisible = visibleColumns[column.name] !== false;
              return (
                <Box
                  key={column.id}
                  onClick={() => {
                    setVisibleColumns(prev => ({
                      ...prev,
                      [column.name]: !isVisible
                    }));
                  }}
                  sx={{
                    p: 1,
                    border: isVisible ? '2px solid #1976d2' : '1px solid #e0e0e0',
                    borderRadius: 1,
                    minWidth: 120,
                    cursor: 'pointer',
                    backgroundColor: isVisible ? '#e3f2fd' : '#f5f5f5',
                    opacity: isVisible ? 1 : 0.6,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: isVisible ? '#bbdefb' : '#eeeeee',
                      transform: 'translateY(-1px)',
                    }
                  }}
                >
                  <Typography 
                    variant="body2" 
                    fontWeight="bold"
                    color={isVisible ? 'primary' : 'textSecondary'}
                  >
                    {column.name}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color={isVisible ? 'textSecondary' : 'textDisabled'}
                  >
                    {column.column_type}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'block', 
                      mt: 0.5,
                      color: isVisible ? 'success.main' : 'error.main',
                      fontWeight: 'bold'
                    }}
                  >
                    {isVisible ? 'Visible' : 'Hidden'}
                  </Typography>
                </Box>
              );
            })}
        </Box>
      </Paper>

      {/* Quarterly Tabs */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Filter by Quarter
        </Typography>
        <Tabs 
          value={selectedQuarter} 
          onChange={handleQuarterChange}
          aria-label="quarterly filter tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="All Data" value="all" />
          <Tab label="Q1 (Jan-Mar)" value="Q1" />
          <Tab label="Q2 (Apr-Jun)" value="Q2" />
          <Tab label="Q3 (Jul-Sep)" value="Q3" />
          <Tab label="Q4 (Oct-Dec)" value="Q4" />
        </Tabs>
      </Paper>

      {/* DataGrid for spreadsheet data */}
      <Paper sx={{ p: 2, height: 500 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Spreadsheet Data {selectedQuarter !== 'all' && `(${selectedQuarter})`}
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => {
              const id = Math.random().toString(36).substr(2, 9);
              console.log('➕ Add Row clicked - Generated ID:', id);
              const newRow: any = { id, isNew: true };
              
              // Initialize with default values for all columns
              spreadsheet?.columns.forEach(col => {
                switch (col.column_type.toLowerCase()) {
                  case 'number':
                  case 'currency':
                    newRow[col.name] = col.default_value ? Number(col.default_value) : null;
                    break;
                  case 'boolean':
                    newRow[col.name] = col.default_value ? Boolean(col.default_value) : false;
                    break;
                  case 'select':
                    if (col.validation_rules?.multiple) {
                      newRow[col.name] = [];
                    } else {
                      newRow[col.name] = col.default_value || null;
                    }
                    break;
                  default:
                    newRow[col.name] = col.default_value || '';
                }
              });

              console.log('➕ Adding new row to state:', newRow);
              console.log('➕ Current rows before adding:', rows.length);
              setRows((oldRows) => {
                const newRows = [...oldRows, newRow];
                console.log('➕ New rows array:', newRows.length, 'IDs:', newRows.map(r => r.id));
                return newRows;
              });
              console.log('➕ Setting edit mode for new row:', id);
              setRowModesModel((oldModel) => {
                const newModel = {
                  ...oldModel,
                  [id]: { 
                    mode: GridRowModes.Edit, 
                    fieldToFocus: spreadsheet?.columns.sort((a, b) => a.position - b.position)[0]?.name 
                  },
                };
                console.log('➕ New rowModesModel:', Object.keys(newModel));
                return newModel;
              });
            }}
          >
            Add Row
          </Button>
        </Box>
        {spreadsheet && !loading && (
          (() => {
            return (
              <DataGrid
                key={`${spreadsheet.id}-${filteredRows.length}`}
                rows={filteredRows}
              columns={[
              // Dynamic columns generated from spreadsheet column definitions
              ...spreadsheet.columns
                .sort((a, b) => a.position - b.position)
                .filter(col => visibleColumns[col.name] !== false) // Only show visible columns
                .map((col): GridColDef => {
                  console.log(`🔧 Processing column:`, col.name, 'type:', col.column_type, 'position:', col.position);
                  console.log(`🔍 Is this Type column? name.toLowerCase(): '${col.name.toLowerCase()}' === 'type'?`, col.name.toLowerCase() === 'type');
                  
                  const baseColumn: GridColDef = {
                    field: col.name,
                    headerName: col.name,
                    width: 200,
                    editable: true,
                  };

                  // Handle different column types
                  switch (col.column_type.toLowerCase()) {
                    case 'number':
                    case 'currency':
                      return {
                        ...baseColumn,
                        type: 'number',
                        valueFormatter: (value: any) => {
                          if (value == null || value === '') return '';
                          return new Intl.NumberFormat('en-US', {
                            style: col.column_type.toLowerCase() === 'currency' ? 'currency' : 'decimal',
                            currency: 'USD',
                          }).format(value);
                        },
                      };
                    
                    case 'select':
                      // Special handling for Type field - auto-populated from Salesforce Account
                      if (col.name.toLowerCase() === 'type') {
                        console.log('🔍 Type field column info:', col.name, 'baseColumn.field:', baseColumn.field);
                        return {
                          ...baseColumn,
                          field: 'type', // Normalize to lowercase for both column and row data
                          width: 200,
                          editable: false, // Make it read-only since it's auto-populated
                          renderCell: (params: any) => {
                            console.log('🎨 Type field renderCell - params.value:', params.value, 'params.field:', params.field, 'params.row:', params.row);
                            return (
                              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                <Chip
                                  label={params.value || 'Auto-populated from Account'}
                                  size="small"
                                  variant={params.value ? "filled" : "outlined"}
                                  color={params.value ? "primary" : "default"}
                                  sx={{ fontSize: '0.75rem' }}
                                />
                              </Box>
                            );
                          },
                        };
                      }
                      
                      return {
                        ...baseColumn,
                        width: 250,
                        renderCell: (params: any) => {
                          const value = params.value;
                          
                          // Handle multi-select (Owner column)
                          if (col.validation_rules?.multiple && Array.isArray(value)) {
                            const options = Array.isArray(col.validation_rules?.options) ? col.validation_rules.options : [];
                            return (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {value.map((selectedValue: string) => {
                                  const option = options.find((opt: any) => opt.value === selectedValue);
                                  return (
                                    <Chip
                                      key={selectedValue}
                                      label={option?.label || selectedValue}
                                      size="small"
                                      variant="outlined"
                                      sx={{ fontSize: '0.75rem' }}
                                    />
                                  );
                                })}
                                {value.length === 0 && (
                                  <Typography variant="caption" color="textSecondary">
                                    {col.display_options?.placeholder || 'Select...'}
                                  </Typography>
                                )}
                              </Box>
                            );
                          }
                          
                          // Handle single select
                          const options = Array.isArray(col.validation_rules?.options) ? col.validation_rules.options : [];
                          const option = options.find((opt: any) => opt.value === value);
                          return option ? (
                            <Chip
                              label={option.label}
                              size="small"
                              variant="outlined"
                            />
                          ) : (
                            <Typography variant="body2">{value || ''}</Typography>
                          );
                        },
                        renderEditCell: (params: any) => {
                          const options = Array.isArray(col.validation_rules?.options) ? col.validation_rules.options : [];
                          const isMultiple = col.validation_rules?.multiple;
                          
                          return (
                            <FormControl fullWidth size="small">
                              <Select
                                multiple={isMultiple}
                                value={isMultiple ? (params.value || []) : (params.value || '')}
                                onChange={(e: any) => {
                                  params.api.setEditCellValue({
                                    id: params.id,
                                    field: params.field,
                                    value: e.target.value,
                                  });
                                }}
                                displayEmpty
                                renderValue={isMultiple ? (selected: any) => (
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {Array.isArray(selected) ? selected.map((value) => {
                                      const option = Array.isArray(options) ? options.find((opt: any) => opt.value === value) : null;
                                      return (
                                        <Chip
                                          key={value}
                                          label={option?.label || value}
                                          size="small"
                                        />
                                      );
                                    }) : []}
                                  </Box>
                                ) : undefined}
                              >
                                {options.map((option: any) => (
                                  <MenuItem key={option.value} value={option.value}>
                                    {isMultiple && (
                                      <Checkbox
                                        checked={(params.value || []).indexOf(option.value) > -1}
                                        size="small"
                                      />
                                    )}
                                    <Box>
                                      <Typography variant="body2">{option.label}</Typography>
                                      {option.role && (
                                        <Typography variant="caption" color="textSecondary">
                                          {option.role}
                                        </Typography>
                                      )}
                                    </Box>
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          );
                        },
                      };
                    
                    case 'date':
                      return {
                        ...baseColumn,
                        type: 'date',
                        valueGetter: (value: any) => value ? new Date(value) : null,
                      };
                    
                    case 'boolean':
                      return {
                        ...baseColumn,
                        type: 'boolean',
                      };
                    
                    default:
                      // Special handling for Account/Company field - use Salesforce Account autocomplete
                      if (col.name.toLowerCase() === 'account' || col.name.toLowerCase() === 'company') {
                        return {
                          ...baseColumn,
                          width: 250,
                          renderEditCell: (params: any) => {
                            const availableOptions = Array.isArray(salesforceAccounts) ? salesforceAccounts : [];
                            console.log('🔍 Rendering Account Autocomplete for field:', params.field, 'row:', params.id);
                            console.log('🔍 Available options:', availableOptions.length, 'accounts');
                            console.log('🔍 First 3 options:', availableOptions.slice(0, 3));
                            
                            return (
                              <Autocomplete
                                fullWidth
                                options={availableOptions}
                                getOptionLabel={(option: any) => typeof option === 'string' ? option : option.Name}
                                onOpen={() => {
                                  console.log('🔓 Account Autocomplete opened with', availableOptions.length, 'options');
                                }}
                                value={Array.isArray(salesforceAccounts) ? salesforceAccounts.find(account => account.Name === params.value) || null : null}
                                onChange={(event: any, newValue: any) => {
                                  console.log('🔄 Account selection changed:', newValue);
                                  const accountName = (typeof newValue === 'string' ? newValue : newValue?.Name) || '';
                                  const accountType = (typeof newValue === 'object' && newValue?.Type) || '';
                                  console.log('📝 Account name:', accountName, 'Type:', accountType);
                                  
                                  // Update the Account field
                                  params.api.setEditCellValue({
                                    id: params.id,
                                    field: params.field,
                                    value: accountName,
                                  });
                                  
                                  // Also update the Type field if it exists
                                  if (accountType && accountType !== 'Custom Entry') {
                                    console.log('🎯 Attempting to auto-fill Type field with:', accountType, 'for account:', accountName);
                                    try {
                                      params.api.setEditCellValue({
                                        id: params.id,
                                        field: 'type', // Always use lowercase
                                        value: accountType,
                                      });
                                      console.log('✅ Successfully set field: type to:', accountType);
                                    } catch (error) {
                                      console.log('❌ Failed to set field: type', error);
                                    }
                                  } else {
                                    console.log('⚠️ No Type to auto-fill, accountType:', accountType);
                                  }
                                }}
                                renderInput={(inputParams: any) => (
                                  <TextField
                                    {...inputParams}
                                    variant="outlined"
                                    size="small"
                                    placeholder="Select or type account name..."
                                    fullWidth
                                  />
                                )}
                                freeSolo
                                clearOnEscape
                                disableClearable={false}
                                filterOptions={(options: any[], { inputValue }: { inputValue: string }) => {
                                  const filtered = options.filter((option: any) =>
                                    option.Name.toLowerCase().includes(inputValue.toLowerCase())
                                  );
                                  
                                  // If the input doesn't match any existing account, show option to create new
                                  if (inputValue && !filtered.some((option: any) =>
                                    option.Name.toLowerCase() === inputValue.toLowerCase()
                                  )) {
                                    filtered.push({
                                      Id: `new-${inputValue}`,
                                      Name: inputValue,
                                      Type: 'Custom Entry'
                                    } as SalesforceAccount);
                                  }
                                  
                                  return filtered;
                                }}
                                renderOption={(props: any, option: any) => (
                                  <Box component="li" {...props}>
                                    <Box>
                                      <Typography variant="body2">
                                        {option.Name}
                                      </Typography>
                                      {option.Industry && (
                                        <Typography variant="caption" color="textSecondary">
                                          {option.Industry} • {option.Type || 'Account'}
                                        </Typography>
                                      )}
                                    </Box>
                                  </Box>
                                )}
                              />
                            );
                          },
                        };
                      }
                      
                      return baseColumn;
                  }
                }),
              {
                field: 'technical_win',
                headerName: 'Technical Win',
                width: 140,
                sortable: false,
                disableColumnMenu: true,
                renderCell: (params: any) => {
                  const rowId = String(params.id);
                  const statusResult = getTechnicalWinStatus(rowId);
                  
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {statusResult.status === 'Completed' ? (
                        <Chip
                          label="Technical Win"
                          color="success"
                          size="small"
                          variant="filled"
                          sx={{ fontWeight: 'bold' }}
                        />
                      ) : (
                        <Chip
                          label="In Progress"
                          color="default"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  );
                },
              },
              {
                field: 'todos',
                headerName: 'Todos',
                width: 200,
                sortable: false,
                disableColumnMenu: true,
                renderCell: (params: any) => {
                  try {
                    if (!params || !params.id || params.id === null || params.id === undefined) {
                      console.warn('Invalid params in renderCell:', params);
                      return null;
                    }
                    const rowId = String(params.id);
                    const stats = getRowTodoStats(rowId);
                  
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
                      <RadialProgress rowId={rowId} />
                      <Button
                        size="small"
                        startIcon={<AssignmentIcon />}
                        onClick={() => {
                          try {
                            handleOpenRowTodos(rowId);
                          } catch (error) {
                            console.error('Error opening row todos:', error);
                          }
                        }}
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
                  } catch (error) {
                    console.error('Error in todos renderCell:', error, params);
                    return <Box>Error</Box>;
                  }
                },
              },
              {
                field: 'actions',
                type: 'actions' as const,
                headerName: 'Actions',
                width: 100,
                cellClassName: 'actions',
                getActions: ({ id }: { id: any }) => {
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
              }
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
            );
          })()
        )}
      </Paper>



      {/* Add Todo Dialog */}
      <Dialog 
        open={todoDialogOpen} 
        onClose={() => setTodoDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        disablePortal
        aria-labelledby="todo-dialog-title"
      >
        <DialogTitle id="todo-dialog-title">Add New Todo</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Title"
              value={newTodo.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTodo({ ...newTodo, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={newTodo.description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTodo({ ...newTodo, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <Select
              value={newTodo.priority.toLowerCase()}
              onChange={(e) => {
                const value = e.target.value as 'low' | 'medium' | 'high';
                let priority: 'Low' | 'Medium' | 'High';
                switch (value) {
                  case 'low': priority = 'Low'; break;
                  case 'medium': priority = 'Medium'; break;
                  case 'high': priority = 'High'; break;
                  default: priority = 'Medium';
                }
                setNewTodo({ ...newTodo, priority });
              }}
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
            <FormControl fullWidth>
              <InputLabel>Assign To</InputLabel>
              <Select
                value={newTodo.assignedTo}
                onChange={(e) => setNewTodo({ ...newTodo, assignedTo: e.target.value })}
                label="Assign To"
              >
                <MenuItem value="">
                  <em>Unassigned</em>
                </MenuItem>
                {(() => {
                  console.log('Rendering users dropdown. users:', users, 'isArray:', Array.isArray(users));
                  return Array.isArray(users) && users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name}
                    </MenuItem>
                  ));
                })()}
              </Select>
            </FormControl>
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
        disablePortal
        aria-labelledby="row-todo-dialog-title"
      >
        <DialogTitle id="row-todo-dialog-title">
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
                    value={newTodo.priority.toLowerCase()}
                    onChange={(e) => {
                      const value = e.target.value as 'low' | 'medium' | 'high';
                      let priority: 'Low' | 'Medium' | 'High';
                      switch (value) {
                        case 'low': priority = 'Low'; break;
                        case 'medium': priority = 'Medium'; break;
                        case 'high': priority = 'High'; break;
                        default: priority = 'Medium';
                      }
                      setNewTodo({ ...newTodo, priority });
                    }}
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
                <FormControl fullWidth size="small">
                  <InputLabel>Assign To</InputLabel>
                  <Select
                    value={newTodo.assignedTo}
                    onChange={(e) => setNewTodo({ ...newTodo, assignedTo: e.target.value })}
                    label="Assign To"
                  >
                    <MenuItem value="">
                      <em>Unassigned</em>
                    </MenuItem>
                    {Array.isArray(users) && users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Assign To</InputLabel>
                  <Select
                    value={newTodo.assignedTo}
                    onChange={(e) => setNewTodo({ ...newTodo, assignedTo: e.target.value })}
                    label="Assign To"
                  >
                    <MenuItem value="">
                      <em>Unassigned</em>
                    </MenuItem>
                    {Array.isArray(users) && users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
                            label={getPriorityDisplayText(todo.priority)}
                            color={getPriorityColor(todo.priority)}
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                          {todo.dueDate && (
                            <Typography variant="caption" color="textSecondary">
                              Due: {new Date(todo.dueDate).toLocaleDateString()}
                            </Typography>
                          )}
                          {todo.assignedTo && (
                            <Chip
                              size="small"
                              label={`@${getUserName(todo.assignedTo)}`}
                              color="primary"
                              variant="outlined"
                              sx={{ fontSize: '0.6rem', height: '18px' }}
                            />
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
                            label={getPriorityDisplayText(todo.priority)}
                            color={getPriorityColor(todo.priority)}
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                          {todo.assignedTo && (
                            <Chip
                              size="small"
                              label={`@${getUserName(todo.assignedTo)}`}
                              color="primary"
                              variant="outlined"
                              sx={{ fontSize: '0.6rem', height: '18px', opacity: 0.7 }}
                            />
                          )}
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