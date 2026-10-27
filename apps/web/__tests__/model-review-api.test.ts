// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ asset: {} as Record<string, unknown>, rpc: vi.fn(), role: 'admin' }));
vi.mock('@/lib/authz', () => ({ getAuthorizedUser: vi.fn(async () => ({
 user: {id:'admin'}, reason: state.role === 'admin' ? null : 'Forbidden',
 supabase: {from: () => ({select: () => ({eq: () => ({single: async () => ({data:state.asset,error:null})})})}), rpc:state.rpc}
})) }));
import { PATCH } from '../app/api/admin/models/route';
const request = () => new Request('http://localhost/api/admin/models',{method:'PATCH',body:JSON.stringify({id:'11111111-1111-4111-8111-111111111111',action:'publish'})});
beforeEach(()=>{state.role='admin';state.rpc.mockReset().mockResolvedValue({data:{ok:true},error:null});});
it('blocks unreviewed generated models and legacy reports',async()=>{
 for(const quality_report of [null,{confidenceScore:.94},{reportVersion:4,engine:'pixal3d',glbValid:true,publicationBlocked:true}]) {
  state.asset={origin:'generated',quality_report};
  expect((await PATCH(request())).status).toBe(409);
 }
 expect(state.rpc).not.toHaveBeenCalled();
});
it('allows an admin to publish a structurally valid Pixal3D result after review',async()=>{
 state.asset={origin:'generated',quality_report:{reportVersion:4,engine:'pixal3d',glbValid:true,publicationBlocked:false}};
 expect((await PATCH(request())).status).toBe(200);
 expect(state.rpc).toHaveBeenCalledWith('manage_product_model',expect.objectContaining({p_action:'publish'}));
});
it('preserves deliberate admin publication of manually corrected GLBs',async()=>{
 state.asset={origin:'admin'};
 expect((await PATCH(request())).status).toBe(200);
 expect(state.rpc).toHaveBeenCalledWith('manage_product_model',expect.objectContaining({p_action:'publish'}));
});
it('does not allow seller to approve',async()=>{
 state.role='seller';state.asset={origin:'admin'};
 expect((await PATCH(request())).status).toBe(403);
 expect(state.rpc).not.toHaveBeenCalled();
});
