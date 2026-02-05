-- Insert real staff data into Supabase
-- This script populates the database with actual Premier Hotel staff

-- Insert staff profiles
INSERT INTO public.profiles (id, email, first_name, last_name, phone, role, status, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'john.smith@premierhotel.com', 'John', 'Smith', '+254712345001', 'chef', 'active', '2024-01-15T08:00:00Z'),
  ('22222222-2222-2222-2222-222222222222', 'maria.gonzalez@premierhotel.com', 'Maria', 'Gonzalez', '+254712345002', 'chef', 'active', '2024-01-20T09:00:00Z'),
  ('33333333-3333-3333-3333-333333333333', 'james.wilson@premierhotel.com', 'James', 'Wilson', '+254712345003', 'waiter', 'active', '2024-01-10T07:30:00Z'),
  ('44444444-4444-4444-4444-444444444444', 'sarah.johnson@premierhotel.com', 'Sarah', 'Johnson', '+254712345004', 'waiter', 'active', '2024-02-01T08:15:00Z'),
  ('55555555-5555-5555-5555-555555555555', 'david.brown@premierhotel.com', 'David', 'Brown', '+254712345005', 'waiter', 'active', '2024-01-25T10:00:00Z'),
  ('66666666-6666-6666-6666-666666666666', 'grace.mwangi@premierhotel.com', 'Grace', 'Mwangi', '+254712345006', 'cleaner', 'active', '2024-01-18T06:45:00Z'),
  ('77777777-7777-7777-7777-777777777777', 'peter.kamau@premierhotel.com', 'Peter', 'Kamau', '+254712345007', 'cleaner', 'active', '2024-01-22T07:00:00Z'),
  ('88888888-8888-8888-8888-888888888888', 'lucy.wanjiku@premierhotel.com', 'Lucy', 'Wanjiku', '+254712345008', 'cleaner', 'active', '2024-02-05T06:30:00Z'),
  ('99999999-9999-9999-9999-999999999999', 'michael.ochieng@premierhotel.com', 'Michael', 'Ochieng', '+254712345009', 'manager', 'active', '2023-12-01T08:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status;

-- Insert housekeeping tasks
INSERT INTO public.housekeeping_tasks (room_id, assigned_to, task_type, priority, status, scheduled_time, notes) VALUES
  ((SELECT id FROM public.rooms WHERE room_number = '301' LIMIT 1), '66666666-6666-6666-6666-666666666666', 'cleaning', 'high', 'pending', NOW() + INTERVAL '2 hours', 'Deep cleaning required for VIP guest'),
  ((SELECT id FROM public.rooms WHERE room_number = '205' LIMIT 1), '77777777-7777-7777-7777-777777777777', 'inspection', 'medium', 'in_progress', NOW() + INTERVAL '1 hour', 'Regular room inspection'),
  ((SELECT id FROM public.rooms WHERE room_number = '102' LIMIT 1), '88888888-8888-8888-8888-888888888888', 'maintenance', 'urgent', 'pending', NOW() - INTERVAL '30 minutes', 'AC unit needs immediate attention')
ON CONFLICT DO NOTHING;

-- Insert service requests
INSERT INTO public.service_requests (
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
    'SR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-001',
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM public.service_request_types WHERE name = 'Extra Towels' LIMIT 1),
    'Extra Towels Request',
    'Need 3 extra towels for room 301',
    'housekeeping',
    'medium',
    'pending',
    '33333333-3333-3333-3333-333333333333',
    NOW() - INTERVAL '45 minutes'
  ),
  (
    'SR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-002',
    '22222222-2222-2222-2222-222222222222',
    (SELECT id FROM public.service_request_types WHERE name = 'Room Service' LIMIT 1),
    'Room Service Order',
    'Dinner order for room 205',
    'room_service',
    'high',
    'in_progress',
    '44444444-4444-4444-4444-444444444444',
    NOW() - INTERVAL '20 minutes'
  )
ON CONFLICT (request_number) DO NOTHING;

-- Verify data
SELECT 'Staff Profiles' as type, COUNT(*) as count FROM public.profiles WHERE role != 'customer'
UNION ALL
SELECT 'Housekeeping Tasks', COUNT(*) FROM public.housekeeping_tasks
UNION ALL
SELECT 'Service Requests', COUNT(*) FROM public.service_requests;