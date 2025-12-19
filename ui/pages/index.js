import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Task-Master - MVP</title>
      </Head>

      <main className={styles.main}>
        <h1>Task-Master UI (MVP)</h1>
        <p>Dashboard placeholder — connect to MCP server for tasks.</p>
        <Link href="/tasks">Go to Tasks</Link>
      </main>
    </div>
  )
}
