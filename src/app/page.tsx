import OrderManagement from '../components/OrderManagement'

export default function Home() {
  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>注文管理システム</h1>
      <OrderManagement />
    </main>
  )
}
