-- =============================================
-- منصة تعليم - مخطط قاعدة البيانات (Supabase SQL)
-- ==== المخطط الفعلي للقاعدة ====
-- =============================================

-- 1) جدول المعلمين (مع صلاحيات)
create table if not exists public.teachers (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'teacher' check (role in ('admin', 'teacher', 'disabled')),
  full_name text,
  email text,
  created_at timestamptz default now()
);

-- 2) جدول المجاميع (المجموعات)
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  group_name text not null,
  color_code text not null default '#2547eb',
  created_at timestamptz default now()
);

-- 3) جدول الطلاب
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  group_id uuid references public.groups (id) on delete set null,
  student_name text not null,
  student_code text not null unique,
  parent_phone text,
  evaluations jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

-- إضافة عمود التقييمات للجداول الموجودة (ترقية)
alter table public.students add column if not exists evaluations jsonb not null default '[]'::jsonb;

-- 4) جدول الحضور والغياب
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  session_date date not null,
  status text not null check (status in ('present', 'absent', 'late')),
  created_at timestamptz default now(),
  unique (student_id, session_date)
);

-- 5) جدول المصاريف والمدفوعات
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  amount numeric(10, 2) not null default 0,
  is_paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- 6) جدول تقييمات الحصص (الدرجات والواجبات)
create table if not exists public.session_evaluations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  title text not null,
  session_date date not null,
  group_name text not null default 'بدون مجموعة',
  student_name text not null,
  homework_status text not null default 'not_submitted' check (homework_status in ('submitted', 'partial', 'not_submitted')),
  score numeric(5, 2),
  max_score numeric(5, 2) not null default 10,
  note text,
  created_at timestamptz default now(),
  unique (student_id, session_date, title)
);

-- فهارس للأداء
create index if not exists idx_students_teacher on public.students (teacher_id);
create index if not exists idx_students_group on public.students (group_id);
create index if not exists idx_attendance_date on public.attendance (session_date);
create index if not exists idx_attendance_student on public.attendance (student_id);
create index if not exists idx_payments_student on public.payments (student_id);
create index if not exists idx_session_evals_student on public.session_evaluations (student_id);
create index if not exists idx_session_evals_date on public.session_evaluations (session_date);

-- =============================================
-- تفعيل Row Level Security
-- =============================================
alter table public.teachers enable row level security;
alter table public.groups enable row level security;
alter table public.students enable row level security;
alter table public.attendance enable row level security;
alter table public.payments enable row level security;
alter table public.session_evaluations enable row level security;

-- المعلم يرى ملفه فقط (وجميع المعلمين للادمن)
create policy "teachers_own_select" on public.teachers
  for select using (
    auth.uid() = id
    or exists (select 1 from public.teachers t where t.id = auth.uid() and t.role = 'admin')
  );

-- الادمن فقط يستطيع تحديث الأدوار
create policy "teachers_admin_update" on public.teachers
  for update using (
    exists (select 1 from public.teachers t where t.id = auth.uid() and t.role = 'admin')
  );

-- المجاميع: إدارة كاملة لمالكها
create policy "groups_own_all" on public.groups
  for all using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

-- الطلاب: إدارة كاملة لمالكها
create policy "students_own_all" on public.students
  for all using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

-- الحضور: للمعلم عبر طلابه
create policy "attendance_own_all" on public.attendance
  for all using (
    exists (select 1 from public.students s where s.id = attendance.student_id and s.teacher_id = auth.uid())
  ) with check (
    exists (select 1 from public.students s where s.id = attendance.student_id and s.teacher_id = auth.uid())
  );

-- المدفوعات: للمعلم عبر طلابه
create policy "payments_own_all" on public.payments
  for all using (
    exists (select 1 from public.students s where s.id = payments.student_id and s.teacher_id = auth.uid())
  ) with check (
    exists (select 1 from public.students s where s.id = payments.student_id and s.teacher_id = auth.uid())
  );

-- تقييمات الحصص: للمعلم عبر طلابه (وإدراج بحسب ملكية الطالب)
create policy "session_evals_own_all" on public.session_evaluations
  for all using (
    exists (select 1 from public.students s where s.id = session_evaluations.student_id and s.teacher_id = auth.uid())
  ) with check (
    exists (select 1 from public.students s where s.id = session_evaluations.student_id and s.teacher_id = auth.uid())
  );

-- =============================================
-- دالة استعلام ولي الأمر (قراءة فقط عبر كود الطالب)
-- =============================================
create or replace function public.get_student_by_parent_code(code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.students%rowtype;
  v_group_name text;
  v_group_color text;
  v_attendance json;
  v_payments json;
  v_evaluations json;
  v_teacher_name text;
begin
  select * into v_student from public.students where student_code = code limit 1;
  if not found then
    return json_build_object('error', 'INVALID_CODE');
  end if;

  select group_name, color_code into v_group_name, v_group_color
  from public.groups where id = v_student.group_id;

  select full_name into v_teacher_name
  from public.teachers where id = v_student.teacher_id;

  select coalesce(json_agg(
    json_build_object(
      'session_date', a.session_date,
      'status', a.status,
      'status_label', case a.status
        when 'present' then 'حاضر'
        when 'absent' then 'غائب'
        when 'late' then 'متأخر'
      end
    ) order by a.session_date desc
  ), '[]') into v_attendance
  from public.attendance a where a.student_id = v_student.id;

  select coalesce(json_agg(
    json_build_object(
      'amount', p.amount,
      'is_paid', p.is_paid,
      'paid_at', p.paid_at,
      'status', case when p.is_paid then 'مدفوع' else 'غير مدفوع' end
    ) order by p.created_at desc
  ), '[]') into v_payments
  from public.payments p where p.student_id = v_student.id;

  select coalesce(json_agg(
    json_build_object(
      'title', e.title,
      'date', e.session_date,
      'homework', e.homework_status,
      'score', e.score,
      'total', e.max_score,
      'note', e.note
    ) order by e.session_date desc
  ), '[]') into v_evaluations
  from public.session_evaluations e where e.student_id = v_student.id;

  return json_build_object(
    'error', 'NONE',
    'student_name', v_student.student_name,
    'group_name', coalesce(v_group_name, 'بدون مجموعة'),
    'group_color', coalesce(v_group_color, '#2547eb'),
    'teacher_name', coalesce(v_teacher_name, 'المعلم'),
    'attendance', v_attendance,
    'payments', v_payments,
    'evaluations', v_evaluations
  );
end;
$$;

revoke all on function public.get_student_by_parent_code(text) from public;
grant execute on function public.get_student_by_parent_code(text) to anon, authenticated;

-- =============================================
-- إنشاء سجل المعلم تلقائياً عند إنشاء الحساب
-- =============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.teachers (id, role, full_name, email)
  values (
    new.id,
    'teacher',
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
