// GitHub API helper functions

// Function to fetch repository data
export async function fetchRepoData(owner: string, repo: string) {
  try {
    // This is a mock implementation since we're not connecting to the real GitHub API
    // In a real application, you would make actual API calls here

    // Mock data based on nano-node repository
    return {
      repo: {
        name: repo,
        stars: 6328,
        forks: 992,
        watchers: 325,
        open_issues: 186,
        description:
          'Nano is a cryptocurrency with ultrafast transactions and zero fees over a secure, decentralized network.',
        updated_at: new Date().toISOString()
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
        },
        {
          login: 'argakiig',
          contributions: 212,
          avatar_url: 'https://avatars.githubusercontent.com/u/14989356?v=4'
        },
        {
          login: 'SergiySW',
          contributions: 187,
          avatar_url: 'https://avatars.githubusercontent.com/u/14818357?v=4'
        },
        {
          login: 'zhyatt',
          contributions: 156,
          avatar_url: 'https://avatars.githubusercontent.com/u/8842945?v=4'
        }
      ],
      languages: {
        C: 53.4,
        'C++': 42.3,
        CMake: 3.2,
        Python: 0.7,
        Shell: 0.4
      },
      recent_commits: generateMockCommits(),
      pull_requests: {
        open: 24,
        closed: 1837,
        merged: 1612
      },
      issues: {
        open: 162,
        closed: 1973
      },
      commits_last_year: 1583
    };
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
    throw error;
  }
}

// Helper function to generate mock commit data
function generateMockCommits() {
  const authors = [
    'rkeene',
    'clemahieu',
    'wezrule',
    'guilhermelawless',
    'cryptocode',
    'argakiig',
    'SergiySW'
  ];

  const commitTypes = [
    'Fix',
    'Update',
    'Add',
    'Improve',
    'Remove',
    'Refactor',
    'Optimize'
  ];

  const components = [
    'node',
    'wallet',
    'RPC',
    'telemetry',
    'bootstrap peers',
    'block processing',
    'vote handling',
    'consensus algorithm',
    'memory management',
    'TCP connection handler',
    'config options'
  ];

  const commits = [];
  const now = new Date();

  for (let i = 0; i < 10; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const author = authors[Math.floor(Math.random() * authors.length)];
    const type = commitTypes[Math.floor(Math.random() * commitTypes.length)];
    const component = components[Math.floor(Math.random() * components.length)];

    commits.push({
      message: `${type} ${component}`,
      author,
      date: date.toISOString()
    });
  }

  return commits;
}
