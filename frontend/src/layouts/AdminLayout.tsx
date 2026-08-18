import { useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';
import AdminHeader from '../components/admin/AdminHeader';
import AdminSidebar from '../components/admin/AdminSidebar';
export default function AdminLayout({children}:{children:ReactNode}){const{user,logout}=useAuth();const[open,setOpen]=useState(false);return <div className="min-h-screen bg-[#f6f7fb] lg:grid lg:grid-cols-[272px_1fr]"><AdminSidebar user={user} open={open} onClose={()=>setOpen(false)}/><div className="min-w-0 lg:col-start-2"><AdminHeader user={user} onMenu={()=>setOpen(true)} logout={logout}/><main className="p-4 pb-14 sm:p-6 xl:p-8">{children}</main></div></div>}
