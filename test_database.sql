-- Test script to add sample data for testing the dashboard

-- Insert sample staff profiles (these would normally be created through auth)
INSERT INTO public.profiles (id, email, first_name, last_name, phone, role, status, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'chef1@hotel.com', 'John', 'Smith', '+254700000001', 'chef', 'active', NOW() - INTERVAL '10 days'),
  ('22222222-2222-2222-2222-222222222222', 'waiter1@hotel.com', 'Jane', 'Doe', '+254700000002', 'waiter', 'active', NOW() - INTERVAL '5 days'),
  ('33333333-3333-3333-3333-333333333333', 'cleaner1@hotel.com', 'Bob', 'Wilson', '+254700000003', 'cleaner', 'active', NOW() - INTERVAL '15 days'),
  ('44444444-4444-4444-4444-444444444444', 'manager1@hotel.com', 'Alice', 'Johnson', '+254700000004', 'manager', 'active', NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

-- Insert sample housekeeping tasks
INSERT INTO public.housekeeping_tasks (id, room_id, assigned_to, task_type, priority, status, scheduled_time, notes) VALUES
  (uuid_generate_v4(), (SELECT id FROM public.rooms LIMIT 1), '33333333-3333-3333-3333-333333333333', 'cleaning', 'high', 'pending', NOW() + INTERVAL '1 hour', 'Deep cleaning required'),
  (uuid_generate_v4(), (SELECT id FROM public.rooms LIMIT 1 OFFSET 1), '33333333-3333-3333-3333-333333333333', 'inspection', 'medium', 'in_progress', NOW() + INTERVAL '2 hours', 'Regular inspection')
ON CONFLICT DO NOTHING;

-- Insert sample service request types (if not already exists)
INSERT INTO public.service_request_types (name, description, category, estimated_time) VALUES
  ('Room Cleaning', 'Request immediate room cleaning', 'housekeeping', 30),
  ('Extra Towels', 'Request additional towels', 'housekeeping', 15),
  ('Maintenance Issue', 'Report maintenance problems', 'maintenance', 60)
ON CONFLICT (name) DO NOTHING;

-- Insert sample service requests
INSERT INTO public.service_requests (
  id, 
  request_number, 
  guest_id, 
  request_type_id, 
  title, 
  description, 
  category, 
  priority, 
  status, 
  assigned_to,
  requested_at
) VALUES
  (
    uuid_generate_v4(), 
    'SR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-001',
    '11111111-1111-1111-1111-111111111111', -- Using chef as guest for testing
    (SELECT id FROM public.service_request_types WHERE name = 'Room Cleaning' LIMIT 1),
    'Room Cleaning Request',
    'Please clean room 101',
    'housekeeping',
    'high',
    'pending',
    '22222222-2222-2222-2222-222222222222', -- Assigned to waiter
    NOW() - INTERVAL '30 minutes'
  ),
  (
    uuid_generate_v4(), 
    'SR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-002',
    '22222222-2222-2222-2222-222222222222', -- Using waiter as guest for testing
    (SELECT id FROM public.service_request_types WHERE name = 'Extra Towels' LIMIT 1),
    'Extra Towels Needed',
    'Need 2 extra towels for room 201',
    'housekeeping',
    'medium',
    'in_progress',
    '33333333-3333-3333-3333-333333333333', -- Assigned to cleaner
    NOW() - INTERVAL '1 hour'
  )
ON CONFLICT DO NOTHING;

-- Verify the data
SELECT 'Profiles' as table_name, COUNT(*) as count FROM public.profiles WHERE role IN ('chef', 'waiter', 'cleaner', 'manager')
UNION ALL
SELECT 'Housekeeping Tasks', COUNT(*) FROM public.housekeeping_tasks
UNION ALL
SELECT 'Service Requests', COUNT(*) FROM public.service_requests
UNION ALL
SELECT 'Service Request Types', COUNT(*) FROM public.service_request_types;