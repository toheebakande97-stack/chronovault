import { Clock } from 'lucide-react'

const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">ChronoVault</h1>
              <p className="text-sm text-gray-600">Temporal NFT Vault</p>
            </div>
          </div>
          <nav className="hidden md:flex space-x-6">
            <a href="#gallery" className="text-gray-600 hover:text-gray-900 transition-colors">Gallery</a>
            <a href="#breeding" className="text-gray-600 hover:text-gray-900 transition-colors">Breeding</a>
            <a href="#analytics" className="text-gray-600 hover:text-gray-900 transition-colors">Analytics</a>
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header
