const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ALL_PERMISSIONS = [
  // Pages
  { code: 'pages.dashboard', name: 'Dashboard', category: 'pages' },
  { code: 'pages.clients', name: 'Clients', category: 'pages' },
  { code: 'pages.missions', name: 'Missions', category: 'pages' },
  { code: 'pages.campaigns', name: 'Campaigns', category: 'pages' },
  { code: 'pages.lists', name: 'Lists', category: 'pages' },
  { code: 'pages.analytics', name: 'Analytics', category: 'pages' },
  { code: 'pages.planning', name: 'Planning', category: 'pages' },
  { code: 'pages.files', name: 'Files', category: 'pages' },
  { code: 'pages.users', name: 'Users', category: 'pages' },
  { code: 'pages.sdrs', name: 'SDRs', category: 'pages' },
  { code: 'pages.projects', name: 'Projects', category: 'pages' },
  { code: 'pages.action', name: 'Action', category: 'pages' },
  { code: 'pages.opportunities', name: 'Opportunities', category: 'pages' },
  { code: 'pages.settings', name: 'Settings', category: 'pages' },
  { code: 'pages.portfolio', name: 'Portfolio', category: 'pages' },
  { code: 'pages.onboarding', name: 'Onboarding', category: 'pages' },
  // Email Hub Pages
  { code: 'pages.email', name: 'Email Hub', category: 'pages' },
  { code: 'pages.email_inbox', name: 'Email Inbox', category: 'pages' },
  { code: 'pages.email_team', name: 'Email Team', category: 'pages' },
  { code: 'pages.email_sequences', name: 'Email Sequences', category: 'pages' },
  { code: 'pages.email_mailboxes', name: 'Email Mailboxes', category: 'pages' },
  { code: 'pages.email_analytics', name: 'Email Analytics', category: 'pages' },
  // Features - Mission
  { code: 'features.create_mission', name: 'Create Mission', category: 'features' },
  { code: 'features.edit_mission', name: 'Edit Mission', category: 'features' },
  { code: 'features.delete_mission', name: 'Delete Mission', category: 'features' },
  { code: 'features.assign_sdr', name: 'Assign SDR', category: 'features' },
  // Features - List
  { code: 'features.create_list', name: 'Create List', category: 'features' },
  { code: 'features.edit_list', name: 'Edit List', category: 'features' },
  { code: 'features.delete_list', name: 'Delete List', category: 'features' },
  { code: 'features.import_lists', name: 'Import Lists', category: 'features' },
  { code: 'features.export_data', name: 'Export Data', category: 'features' },
  // Features - Campaign
  { code: 'features.create_campaign', name: 'Create Campaign', category: 'features' },
  { code: 'features.edit_campaign', name: 'Edit Campaign', category: 'features' },
  { code: 'features.delete_campaign', name: 'Delete Campaign', category: 'features' },
  // Features - Client
  { code: 'features.create_client', name: 'Create Client', category: 'features' },
  { code: 'features.edit_client', name: 'Edit Client', category: 'features' },
  { code: 'features.delete_client', name: 'Delete Client', category: 'features' },
  // Features - User
  { code: 'features.create_user', name: 'Create User', category: 'features' },
  { code: 'features.edit_user', name: 'Edit User', category: 'features' },
  { code: 'features.delete_user', name: 'Delete User', category: 'features' },
  { code: 'features.manage_permissions', name: 'Manage Permissions', category: 'features' },
  { code: 'features.ban_user', name: 'Ban User', category: 'features' },
  // Features - Files
  { code: 'features.upload_files', name: 'Upload Files', category: 'features' },
  { code: 'features.delete_files', name: 'Delete Files', category: 'features' },
  { code: 'features.manage_folders', name: 'Manage Folders', category: 'features' },
  // Features - Email Hub
  { code: 'features.connect_mailbox', name: 'Connect Mailbox', category: 'features' },
  { code: 'features.manage_mailboxes', name: 'Manage Mailboxes', category: 'features' },
  { code: 'features.send_email', name: 'Send Email', category: 'features' },
  { code: 'features.send_as', name: 'Send As', category: 'features' },
  { code: 'features.create_sequence', name: 'Create Sequence', category: 'features' },
  { code: 'features.edit_sequence', name: 'Edit Sequence', category: 'features' },
  { code: 'features.delete_sequence', name: 'Delete Sequence', category: 'features' },
  { code: 'features.enroll_contacts', name: 'Enroll Contacts', category: 'features' },
  { code: 'features.view_email_analytics', name: 'View Email Analytics', category: 'features' },
  { code: 'features.manage_team_inbox', name: 'Manage Team Inbox', category: 'features' },
  // Actions
  { code: 'actions.make_calls', name: 'Make Calls', category: 'actions' },
  { code: 'actions.send_emails', name: 'Send Emails', category: 'actions' },
  { code: 'actions.send_linkedin', name: 'Send LinkedIn', category: 'actions' },
  { code: 'actions.book_meetings', name: 'Book Meetings', category: 'actions' },
  { code: 'actions.create_opportunity', name: 'Create Opportunity', category: 'actions' },
  { code: 'actions.edit_contacts', name: 'Edit Contacts', category: 'actions' },
  // Internal Communication
  { code: 'pages.comms', name: 'Communications', category: 'pages' },
  { code: 'pages.comms_inbox', name: 'Comms Inbox', category: 'pages' },
  { code: 'pages.comms_threads', name: 'Comms Threads', category: 'pages' },
  { code: 'pages.comms_groups', name: 'Comms Groups', category: 'pages' },
  { code: 'pages.comms_broadcasts', name: 'Comms Broadcasts', category: 'pages' },
  { code: 'features.comms_create_thread', name: 'Create Comms Thread', category: 'features' },
  { code: 'features.comms_create_group', name: 'Create Comms Group', category: 'features' },
  { code: 'features.comms_create_broadcast', name: 'Create Broadcast', category: 'features' },
  { code: 'features.comms_resolve_thread', name: 'Resolve Comms Thread', category: 'features' },
  { code: 'features.comms_delete_message', name: 'Delete Comms Message', category: 'features' },
  { code: 'features.comms_manage_groups', name: 'Manage Comms Groups', category: 'features' },
  // Billing
  { code: 'pages.billing', name: 'Billing', category: 'pages' },
  { code: 'features.create_invoice', name: 'Create Invoice', category: 'features' },
  { code: 'features.validate_invoice', name: 'Validate Invoice', category: 'features' },
  { code: 'features.sync_payments', name: 'Sync Payments', category: 'features' },
  { code: 'features.confirm_payment', name: 'Confirm Payment', category: 'features' },
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@captain-prospect.fr';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin12345@';
  const adminName = process.env.ADMIN_NAME || 'Super Administrator';

  console.log(`Starting Admin user creation for: ${adminEmail}`);

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // 1. Upsert Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase().trim() },
    update: {
      password: hashedPassword,
      name: adminName,
      role: 'MANAGER',
      isActive: true,
    },
    create: {
      email: adminEmail.toLowerCase().trim(),
      password: hashedPassword,
      name: adminName,
      role: 'MANAGER',
      isActive: true,
    },
  });

  console.log(` Admin User created/updated with ID: ${adminUser.id} and Role: ${adminUser.role}`);

  // 2. Upsert Master Password SystemConfig
  await prisma.systemConfig.upsert({
    where: { key: 'masterPasswordHash' },
    update: { value: hashedPassword },
    create: {
      key: 'masterPasswordHash',
      value: hashedPassword,
    },
  });
  console.log(` Master password configuration updated.`);

  // 3. Seed Permissions & Grant to Admin and MANAGER role
  console.log(`Seeding ${ALL_PERMISSIONS.length} permissions...`);
  for (const perm of ALL_PERMISSIONS) {
    const createdPerm = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, category: perm.category },
      create: { code: perm.code, name: perm.name, category: perm.category },
    });

    // Grant Role Permission to MANAGER
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role: 'MANAGER',
          permissionId: createdPerm.id,
        },
      },
      update: { granted: true },
      create: {
        role: 'MANAGER',
        permissionId: createdPerm.id,
        granted: true,
      },
    });

    // Grant User Permission Override explicitly to this Admin User
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId: adminUser.id,
          permissionId: createdPerm.id,
        },
      },
      update: { granted: true },
      create: {
        userId: adminUser.id,
        permissionId: createdPerm.id,
        granted: true,
      },
    });
  }

  console.log(` All permissions successfully granted to admin user and MANAGER role.`);
  console.log('\n=============================================');
  console.log(' ADMIN ACCOUNT CREDENTIALS');
  console.log('=============================================');
  console.log(` Email:    ${adminEmail}`);
  console.log(` Password: ${adminPassword}`);
  console.log(` Role:     ${adminUser.role}`);
  console.log(` Status:   Active`);
  console.log('=============================================\n');
}

main()
  .catch((e) => {
    console.error('Error creating admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
