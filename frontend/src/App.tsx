import { useState, useEffect } from 'react'
import { AppConfig, UserSession, showConnect } from '@stacks/connect'
import { Activity, Coins, Clock, TrendingUp, Zap } from 'lucide-react'
import Header from './components/Header'
import WalletConnect from './components/WalletConnect'
import NFTGallery from './components/NFTGallery'
import BreedingInterface from './components/BreedingInterface'
import AnalyticsDashboard from './components/AnalyticsDashboard'

const appConfig = new AppConfig(['store_write', 'publish_data'])
const userSession = new UserSession({ appConfig })

function App() {
  const [userData, setUserData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('gallery')

  useEffect(() => {
    if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then((userData) => {
        setUserData(userData)
      })
    } else if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData())
    }
  }, [])

  const connectWallet = () => {
    showConnect({
      appDetails: {
        name: 'ChronoVault',
        icon: window.location.origin + '/vite.svg',
      },
      redirectTo: '/',
      onFinish: () => {
        window.location.reload()
      },
      userSession,
    })
  }

  const disconnectWallet = () => {
    userSession.signUserOut()
    setUserData(null)
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-8">
              Welcome to ChronoVault
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Experience the future of NFTs with temporal evolution. Your digital assets grow and change over time based on Bitcoin block progression.
            </p>
            <WalletConnect onConnect={connectWallet} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ChronoVault Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your temporal NFTs</p>
          </div>
          <button
            onClick={disconnectWallet}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex-1 px-6 py-3 rounded-md font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeTab === 'gallery'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>My NFTs</span>
          </button>
          <button
            onClick={() => setActiveTab('breeding')}
            className={`flex-1 px-6 py-3 rounded-md font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeTab === 'breeding'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Breeding</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 px-6 py-3 rounded-md font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeTab === 'analytics'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Analytics</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'gallery' && <NFTGallery userSession={userSession} />}
          {activeTab === 'breeding' && <BreedingInterface userSession={userSession} />}
          {activeTab === 'analytics' && <AnalyticsDashboard userSession={userSession} />}
        </div>
      </div>
    </div>
  )
}

export default App
