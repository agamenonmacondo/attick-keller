import dynamic from 'next/dynamic'

const AdminClient = dynamic(() => import('./AdminClient'))

export const metadata = { title: 'Admin — Attick & Keller' }

export default function AdminPage() {
  return <AdminClient />
}