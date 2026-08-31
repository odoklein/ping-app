-- ==============================================================================
-- CAPTAIN PROSPECT / SUZALINK - ADMIN USER & PERMISSIONS SEED SCRIPT
-- Run this directly in Neon SQL Editor / Neon Console / psql
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create or Update the Administrator User (Role: MANAGER)
-- Credentials:
--   Email:    admin@captain-prospect.fr
--   Password: Admin12345@
--   Role:     MANAGER
-- ==============================================================================

INSERT INTO "User" (
  "id",
  "email",
  "password",
  "name",
  "role",
  "isActive",
  "clientId",
  "clientOnboardingDismissedPermanently",
  "createdAt",
  "updatedAt"
) VALUES (
  'admin-super-001',
  'admin@captain-prospect.fr',
  crypt('Admin12345@', gen_salt('bf', 10)),
  'Super Administrator',
  'MANAGER',
  true,
  NULL,
  false,
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO UPDATE SET
  "password" = crypt('Admin12345@', gen_salt('bf', 10)),
  "name" = EXCLUDED."name",
  "role" = 'MANAGER',
  "isActive" = true,
  "updatedAt" = NOW();

-- 2. Set Master Password in SystemConfig
-- ==============================================================================
INSERT INTO "SystemConfig" ("key", "value", "updatedAt")
VALUES (
  'masterPasswordHash',
  crypt('Admin12345@', gen_salt('bf', 10)),
  NOW()
)
ON CONFLICT ("key") DO UPDATE SET
  "value" = EXCLUDED."value",
  "updatedAt" = NOW();

-- 3. Seed All Standard System Permissions
-- ==============================================================================
INSERT INTO "Permission" ("id", "code", "name", "category", "createdAt")
VALUES
  -- Pages
  ('perm-p-dash',       'pages.dashboard',          'Dashboard',               'pages', NOW()),
  ('perm-p-clients',    'pages.clients',            'Clients',                 'pages', NOW()),
  ('perm-p-missions',   'pages.missions',           'Missions',                'pages', NOW()),
  ('perm-p-campaigns',  'pages.campaigns',          'Campaigns',               'pages', NOW()),
  ('perm-p-lists',      'pages.lists',              'Lists',                   'pages', NOW()),
  ('perm-p-analytics',  'pages.analytics',          'Analytics',               'pages', NOW()),
  ('perm-p-planning',   'pages.planning',           'Planning',                'pages', NOW()),
  ('perm-p-files',      'pages.files',              'Files',                   'pages', NOW()),
  ('perm-p-users',      'pages.users',              'Users',                   'pages', NOW()),
  ('perm-p-sdrs',       'pages.sdrs',               'SDRs',                    'pages', NOW()),
  ('perm-p-projects',   'pages.projects',           'Projects',                'pages', NOW()),
  ('perm-p-action',     'pages.action',             'Action',                  'pages', NOW()),
  ('perm-p-opps',       'pages.opportunities',      'Opportunities',           'pages', NOW()),
  ('perm-p-settings',   'pages.settings',           'Settings',                'pages', NOW()),
  ('perm-p-portfolio',  'pages.portfolio',          'Portfolio',               'pages', NOW()),
  ('perm-p-onboarding', 'pages.onboarding',         'Onboarding',              'pages', NOW()),
  -- Email Hub Pages
  ('perm-p-email',      'pages.email',              'Email Hub',               'pages', NOW()),
  ('perm-p-em-inbox',   'pages.email_inbox',        'Email Inbox',             'pages', NOW()),
  ('perm-p-em-team',    'pages.email_team',         'Email Team',              'pages', NOW()),
  ('perm-p-em-seq',     'pages.email_sequences',    'Email Sequences',         'pages', NOW()),
  ('perm-p-em-box',     'pages.email_mailboxes',    'Email Mailboxes',         'pages', NOW()),
  ('perm-p-em-ana',     'pages.email_analytics',    'Email Analytics',         'pages', NOW()),
  -- Features - Mission
  ('perm-f-m-create',   'features.create_mission',  'Create Mission',          'features', NOW()),
  ('perm-f-m-edit',     'features.edit_mission',    'Edit Mission',            'features', NOW()),
  ('perm-f-m-del',      'features.delete_mission',  'Delete Mission',          'features', NOW()),
  ('perm-f-m-assign',   'features.assign_sdr',      'Assign SDR',              'features', NOW()),
  -- Features - List
  ('perm-f-l-create',   'features.create_list',     'Create List',             'features', NOW()),
  ('perm-f-l-edit',     'features.edit_list',       'Edit List',               'features', NOW()),
  ('perm-f-l-del',      'features.delete_list',     'Delete List',             'features', NOW()),
  ('perm-f-l-imp',      'features.import_lists',    'Import Lists',            'features', NOW()),
  ('perm-f-l-exp',      'features.export_data',     'Export Data',             'features', NOW()),
  -- Features - Campaign
  ('perm-f-c-create',   'features.create_campaign', 'Create Campaign',         'features', NOW()),
  ('perm-f-c-edit',     'features.edit_campaign',   'Edit Campaign',           'features', NOW()),
  ('perm-f-c-del',      'features.delete_campaign', 'Delete Campaign',         'features', NOW()),
  -- Features - Client
  ('perm-f-cl-create',  'features.create_client',   'Create Client',           'features', NOW()),
  ('perm-f-cl-edit',    'features.edit_client',     'Edit Client',             'features', NOW()),
  ('perm-f-cl-del',     'features.delete_client',   'Delete Client',           'features', NOW()),
  -- Features - User
  ('perm-f-u-create',   'features.create_user',     'Create User',             'features', NOW()),
  ('perm-f-u-edit',     'features.edit_user',       'Edit User',               'features', NOW()),
  ('perm-f-u-del',      'features.delete_user',     'Delete User',             'features', NOW()),
  ('perm-f-u-perms',    'features.manage_permissions','Manage Permissions',    'features', NOW()),
  ('perm-f-u-ban',      'features.ban_user',        'Ban User',                'features', NOW()),
  -- Features - Files
  ('perm-f-f-upload',   'features.upload_files',    'Upload Files',            'features', NOW()),
  ('perm-f-f-del',      'features.delete_files',    'Delete Files',            'features', NOW()),
  ('perm-f-f-folders',  'features.manage_folders',  'Manage Folders',          'features', NOW()),
  -- Features - Email Hub
  ('perm-f-em-conn',    'features.connect_mailbox', 'Connect Mailbox',         'features', NOW()),
  ('perm-f-em-mgmt',    'features.manage_mailboxes','Manage Mailboxes',        'features', NOW()),
  ('perm-f-em-send',    'features.send_email',      'Send Email',              'features', NOW()),
  ('perm-f-em-sendas',  'features.send_as',         'Send As',                 'features', NOW()),
  ('perm-f-em-sq-c',    'features.create_sequence', 'Create Sequence',         'features', NOW()),
  ('perm-f-em-sq-e',    'features.edit_sequence',   'Edit Sequence',           'features', NOW()),
  ('perm-f-em-sq-d',    'features.delete_sequence', 'Delete Sequence',         'features', NOW()),
  ('perm-f-em-enroll',  'features.enroll_contacts', 'Enroll Contacts',         'features', NOW()),
  ('perm-f-em-analytics','features.view_email_analytics','View Email Analytics','features', NOW()),
  ('perm-f-em-team',    'features.manage_team_inbox','Manage Team Inbox',      'features', NOW()),
  -- Actions
  ('perm-a-call',       'actions.make_calls',       'Make Calls',              'actions', NOW()),
  ('perm-a-email',      'actions.send_emails',      'Send Emails',             'actions', NOW()),
  ('perm-a-linkedin',   'actions.send_linkedin',    'Send LinkedIn',           'actions', NOW()),
  ('perm-a-book',       'actions.book_meetings',    'Book Meetings',           'actions', NOW()),
  ('perm-a-opp',        'actions.create_opportunity','Create Opportunity',     'actions', NOW()),
  ('perm-a-editc',      'actions.edit_contacts',    'Edit Contacts',           'actions', NOW()),
  -- Internal Comms
  ('perm-p-comms',      'pages.comms',              'Communications',          'pages', NOW()),
  ('perm-p-c-inbox',    'pages.comms_inbox',        'Comms Inbox',             'pages', NOW()),
  ('perm-p-c-threads',  'pages.comms_threads',      'Comms Threads',           'pages', NOW()),
  ('perm-p-c-groups',   'pages.comms_groups',       'Comms Groups',            'pages', NOW()),
  ('perm-p-c-broad',    'pages.comms_broadcasts',   'Comms Broadcasts',        'pages', NOW()),
  ('perm-f-c-thread',   'features.comms_create_thread','Create Comms Thread',  'features', NOW()),
  ('perm-f-c-group',    'features.comms_create_group','Create Comms Group',    'features', NOW()),
  ('perm-f-c-broad',    'features.comms_create_broadcast','Create Broadcast',   'features', NOW()),
  ('perm-f-c-resolve',  'features.comms_resolve_thread','Resolve Comms Thread','features', NOW()),
  ('perm-f-c-delmsg',   'features.comms_delete_message','Delete Comms Message','features', NOW()),
  ('perm-f-c-groups',   'features.comms_manage_groups','Manage Comms Groups',  'features', NOW()),
  -- Billing
  ('perm-p-billing',    'pages.billing',            'Billing',                 'pages', NOW()),
  ('perm-f-b-invoice',  'features.create_invoice',  'Create Invoice',          'features', NOW()),
  ('perm-f-b-val',      'features.validate_invoice','Validate Invoice',        'features', NOW()),
  ('perm-f-b-sync',     'features.sync_payments',   'Sync Payments',           'features', NOW()),
  ('perm-f-b-pay',      'features.confirm_payment', 'Confirm Payment',         'features', NOW())
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category";

-- 4. Grant ALL Permissions to MANAGER Role
-- ==============================================================================
INSERT INTO "RolePermission" ("id", "role", "permissionId", "granted", "createdAt", "updatedAt")
SELECT
  'rp-mgr-' || p."id",
  'MANAGER'::"UserRole",
  p."id",
  true,
  NOW(),
  NOW()
FROM "Permission" p
ON CONFLICT ("role", "permissionId") DO UPDATE SET
  "granted" = true,
  "updatedAt" = NOW();

-- 5. Grant ALL Explicit User Permissions to the Super Admin User
-- ==============================================================================
INSERT INTO "UserPermission" ("id", "userId", "permissionId", "granted", "createdAt", "updatedAt")
SELECT
  'up-admin-' || p."id",
  u."id",
  p."id",
  true,
  NOW(),
  NOW()
FROM "Permission" p
CROSS JOIN (SELECT "id" FROM "User" WHERE "email" = 'admin@captain-prospect.fr' LIMIT 1) u
ON CONFLICT ("userId", "permissionId") DO UPDATE SET
  "granted" = true,
  "updatedAt" = NOW();

-- ==============================================================================
-- Verification output
-- ==============================================================================
SELECT "id", "email", "name", "role", "isActive", "createdAt" FROM "User" WHERE "email" = 'admin@captain-prospect.fr';
