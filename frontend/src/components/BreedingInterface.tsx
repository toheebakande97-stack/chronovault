import { useState } from 'react'
import { UserSession } from '@stacks/connect'
import { Heart, Clock, Zap, Plus } from 'lucide-react'

interface BreedingInterfaceProps {
  userSession: UserSession
}

interface NFT {
  tokenId: number
  baseTraits: string
  generation: number
  evolutionLevel: number
  canBreed: boolean
}

const BreedingInterface = ({ userSession }: BreedingInterfaceProps) => {
  const [selectedParents, setSelectedParents] = useState<{parent1?: NFT, parent2?: NFT}>({})
  const [offspringTraits, setOffspringTraits] = useState('')
  const [isBreeding, setIsBreeding] = useState(false)

  // Mock NFT data - in real implementation, this would fetch from contract
  const userNFTs: NFT[] = [
    { tokenId: 1, baseTraits: "Ancient Warrior Spirit", generation: 0, evolutionLevel: 2, canBreed: true },
    { tokenId: 2, baseTraits: "Mystic Time Weaver", generation: 1, evolutionLevel: 1, canBreed: true },
    { tokenId: 3, baseTraits: "Chronal Guardian", generation: 0, evolutionLevel: 0, canBreed: false },
    { tokenId: 4, baseTraits: "Temporal Phoenix", generation: 2, evolutionLevel: 3, canBreed: true }
  ]

  const selectParent = (nft: NFT, position: 'parent1' | 'parent2') => {
    if (position === 'parent1') {
      setSelectedParents(prev => ({ ...prev, parent1: nft, parent2: prev.parent2?.tokenId === nft.tokenId ? undefined : prev.parent2 }))
    } else {
      setSelectedParents(prev => ({ ...prev, parent2: nft, parent1: prev.parent1?.tokenId === nft.tokenId ? undefined : prev.parent1 }))
    }
  }

  const canBreed = selectedParents.parent1 && selectedParents.parent2 &&
                   selectedParents.parent1.canBreed && selectedParents.parent2.canBreed &&
                   selectedParents.parent1.tokenId !== selectedParents.parent2.tokenId

  const handleBreed = async () => {
    if (!canBreed) return

    setIsBreeding(true)
    // Mock breeding process - in real implementation, this would call contract
    setTimeout(() => {
      setIsBreeding(false)
      alert('Breeding successful! New ChronoVault NFT created.')
      setSelectedParents({})
      setOffspringTraits('')
    }, 3000)
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center mb-2">
          <Heart className="h-6 w-6 mr-2 text-pink-600" />
          Breeding Chamber
        </h2>
        <p className="text-gray-600">Combine your temporal NFTs to create new offspring with unique traits</p>
      </div>

      {/* Parent Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Parent 1 */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm mr-2">1</span>
            Parent 1
          </h3>
          {selectedParents.parent1 ? (
            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedParents.parent1.baseTraits}</h4>
                  <p className="text-sm text-gray-600">Token #{selectedParents.parent1.tokenId} • Gen {selectedParents.parent1.generation}</p>
                </div>
                <button
                  onClick={() => setSelectedParents(prev => ({ ...prev, parent1: undefined }))}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {userNFTs.filter(nft => nft.canBreed && nft.tokenId !== selectedParents.parent2?.tokenId).map((nft) => (
                <button
                  key={nft.tokenId}
                  onClick={() => selectParent(nft, 'parent1')}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">{nft.baseTraits}</div>
                  <div className="text-sm text-gray-600">Token #{nft.tokenId} • Gen {nft.generation} • Lvl {nft.evolutionLevel}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Parent 2 */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold text-sm mr-2">2</span>
            Parent 2
          </h3>
          {selectedParents.parent2 ? (
            <div className="p-4 bg-pink-50 rounded-lg border-2 border-pink-200">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedParents.parent2.baseTraits}</h4>
                  <p className="text-sm text-gray-600">Token #{selectedParents.parent2.tokenId} • Gen {selectedParents.parent2.generation}</p>
                </div>
                <button
                  onClick={() => setSelectedParents(prev => ({ ...prev, parent2: undefined }))}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {userNFTs.filter(nft => nft.canBreed && nft.tokenId !== selectedParents.parent1?.tokenId).map((nft) => (
                <button
                  key={nft.tokenId}
                  onClick={() => selectParent(nft, 'parent2')}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-pink-300 hover:bg-pink-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">{nft.baseTraits}</div>
                  <div className="text-sm text-gray-600">Token #{nft.tokenId} • Gen {nft.generation} • Lvl {nft.evolutionLevel}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Offspring Configuration */}
      {canBreed && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-yellow-600" />
            Offspring Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Offspring Traits (describe the unique characteristics)
              </label>
              <textarea
                value={offspringTraits}
                onChange={(e) => setOffspringTraits(e.target.value)}
                placeholder="Describe the unique traits that will emerge from this breeding..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
                maxLength={1024}
              />
              <p className="text-sm text-gray-500 mt-1">{offspringTraits.length}/1024 characters</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Breeding Requirements</h4>
                  <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                    <li>• Both parents must be mature (100,000+ blocks since birth)</li>
                    <li>• Parents must be outside their cooldown period (50,000 blocks)</li>
                    <li>• Breeding fee: 0.5 STX (includes security distribution)</li>
                    <li>• New generation will be max(parent generations) + 1</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Breed Button */}
      <div className="text-center">
        <button
          onClick={handleBreed}
          disabled={!canBreed || !offspringTraits.trim() || isBreeding}
          className={`px-8 py-4 rounded-lg font-bold text-lg transition-all duration-200 ${
            canBreed && offspringTraits.trim() && !isBreeding
              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:from-pink-700 hover:to-purple-700 transform hover:scale-105 shadow-lg'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isBreeding ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Breeding in Progress...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5" />
              <span>Initiate Breeding</span>
            </div>
          )}
        </button>
        {!canBreed && selectedParents.parent1 && selectedParents.parent2 && (
          <p className="text-red-600 mt-2">Invalid breeding combination. Check parent requirements.</p>
        )}
      </div>
    </div>
  )
}

export default BreedingInterface
