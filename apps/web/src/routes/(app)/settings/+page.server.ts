import { error } from '@sveltejs/kit';
import { serverApi } from '#lib/server/api.js';
import type { Me, PropertyRow } from '#lib/types.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const meResult = await serverApi<{ data: Me }>(event, '/api/me');
  if (!meResult.ok)
    error(meResult.status || 500, meResult.error?.message ?? 'Gagal memuat pengaturan.');

  const me = meResult.data!.data;
  const canReadMembers = me.membership.role === 'owner' || me.membership.role === 'admin';

  const [members, properties] = await Promise.all([
    canReadMembers
      ? serverApi<{
          data: Array<{
            id: string;
            userId: string;
            name: string;
            email: string;
            role: string;
            status: string;
            propertyIds: string[];
            createdAt: string;
          }>;
        }>(event, '/api/members')
      : Promise.resolve(null),
    serverApi<{ data: PropertyRow[] }>(event, '/api/properties?pageSize=100'),
  ]);

  return {
    me,
    members: members?.ok ? members.data!.data : [],
    properties: properties.ok ? properties.data!.data : [],
  };
};
