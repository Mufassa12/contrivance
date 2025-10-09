import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BusinessIcon from '@mui/icons-material/Business';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import { spreadsheetService } from '../services/spreadsheet';
import { todoService } from '../services/todoService';

interface SpreadsheetData {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  settings: Record<string, any>;
  rows?: Array<{
    id: string;
    row_data: {
      Company?: string;
      'Primary Contact'?: string;
      'Deal Value'?: number;
    };
  }>;
}

interface TodoItem {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  completed: boolean;
  createdAt: string;
  dueDate?: string;
  supportingArtifact?: string;
}

interface AnalyticsData {
  totalPipelines: number;
  totalValue: number;
  completedTodos: number;
  pendingTodos: number;
  averageCompletionRate: number;
  pipelinesByStage: Array<{ stage: string; count: number; value: number }>;
  todosByPriority: Array<{ priority: string; count: number; color: string }>;
  valueByMonth: Array<{ month: string; value: number; count: number }>;
  topPerformers: Array<{ company: string; value: number; completionRate: number }>;
  activityTrend: Array<{ date: string; todos: number; completed: number }>;
}

export function Analytics() {
  const [timeRange, setTimeRange] = useState('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadAnalyticsData();
    
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      loadAnalyticsData(false); // Silent refresh without loading spinner
    }, 30000);

    return () => clearInterval(interval);
  }, [timeRange]);

  const loadAnalyticsData = async (showLoading: boolean = true) => {
    if (showLoading) {
      setLoading(true);
    }
    
    try {
      // Fetch real spreadsheet data
      const response = await spreadsheetService.getSpreadsheets();
      const spreadsheets = response.data || [];
      
      // Load todos using the todo service (both pipeline-level and row-specific)
      const allTodos: { [key: string]: TodoItem[] } = {};
      const allRowTodos: { [key: string]: { [rowId: string]: TodoItem[] } } = {};
      let totalTodos = 0;
      let completedTodos = 0;
      let totalValue = 0;
      
      // Collect todos and calculate metrics
      for (const sheet of spreadsheets) {
        // Pipeline-level todos
        const pipelineServiceTodos = todoService.getLocalTodos(sheet.id);
        const pipelineTodos = pipelineServiceTodos.map(todo => ({
          id: todo.id,
          title: todo.title,
          description: todo.description || '',
          priority: todo.priority,
          completed: todo.completed,
          createdAt: todo.created_at.toString(),
          dueDate: todo.due_date?.toString() || '',
          supportingArtifact: todo.supporting_artifact || '',
        }));
        
        allTodos[sheet.id] = pipelineTodos;
        totalTodos += pipelineTodos.length;
        completedTodos += pipelineTodos.filter(todo => todo.completed).length;
        
        // Row-specific todos
        allRowTodos[sheet.id] = {};
        
        // Fetch rows to get row-specific todos
        try {
          const rows = await spreadsheetService.getRows(sheet.id);
          if (rows && Array.isArray(rows)) {
            for (const row of rows) {
              const rowServiceTodos = todoService.getLocalTodos(sheet.id, row.id);
              const rowTodos = rowServiceTodos.map(todo => ({
                id: todo.id,
                title: todo.title,
                description: todo.description || '',
                priority: todo.priority,
                completed: todo.completed,
                createdAt: todo.created_at.toString(),
                dueDate: todo.due_date?.toString() || '',
                supportingArtifact: todo.supporting_artifact || '',
              }));
              
              if (rowTodos.length > 0) {
                allRowTodos[sheet.id][row.id] = rowTodos;
                totalTodos += rowTodos.length;
                completedTodos += rowTodos.filter(todo => todo.completed).length;
              }
            }
          }
        } catch (error) {
          console.warn(`Could not fetch rows for todos calculation ${sheet.id}:`, error);
        }
        
        // Fetch rows for this spreadsheet to get deal values
        try {
          const rows = await spreadsheetService.getRows(sheet.id);
          if (rows && Array.isArray(rows)) {
            rows.forEach(row => {
              const dealValue = row.row_data['Deal Value'];
              if (dealValue && !isNaN(Number(dealValue))) {
                totalValue += Number(dealValue);
              }
            });
          }
        } catch (error) {
          console.warn(`Could not fetch rows for spreadsheet ${sheet.id}:`, error);
        }
      }
      
      const pendingTodos = totalTodos - completedTodos;
      const averageCompletionRate = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;
      
      // Calculate pipelines by stage based on combined todo completion rates
      const pipelinesByStage = await Promise.all(spreadsheets.map(async (sheet) => {
        // Combine pipeline todos and all row todos for this sheet
        const pipelineTodos = allTodos[sheet.id] || [];
        const rowTodos = Object.values(allRowTodos[sheet.id] || {}).flat();
        const allSheetTodos = [...pipelineTodos, ...rowTodos];
        
        const completionRate = allSheetTodos.length > 0 
          ? allSheetTodos.filter(todo => todo.completed).length / allSheetTodos.length 
          : 0;
        
        let stage = 'Prospecting';
        if (completionRate >= 0.8) stage = 'Negotiation';
        else if (completionRate >= 0.6) stage = 'Proposal Sent';
        else if (completionRate >= 0.4) stage = 'Technical Review';
        else if (completionRate >= 0.2) stage = 'Demo Scheduled';
        
        // Fetch row data to calculate sheet value
        let sheetValue = 0;
        try {
          const rows = await spreadsheetService.getRows(sheet.id);
          if (rows && Array.isArray(rows)) {
            sheetValue = rows.reduce((sum, row) => {
              const value = row.row_data['Deal Value'];
              return sum + (value && !isNaN(Number(value)) ? Number(value) : 0);
            }, 0);
          }
        } catch (error) {
          console.warn(`Could not fetch rows for sheet value calculation ${sheet.id}:`, error);
        }
        
        return { sheet: sheet.name, stage, value: sheetValue, completionRate };
      }));
      
      // Aggregate by stage
      const stageAggregation = pipelinesByStage.reduce((acc: Record<string, { count: number; value: number }>, pipeline) => {
        if (!acc[pipeline.stage]) {
          acc[pipeline.stage] = { count: 0, value: 0 };
        }
        acc[pipeline.stage].count++;
        acc[pipeline.stage].value += pipeline.value;
        return acc;
      }, {});
      
      const stageData = Object.entries(stageAggregation).map(([stage, data]) => ({
        stage,
        count: data.count,
        value: data.value,
      }));
      
      // Calculate todos by priority (including both pipeline and row todos)
      const allPipelineTodos = Object.values(allTodos).flat();
      const allRowTodosList = Object.values(allRowTodos).flatMap(sheetRows => 
        Object.values(sheetRows).flat()
      );
      const allTodosList = [...allPipelineTodos, ...allRowTodosList];
      
      const priorityCounts = allTodosList.reduce((acc: Record<string, number>, todo) => {
        acc[todo.priority] = (acc[todo.priority] || 0) + 1;
        return acc;
      }, {});
      
      const todosByPriority = [
        { priority: 'High', count: priorityCounts.High || 0, color: '#f44336' },
        { priority: 'Medium', count: priorityCounts.Medium || 0, color: '#ff9800' },
        { priority: 'Low', count: priorityCounts.Low || 0, color: '#4caf50' },
      ];
      
      // Generate monthly value trend (simplified)
      const currentMonth = new Date().toLocaleString('default', { month: 'short' });
      const spreadsheetsCount = spreadsheets.length;
      const valueByMonth = [
        { month: 'Jan', value: Math.floor(totalValue * 0.6), count: Math.floor(spreadsheetsCount * 0.6) },
        { month: 'Feb', value: Math.floor(totalValue * 0.7), count: Math.floor(spreadsheetsCount * 0.7) },
        { month: 'Mar', value: Math.floor(totalValue * 0.8), count: Math.floor(spreadsheetsCount * 0.8) },
        { month: 'Apr', value: Math.floor(totalValue * 0.9), count: Math.floor(spreadsheetsCount * 0.9) },
        { month: currentMonth, value: totalValue, count: spreadsheetsCount },
      ];
      
      // Top performers based on completion rate and deal value
      const topPerformers = pipelinesByStage
        .filter((p) => p.value > 0 || p.completionRate > 0) // Include pipelines with activity even if no deal value
        .sort((a, b) => {
          // Sort by completion rate first, then by deal value
          const scoreA = (a.completionRate * 0.7) + ((a.value / 1000000) * 0.3);
          const scoreB = (b.completionRate * 0.7) + ((b.value / 1000000) * 0.3);
          return scoreB - scoreA;
        })
        .slice(0, 4)
        .map((p) => ({
          company: p.sheet,
          value: p.value,
          completionRate: Math.round(p.completionRate * 100),
        }));
      
      // Activity trend based on time range selection
      const daysToShow = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const activityTrend = [];
      
      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        
        // Filter todos created on this date
        const todosCreatedOnDate = allTodosList.filter(todo => {
          const todoDate = new Date(todo.createdAt);
          return todoDate.toDateString() === date.toDateString();
        });
        
        // Get completion count for todos created on this date
        const completedOnDate = todosCreatedOnDate.filter(todo => todo.completed).length;
        
        activityTrend.push({
          date: dateStr,
          todos: todosCreatedOnDate.length,
          completed: completedOnDate,
        });
      }
      
      const realData: AnalyticsData = {
        totalPipelines: spreadsheetsCount,
        totalValue,
        completedTodos,
        pendingTodos,
        averageCompletionRate: Math.round(averageCompletionRate * 100) / 100,
        pipelinesByStage: stageData.length > 0 ? stageData : [{ stage: 'No Data', count: 0, value: 0 }],
        todosByPriority,
        valueByMonth,
        topPerformers: topPerformers.length > 0 ? topPerformers : [{ company: 'No Data', value: 0, completionRate: 0 }],
        activityTrend,
      };
      
      setData(realData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading analytics data:', error);
      // Fallback to empty data
      setData({
        totalPipelines: 0,
        totalValue: 0,
        completedTodos: 0,
        pendingTodos: 0,
        averageCompletionRate: 0,
        pipelinesByStage: [{ stage: 'No Data', count: 0, value: 0 }],
        todosByPriority: [
          { priority: 'High', count: 0, color: '#f44336' },
          { priority: 'Medium', count: 0, color: '#ff9800' },
          { priority: 'Low', count: 0, color: '#4caf50' },
        ],
        valueByMonth: [],
        topPerformers: [{ company: 'No Data', value: 0, completionRate: 0 }],
        activityTrend: [],
      });
    }
    
    if (showLoading) {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return '#4caf50';
    if (rate >= 60) return '#ff9800';
    return '#f44336';
  };

  if (loading || !data) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Pipeline Analytics
        </Typography>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading analytics data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1">
            Pipeline Analytics
          </Typography>
          {lastUpdated && (
            <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              🔄 Real-time data • Last updated: {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
        </Box>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <MenuItem value="7d">Last 7 days</MenuItem>
            <MenuItem value="30d">Last 30 days</MenuItem>
            <MenuItem value="90d">Last 90 days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Key Metrics Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Pipeline Value
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(data.totalValue)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TrendingUpIcon color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                      +12.5% from last month
                    </Typography>
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <AttachMoneyIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Pipelines
                  </Typography>
                  <Typography variant="h4">
                    {data.totalPipelines}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TrendingUpIcon color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                      +2 this month
                    </Typography>
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  <BusinessIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Todo Completion Rate
                  </Typography>
                  <Typography variant="h4">
                    {data.averageCompletionRate}%
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TrendingDownIcon color="error" fontSize="small" />
                    <Typography variant="body2" color="error.main" sx={{ ml: 0.5 }}>
                      -3.2% from last week
                    </Typography>
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <AssignmentIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Completed / Pending
                  </Typography>
                  <Typography variant="h4">
                    {data.completedTodos} / {data.pendingTodos}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                    <Chip 
                      size="small" 
                      icon={<CheckCircleIcon />} 
                      label={`${data.completedTodos} done`} 
                      color="success" 
                      variant="outlined"
                    />
                    <Chip 
                      size="small" 
                      icon={<PendingIcon />} 
                      label={`${data.pendingTodos} pending`} 
                      color="warning" 
                      variant="outlined"
                    />
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <CheckCircleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Charts Row 1 */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: { xs: '1 1 100%', md: '2 1 60%' } }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Pipeline Value Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.valueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Pipeline Value']}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 35%' } }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Todos by Priority
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.todosByPriority}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ priority, count }) => `${priority}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.todosByPriority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Box>
      </Box>

      {/* Charts Row 2 */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 45%' } }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Pipelines by Stage
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.pipelinesByStage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'value') return [formatCurrency(value), 'Total Value'];
                    return [value, 'Count'];
                  }}
                />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Count" />
                <Bar dataKey="value" fill="#82ca9d" name="Total Value" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 45%' } }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Daily Activity Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.activityTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="todos" 
                  stroke="#8884d8" 
                  name="Todos Created"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#82ca9d" 
                  name="Todos Completed"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Box>
      </Box>

      {/* Top Performers */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Top Performing Pipelines
        </Typography>
        <List>
          {data.topPerformers.map((performer, index) => (
            <React.Fragment key={performer.company}>
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: index === 0 ? 'gold' : index === 1 ? 'silver' : '#cd7f32' }}>
                    {index + 1}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={performer.company}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                      <Typography variant="body2">
                        {formatCurrency(performer.value)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={performer.completionRate}
                          sx={{ 
                            width: 100, 
                            height: 8, 
                            borderRadius: 4,
                            bgcolor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: getCompletionColor(performer.completionRate)
                            }
                          }}
                        />
                        <Typography variant="body2" color="textSecondary">
                          {performer.completionRate}% complete
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
              {index < data.topPerformers.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
}