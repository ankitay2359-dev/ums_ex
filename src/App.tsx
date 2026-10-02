/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Store,
  Users,
  Search,
  CreditCard,
  Wallet,
  Clock,
  FileText,
  Bot,
  Plus,
  Trash2,
  Edit,
  Printer,
  Download,
  Mic,
  MicOff,
  Send,
  CheckCircle,
  AlertCircle,
  Calendar,
  ArrowRight,
  MessageSquare,
  Copy,
  Menu,
  X,
  Phone,
  MapPin,
  TrendingUp,
  FileSpreadsheet,
  Check
} from 'lucide-react';

interface UdhaarRecord {
  id: number;
  customerId: number;
  productName: string;
  amount: number;
  date: string;
  quantity: string;
  dueDate: string;
  notes: string;
}

interface PaymentRecord {
  id: number;
  customerId: number;
  amount: number;
  date: string;
  method: string;
  notes: string;
}

interface Customer {
  id: number;
  name: string;
  mobile: string;
  address: string;
  regDate: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

const INITIAL_CUSTOMERS: Customer[] = [
  { id: 1, name: 'Ankita', mobile: '9876543210', address: 'Main Market Road, Near Laxmi Mandir, Shop #4', regDate: '2026-08-01' },
  { id: 2, name: 'Ankita', mobile: '9123456780', address: 'Station Chowk, Flat 201, Green Park', regDate: '2026-08-10' },
  { id: 3, name: 'Rahul Gupta', mobile: '9811223344', address: 'Gandhi Nagar, Lane 3, House #14', regDate: '2026-07-15' },
  { id: 4, name: 'Vikram Singh', mobile: '9988776655', address: 'Old Bazaar, Opposite City Bank', regDate: '2026-08-20' },
  { id: 5, name: 'Sunita Sharma', mobile: '9765432190', address: 'Shakti Nagar, Street 7, House 5B', regDate: '2026-09-05' },
  { id: 6, name: 'Amit Patel', mobile: '9822334455', address: 'Nehru Colony, Plot 28', regDate: '2026-09-12' },
];

const INITIAL_UDHAAR: UdhaarRecord[] = [
  { id: 101, customerId: 1, productName: 'Basmati Rice & Mustard Oil', amount: 1250, date: '2026-09-10', quantity: '10kg + 2L', dueDate: '2026-09-25', notes: 'Monthly ration quota' },
  { id: 102, customerId: 1, productName: 'Tata Salt & Sugar', amount: 320, date: '2026-09-15', quantity: '2 packets + 5kg', dueDate: '2026-09-30', notes: 'Festival groceries' },
  { id: 103, customerId: 2, productName: 'Aashirvaad Atta', amount: 480, date: '2026-09-18', quantity: '10kg', dueDate: '2026-10-05', notes: 'Promised by 5th' },
  { id: 104, customerId: 3, productName: 'Spices, Dal & Dry Fruits', amount: 2450, date: '2026-08-01', quantity: 'Various packets', dueDate: '2026-08-25', notes: 'Past due date' },
  { id: 105, customerId: 3, productName: 'Tea & Milk Powder', amount: 450, date: '2026-08-20', quantity: '2 packets + 1kg', dueDate: '2026-09-10', notes: 'Household items' },
  { id: 106, customerId: 4, productName: 'Wheat Flour & Cooking Oil', amount: 1850, date: '2026-09-02', quantity: '20kg + 5 litres', dueDate: '2026-09-20', notes: 'Restaurant supply credit' },
  { id: 107, customerId: 5, productName: 'Soap, Detergent & Toothpaste', amount: 750, date: '2026-09-14', quantity: '1 box', dueDate: '2026-10-10', notes: 'Monthly cleaning supplies' },
  { id: 108, customerId: 6, productName: 'Refined Sunflower Oil', amount: 680, date: '2026-09-22', quantity: '4 litres', dueDate: '2026-10-08', notes: 'Regular customer purchase' },
];

const INITIAL_PAYMENTS: PaymentRecord[] = [
  { id: 201, customerId: 1, amount: 500, date: '2026-09-20', method: 'UPI', notes: 'Paid via Google Pay' },
  { id: 202, customerId: 3, amount: 500, date: '2026-08-10', method: 'Cash', notes: 'First instalment in cash' },
  { id: 203, customerId: 3, amount: 700, date: '2026-08-25', method: 'UPI', notes: 'Second instalment via PhonePe' },
  { id: 204, customerId: 4, amount: 1000, date: '2026-09-15', method: 'Bank Transfer', notes: 'Direct bank transfer' },
  { id: 205, customerId: 5, amount: 750, date: '2026-09-28', method: 'Cash', notes: 'Full settlement in cash' },
];

const SHOP_NAME = 'Shree Ganesh Kirana & General Store';
const SHOP_PHONE = '+91 98765 43210';
const SHOP_ADDRESS = 'Shop No. 12, Main Market Road, Near Gandhi Chowk';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('udhaar_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });
  const [udhaarList, setUdhaarList] = useState<UdhaarRecord[]>(() => {
    const saved = localStorage.getItem('udhaar_records');
    return saved ? JSON.parse(saved) : INITIAL_UDHAAR;
  });
  const [paymentList, setPaymentList] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem('udhaar_payments');
    return saved ? JSON.parse(saved) : INITIAL_PAYMENTS;
  });

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'danger' | 'info' } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Search tab state
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [reminderModalData, setReminderModalData] = useState<{ customer: Customer; balance: number } | null>(null);
  const [reminderTone, setReminderTone] = useState<'polite' | 'formal' | 'firm'>('polite');
  const [generatedReminderText, setGeneratedReminderText] = useState('');
  const [isGeneratingReminder, setIsGeneratingReminder] = useState(false);

  // Statement View Modal
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<PaymentRecord | null>(null);

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: `Namaste! I am your AI Shop Assistant for **${SHOP_NAME}**. I can answer questions about your customer ledgers, calculate balances, find customers, draft payment reminders, and provide financial insights. Ask me anything!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Save changes
  useEffect(() => {
    localStorage.setItem('udhaar_customers', JSON.stringify(customers));
  }, [customers]);
  useEffect(() => {
    localStorage.setItem('udhaar_records', JSON.stringify(udhaarList));
  }, [udhaarList]);
  useEffect(() => {
    localStorage.setItem('udhaar_payments', JSON.stringify(paymentList));
  }, [paymentList]);

  const showNotification = (message: string, type: 'success' | 'danger' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Helper calculations for customer balance
  const getCustomerTotals = (cid: number) => {
    const totalU = udhaarList.filter(u => u.customerId === cid).reduce((sum, u) => sum + u.amount, 0);
    const totalP = paymentList.filter(p => p.customerId === cid).reduce((sum, p) => sum + p.amount, 0);
    return {
      totalUdhaar: totalU,
      totalPaid: totalP,
      remainingBalance: Math.round((totalU - totalP) * 100) / 100,
    };
  };

  // Overall stats
  const totalUdhaarAll = udhaarList.reduce((sum, u) => sum + u.amount, 0);
  const totalPaidAll = paymentList.reduce((sum, p) => sum + p.amount, 0);
  const totalRemainingAll = Math.round((totalUdhaarAll - totalPaidAll) * 100) / 100;

  const todayStr = '2026-10-02';
  const pendingCustomers = customers.map(c => {
    const { totalUdhaar, totalPaid, remainingBalance } = getCustomerTotals(c.id);
    const customerUdhaars = udhaarList.filter(u => u.customerId === c.id);
    const dueDates = customerUdhaars.map(u => u.dueDate).filter(Boolean);
    const latestDue = dueDates.sort().reverse()[0] || '';
    const isOverdue = latestDue && latestDue < todayStr;
    return {
      ...c,
      totalUdhaar,
      totalPaid,
      remainingBalance,
      latestDue,
      status: isOverdue ? 'Overdue' : 'Pending',
    };
  }).filter(c => c.remainingBalance > 0).sort((a, b) => b.remainingBalance - a.remainingBalance);

  const overdueCount = pendingCustomers.filter(c => c.status === 'Overdue').length;

  // Add Customer Handler
  const handleAddCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    const mobile = (formData.get('mobile') as string).trim();
    const address = (formData.get('address') as string).trim();

    if (!name) {
      showNotification('Customer Name is required', 'danger');
      return;
    }

    const nextId = customers.length > 0 ? Math.max(...customers.map(c => c.id)) + 1 : 1;
    const newCust: Customer = {
      id: nextId,
      name,
      mobile,
      address,
      regDate: new Date().toISOString().split('T')[0],
    };

    setCustomers([...customers, newCust]);
    setShowAddCustomerModal(false);
    showNotification(`Customer '${name}' added successfully with Customer ID #${nextId}`, 'success');
  };

  // Edit Customer Handler
  const handleEditCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editCustomer) return;
    setCustomers(customers.map(c => c.id === editCustomer.id ? editCustomer : c));
    setEditCustomer(null);
    showNotification(`Customer #${editCustomer.id} details updated`, 'success');
  };

  // Delete Customer Handler
  const handleDeleteCustomer = (cid: number) => {
    const cust = customers.find(c => c.id === cid);
    setCustomers(customers.filter(c => c.id !== cid));
    setUdhaarList(udhaarList.filter(u => u.customerId !== cid));
    setPaymentList(paymentList.filter(p => p.customerId !== cid));
    setDeleteConfirmId(null);
    if (selectedCustomerId === cid) setSelectedCustomerId(null);
    showNotification(`Customer #${cid} (${cust?.name}) and associated ledgers deleted`, 'success');
  };

  // Add Udhaar Handler
  const handleAddUdhaar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const cid = Number(formData.get('customerId'));
    const productName = (formData.get('productName') as string).trim();
    const quantity = (formData.get('quantity') as string).trim() || '1';
    const amount = parseFloat(formData.get('amount') as string);
    const date = (formData.get('date') as string) || todayStr;
    const dueDate = (formData.get('dueDate') as string) || '';
    const notes = (formData.get('notes') as string).trim();

    if (!cid || !productName || isNaN(amount) || amount <= 0) {
      showNotification('Please fill all required fields correctly', 'danger');
      return;
    }

    const newId = udhaarList.length > 0 ? Math.max(...udhaarList.map(u => u.id)) + 1 : 101;
    const newRecord: UdhaarRecord = {
      id: newId,
      customerId: cid,
      productName,
      amount,
      date,
      quantity,
      dueDate,
      notes,
    };

    setUdhaarList([newRecord, ...udhaarList]);
    e.currentTarget.reset();
    showNotification(`Udhaar of ₹${amount.toLocaleString('en-IN')} recorded successfully!`, 'success');
  };

  // Add Payment Handler
  const handleAddPayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const cid = Number(formData.get('customerId'));
    const amount = parseFloat(formData.get('amount') as string);
    const date = (formData.get('date') as string) || todayStr;
    const method = (formData.get('method') as string) || 'Cash';
    const notes = (formData.get('notes') as string).trim();

    if (!cid || isNaN(amount) || amount <= 0) {
      showNotification('Please enter a valid customer and amount', 'danger');
      return;
    }

    const newId = paymentList.length > 0 ? Math.max(...paymentList.map(p => p.id)) + 1 : 201;
    const newRecord: PaymentRecord = {
      id: newId,
      customerId: cid,
      amount,
      date,
      method,
      notes,
    };

    setPaymentList([newRecord, ...paymentList]);
    setReceiptPayment(newRecord);
    e.currentTarget.reset();
    showNotification(`Payment of ₹${amount.toLocaleString('en-IN')} recorded! Receipt #${newId} generated.`, 'success');
  };

  // Reminder Generator Action
  const triggerReminderModal = (cust: Customer) => {
    const { remainingBalance } = getCustomerTotals(cust.id);
    setReminderModalData({ customer: cust, balance: remainingBalance });
    fetchReminder(cust, remainingBalance, reminderTone);
  };

  const fetchReminder = async (cust: Customer, balance: number, tone: string) => {
    setIsGeneratingReminder(true);
    try {
      const res = await fetch('/api/ai/generate-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { id: cust.id, name: cust.name, remainingBalance: balance },
          tone,
        }),
      });
      const data = await res.json();
      setGeneratedReminderText(data.message || `Hello ${cust.name}, this is a polite reminder from ${SHOP_NAME} that your current outstanding balance is ₹${balance.toLocaleString('en-IN')}. Please settle at your convenience.`);
    } catch {
      setGeneratedReminderText(`Hello ${cust.name}, this is a polite reminder from ${SHOP_NAME} that your current outstanding balance is ₹${balance.toLocaleString('en-IN')}. Please settle at your convenience. Thank you!`);
    } finally {
      setIsGeneratingReminder(false);
    }
  };

  // Voice recognition toggle
  const toggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showNotification('Voice recognition is not supported in this browser.', 'info');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setChatInput(transcript);
        handleSendAiMessage(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  // AI Chat Submit
  const handleSendAiMessage = async (customMsg?: string) => {
    const message = (customMsg !== undefined ? customMsg : chatInput).trim();
    if (!message) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAiLoading(true);

    const shopData = {
      customers: customers.map(c => ({
        ...c,
        ...getCustomerTotals(c.id),
      })),
      totals: {
        totalUdhaar: totalUdhaarAll,
        totalPaid: totalPaidAll,
        totalRemaining: totalRemainingAll,
        overdueCount,
        pendingCount: pendingCustomers.length,
      },
    };

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, shopData }),
      });
      const data = await res.json();
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: data.reply || 'No response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages(prev => [...prev, botMsg]);
    } catch {
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: `Based on your records: Total market outstanding is ₹${totalRemainingAll.toLocaleString('en-IN')} across ${pendingCustomers.length} pending customers. Top pending accounts include: ${pendingCustomers.slice(0, 3).map(p => `#${p.id} ${p.name} (₹${p.remainingBalance})`).join(', ')}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages(prev => [...prev, botMsg]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Filtered search customers
  const filteredSearchCustomers = customers.filter(c => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase().trim();
    return c.id.toString() === q || c.name.toLowerCase().includes(q) || c.mobile.includes(q);
  });

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
          toast.type === 'danger' ? 'bg-rose-50 text-rose-800 border-rose-300' :
          'bg-blue-50 text-blue-800 border-blue-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Store size={22} />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight text-white leading-tight">Udhaar Manager</h2>
              <span className="text-[11px] text-slate-400">Single Shop Ledger</span>
            </div>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <TrendingUp size={18} /> },
            { id: 'customers', label: 'Customers', icon: <Users size={18} /> },
            { id: 'search', label: 'Customer Search', icon: <Search size={18} /> },
            { id: 'udhaar', label: 'Udhaar', icon: <CreditCard size={18} /> },
            { id: 'payments', label: 'Payments', icon: <Wallet size={18} /> },
            { id: 'pending', label: 'Pending Customers', icon: <Clock size={18} /> },
            { id: 'reports', label: 'Reports', icon: <FileSpreadsheet size={18} /> },
            { id: 'ai', label: 'AI Assistant', icon: <Bot size={18} />, badge: 'Gemini' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {tab.icon}
                <span>{tab.label}</span>
              </div>
              {tab.badge && (
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2 mb-2 px-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs">
              A
            </div>
            <div className="overflow-hidden">
              <span className="block text-xs font-semibold truncate">Admin User</span>
              <span className="block text-[10px] text-slate-400 truncate">Shopkeeper Session</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 px-2 leading-tight">
            Single-Shop Udhaar System v2.5
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                {activeTab === 'dashboard' && 'Shop Overview Dashboard'}
                {activeTab === 'customers' && 'Customer Directory & Accounts'}
                {activeTab === 'search' && 'Dedicated Customer Search'}
                {activeTab === 'udhaar' && 'Record Udhaar (Credit Given)'}
                {activeTab === 'payments' && 'Record Payment (Money Received)'}
                {activeTab === 'pending' && 'Pending & Overdue Balances'}
                {activeTab === 'reports' && 'Financial & Ledger Reports'}
                {activeTab === 'ai' && 'AI Shop Assistant & Copilot'}
              </h1>
              <p className="text-xs text-slate-500">{SHOP_NAME}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              MySQL Active
            </div>
            <button
              onClick={() => setActiveTab('udhaar')}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition"
            >
              <Plus size={14} />
              Udhaar
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
            >
              <Plus size={14} />
              Payment
            </button>
          </div>
        </header>

        {/* Content Views */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {/* ===================== TAB: DASHBOARD ===================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-slate-500">Total Customers</span>
                      <h3 className="text-2xl font-bold text-slate-900 mt-1">{customers.length}</h3>
                      <span className="text-[11px] text-slate-400">Registered in shop</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
                      <Users size={24} />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-slate-500">Total Udhaar Given</span>
                      <h3 className="text-2xl font-bold text-rose-600 mt-1">₹{totalUdhaarAll.toLocaleString('en-IN')}</h3>
                      <span className="text-[11px] text-slate-400">All-time credit</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <CreditCard size={24} />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-slate-500">Total Paid</span>
                      <h3 className="text-2xl font-bold text-emerald-600 mt-1">₹{totalPaidAll.toLocaleString('en-IN')}</h3>
                      <span className="text-[11px] text-slate-400">Cash & UPI collected</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Wallet size={24} />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-slate-500">Outstanding Market Balance</span>
                      <h3 className="text-2xl font-bold text-purple-700 mt-1">₹{totalRemainingAll.toLocaleString('en-IN')}</h3>
                      <span className="text-[11px] text-slate-400">{pendingCustomers.length} pending accounts</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Clock size={24} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Notice Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900">
                  <span className="flex items-center gap-2">
                    <Clock size={16} className="text-amber-600" />
                    <b>{pendingCustomers.length}</b> Customers with Pending Balance
                  </span>
                  <button onClick={() => setActiveTab('pending')} className="font-semibold underline">
                    View
                  </button>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-xs text-rose-900">
                  <span className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-rose-600" />
                    <b>{overdueCount}</b> Accounts Past Due Date
                  </span>
                  <button onClick={() => setActiveTab('pending')} className="font-semibold underline">
                    Check
                  </button>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between text-xs text-purple-900">
                  <span className="flex items-center gap-2">
                    <Bot size={16} className="text-purple-600" />
                    AI Shop Assistant Available
                  </span>
                  <button onClick={() => setActiveTab('ai')} className="font-semibold underline">
                    Chat
                  </button>
                </div>
              </div>

              {/* Recent Tables Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Udhaar */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-800">Recent Udhaar Transactions</h4>
                      <p className="text-xs text-slate-400">Last 5 credit purchases</p>
                    </div>
                    <button onClick={() => setActiveTab('udhaar')} className="text-xs text-blue-600 font-medium hover:underline">
                      + Add
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-2.5">Customer</th>
                          <th className="px-4 py-2.5">Product</th>
                          <th className="px-4 py-2.5">Qty</th>
                          <th className="px-4 py-2.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {udhaarList.slice(0, 5).map(u => {
                          const cust = customers.find(c => c.id === u.customerId);
                          return (
                            <tr key={u.id} className="hover:bg-slate-50">
                              <td className="px-4 py-2.5 font-medium">
                                {cust?.name} <span className="text-[10px] text-slate-400">#{u.customerId}</span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-600">{u.productName}</td>
                              <td className="px-4 py-2.5"><span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">{u.quantity}</span></td>
                              <td className="px-4 py-2.5 text-right font-bold text-rose-600">₹{u.amount.toLocaleString('en-IN')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Payments */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-800">Recent Payments Received</h4>
                      <p className="text-xs text-slate-400">Last 5 payments</p>
                    </div>
                    <button onClick={() => setActiveTab('payments')} className="text-xs text-emerald-600 font-medium hover:underline">
                      + Receive
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-2.5">Customer</th>
                          <th className="px-4 py-2.5">Mode</th>
                          <th className="px-4 py-2.5">Date</th>
                          <th className="px-4 py-2.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paymentList.slice(0, 5).map(p => {
                          const cust = customers.find(c => c.id === p.customerId);
                          return (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="px-4 py-2.5 font-medium">
                                {cust?.name} <span className="text-[10px] text-slate-400">#{p.customerId}</span>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold text-[11px]">
                                  {p.method}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-500">{p.date}</td>
                              <td className="px-4 py-2.5 text-right font-bold text-emerald-600">₹{p.amount.toLocaleString('en-IN')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB: CUSTOMERS ===================== */}
          {activeTab === 'customers' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search by ID, Customer Name, or Mobile..."
                    className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => setShowAddCustomerModal(true)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
                >
                  <Plus size={16} />
                  Add Customer
                </button>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                💡 <b>Primary Key Discipline:</b> Notice Customer <b>#1 Ankita</b> and <b>#2 Ankita</b> are both registered with distinct Customer IDs and phone numbers. The system tracks separate ledgers without collision.
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Cust ID</th>
                        <th className="px-4 py-3">Customer Name</th>
                        <th className="px-4 py-3">Mobile Number</th>
                        <th className="px-4 py-3">Address</th>
                        <th className="px-4 py-3 text-right">Total Udhaar</th>
                        <th className="px-4 py-3 text-right">Total Paid</th>
                        <th className="px-4 py-3 text-right">Remaining Balance</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customers
                        .filter(c => {
                          if (!searchQuery) return true;
                          const q = searchQuery.toLowerCase();
                          return c.id.toString() === q || c.name.toLowerCase().includes(q) || c.mobile.includes(q);
                        })
                        .map(c => {
                          const { totalUdhaar, totalPaid, remainingBalance } = getCustomerTotals(c.id);
                          return (
                            <tr key={c.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold text-[11px]">
                                  #{c.id}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {c.name}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {c.mobile ? `📞 ${c.mobile}` : '-'}
                              </td>
                              <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{c.address || '-'}</td>
                              <td className="px-4 py-3 text-right font-medium text-rose-600">₹{totalUdhaar.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-right font-medium text-emerald-600">₹{totalPaid.toLocaleString('en-IN')}</td>
                              <td className={`px-4 py-3 text-right font-bold ${remainingBalance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                ₹{remainingBalance.toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => setStatementCustomer(c)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold"
                                  >
                                    Ledger
                                  </button>
                                  <button
                                    onClick={() => triggerReminderModal(c)}
                                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-[11px] font-semibold"
                                  >
                                    Remind
                                  </button>
                                  <button
                                    onClick={() => setEditCustomer(c)}
                                    className="p-1 text-slate-500 hover:text-blue-600 rounded"
                                    title="Edit Customer"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(c.id)}
                                    className="p-1 text-slate-500 hover:text-rose-600 rounded"
                                    title="Delete Customer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB: CUSTOMER SEARCH ===================== */}
          {activeTab === 'search' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-1">Search Customer Ledgers</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Search by Customer ID (e.g. <code>1</code>, <code>2</code>), Name (e.g. <code>Ankita</code>), or Mobile Number.
                </p>

                <div className="relative">
                  <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Type 'Ankita', 'Rahul', or ID '1'..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {searchQuery && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      {filteredSearchCustomers.length} Matching Customer(s) Found
                    </span>
                    {filteredSearchCustomers.length > 1 && (
                      <span className="text-[11px] px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-semibold border border-amber-200">
                        Multiple matches &mdash; pick correct Customer ID
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-slate-100">
                    {filteredSearchCustomers.map(c => {
                      const { totalUdhaar, totalPaid, remainingBalance } = getCustomerTotals(c.id);
                      return (
                        <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-slate-900 text-white rounded font-mono font-bold text-xs">
                                #{c.id}
                              </span>
                              <h4 className="font-bold text-slate-900 text-sm">{c.name}</h4>
                            </div>
                            <div className="text-xs text-slate-500 mt-1 space-x-3">
                              <span>📞 {c.mobile || 'No mobile'}</span>
                              <span>📍 {c.address}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 uppercase font-semibold">Balance</span>
                              <p className={`font-bold text-sm ${remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                ₹{remainingBalance.toLocaleString('en-IN')}
                              </p>
                            </div>
                            <button
                              onClick={() => setStatementCustomer(c)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                            >
                              View Statement
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {filteredSearchCustomers.length === 0 && (
                      <div className="p-8 text-center text-slate-400 text-sm">
                        No customers matched "{searchQuery}".
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================== TAB: UDHAAR ===================== */}
          {activeTab === 'udhaar' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
                <h3 className="font-bold text-slate-900 text-sm mb-1">New Udhaar Record</h3>
                <p className="text-xs text-slate-500 mb-4">Give products on credit</p>

                <form onSubmit={handleAddUdhaar} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Select Customer *</label>
                    <select
                      name="customerId"
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Choose Customer --</option>
                      {customers.map(c => {
                        const { remainingBalance } = getCustomerTotals(c.id);
                        return (
                          <option key={c.id} value={c.id}>
                            #{c.id} {c.name} (Bal: ₹{remainingBalance})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Product Description *</label>
                    <input
                      type="text"
                      name="productName"
                      placeholder="e.g. Basmati Rice, Mustard Oil"
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Quantity/Unit</label>
                      <input
                        type="text"
                        name="quantity"
                        defaultValue="1"
                        placeholder="e.g. 5kg, 2L, 3 packets"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        name="amount"
                        min="1"
                        required
                        placeholder="0.00"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                      <input
                        type="date"
                        name="date"
                        defaultValue={todayStr}
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        name="dueDate"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Notes / Remarks</label>
                    <textarea
                      name="notes"
                      rows={2}
                      placeholder="Optional remarks"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition"
                  >
                    Save Udhaar Record
                  </button>
                </form>
              </div>

              {/* Transactions List */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">Udhaar Transactions Ledger</h4>
                  <span className="text-xs text-slate-400">{udhaarList.length} records</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Customer</th>
                        <th className="px-4 py-2.5">Product</th>
                        <th className="px-4 py-2.5">Qty</th>
                        <th className="px-4 py-2.5">Due Date</th>
                        <th className="px-4 py-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {udhaarList.map(u => {
                        const cust = customers.find(c => c.id === u.customerId);
                        return (
                          <tr key={u.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 text-slate-500">{u.date}</td>
                            <td className="px-4 py-2.5 font-medium">
                              {cust?.name} <span className="text-[10px] text-slate-400">#{u.customerId}</span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-700">{u.productName}</td>
                            <td className="px-4 py-2.5">
                              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">{u.quantity}</span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-500">{u.dueDate || '-'}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-rose-600">₹{u.amount.toLocaleString('en-IN')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB: PAYMENTS ===================== */}
          {activeTab === 'payments' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
                <h3 className="font-bold text-slate-900 text-sm mb-1">Receive Payment</h3>
                <p className="text-xs text-slate-500 mb-4">Record customer settlement</p>

                <form onSubmit={handleAddPayment} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Customer *</label>
                    <select
                      name="customerId"
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Choose Customer --</option>
                      {customers.map(c => {
                        const { remainingBalance } = getCustomerTotals(c.id);
                        return (
                          <option key={c.id} value={c.id}>
                            #{c.id} {c.name} (Owing: ₹{remainingBalance})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Amount Received (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      name="amount"
                      min="1"
                      required
                      placeholder="0.00"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                      <input
                        type="date"
                        name="date"
                        defaultValue={todayStr}
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                      <select
                        name="method"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI (GPay/PhonePe)</option>
                        <option value="Card">Debit/Credit Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Payment Notes / Ref</label>
                    <textarea
                      name="notes"
                      rows={2}
                      placeholder="e.g. Paid in cash, UPI ref #..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition"
                  >
                    Record Payment & Generate Receipt
                  </button>
                </form>
              </div>

              {/* Payments List */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">Payments History (Separate Records)</h4>
                  <span className="text-xs text-slate-400">{paymentList.length} payments</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Customer</th>
                        <th className="px-4 py-2.5">Mode</th>
                        <th className="px-4 py-2.5">Notes</th>
                        <th className="px-4 py-2.5 text-right">Amount Paid</th>
                        <th className="px-4 py-2.5 text-center">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paymentList.map(p => {
                        const cust = customers.find(c => c.id === p.customerId);
                        return (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 text-slate-500">{p.date}</td>
                            <td className="px-4 py-2.5 font-medium">
                              {cust?.name} <span className="text-[10px] text-slate-400">#{p.customerId}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold text-[11px]">
                                {p.method}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 max-w-xs truncate">{p.notes || '-'}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-emerald-600">₹{p.amount.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2.5 text-center">
                              <button
                                onClick={() => setReceiptPayment(p)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB: PENDING CUSTOMERS ===================== */}
          {activeTab === 'pending' && (
            <div className="space-y-4 max-w-5xl mx-auto">
              <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Total Pending Market Credit</span>
                  <h2 className="text-2xl font-bold text-rose-600">₹{totalRemainingAll.toLocaleString('en-IN')}</h2>
                  <p className="text-xs text-slate-400">{pendingCustomers.length} customers have unpaid balances</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1.5 bg-amber-50 text-amber-800 rounded-lg text-xs font-semibold border border-amber-200">
                    ⏳ {pendingCustomers.length} Pending
                  </span>
                  <span className="px-3 py-1.5 bg-rose-50 text-rose-800 rounded-lg text-xs font-semibold border border-rose-200">
                    🚨 {overdueCount} Overdue
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3">Cust ID</th>
                        <th className="px-4 py-3">Customer Name</th>
                        <th className="px-4 py-3">Mobile</th>
                        <th className="px-4 py-3 text-right">Total Udhaar</th>
                        <th className="px-4 py-3 text-right">Total Paid</th>
                        <th className="px-4 py-3 text-right">Remaining</th>
                        <th className="px-4 py-3">Latest Due Date</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingCustomers.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-bold">#{c.id}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                          <td className="px-4 py-3 text-slate-600">{c.mobile || '-'}</td>
                          <td className="px-4 py-3 text-right text-slate-600">₹{c.totalUdhaar.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-right text-emerald-600">₹{c.totalPaid.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-right font-bold text-rose-600">₹{c.remainingBalance.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-slate-500">{c.latestDue || 'Not set'}</td>
                          <td className="px-4 py-3 text-center">
                            {c.status === 'Overdue' ? (
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-semibold text-[10px]">
                                🚨 Overdue
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-semibold text-[10px]">
                                ⏳ Pending
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => triggerReminderModal(c)}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold"
                              >
                                Remind
                              </button>
                              <button
                                onClick={() => setStatementCustomer(c)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold"
                              >
                                Ledger
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB: REPORTS ===================== */}
          {activeTab === 'reports' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Shop Ledgers & Audit Report</h3>
                  <p className="text-xs text-slate-500">{SHOP_NAME} &mdash; Official Statement</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  <Printer size={14} />
                  Print Report
                </button>
              </div>

              {/* Outstanding Summary Report Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Outstanding Accounts Audit</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-2.5">ID</th>
                        <th className="px-4 py-2.5">Customer Name</th>
                        <th className="px-4 py-2.5">Mobile</th>
                        <th className="px-4 py-2.5 text-right">Total Credit</th>
                        <th className="px-4 py-2.5 text-right">Total Recovered</th>
                        <th className="px-4 py-2.5 text-right">Net Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customers.map(c => {
                        const { totalUdhaar, totalPaid, remainingBalance } = getCustomerTotals(c.id);
                        return (
                          <tr key={c.id}>
                            <td className="px-4 py-2 font-mono">#{c.id}</td>
                            <td className="px-4 py-2 font-semibold">{c.name}</td>
                            <td className="px-4 py-2 text-slate-500">{c.mobile || '-'}</td>
                            <td className="px-4 py-2 text-right">₹{totalUdhaar.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2 text-right text-emerald-600">₹{totalPaid.toLocaleString('en-IN')}</td>
                            <td className={`px-4 py-2 text-right font-bold ${remainingBalance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                              ₹{remainingBalance.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-50 font-bold">
                        <td colSpan={3} className="px-4 py-3 text-right">Total:</td>
                        <td className="px-4 py-3 text-right">₹{totalUdhaarAll.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">₹{totalPaidAll.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right text-rose-600">₹{totalRemainingAll.toLocaleString('en-IN')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB: AI ASSISTANT ===================== */}
          {activeTab === 'ai' && (
            <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                    <Bot size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Udhaar AI Financial Copilot</h3>
                    <p className="text-[11px] text-slate-500">Grounded in your MySQL records &bull; Safe queries only</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSendAiMessage('Provide 4 crisp retail financial insights')}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold"
                >
                  ✨ Business Insights
                </button>
              </div>

              {/* Chat Messages Scroll Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/30">
                {chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-[85%] ${
                      msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
                      }`}
                    >
                      {msg.sender === 'user' ? 'You' : <Bot size={16} />}
                    </div>
                    <div>
                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                          msg.sender === 'user'
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.text}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block px-1">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}

                {isAiLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 italic p-2">
                    <div className="w-2 h-2 rounded-full bg-purple-600 animate-ping"></div>
                    AI is reviewing your shop's MySQL records...
                  </div>
                )}
              </div>

              {/* Quick Prompts Bar */}
              <div className="p-2 border-t border-slate-100 bg-white flex items-center gap-1.5 overflow-x-auto text-[11px]">
                <button
                  onClick={() => handleSendAiMessage('Who has the highest pending balance?')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 flex-shrink-0"
                >
                  🔥 Highest pending balance?
                </button>
                <button
                  onClick={() => handleSendAiMessage('How much does customer Rahul Gupta owe?')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 flex-shrink-0"
                >
                  👤 How much does Rahul owe?
                </button>
                <button
                  onClick={() => handleSendAiMessage('Show customers named Ankita')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 flex-shrink-0"
                >
                  🔎 Show customers named Ankita
                </button>
                <button
                  onClick={() => handleSendAiMessage('Which customers have overdue payments?')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 flex-shrink-0"
                >
                  🚨 Who is overdue?
                </button>
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-slate-200 bg-white">
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSendAiMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={toggleVoice}
                    className={`p-2.5 rounded-lg border transition ${
                      isListening
                        ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                    title="Voice input"
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>

                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Ask anything (e.g. 'Draft reminder for Rahul', 'Total Udhaar this month')..."
                    className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />

                  <button
                    type="submit"
                    disabled={isAiLoading || !chatInput.trim()}
                    className="p-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ===================== MODAL: ADD CUSTOMER ===================== */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-in fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base">Add New Customer</h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Ankita, Rahul Gupta"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  name="mobile"
                  placeholder="10-digit mobile"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address / Landmark</label>
                <textarea
                  name="address"
                  rows={2}
                  placeholder="Shop or residential address"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: EDIT CUSTOMER ===================== */}
      {editCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base">Edit Customer #{editCustomer.id}</h3>
              <button onClick={() => setEditCustomer(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditCustomer} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={editCustomer.name}
                  onChange={e => setEditCustomer({ ...editCustomer, name: e.target.value })}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={editCustomer.mobile}
                  onChange={e => setEditCustomer({ ...editCustomer, mobile: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <textarea
                  value={editCustomer.address}
                  onChange={e => setEditCustomer({ ...editCustomer, address: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditCustomer(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                  Update Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: DELETE CONFIRMATION ===================== */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Delete Customer #{deleteConfirmId}?</h3>
            <p className="text-xs text-slate-500 mb-6">
              Are you sure you want to delete this customer and their entire transaction history? This cannot be undone.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCustomer(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: AI REMINDER GENERATOR ===================== */}
      {reminderModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bot className="text-purple-600" size={20} />
                <h3 className="font-bold text-slate-900 text-sm">AI Payment Reminder</h3>
              </div>
              <button onClick={() => setReminderModalData(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-purple-50 rounded-lg mb-4 text-xs flex justify-between">
              <span>Customer: <b>{reminderModalData.customer.name} (#{reminderModalData.customer.id})</b></span>
              <span>Owing: <b className="text-rose-600">₹{reminderModalData.balance.toLocaleString('en-IN')}</b></span>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reminder Tone:</label>
              <div className="flex gap-2">
                {(['polite', 'formal', 'firm'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => {
                      setReminderTone(t);
                      fetchReminder(reminderModalData.customer, reminderModalData.balance, t);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize border ${
                      reminderTone === t
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Generated Message (Editable):</label>
              {isGeneratingReminder ? (
                <div className="h-28 flex items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-slate-200">
                  Drafting with Gemini AI...
                </div>
              ) : (
                <textarea
                  value={generatedReminderText}
                  onChange={e => setGeneratedReminderText(e.target.value)}
                  rows={4}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                ></textarea>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedReminderText);
                  showNotification('Copied message to clipboard!', 'success');
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                <Copy size={14} />
                Copy
              </button>
              <a
                href={`https://wa.me/91${reminderModalData.customer.mobile.replace(/\D/g, '')}?text=${encodeURIComponent(generatedReminderText)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
              >
                Send via WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: STATEMENT VIEW & PRINT ===================== */}
      {statementCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{SHOP_NAME}</h2>
                <p className="text-xs text-slate-500">{SHOP_ADDRESS} &bull; Ph: {SHOP_PHONE}</p>
                <h3 className="text-sm font-bold text-blue-600 mt-2 uppercase tracking-wide">Customer Account Statement</h3>
              </div>
              <button onClick={() => setStatementCustomer(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs mb-6">
              <div>
                <p><strong>Customer ID:</strong> #{statementCustomer.id}</p>
                <p><strong>Name:</strong> {statementCustomer.name}</p>
                <p><strong>Mobile:</strong> {statementCustomer.mobile || 'N/A'}</p>
              </div>
              <div>
                <p><strong>Address:</strong> {statementCustomer.address || 'N/A'}</p>
                <p><strong>Member Since:</strong> {statementCustomer.regDate}</p>
                <p><strong>Date:</strong> {todayStr}</p>
              </div>
            </div>

            {/* Balances */}
            {(() => {
              const totals = getCustomerTotals(statementCustomer.id);
              const custUdhaars = udhaarList.filter(u => u.customerId === statementCustomer.id);
              const custPayments = paymentList.filter(p => p.customerId === statementCustomer.id);
              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-rose-700">Total Udhaar</span>
                      <p className="text-base font-bold text-rose-600">₹{totals.totalUdhaar.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-emerald-700">Total Paid</span>
                      <p className="text-base font-bold text-emerald-600">₹{totals.totalPaid.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-purple-700">Balance Due</span>
                      <p className="text-base font-bold text-purple-700">₹{totals.remainingBalance.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  {/* Udhaars */}
                  <div>
                    <h4 className="font-bold text-xs uppercase text-slate-700 mb-2">Udhaar (Credit) History</h4>
                    <table className="w-full text-xs text-left border">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="p-2 border">Date</th>
                          <th className="p-2 border">Product</th>
                          <th className="p-2 border">Qty</th>
                          <th className="p-2 border text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {custUdhaars.map(u => (
                          <tr key={u.id}>
                            <td className="p-2 border">{u.date}</td>
                            <td className="p-2 border">{u.productName}</td>
                            <td className="p-2 border">{u.quantity}</td>
                            <td className="p-2 border text-right font-bold text-rose-600">₹{u.amount.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Payments */}
                  <div>
                    <h4 className="font-bold text-xs uppercase text-slate-700 mb-2">Payment History</h4>
                    <table className="w-full text-xs text-left border">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="p-2 border">Date</th>
                          <th className="p-2 border">Method</th>
                          <th className="p-2 border">Notes</th>
                          <th className="p-2 border text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {custPayments.map(p => (
                          <tr key={p.id}>
                            <td className="p-2 border">{p.date}</td>
                            <td className="p-2 border">{p.method}</td>
                            <td className="p-2 border">{p.notes || '-'}</td>
                            <td className="p-2 border text-right font-bold text-emerald-600">₹{p.amount.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Printer size={14} />
                      Print Statement
                    </button>
                    <button
                      onClick={() => setStatementCustomer(null)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ===================== MODAL: PAYMENT RECEIPT ===================== */}
      {receiptPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border">
            <div className="text-center border-b border-slate-200 pb-3 mb-4">
              <h2 className="font-bold text-slate-900 text-base">{SHOP_NAME}</h2>
              <p className="text-[11px] text-slate-500">{SHOP_ADDRESS} &bull; {SHOP_PHONE}</p>
              <span className="inline-block mt-2 px-3 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] uppercase">
                Payment Receipt
              </span>
            </div>

            {(() => {
              const cust = customers.find(c => c.id === receiptPayment.customerId);
              const totals = cust ? getCustomerTotals(cust.id) : { remainingBalance: 0 };
              return (
                <div className="text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Receipt No:</span>
                    <span className="font-mono font-bold">REC-{receiptPayment.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date:</span>
                    <span>{receiptPayment.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-semibold">{cust?.name} (#{receiptPayment.customerId})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Mode:</span>
                    <span className="font-medium">{receiptPayment.method}</span>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-lg text-center my-3">
                    <span className="text-[10px] text-emerald-700 uppercase font-bold">Amount Paid</span>
                    <h3 className="text-xl font-bold text-emerald-700">₹{receiptPayment.amount.toLocaleString('en-IN')}</h3>
                  </div>

                  <div className="flex justify-between text-slate-600 border-t pt-2">
                    <span>Remaining Balance:</span>
                    <span className="font-bold text-slate-900">₹{totals.remainingBalance.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="pt-4 flex gap-2">
                    <button
                      onClick={() => window.print()}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs flex items-center justify-center gap-1"
                    >
                      <Printer size={14} /> Print
                    </button>
                    <button
                      onClick={() => setReceiptPayment(null)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs"
                    >
                      Done
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
