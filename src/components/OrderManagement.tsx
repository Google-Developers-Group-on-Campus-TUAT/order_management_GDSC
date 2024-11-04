'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import './OrderManagement.css'

// 型定義
interface OrderItem {
  id: number
  item: 'リンゴ' | 'バナナ'
  price: number
  ticketNumber: number
}

const TICKET_COUNT = 50 // 札の総数

export default function OrderManagement() {
  // Stateの型定義
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [tempOrderItems, setTempOrderItems] = useState<OrderItem[]>([])
  const [tempTotal, setTempTotal] = useState<number>(0)
  const [nextTicketNumber, setNextTicketNumber] = useState<number>(1)
  const [showOrderSection, setShowOrderSection] = useState<boolean>(true)
  const [showKitchenSection, setShowKitchenSection] = useState<boolean>(true)
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)
  const [confirmingItemId, setConfirmingItemId] = useState<number | null>(null)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const getCardClassName = () => {
    if (showOrderSection && showKitchenSection) {
      return 'card'
    } else {
      return 'card full-width'
    }
  }

  // Supabaseから注文を取得する関数
  const fetchOrdersFromDatabase = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: true })
  
    if (error) {
      console.error('注文の取得に失敗しました:', error.message)
      return []
    }
  
    return data.map((order: any) => ({
      id: order.id,
      item: order.item,
      price: order.price,
      ticketNumber: order.ticket_number
    }))
  }
  
  useEffect(() => {
    // 初期注文の読み込み
    const loadInitialOrders = async () => {
      const orders = await fetchOrdersFromDatabase()
      if (orders) {
        setOrderItems(orders)
      }
    }
    loadInitialOrders()

    // リアルタイムリスナーの設定
    const channel = supabase
      .channel('orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
        const updatedOrders = await fetchOrdersFromDatabase()
        if (updatedOrders) {
          setOrderItems(updatedOrders)
        }
      })
      .subscribe()

    // クリーンアップ関数
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Supabaseへのデータ追加関数
  const addOrderToDatabase = async (orderItems: OrderItem[]) => {
    const { data, error } = await supabase
      .from('orders')
      .insert(orderItems.map(orderItem => ({
        item: orderItem.item,
        price: orderItem.price,
        ticket_number: orderItem.ticketNumber,
        status: 'pending'
      })))

    if (error) {
      console.error('注文の追加に失敗しました:', error.message)
    }
  }

  // Supabaseからのデータ削除関数
  const removeOrderFromDatabase = async (id: number) => {
    const { data, error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('注文の削除に失敗しました:', error.message)
    }
  }

  // 一時的に注文を追加する関数
  const addTempItem = (item: 'リンゴ' | 'バナナ', price: number) => {
    const ticketNumber = nextTicketNumber
    const newItem: OrderItem = { id: Date.now(), item, price, ticketNumber }
    setTempOrderItems([...tempOrderItems, newItem])
    setNextTicketNumber(prev => (prev % TICKET_COUNT) + 1)
  }

  // 注文を確定する関数
  const confirmOrder = async () => {
    await addOrderToDatabase(tempOrderItems)
    const updatedOrders = await fetchOrdersFromDatabase()
    setOrderItems(updatedOrders)
    setTempOrderItems([])
  }

  // アイテムを削除する関数
  const removeItem = async (id: number) => {
    await removeOrderFromDatabase(id)
    const updatedOrders = await fetchOrdersFromDatabase()
    setOrderItems(updatedOrders)
    setConfirmingItemId(null)
  }

  // 仮の注文をクリアする関数
  const clearTempOrder = () => {
    setTempOrderItems([])
  }

  // 仮の合計を計算する副作用
  useEffect(() => {
    const newTempTotal = tempOrderItems.reduce((sum, item) => sum + item.price, 0)
    setTempTotal(newTempTotal)
  }, [tempOrderItems])

  // 注文入力セクションのコンポーネント
  const OrderSection = () => (
    <div className={getCardClassName()}>
      <div className="card-header">
        <h2 className="card-title">注文入力</h2>
      </div>
      <div className="card-content">
        <div className="button-group">
          <button onClick={() => addTempItem('リンゴ', 350)} className='apple'>リンゴ ¥350</button>
          <button onClick={() => addTempItem('バナナ', 200)} className='banana'>バナナ ¥200</button>
        </div>
        <div className="item-list">
          {tempOrderItems.map((item) => (
            <div key={item.id} className="item">
              <span>
                {item.item} #{item.ticketNumber}
              </span>
              <span>¥{item.price}</span>
            </div>
          ))}
        </div>
        <div className="total">
          <span>仮合計</span>
          <span>¥{tempTotal}</span>
        </div>
        <button 
          className="confirm-button" 
          onClick={confirmOrder} 
          disabled={tempOrderItems.length === 0}
        >
          注文を確定
        </button>
        <button 
          className="clear-button" 
          onClick={clearTempOrder}
        >
          注文をクリア
        </button>
      </div>
    </div>
  )

  // 調理状況セクションのコンポーネント
  const KitchenSection = () => (
    <div className={getCardClassName()} onClick={() => setConfirmingItemId(null)}>
      <div className="card-header">
        <h2 className="card-title">調理状況</h2>
      </div>
      <div className="kitchen-total">
          <span>調理中: {orderItems.length}</span>
      </div>
      <div className="card-content">
        {orderItems.map((item) => (
          <div
            key={item.id}
            className={`kitchen-item ${item.item === 'リンゴ' ? 'apple' : 'banana'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <span>
              {item.item} #{item.ticketNumber}
            </span>
            <div>
              {confirmingItemId === item.id ? (
                <button className="confirm-serve-button" onClick={() => removeItem(item.id)}>
                  渡す
                </button>
              ) : (
                <button className="serve-button" onClick={() => setConfirmingItemId(item.id)}>
                  完成
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="order-management">      
      <button onClick={toggleMenu} className='hamburger-menu'>
        ☰
      </button>
      {isMenuOpen && (
         <div className="menu-items">
          <button onClick={() => setShowOrderSection(!showOrderSection)} >
            {showOrderSection ? '注文入力を非表示' : '注文入力を表示'}
          </button>
          <button onClick={() => setShowKitchenSection(!showKitchenSection)} >
            {showKitchenSection ? '調理状況を非表示' : '調理状況を表示'}
          </button>
        </div>
      )}

      {showOrderSection && <OrderSection />}
      {showKitchenSection && <KitchenSection />}
    </div>
  )
}
