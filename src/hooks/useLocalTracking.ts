import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

export interface LocalUserAction {
  timestamp: string;
  userEmail?: string;
  actionType: 'button_click' | 'route_generation' | 'comment' | 'save_route' | 'page_view';
  actionName: string;
  data?: Record<string, any>;
  pageUrl?: string;
}

export const useLocalTracking = () => {
  const { user } = useAuth();
  const [actions, setActions] = useState<LocalUserAction[]>([]);

  // Load existing actions from localStorage on mount
  useEffect(() => {
    const savedActions = localStorage.getItem('turnright_user_actions');
    if (savedActions) {
      try {
        setActions(JSON.parse(savedActions));
      } catch (error) {
        console.error('Error loading saved actions:', error);
      }
    }
  }, []);

  // Save actions to localStorage whenever actions change
  useEffect(() => {
    localStorage.setItem('turnright_user_actions', JSON.stringify(actions));
  }, [actions]);

  // Track a user action
  const trackAction = (action: Omit<LocalUserAction, 'timestamp' | 'userEmail'>) => {
    const newAction: LocalUserAction = {
      ...action,
      timestamp: new Date().toISOString(),
      userEmail: user?.email || 'anonymous',
      pageUrl: action.pageUrl || window.location.pathname
    };

    setActions(prev => [...prev, newAction]);
    console.log('📊 Action tracked locally:', newAction);
  };

  // Track button click
  const trackButtonClick = (buttonName: string, additionalData?: Record<string, any>) => {
    trackAction({
      actionType: 'button_click',
      actionName: buttonName,
      data: additionalData
    });
  };

  // Track route generation
  const trackRouteGeneration = (routeData: Record<string, any>) => {
    trackAction({
      actionType: 'route_generation',
      actionName: 'generate_route',
      data: routeData
    });
  };

  // Track comment
  const trackComment = (commentData: Record<string, any>) => {
    trackAction({
      actionType: 'comment',
      actionName: 'leave_comment',
      data: commentData
    });
  };

  // Track save route
  const trackSaveRoute = (saveData: Record<string, any>) => {
    trackAction({
      actionType: 'save_route',
      actionName: 'save_route',
      data: saveData
    });
  };

  // Track page view
  const trackPageView = (pageData?: Record<string, any>) => {
    trackAction({
      actionType: 'page_view',
      actionName: 'page_view',
      data: pageData
    });
  };

  // Export actions to file
  const exportActions = (format: 'json' | 'csv' | 'txt' = 'json') => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `turnright_actions_${timestamp}`;

    if (format === 'json') {
      const dataStr = JSON.stringify(actions, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      downloadFile(blob, `${filename}.json`);
    } else if (format === 'csv') {
      const csvStr = convertToCSV(actions);
      const blob = new Blob([csvStr], { type: 'text/csv' });
      downloadFile(blob, `${filename}.csv`);
    } else if (format === 'txt') {
      const txtStr = convertToText(actions);
      const blob = new Blob([txtStr], { type: 'text/plain' });
      downloadFile(blob, `${filename}.txt`);
    }
  };

  // Convert actions to CSV format
  const convertToCSV = (actions: LocalUserAction[]): string => {
    const headers = ['Timestamp', 'User Email', 'Action Type', 'Action Name', 'Page URL', 'Data'];
    const rows = actions.map(action => [
      action.timestamp,
      action.userEmail || '',
      action.actionType,
      action.actionName,
      action.pageUrl || '',
      JSON.stringify(action.data || {})
    ]);

    return [headers, ...rows].map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');
  };

  // Convert actions to readable text format
  const convertToText = (actions: LocalUserAction[]): string => {
    let text = 'TurnRight User Actions Report\n';
    text += '='.repeat(50) + '\n\n';
    text += `Generated: ${new Date().toLocaleString()}\n`;
    text += `Total actions: ${actions.length}\n\n`;

    actions.forEach((action, index) => {
      text += `${index + 1}. ${action.actionName}\n`;
      text += `   Type: ${action.actionType}\n`;
      text += `   Time: ${new Date(action.timestamp).toLocaleString()}\n`;
      text += `   User: ${action.userEmail || 'Anonymous'}\n`;
      text += `   Page: ${action.pageUrl || 'Unknown'}\n`;
      if (action.data && Object.keys(action.data).length > 0) {
        text += `   Data: ${JSON.stringify(action.data, null, 2)}\n`;
      }
      text += '\n';
    });

    return text;
  };

  // Helper function to download file
  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear all actions
  const clearActions = () => {
    setActions([]);
    localStorage.removeItem('turnright_user_actions');
  };

  // Get actions count
  const getActionsCount = () => actions.length;

  // Get actions by type
  const getActionsByType = (actionType: LocalUserAction['actionType']) => {
    return actions.filter(action => action.actionType === actionType);
  };

  return {
    actions,
    trackAction,
    trackButtonClick,
    trackRouteGeneration,
    trackComment,
    trackSaveRoute,
    trackPageView,
    exportActions,
    clearActions,
    getActionsCount,
    getActionsByType
  };
};
