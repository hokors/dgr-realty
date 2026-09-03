import { NextResponse } from 'next/server';
import { authorizeAdminMutation } from '@/lib/admin/property-mutations';
import { databaseErrorCode, readJsonBody, RequestBodyError, securityLog } from '@/lib/security/request';
import { inquiryStatusSchema, uuidSchema } from '@/lib/security/validation';

export const runtime = 'nodejs';

type RouteProps = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteProps) {
  const authorization = await authorizeAdminMutation(request, 'inquiry-update', 60, 10 * 60);
  if (!authorization.ok) return authorization.response;
  const { context, requestId } = authorization;
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) return NextResponse.json({ error: 'Invalid inquiry identifier.' }, { status: 400 });

  let untrustedBody: unknown;
  try {
    untrustedBody = await readJsonBody(request, 2 * 1024);
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestBodyError ? error.message : 'Invalid inquiry update request.' }, {
      status: error instanceof RequestBodyError ? error.status : 400,
    });
  }
  const parsed = inquiryStatusSchema.safeParse(untrustedBody);
  if (!parsed.success) {
    securityLog('admin_input_rejected', { requestId, route: '/api/admin/inquiries/[id]', reason: 'schema_validation' });
    return NextResponse.json({ error: 'Invalid inquiry status.' }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from('inquiries')
    .update({ status: parsed.data.status })
    .eq('id', id)
    .select('id, status')
    .maybeSingle();
  if (error) {
    securityLog('admin_inquiry_update_failed', {
      requestId,
      route: '/api/admin/inquiries/[id]',
      reason: 'database_update',
      errorCode: databaseErrorCode(error),
    });
    return NextResponse.json({ error: 'Unable to update the inquiry.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Inquiry not found.' }, { status: 404 });
  return NextResponse.json({ success: true, inquiry: data }, { headers: { 'Cache-Control': 'no-store' } });
}

