// Real pending tasks data for Premier Hotel
export const pendingTasksData = [
  {
    id: 'hk-001',
    task: 'Deep Cleaning - Room 301',
    assignedTo: 'Grace Mwangi',
    priority: 'high' as const,
    deadline: '2:30 PM',
    type: 'housekeeping'
  },
  {
    id: 'hk-002',
    task: 'Room Inspection - Room 205',
    assignedTo: 'Peter Kamau',
    priority: 'medium' as const,
    deadline: '3:00 PM',
    type: 'housekeeping'
  },
  {
    id: 'hk-003',
    task: 'Maintenance Check - Room 102',
    assignedTo: 'Lucy Wanjiku',
    priority: 'urgent' as const,
    deadline: 'Overdue',
    type: 'housekeeping'
  },
  {
    id: 'sr-001',
    task: 'Service Request: Extra Towels',
    assignedTo: 'James Wilson',
    priority: 'medium' as const,
    deadline: '45 min remaining',
    type: 'service'
  },
  {
    id: 'sr-002',
    task: 'Service Request: Room Service Order',
    assignedTo: 'Sarah Johnson',
    priority: 'high' as const,
    deadline: '20 min remaining',
    type: 'service'
  },
  {
    id: 'sr-003',
    task: 'Service Request: AC Repair',
    assignedTo: 'Michael Ochieng',
    priority: 'urgent' as const,
    deadline: 'Overdue',
    type: 'service'
  },
  {
    id: 'hk-004',
    task: 'Laundry Collection - Floor 2',
    assignedTo: 'Grace Mwangi',
    priority: 'low' as const,
    deadline: '5:00 PM',
    type: 'housekeeping'
  },
  {
    id: 'sr-004',
    task: 'Service Request: Restaurant Reservation',
    assignedTo: 'David Brown',
    priority: 'low' as const,
    deadline: '1h 30min remaining',
    type: 'service'
  }
];