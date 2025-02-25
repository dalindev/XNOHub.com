'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchRepoData } from '@/lib/github-api';
import {
  Star,
  GitBranch,
  GitPullRequest,
  AlertCircle,
  Clock,
  Code,
  Github,
  Users,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Activity,
  User,
  GitFork,
  Rocket,
  Eye,
  Globe,
  TrendingUp,
  Heart,
  MessageCircle,
  ThumbsUp,
  Share2,
  BarChart2
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

// Define the ContributionLevel type
type ContributionLevel = 0 | 1 | 2 | 3 | 4;

interface GitHubStatsOverlayProps {
  repoOwner: string;
  repoName: string;
  isVisible: boolean; // Controls the full overlay visibility
  isRocketView: boolean;
  isStarlinkView: boolean;
  rocketCount: number;
  resetToEarthView: () => void;
  toggleStarlinkView: () => void;
  toggleRocketView: () => void;
  moveToNextStarlink: () => void;
  moveToNextRocket: () => void;
}

const GitHubStatsOverlay: React.FC<GitHubStatsOverlayProps> = ({
  repoOwner,
  repoName,
  isVisible,
  isRocketView,
  isStarlinkView,
  rocketCount,
  resetToEarthView,
  toggleStarlinkView,
  toggleRocketView,
  moveToNextStarlink,
  moveToNextRocket
}) => {
  const [loading, setLoading] = useState(true);
  const [repoData, setRepoData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showExpandedStats, setShowExpandedStats] = useState(false);

  // Instead of using NavContext, we'll use the isVisible prop
  // that's passed from the parent component

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchRepoData(repoOwner, repoName);
        setRepoData(data);
      } catch (err) {
        console.error('Error fetching GitHub data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [repoOwner, repoName]);

  if (!isVisible) return null;

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (isMinimized) {
      setShowExpandedStats(false);
    }
  };

  const toggleExpandedStats = () => {
    setShowExpandedStats(!showExpandedStats);
  };

  if (loading) {
    return (
      <div className="absolute bottom-20 left-4 z-10 bg-gray-900/80 backdrop-blur-sm rounded-lg p-2 text-white text-sm border border-[#209ce9]/30">
        Loading GitHub stats...
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute bottom-20 left-4 z-10 bg-gray-900/80 backdrop-blur-sm rounded-lg p-2 text-white text-sm border border-[#209ce9]/30">
        Error: {error}
      </div>
    );
  }

  // Fallback data if repoData is null
  const data = repoData || {
    repo: {
      stars: 3500,
      forks: 795,
      watchers: 251,
      open_issues: 272
    },
    languages: {
      'C++': 54.3,
      C: 42.8,
      CMake: 1.7,
      Shell: 0.9
    },
    commits_last_year: 1583,
    pull_requests: {
      open: 51,
      closed: 123,
      merged: 78
    },
    issues: {
      open: 72,
      closed: 168
    },
    contributors: [
      {
        login: 'rkeene',
        contributions: 532,
        avatar_url: 'https://avatars.githubusercontent.com/u/82819?v=4'
      },
      {
        login: 'clemahieu',
        contributions: 483,
        avatar_url: 'https://avatars.githubusercontent.com/u/310560?v=4'
      },
      {
        login: 'wezrule',
        contributions: 467,
        avatar_url: 'https://avatars.githubusercontent.com/u/550317?v=4'
      },
      {
        login: 'guilhermelawless',
        contributions: 348,
        avatar_url: 'https://avatars.githubusercontent.com/u/4986211?v=4'
      },
      {
        login: 'cryptocode',
        contributions: 251,
        avatar_url: 'https://avatars.githubusercontent.com/u/34003459?v=4'
      }
    ],
    recent_commits: [
      {
        message: 'Fix alignment issue in vote handling',
        author: 'cryptocode',
        date: new Date().toISOString()
      },
      {
        message: 'Update bootstrap peers',
        author: 'wezrule',
        date: new Date(Date.now() - 3600000).toISOString()
      },
      {
        message: 'Add telemetry endpoint',
        author: 'clemahieu',
        date: new Date(Date.now() - 7200000).toISOString()
      },
      {
        message: 'Improve block processing',
        author: 'rkeene',
        date: new Date(Date.now() - 10800000).toISOString()
      },
      {
        message: 'Fix memory leak in handler',
        author: 'guilhermelawless',
        date: new Date(Date.now() - 14400000).toISOString()
      }
    ]
  };

  // Function to get color for contribution level
  const getContributionColor = (level: ContributionLevel) => {
    switch (level) {
      case 0:
        return 'bg-gray-800';
      case 1:
        return 'bg-[#0e4429]';
      case 2:
        return 'bg-[#006d32]';
      case 3:
        return 'bg-[#26a641]';
      case 4:
        return 'bg-[#39d353]';
    }
  };

  // Social media metrics - mock data
  const socialMetrics = {
    sentiment: {
      positive: 78,
      neutral: 17,
      negative: 5
    },
    engagement: {
      posts: 248,
      likes: 1879,
      shares: 592,
      comments: 356
    },
    trending: [
      { topic: '#NanoSpeed', count: 2453, change: '+42%' },
      { topic: '#GreenCrypto', count: 1827, change: '+18%' },
      { topic: '#FeelessPayments', count: 1230, change: '+27%' }
    ],
    activity: {
      daily: '+12%',
      weekly: '+28%',
      monthly: '+63%'
    }
  };

  // Add this function to the component, before the return statement
  const getYellowContributionColor = (level: ContributionLevel) => {
    switch (level) {
      case 0:
        return 'bg-gray-800';
      case 1:
        return 'bg-amber-900/70';
      case 2:
        return 'bg-amber-700/80';
      case 3:
        return 'bg-amber-500/90';
      case 4:
        return 'bg-amber-300';
    }
  };

  // Always show the bottom control bar, but make the rest of the overlay conditional
  return (
    <div className="fixed inset-0 pointer-events-none z-10 flex items-center justify-center p-4">
      <div className="w-full h-full flex flex-col items-center justify-between pointer-events-none">
        {/* Conditional content - only show when in Earth view */}
        {isVisible && (
          <>
            {/* Top stats panel */}
            <div className="mt-4 mx-auto flex justify-center gap-8">
              <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 border-t border-l border-[#209ce9]/30 flex gap-4 pointer-events-auto">
                <div className="flex items-center gap-2">
                  <GitFork className="h-5 w-5 text-[#209ce9]" />
                  <div>
                    <div className="text-sm text-gray-400">Forked Projects</div>
                    <div className="text-lg font-semibold text-white">
                      {data.repo.forks}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#209ce9]" />
                  <div>
                    <div className="text-sm text-gray-400">
                      Collaborations Today
                    </div>
                    <div className="text-lg font-semibold text-white">
                      {data.repo.watchers + data.repo.forks * 2}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full flex justify-between items-center mt-6">
              {/* Left panel - Trending Developers, Navigation Controls, and Dev Stats */}
              <div className="self-start flex flex-col gap-2 ml-4 mt-8 pointer-events-auto w-72">
                {/* Trending Developers Panel */}
                <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 border-t border-l border-[#209ce9]/30">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[#209ce9] font-semibold flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Trending Developers
                    </h3>
                    <button
                      onClick={toggleMinimize}
                      className="text-[#209ce9] hover:text-white cursor-pointer"
                      type="button"
                    >
                      {isMinimized ? (
                        <Maximize2 size={16} />
                      ) : (
                        <Minimize2 size={16} />
                      )}
                    </button>
                  </div>

                  {!isMinimized && (
                    <div className="space-y-3 max-h-[200px] overflow-y-auto">
                      {data.contributors
                        .slice(0, 5)
                        .map((contributor: any, index: number) => (
                          <div
                            key={contributor.login}
                            className="flex items-center gap-3 p-2 hover:bg-gray-800/40 rounded"
                          >
                            <div className="relative">
                              <img
                                src={contributor.avatar_url}
                                alt={contributor.login}
                                className="w-10 h-10 rounded-full border border-[#209ce9]/30"
                              />
                              <div className="absolute -bottom-1 -right-1 bg-[#209ce9] text-xs text-black font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {index + 1}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">
                                {contributor.login}
                              </div>
                              <div className="text-xs text-gray-400">
                                {contributor.contributions} commits
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Navigation Controls Panel - Moved from bottom */}
                <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 border-t border-l border-[#209ce9]/30">
                  <h3 className="text-[#209ce9] font-semibold flex items-center mb-3">
                    <Activity className="h-4 w-4 mr-2" />
                    Navigation Controls
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Earth View Button - Only show when in StarLink or Rocket view */}
                    {(isStarlinkView || isRocketView) && (
                      <button
                        onClick={resetToEarthView}
                        className="flex items-center gap-1 bg-transparent text-white hover:text-[#209ce9] px-2 py-1 rounded border border-gray-700 text-xs"
                      >
                        <Globe className="w-3 h-3 text-blue-400" />
                        <span>Earth View</span>
                      </button>
                    )}

                    {/* StarLink View Button - Only show in Earth view */}
                    {!isStarlinkView && !isRocketView && (
                      <button
                        onClick={toggleStarlinkView}
                        className="flex items-center gap-1 bg-transparent text-white hover:text-[#209ce9] px-2 py-1 rounded border border-gray-700 text-xs"
                      >
                        <svg
                          className="w-3 h-3 text-blue-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0-11V3"
                          />
                        </svg>
                        <span>StarLink View</span>
                      </button>
                    )}

                    {/* Next StarLink Button - Only show in StarLink view */}
                    {isStarlinkView && (
                      <button
                        onClick={moveToNextStarlink}
                        className="flex items-center gap-1 bg-transparent text-white hover:text-[#209ce9] px-2 py-1 rounded border border-gray-700 text-xs"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Next StarLink</span>
                      </button>
                    )}

                    {/* Rocket View Button - Only show in Earth view when rockets are available */}
                    {!isStarlinkView && !isRocketView && rocketCount > 0 && (
                      <button
                        onClick={toggleRocketView}
                        className="flex items-center gap-1 bg-transparent text-white hover:text-[#209ce9] px-2 py-1 rounded border border-gray-700 text-xs"
                      >
                        <Rocket className="w-3 h-3 text-red-600" />
                        <span>Rocket View</span>
                      </button>
                    )}

                    {/* Next Rocket Button - Only show in Rocket view */}
                    {isRocketView && rocketCount > 1 && (
                      <button
                        onClick={moveToNextRocket}
                        className="flex items-center gap-1 bg-transparent text-white hover:text-[#209ce9] px-2 py-1 rounded border border-gray-700 text-xs"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Next Rocket</span>
                      </button>
                    )}

                    {/* Active Rocket Count */}
                    {rocketCount > 0 && (
                      <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded text-white text-xs border border-gray-700">
                        <Rocket className="w-3 h-3 text-red-600" />
                        {rocketCount}
                      </div>
                    )}
                  </div>
                </div>

                {/* Language Distribution Panel - Moved from bottom */}
                <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 border-t border-l border-[#209ce9]/30">
                  <h5 className="text-[#209ce9] flex items-center font-medium mb-2">
                    <Code className="h-4 w-4 mr-2" />
                    Language Distribution
                  </h5>
                  <div className="relative h-[60px] flex items-end">
                    {Object.entries(data.languages).map(
                      ([lang, percentage], i) => {
                        const colors = [
                          '#4285F4',
                          '#34A853',
                          '#FBBC05',
                          '#EA4335',
                          '#8A2BE2'
                        ];
                        const color = colors[i % colors.length];
                        return (
                          <div
                            key={lang}
                            className="flex flex-col items-center flex-1"
                          >
                            <div
                              className="w-full rounded-t transition-all"
                              style={{
                                height: `${Number(percentage) * 0.5}px`,
                                backgroundColor: color,
                                maxHeight: '50px'
                              }}
                            ></div>
                            <div className="text-[10px] text-gray-400 mt-1 w-full text-center truncate">
                              {lang}
                            </div>
                            <div className="text-[9px] text-white font-medium">
                              {String(percentage)}%
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Pull Request Stats Panel - Moved from bottom */}
                <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 border-t border-l border-[#209ce9]/30">
                  <h5 className="text-[#209ce9] flex items-center font-medium mb-2">
                    <GitPullRequest className="h-4 w-4 mr-2" />
                    Pull Requests & Issues
                  </h5>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></div>
                        <span className="text-[10px] text-gray-300">
                          Merged
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-[10px] text-white font-medium pr-1.5">
                          {data.pull_requests.merged}
                        </span>
                        <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{
                              width: `${
                                (data.pull_requests.merged /
                                  (data.pull_requests.open +
                                    data.pull_requests.closed +
                                    data.pull_requests.merged)) *
                                100
                              }%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></div>
                        <span className="text-[10px] text-gray-300">Open</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-[10px] text-white font-medium pr-1.5">
                          {data.pull_requests.open}
                        </span>
                        <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{
                              width: `${
                                (data.pull_requests.open /
                                  (data.pull_requests.open +
                                    data.pull_requests.closed +
                                    data.pull_requests.merged)) *
                                100
                              }%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-rose-500 mr-1.5"></div>
                        <span className="text-[10px] text-gray-300">
                          Issues
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-[10px] text-white font-medium pr-1.5">
                          {data.issues.open}
                        </span>
                        <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rose-500"
                            style={{
                              width: `${
                                (data.issues.open /
                                  (data.issues.open + data.issues.closed)) *
                                100
                              }%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center - Earth visualization */}
              <div className="pointer-events-none flex-1"></div>
            </div>
          </>
        )}

        {/* Bottom Panel - Always Visible but now more compact */}
        <div className="w-full pointer-events-none mt-auto">
          <div className="bg-black/70 backdrop-blur-sm rounded-t-lg p-1.5 border-t border-l border-r border-[#209ce9]/30 w-full max-w-full pointer-events-auto">
            {/* Main Content Area - Two Column Layout */}
            <div className="flex justify-between items-start gap-2">
              {/* Left Side - Only Contribution Heatmap (More Compact) */}
              <div className="w-[481px] bg-black/40 p-1.5 rounded border border-gray-800/50">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-[#209ce9] font-medium text-xs flex items-center">
                    <Code className="h-3 w-3 mr-1" />
                    Developer Activity
                  </h4>
                </div>

                {/* Main Contribution Heatmap */}
                <div className="flex justify-center">
                  <div className="flex w-full">
                    <div className="grid grid-cols-[repeat(52,1fr)] gap-[1px] w-full">
                      {Array.from({ length: 52 }).map((_, weekIndex) => {
                        // Fixed array of random-looking patterns for developer activity
                        const patterns = [
                          [0, 1, 0, 2, 3],
                          [1, 2, 0, 0, 1],
                          [2, 3, 1, 0, 2],
                          [0, 1, 2, 3, 4],
                          [1, 0, 0, 1, 2],
                          [3, 2, 1, 0, 1],
                          [2, 1, 0, 0, 0],
                          [1, 1, 2, 3, 2],
                          [0, 0, 1, 2, 3],
                          [1, 2, 3, 4, 1],
                          [2, 0, 1, 1, 0],
                          [3, 2, 1, 0, 0],
                          [4, 3, 2, 1, 0],
                          [0, 0, 0, 1, 2],
                          [1, 2, 3, 0, 0],
                          [0, 1, 2, 3, 0]
                        ];

                        return (
                          <div
                            key={`week-${weekIndex}`}
                            className="flex flex-col gap-[1px]"
                          >
                            {Array.from({ length: 5 }).map((_, dayIndex) => {
                              // Get level from the predefined pattern
                              const patternIndex = weekIndex % patterns.length;
                              const level = patterns[patternIndex][
                                dayIndex
                              ] as ContributionLevel;

                              return (
                                <TooltipProvider
                                  key={`day-${weekIndex}-${dayIndex}`}
                                >
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={`w-2 h-2 rounded-[1px] ${getContributionColor(
                                          level
                                        )}`}
                                      ></div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="bg-gray-900 text-white text-xs p-1"
                                    >
                                      {level === 0
                                        ? 'No contributions'
                                        : `${level * 3} contributions`}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="text-[8px] text-gray-500 flex justify-between w-full mt-0.5">
                  <span>Code</span>
                  <span>Now</span>
                </div>

                {/* Second Contribution Heatmap with Yellow Theme */}
                <div className="mt-1 pt-1 border-t border-gray-800/30">
                  <div className="flex justify-between items-center mb-0.5">
                    <h5 className="text-amber-400 text-xs font-medium">
                      Community Engagement
                    </h5>
                  </div>
                  <div className="flex justify-center">
                    <div className="flex w-full">
                      <div className="grid grid-cols-[repeat(52,1fr)] gap-[1px] w-full">
                        {Array.from({ length: 52 }).map((_, weekIndex) => {
                          // Different pattern array for community engagement
                          const engagementPatterns = [
                            [1, 0, 2, 0, 3],
                            [0, 1, 2, 0, 0],
                            [0, 0, 1, 3, 2],
                            [2, 1, 0, 0, 1],
                            [3, 2, 1, 0, 0],
                            [0, 1, 2, 3, 4],
                            [1, 0, 0, 1, 2],
                            [4, 3, 2, 1, 0],
                            [0, 1, 2, 3, 0],
                            [2, 0, 0, 1, 3],
                            [3, 2, 1, 0, 0],
                            [0, 0, 1, 2, 3],
                            [1, 2, 3, 0, 0],
                            [0, 1, 2, 3, 2],
                            [2, 0, 0, 1, 0],
                            [3, 2, 1, 0, 0]
                          ];

                          return (
                            <div
                              key={`week-comm-${weekIndex}`}
                              className="flex flex-col gap-[1px]"
                            >
                              {Array.from({ length: 5 }).map((_, dayIndex) => {
                                // Get level from the predefined engagement pattern
                                const patternIndex =
                                  weekIndex % engagementPatterns.length;
                                const level = engagementPatterns[patternIndex][
                                  dayIndex
                                ] as ContributionLevel;

                                return (
                                  <TooltipProvider
                                    key={`day-comm-${weekIndex}-${dayIndex}`}
                                  >
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div
                                          className={`w-2 h-2 rounded-[1px] ${getYellowContributionColor(
                                            level
                                          )}`}
                                        ></div>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="top"
                                        className="bg-gray-900 text-white text-xs p-1"
                                      >
                                        {level === 0
                                          ? 'No engagement'
                                          : `${level * 2} forum posts`}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-[8px] text-gray-500 flex justify-between w-full mt-0.5">
                    <span>Forum</span>
                    <span>Today</span>
                  </div>
                </div>
              </div>

              {/* Right Side - Enhanced Social Metrics (2 rows with 4 columns) */}
              <div className="flex-1 bg-black/40 p-1.5 rounded border border-gray-800/50 relative overflow-hidden">
                {/* Background glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-[#209ce9] font-medium text-xs flex items-center">
                      <MessageCircle className="h-3 w-3 mr-1" />
                      Social & Community Metrics
                    </h4>
                    <div className="text-[9px] text-gray-400">
                      Updated{' '}
                      <span className="text-white font-medium">just now</span>
                    </div>
                  </div>

                  {/* Futuristic metrics layout - changed to be more compact */}
                  <div className="grid grid-cols-4 gap-1">
                    {/* First row - 4 metrics */}
                    <div className="col-span-1 bg-gradient-to-b from-black/80 to-black/60 rounded border border-[#209ce9]/20 shadow-[0_0_10px_rgba(32,156,233,0.1)] p-1">
                      <h5 className="text-[9px] text-[#209ce9] flex items-center font-medium mb-0.5">
                        <Heart className="h-2.5 w-2.5 mr-0.5 text-rose-400" />
                        Sentiment
                      </h5>
                      <div className="flex items-center justify-between">
                        {/* Replace with 5 circles with different colors */}
                        <div className="w-[12%] h-[12%] relative">
                          <svg
                            viewBox="0 0 36 36"
                            className="w-full h-full transform -rotate-90"
                          >
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#444"
                              strokeWidth="1"
                              strokeDasharray="100, 100"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#4ade80"
                              strokeWidth="2.5"
                              strokeDasharray="78, 100"
                              className="stroke-green-400"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-white font-semibold">
                            78%
                          </div>
                        </div>
                        <div className="w-[12%] h-[12%] relative">
                          <svg
                            viewBox="0 0 36 36"
                            className="w-full h-full transform -rotate-90"
                          >
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#444"
                              strokeWidth="1"
                              strokeDasharray="100, 100"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="2.5"
                              strokeDasharray="65, 100"
                              className="stroke-blue-500"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-white font-semibold">
                            65%
                          </div>
                        </div>
                        <div className="w-[12%] h-[12%] relative">
                          <svg
                            viewBox="0 0 36 36"
                            className="w-full h-full transform -rotate-90"
                          >
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#444"
                              strokeWidth="1"
                              strokeDasharray="100, 100"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#f472b6"
                              strokeWidth="2.5"
                              strokeDasharray="92, 100"
                              className="stroke-pink-400"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-white font-semibold">
                            92%
                          </div>
                        </div>
                        <div className="w-[12%] h-[12%] relative">
                          <svg
                            viewBox="0 0 36 36"
                            className="w-full h-full transform -rotate-90"
                          >
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#444"
                              strokeWidth="1"
                              strokeDasharray="100, 100"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#fbbf24"
                              strokeWidth="2.5"
                              strokeDasharray="45, 100"
                              className="stroke-amber-400"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-white font-semibold">
                            45%
                          </div>
                        </div>
                        <div className="w-[12%] h-[12%] relative">
                          <svg
                            viewBox="0 0 36 36"
                            className="w-full h-full transform -rotate-90"
                          >
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#444"
                              strokeWidth="1"
                              strokeDasharray="100, 100"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#a78bfa"
                              strokeWidth="2.5"
                              strokeDasharray="83, 100"
                              className="stroke-purple-400"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-white font-semibold">
                            83%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Network Growth - Updated with 30 bars */}
                    <div className="col-span-1 bg-gradient-to-b from-black/80 to-black/60 rounded border border-[#209ce9]/20 shadow-[0_0_10px_rgba(32,156,233,0.1)] p-1">
                      <h5 className="text-[9px] text-[#209ce9] flex items-center font-medium mb-0.5">
                        <Activity className="h-2.5 w-2.5 mr-0.5 text-blue-400" />
                        Growth
                      </h5>
                      <div className="flex items-center h-8">
                        <div className="flex-1 h-8 flex items-end">
                          {/* 30 Bars for detailed chart with auto width */}
                          {Array.from({ length: 30 }).map((_, i) => {
                            // Generate random heights between 15% and 85%
                            const height = 15 + Math.random() * 70;

                            return (
                              <div
                                key={i}
                                style={{ height: `${height}%` }}
                                className={`flex-1 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t mx-[0.5px] ${
                                  i === 29 ? 'animate-pulse' : ''
                                }`}
                              ></div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Community Rank - Enhanced with multiple ranks in a single row */}
                    <div className="col-span-1 bg-gradient-to-b from-black/80 to-black/60 rounded border border-[#209ce9]/20 shadow-[0_0_10px_rgba(32,156,233,0.1)] p-1">
                      <div className="flex justify-center items-center h-full gap-0.5">
                        {/* GitHub Rank */}
                        <div className="flex items-center">
                          <div className="relative">
                            <svg viewBox="0 0 36 36" className="w-12 h-12">
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#444"
                                strokeWidth="1"
                                strokeDasharray="100, 100"
                              />
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#fbbf24"
                                strokeWidth="2.5"
                                strokeDasharray="85, 100"
                                className="stroke-yellow-400"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-xl font-bold text-yellow-400">
                                #4
                              </div>
                            </div>
                          </div>
                          <div className="text-[9px] text-gray-300 ml-0 transform -rotate-90 origin-center flex items-center justify-center h-12">
                            GitHub
                          </div>
                        </div>

                        {/* Stars Rank */}
                        <div className="flex items-center">
                          <div className="relative">
                            <svg viewBox="0 0 36 36" className="w-12 h-12">
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#444"
                                strokeWidth="1"
                                strokeDasharray="100, 100"
                              />
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="2.5"
                                strokeDasharray="78, 100"
                                className="stroke-blue-500"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-xl font-bold text-blue-500">
                                #12
                              </div>
                            </div>
                          </div>
                          <div className="text-[9px] text-gray-300 ml-0 transform -rotate-90 origin-center flex items-center justify-center h-12">
                            Stars
                          </div>
                        </div>

                        {/* CoinMkt Rank */}
                        <div className="flex items-center">
                          <div className="relative">
                            <svg viewBox="0 0 36 36" className="w-12 h-12">
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#444"
                                strokeWidth="1"
                                strokeDasharray="100, 100"
                              />
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#22c55e"
                                strokeWidth="2.5"
                                strokeDasharray="62, 100"
                                className="stroke-green-500"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-xl font-bold text-green-500">
                                #84
                              </div>
                            </div>
                          </div>
                          <div className="text-[9px] text-gray-300 ml-0 transform -rotate-90 origin-center flex items-center justify-center h-12">
                            CoinMkt
                          </div>
                        </div>

                        {/* Community Rank */}
                        <div className="flex items-center">
                          <div className="relative">
                            <svg viewBox="0 0 36 36" className="w-12 h-12">
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#444"
                                strokeWidth="1"
                                strokeDasharray="100, 100"
                              />
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#a855f7"
                                strokeWidth="2.5"
                                strokeDasharray="94, 100"
                                className="stroke-purple-500"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-xl font-bold text-purple-500">
                                #2
                              </div>
                            </div>
                          </div>
                          <div className="text-[9px] text-gray-300 ml-0 transform -rotate-90 origin-center flex items-center justify-center h-12">
                            Community
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Trending Topics */}
                    <div className="col-span-1 bg-gradient-to-b from-black/80 to-black/60 rounded border border-[#209ce9]/20 shadow-[0_0_10px_rgba(32,156,233,0.1)] p-1">
                      <h5 className="text-[9px] text-[#209ce9] flex items-center font-medium mb-0.5">
                        <TrendingUp className="h-2.5 w-2.5 mr-0.5 text-[#209ce9]" />
                        Trending
                      </h5>
                      <div className="grid grid-cols-1 gap-0.5">
                        {socialMetrics.trending.slice(0, 2).map((topic, i) => (
                          <div
                            key={i}
                            className="bg-gradient-to-r from-black/70 to-black/60 rounded p-0.5 border border-[#209ce9]/10 relative overflow-hidden"
                          >
                            <div
                              className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-blue-500 to-cyan-400"
                              style={{ width: '100%' }}
                            ></div>
                            <div className="flex justify-between items-center">
                              <span className="text-[8px] text-white font-medium truncate w-24">
                                {topic.topic}
                              </span>
                              <span className="text-[7px] text-green-400 font-medium ml-1">
                                {topic.change}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Second row - 4 metrics (Combined into 2 wider panels) */}
                    {/* Combined Signal Strength & Engagement */}
                    <div className="col-span-2 bg-gradient-to-b from-black/80 to-black/60 rounded border border-[#209ce9]/20 shadow-[0_0_10px_rgba(32,156,233,0.1)] p-1">
                      <h5 className="text-[9px] text-[#209ce9] flex items-center font-medium mb-0.5">
                        <Activity className="h-2.5 w-2.5 mr-0.5 text-purple-400" />
                        Signal & Engagement
                      </h5>
                      <div className="grid grid-cols-3 gap-1">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-0.5">
                            <span className="text-[12px] text-gray-300 w-16">
                              Twitter
                            </span>
                            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-400"
                                style={{ width: '85%' }}
                              ></div>
                            </div>
                            <span className="text-[12px] text-blue-400 font-medium ml-0.5">
                              85%
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <span className="text-[12px] text-gray-300 w-16">
                              Reddit
                            </span>
                            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-400"
                                style={{ width: '72%' }}
                              ></div>
                            </div>
                            <span className="text-[12px] text-orange-400 font-medium ml-0.5">
                              72%
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <span className="text-[12px] text-gray-300 w-16">
                              Discord
                            </span>
                            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-400"
                                style={{ width: '68%' }}
                              ></div>
                            </div>
                            <span className="text-[12px] text-indigo-400 font-medium ml-0.5">
                              68%
                            </span>
                          </div>
                        </div>

                        {/* Metrics in grid for consistent appearance - rows of 3 items */}
                        <div className="col-span-2 grid grid-cols-3 gap-0.5">
                          {/* First row: Posts, Likes, Shares */}
                          <div className="bg-gray-800/50 rounded p-1 flex items-center justify-center">
                            <MessageCircle className="h-2.5 w-2.5 text-[#209ce9] mr-1" />
                            <div className="text-[10px] text-gray-300 mr-1">
                              Posts:
                            </div>
                            <div className="text-[14px] font-medium text-white">
                              {socialMetrics.engagement.posts}
                            </div>
                          </div>

                          <div className="bg-gray-800/50 rounded p-1 flex items-center justify-center">
                            <ThumbsUp className="h-2.5 w-2.5 text-green-400 mr-1" />
                            <div className="text-[10px] text-gray-300 mr-1">
                              Likes:
                            </div>
                            <div className="text-[14px] font-medium text-white">
                              {socialMetrics.engagement.likes}
                            </div>
                          </div>

                          <div className="bg-gray-800/50 rounded p-1 flex items-center justify-center">
                            <Share2 className="h-2.5 w-2.5 text-blue-400 mr-1" />
                            <div className="text-[10px] text-gray-300 mr-1">
                              Shares:
                            </div>
                            <div className="text-[14px] font-medium text-white">
                              {socialMetrics.engagement.shares}
                            </div>
                          </div>

                          {/* Second row: Daily, Weekly, Monthly */}
                          <div className="bg-gray-800/50 rounded p-1 flex items-center justify-center">
                            <Activity className="h-2.5 w-2.5 text-amber-400 mr-1" />
                            <div className="text-[10px] text-gray-300 mr-1">
                              Daily:
                            </div>
                            <div className="text-[14px] font-medium text-green-400">
                              +12%
                            </div>
                          </div>

                          <div className="bg-gray-800/50 rounded p-1 flex items-center justify-center">
                            <BarChart2 className="h-2.5 w-2.5 text-purple-400 mr-1" />
                            <div className="text-[10px] text-gray-300 mr-1">
                              Weekly:
                            </div>
                            <div className="text-[14px] font-medium text-green-400">
                              +28%
                            </div>
                          </div>

                          <div className="bg-gray-800/50 rounded p-1 flex items-center justify-center">
                            <TrendingUp className="h-2.5 w-2.5 text-cyan-400 mr-1" />
                            <div className="text-[10px] text-gray-300 mr-1">
                              Monthly:
                            </div>
                            <div className="text-[14px] font-medium text-green-400">
                              +63%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Combined Geographic Distribution & Impact Score - Enhanced */}
                    <div className="col-span-2 bg-gradient-to-b from-black/80 to-black/60 rounded border border-[#209ce9]/20 shadow-[0_0_10px_rgba(32,156,233,0.1)] p-1">
                      <div className="grid grid-cols-[0.4fr_1.6fr_1fr_1fr] gap-2">
                        {/* Column 1: Mini world map - Made smaller and narrower */}
                        <div className="flex items-center justify-center h-full">
                          <div className="relative w-full h-full aspect-square border border-gray-800/30 rounded bg-black/30">
                            <div className="absolute top-[30%] left-[30%] w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-75"></div>
                            <div className="absolute top-[30%] left-[30%] w-2 h-2 bg-blue-400 rounded-full"></div>
                            <div className="absolute top-[50%] left-[50%] w-2 h-2 bg-green-400 rounded-full"></div>
                            <div className="absolute top-[30%] left-[60%] w-2 h-2 bg-purple-400 rounded-full"></div>
                            <div className="absolute top-[60%] left-[35%] w-2 h-2 bg-yellow-400 rounded-full"></div>

                            {/* Additional points */}
                            <div className="absolute top-[35%] left-[15%] w-1.5 h-1.5 bg-blue-200 rounded-full"></div>
                            <div className="absolute top-[15%] left-[45%] w-1.5 h-1.5 bg-green-200 rounded-full"></div>
                            <div className="absolute top-[75%] left-[25%] w-1.5 h-1.5 bg-purple-200 rounded-full"></div>
                            <div className="absolute top-[45%] left-[75%] w-1.5 h-1.5 bg-yellow-200 rounded-full"></div>
                            <div className="absolute top-[70%] left-[70%] w-1.5 h-1.5 bg-red-300 rounded-full"></div>
                            <div className="absolute top-[15%] left-[75%] w-1.5 h-1.5 bg-cyan-300 rounded-full"></div>

                            {/* Map grid lines */}
                            <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-gray-800/30"></div>
                            <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-gray-800/30"></div>
                          </div>
                        </div>

                        {/* Column 2: Region bars - More space for labels */}
                        <div className="flex flex-col gap-1 justify-center">
                          <div className="grid grid-cols-2 gap-3">
                            {/* First row: NA and EU */}
                            <div className="flex items-center">
                              <span className="text-[14px] text-gray-300 w-16 mr-1">
                                N.A:
                              </span>
                              <div className="w-14 h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-400"
                                  style={{ width: '48%' }}
                                ></div>
                              </div>
                              <span className="text-[14px] text-white ml-2 w-10 text-right">
                                48%
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-[14px] text-gray-300 w-16 mr-1">
                                EU:
                              </span>
                              <div className="w-14 h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-400"
                                  style={{ width: '32%' }}
                                ></div>
                              </div>
                              <span className="text-[14px] text-white ml-2 w-10 text-right">
                                32%
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {/* Second row: ASIA and OTHER */}
                            <div className="flex items-center">
                              <span className="text-[14px] text-gray-300 w-16 mr-1">
                                ASIA:
                              </span>
                              <div className="w-14 h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-400"
                                  style={{ width: '15%' }}
                                ></div>
                              </div>
                              <span className="text-[14px] text-white ml-2 w-10 text-right">
                                15%
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-[14px] text-gray-300 w-16 mr-1">
                                OTHER:
                              </span>
                              <div className="w-14 h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-yellow-400"
                                  style={{ width: '5%' }}
                                ></div>
                              </div>
                              <span className="text-[14px] text-white ml-2 w-10 text-right">
                                5%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Column 3: Impact score */}
                        <div className="flex items-center justify-center">
                          <div className="relative">
                            <svg
                              viewBox="0 0 36 36"
                              className="w-16 h-16 transform -rotate-90"
                            >
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#444"
                                strokeWidth="1"
                                strokeDasharray="100, 100"
                              />
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#06b6d4"
                                strokeWidth="3"
                                strokeDasharray="92, 100"
                                className="stroke-cyan-500"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-xl font-bold text-white">
                                92
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Column 4: Impact metrics - Excellent and Top 5% in one row */}
                        <div className="flex flex-col justify-between">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[16px] text-cyan-400 font-medium">
                              Excellent
                            </span>
                            <span className="text-[14px] text-gray-400">
                              Top 5%
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 mt-1">
                            <div className="flex items-center bg-gray-800/30 rounded px-2 py-1">
                              <div className="w-2 h-2 rounded-full bg-cyan-500 mr-1"></div>
                              <div>
                                <div className="text-[12px] text-gray-400">
                                  Growth
                                </div>
                                <div className="text-[14px] text-cyan-500">
                                  +12%
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center bg-gray-800/30 rounded px-2 py-1">
                              <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                              <div>
                                <div className="text-[12px] text-gray-400">
                                  Trust
                                </div>
                                <div className="text-[14px] text-green-500">
                                  High
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitHubStatsOverlay;
