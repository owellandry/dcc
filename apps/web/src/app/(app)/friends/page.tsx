import { redirect } from 'next/navigation'

export default function FriendsPageAlias() {
  redirect('/channels/@me')
}
