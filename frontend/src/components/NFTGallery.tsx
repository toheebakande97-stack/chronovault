import { useState, useEffect } from 'react'
import { UserSession } from '@stacks/connect'
import { Clock, Zap, TrendingUp, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface NFTGalleryProps {
  userSession: UserSession
}

interface NFTData {
  tokenId: number
  birthBlock: number
  generation: number
  evolutionLevel: number
  baseTraits: string
  evolutionSchedule: any[]
}

const NFTGallery = ({ userSession }: NFTGalleryProps) => {
  const [nfts, setNfts] = useState<NFTData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for now - in real implementation, this would fetch from the contract
    const mockNFTs: NFTData[] = [
      {
        tokenId: 1,
        birthBlock: 850000,
        generation: 0,
        evolutionLevel: 2,
        baseTraits: "Ancient Warrior Spirit",
        evolutionSchedule: []
      },
      {
        tokenId: 2,
        birthBlock: 852000,
        generation: 1,
        evolutionLevel: 1,
        baseTraits: "Mystic Time Weaver",
        evolutionSchedule: []
      },
      {
        tokenId: 3,
        birthBlock: 854000,
        generation: 0,
        evolutionLevel: 0,
        baseTraits: "Chronal Guardian",
        evolutionSchedule: []
      }
    ]

    setTimeout(() => {
      setNfts(mockNFTs)
      setLoading(false)
    }, 1000)
  }, [])

  const getEvolutionColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-gray-100 text-gray-800'
      case 1: return 'bg-blue-100 text-blue-800'
      case 2: return 'bg-purple-100 text-purple-800'
      case 3: return 'bg-green-100 text-green-800'
      case 4: return 'bg-yellow-100 text-yellow-800'
      case 5: return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEvolutionIcon = (level: number) => {
    if (level === 0) return <Clock className="h-4 w-4" />
    if (level >= 3) return <TrendingUp className="h-4 w-4" />
    return <Zap className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading your ChronoVault NFTs...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Clock className="h-6 w-6 mr-2 text-purple-600" />
            Your Temporal NFTs
          </h2>
          <p className="text-gray-600 mt-1">NFTs that evolve over time based on Bitcoin blocks</p>
        </div>
        <button className="btn-primary flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Mint New</span>
        </button>
      </div>

      {nfts.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No NFTs Yet</h3>
          <p className="text-gray-600 mb-6">Start your ChronoVault journey by minting your first temporal NFT.</p>
          <button className="btn-primary">Mint Your First NFT</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nfts.map((nft) => (
            <div key={nft.tokenId} className="nft-card">
              <div className="aspect-square bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                <div className="text-center">
                  <Clock className="h-12 w-12 text-purple-600 mx-auto mb-2" />
                  <div className="text-sm font-medium text-gray-700">Token #{nft.tokenId}</div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900 truncate">{nft.baseTraits}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getEvolutionColor(nft.evolutionLevel)}`}>
                    {getEvolutionIcon(nft.evolutionLevel)}
                    <span>Lvl {nft.evolutionLevel}</span>
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>Generation: {nft.generation}</div>
                  <div>Born: {formatDistanceToNow(new Date(nft.birthBlock * 10 * 60 * 1000), { addSuffix: true })}</div>
                  <div>Birth Block: #{nft.birthBlock.toLocaleString()}</div>
                </div>
                <div className="mt-4 flex space-x-2">
                  <button className="flex-1 btn-secondary text-xs py-2">View Details</button>
                  <button className="flex-1 btn-primary text-xs py-2">Evolve</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default NFTGallery
