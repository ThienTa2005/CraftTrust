import Link from "next/link";
import { AlertTriangle, Boxes, FileCheck2, ShoppingBasket } from "lucide-react";
import { getAuthorizedUser } from "@/lib/authz";
import { formatVnd } from "@/lib/data";

export default async function SellerPage() {
  const auth=await getAuthorizedUser(["artisan","seller","admin"]);
  if(auth.reason) return <section className="shell page-hero"><span className="eyebrow">Seller studio</span><h1>Protected workspace</h1><div className="error-banner">{auth.reason}</div><Link className="button" href="/auth" style={{marginTop:20}}>Sign in</Link></section>;
  const {data:products,error}=await auth.supabase!.from("products").select("id,name,status,price_vnd,stock_quantity,passport_records(tier,status)").order("created_at",{ascending:false});
  const active=(products??[]).filter((p:any)=>p.status==="active"); const low=active.filter((p:any)=>p.stock_quantity<5);
  return <section className="shell page-hero"><div className="section-head"><div><span className="eyebrow">Seller studio</span><h1>Inventory and trust</h1></div><span className="badge">{auth.roles.join(" · ")}</span></div><div className="dashboard-grid"><aside className="sidebar"><a>Overview</a><a>Products</a><a>Evidence</a><a>Orders</a></aside><div>{error?<div className="error-banner">{error.message}</div>:<><div className="metric-grid"><div className="metric"><Boxes/><strong>{active.length}</strong><span>Active products</span></div><div className="metric"><AlertTriangle/><strong>{low.length}</strong><span>Low-stock products</span></div><div className="metric"><FileCheck2/><strong>{(products??[]).filter((p:any)=>p.passport_records?.length).length}</strong><span>Passport records</span></div></div><div className="panel"><div className="card-bottom"><h3>Product inventory</h3><ShoppingBasket/></div>{products?.length?<table className="table"><thead><tr><th>Product</th><th>Status</th><th>Stock</th><th>Price</th><th>Passport</th></tr></thead><tbody>{products.map((p:any)=><tr key={p.id}><td>{p.name}</td><td>{p.status}</td><td>{p.stock_quantity}</td><td>{formatVnd(p.price_vnd)}</td><td>{p.passport_records?.[0]?.tier??"pending"}</td></tr>)}</tbody></table>:<div className="empty">No products assigned to this seller. RLS limits this view to owned artisan records.</div>}</div></>}</div></div></section>;
}
