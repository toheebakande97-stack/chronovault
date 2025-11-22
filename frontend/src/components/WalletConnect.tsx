interface WalletConnectProps {
  onConnect: () => void
}

const WalletConnect = ({ onConnect }: WalletConnectProps) => {
  return (
    <div className="text-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
        <p className="text-gray-600 mb-6">
          Connect your Stacks wallet to start collecting and breeding temporal NFTs that evolve over time.
        </p>
        <button
          onClick={onConnect}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
        >
          Connect Wallet
        </button>
        <p className="text-sm text-gray-500 mt-4">
          Secure connection powered by Stacks.js
        </p>
      </div>
    </div>
  )
}

export default WalletConnect
