import Link from 'next/link'

export default function Tasks() {
  return (
    <div style={{padding:20}}>
      <h2>Tasks (MVP)</h2>
      <p>List of active tasks will appear here.</p>
      <Link href="/">Back</Link>
    </div>
  )
}
