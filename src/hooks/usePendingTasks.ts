import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

interface PendingTask {
  id: string;
  task: string;
  assignedTo: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  deadline: string;
  type: string;
}

export function usePendingTasks() {
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPendingTasks();
  }, []);

  const fetchPendingTasks = async () => {
    try {
      setIsLoading(true);
      
      // Get housekeeping tasks
      const { data: housekeepingTasks } = await supabase
        .from('housekeeping_tasks')
        .select(`
          id,
          task_type,
          priority,
          deadline,
          room_id,
          assigned_to,
          profiles!housekeeping_tasks_assigned_to_fkey(full_name)
        `)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .limit(10);

      // Get service requests
      const { data: serviceRequests } = await supabase
        .from('service_requests')
        .select(`
          id,
          request_type,
          priority,
          created_at,
          assigned_to,
          profiles!service_requests_assigned_to_fkey(full_name)
        `)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .limit(10);

      const formattedTasks: PendingTask[] = [];

      // Format housekeeping tasks
      housekeepingTasks?.forEach(task => {
        const deadline = task.deadline ? 
          new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
          'No deadline';
        
        formattedTasks.push({
          id: task.id,
          task: `${task.task_type} - Room ${task.room_id}`,
          assignedTo: task.profiles?.full_name || 'Unassigned',
          priority: task.priority as 'urgent' | 'high' | 'medium' | 'low',
          deadline,
          type: 'housekeeping'
        });
      });

      // Format service requests
      serviceRequests?.forEach(request => {
        const timeDiff = Date.now() - new Date(request.created_at).getTime();
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
        const deadline = hoursAgo > 2 ? 'Overdue' : `${2 - hoursAgo}h remaining`;
        
        formattedTasks.push({
          id: request.id,
          task: `Service Request: ${request.request_type}`,
          assignedTo: request.profiles?.full_name || 'Unassigned',
          priority: request.priority as 'urgent' | 'high' | 'medium' | 'low',
          deadline,
          type: 'service'
        });
      });

      // Sort by priority
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      formattedTasks.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

      setTasks(formattedTasks);
    } catch (error: any) {
      toast.error('Failed to load pending tasks');
    } finally {
      setIsLoading(false);
    }
  };

  return { tasks, isLoading, refetch: fetchPendingTasks };
}