import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const allPermissions = [
  'view_dashboard',
  'create_content',
  'create_video',
  'register_affiliate',
  'view_affiliate_stats',
  'create_campaign',
  'view_own_campaigns',
  'create_team',
  'view_own_teams',
  'create_workflow',
  'view_own_workflows',
  'request_withdraw',
  'manage_users',
  'manage_subscriptions',
  'manage_ai_providers',
  'manage_campaigns',
  'view_audit_logs',
  'approve_content',
  'view_assigned_tasks',
];

const permissionsMap: Record<string, string[]> = {
  'Super Admin': allPermissions,
  Admin: allPermissions.filter(p => p !== 'manage_ai_providers'),
  'Content Creator': [
    'view_dashboard',
    'create_content',
    'create_video',
    'register_affiliate',
    'view_affiliate_stats',
    'create_team',
    'view_own_teams',
    'create_workflow',
    'view_own_workflows',
    'request_withdraw',
  ],
  Advertiser: ['view_dashboard', 'create_campaign', 'view_own_campaigns', 'create_team', 'view_own_teams'],
  'Team Leader': [
    'view_dashboard',
    'create_content',
    'create_video',
    'create_team',
    'view_own_teams',
    'approve_content',
  ],
  'Team Member': ['view_dashboard', 'view_assigned_tasks'],
  'Affiliate Partner': [
    'view_dashboard',
    'register_affiliate',
    'view_affiliate_stats',
    'request_withdraw',
  ],
};

const roles = Object.keys(permissionsMap);

async function main() {
  for (const perm of allPermissions) {
    await prisma.permission.upsert({
      where: { name: perm },
      update: {},
      create: { name: perm },
    });
  }

  for (const roleName of roles) {
    const permObjs = await prisma.permission.findMany({
      where: { name: { in: permissionsMap[roleName] } },
    });
    await prisma.role.upsert({
      where: { name: roleName },
      update: { permissions: { set: permObjs.map(p => ({ id: p.id })) } },
      create: {
        name: roleName,
        permissions: { connect: permObjs.map(p => ({ id: p.id })) },
      },
    });
  }

  const providerDefs = [
    { name: 'Mock Text Provider', type: 'text' },
    { name: 'Mock Image Provider', type: 'image' },
    { name: 'Mock Video Provider', type: 'video' },
  ];
  for (const def of providerDefs) {
    const existing = await prisma.aIProvider.findFirst({ where: { name: def.name } });
    if (!existing) {
      await prisma.aIProvider.create({ data: { name: def.name, type: def.type, config: {} } });
      console.log(`AI provider created: ${def.name}`);
    }
  }

  const adminEmail = 'admin@cpai.com';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const hash = await bcrypt.hash('admin123', 12);
    const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Super Admin' } });
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hash,
        role: { connect: { id: superAdminRole.id } },
        wallet: { create: {} },
      },
    });
    console.log('Super Admin user created (admin@cpai.com / admin123)');
  } else {
    console.log('Super Admin user already exists');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
