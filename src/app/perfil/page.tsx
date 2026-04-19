import dynamic from 'next/dynamic'

const ProfileClient = dynamic(() => import('./ProfileClient'))

export const metadata = { title: 'Mi Perfil — Attick & Keller' }

export default function ProfilePage() {
  return <ProfileClient />
}