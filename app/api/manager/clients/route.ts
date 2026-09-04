import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOrganization, successResponse, withErrorHandler } from '@/lib/api-utils';

// ============================================
// GET /api/manager/clients
// Returns simple list of clients for dropdowns
// ============================================

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { organizationId } = await requireOrganization(request);

  const clients = await prisma.client.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  });

  return successResponse(clients);
});
