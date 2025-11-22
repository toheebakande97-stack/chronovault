import { useState, useEffect } from 'react'
import { UserSession } from '@stacks/connect'
import { BarChart3, TrendingUp, Users, Clock, Zap, Heart } from 'lucide-react'

interface AnalyticsDashboardProps {
  userSession: UserSession
}

interface AnalyticsData {
  totalNFTs: number
  totalGenerations: number
  breedingEvents: number
  evolutionEvents: number
  averageEvolutionLevel: number
  holderRank: number
  breedingSuccessRate: number
  temporalValue: number
}

const AnalyticsDashboard = ({ userSession }: AnalyticsDashboardProps) => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalNFTs: 0,
    totalGenerations: 0,
    breedingEvents: 0,
    evolutionEvents: 0,
    averageEvolutionLevel: 0,
    holderRank: 0,
    breedingSuccessRate: 0,
    temporalValue: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock analytics data - in real implementation, this would fetch from contract
    const mockAnalytics: AnalyticsData = {
      totalNFTs: 12,
      totalGenerations: 3,
      breedingEvents: 8,
      evolutionEvents: 15,
      averageEvolutionLevel: 2.4,
      holderRank: 47,
      breedingSuccessRate: 87.5,
      temporalValue: 1250
    }

    setTimeout(() => {
      setAnalytics(mockAnalytics)
      setLoading(false)
    }, 1000)
  }, [])

  const stats = [
    {
      label: 'Total NFTs',
      value: analytics.totalNFTs,
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Breeding Events',
      value: analytics.breedingEvents,
      icon: Heart,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100'
    },
    {
      label: 'Evolution Events',
      value: analytics.evolutionEvents,
      icon: Zap,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      label: 'Temporal Value',
      value: `${analytics.temporalValue} STX`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    }
  ]

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Analyzing your ChronoVault data...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center mb-2">
          <BarChart3 className="h-6 w-6 mr-2 text-purple-600" />
          ChronoVault Analytics
        </h2>
        <p className="text-gray-600">Track your temporal NFT collection's growth and performance</p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolution Progress */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-yellow-600" />
            Evolution Progress
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Average Evolution Level</span>
                <span>{analytics.averageEvolutionLevel}/5</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ width: `${(analytics.averageEvolutionLevel / 5) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4, 5].map((level) => (
                <div key={level} className="text-center">
                  <div className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-bold ${
                    level <= analytics.averageEvolutionLevel
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {level}
                  </div>
                  <div className="text-xs text-gray-600">Lvl {level}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Breeding Analytics */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Heart className="h-5 w-5 mr-2 text-pink-600" />
            Breeding Analytics
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Success Rate</span>
                <span>{analytics.breedingSuccessRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-pink-500 h-2 rounded-full"
                  style={{ width: `${analytics.breedingSuccessRate}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{analytics.totalGenerations}</div>
                <div className="text-sm text-gray-600">Max Generation</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">#{analytics.holderRank}</div>
                <div className="text-sm text-gray-600">Holder Rank</div>
              </div>
            </div>
          </div>
        </div>

        {/* Temporal Timeline */}
        <div className="card lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-600" />
            Temporal Activity Timeline
          </h3>
          <div className="space-y-3">
            {[
              { action: 'Evolution', tokenId: 5, level: 3, time: '2 hours ago' },
              { action: 'Breeding', tokenId: 12, partners: [3, 7], time: '1 day ago' },
              { action: 'Evolution', tokenId: 8, level: 2, time: '3 days ago' },
              { action: 'Minting', tokenId: 10, time: '1 week ago' },
              { action: 'Evolution', tokenId: 2, level: 1, time: '2 weeks ago' }
            ].map((event, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {event.action === 'Evolution' && <Zap className="h-4 w-4 text-yellow-600" />}
                  {event.action === 'Breeding' && <Heart className="h-4 w-4 text-pink-600" />}
                  {event.action === 'Minting' && <BarChart3 className="h-4 w-4 text-blue-600" />}
                  <div>
                    <div className="font-medium text-gray-900">
                      {event.action} {event.action === 'Evolution' && `to Level ${event.level}`}
                    </div>
                    <div className="text-sm text-gray-600">
                      Token #{event.tokenId}
                      {event.partners && ` with #${event.partners.join(', #')}`}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">{event.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsDashboard
