// components/community/ScenarioMarketplace.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Rating,
  Avatar,
  Divider,
  Menu,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search,
  FilterList,
  Star,
  StarBorder,
  Download,
  Share,
  Favorite,
  FavoriteBorder,
  CloudDownload,
  Sort,
  FlightTakeoff,
  School,
  Warning,
} from '@mui/icons-material';

interface Scenario {
  id: string;
  title: string;
  description: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    organization?: string;
  };
  category: string;
  tags: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  rating: number;
  reviews: number;
  downloads: number;
  price: number | null; // null for free
  thumbnail?: string;
  isFavorite: boolean;
  isPurchased: boolean;
  aircraft: string[];
  createdAt: string;
  updatedAt: string;
}

export const ScenarioMarketplace: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    {
      id: 'scenario-1',
      title: 'Engine Failure After Takeoff',
      description: 'Practice handling of engine failure shortly after takeoff from KJFK with deteriorating weather conditions.',
      author: {
        id: 'author-1',
        name: 'Capt. Sarah Johnson',
        organization: 'Global Training Academy',
      },
      category: 'Emergency',
      tags: ['Engine Failure', 'B737', 'EASA'],
      difficulty: 4,
      rating: 4.7,
      reviews: 128,
      downloads: 2345,
      price: null,
      isFavorite: true,
      isPurchased: true,
      aircraft: ['B737-800'],
      createdAt: '2023-06-15T14:30:00Z',
      updatedAt: '2023-07-10T09:15:00Z',
    },
    {
      id: 'scenario-2',
      title: 'Dual Hydraulic System Failure',
      description: 'Management of complex hydraulic failures requiring crew coordination and manual reversion techniques.',
      author: {
        id: 'author-2',
        name: 'John Miller',
        organization: 'Airbus Training Center',
      },
      category: 'Emergency',
      tags: ['Hydraulic Failure', 'A320', 'FAA'],
      difficulty: 5,
      rating: 4.9,
      reviews: 87,
      downloads: 1562,
      price: 24.99,
      isFavorite: false,
      isPurchased: false,
      aircraft: ['A320', 'A321'],
      createdAt: '2023-05-22T10:15:00Z',
      updatedAt: '2023-07-05T16:30:00Z',
    },
    {
      id: 'scenario-3',
      title: 'RNAV Approach with Low Visibility',
      description: 'Practice RNAV approaches in challenging weather conditions with various ATC scenarios.',
      author: {
        id: 'author-3',
        name: 'Maria Garcia',
        avatar: 'https://randomuser.me/api/portraits/women/42.jpg',
        organization: 'PrecisionFlight Academy',
      },
      category: 'Approach',
      tags: ['RNAV', 'Low Visibility', 'B777', 'ICAO'],
      difficulty: 3,
      rating: 4.5,
      reviews: 62,
      downloads: 1128,
      price: 19.99,
      isFavorite: true,
      isPurchased: true,
      aircraft: ['B777-300ER'],
      createdAt: '2023-04-10T09:45:00Z',
      updatedAt: '2023-06-22T11:20:00Z',
    },
    {
      id: 'scenario-4',
      title: 'CRM Challenging Scenarios Pack',
      description: 'Collection of scenarios designed to test crew resource management skills in challenging situations.',
      author: {
        id: 'author-1',
        name: 'Capt. Sarah Johnson',
        organization: 'Global Training Academy',
      },
      category: 'CRM',
      tags: ['CRM', 'Multi-crew', 'B737', 'A320', 'EASA'],
      difficulty: 4,
      rating: 4.8,
      reviews: 95,
      downloads: 1876,
      price: 39.99,
      isFavorite: false,
      isPurchased: false,
      aircraft: ['B737-800', 'A320'],
      createdAt: '2023-03-15T14:30:00Z',
      updatedAt: '2023-07-01T09:15:00Z',
    },
  ]);

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleSortClick = (event: React.MouseEvent<HTMLElement>) => {
    setSortAnchorEl(event.currentTarget);
  };

  const handleCloseMenus = () => {
    setFilterAnchorEl(null);
    setSortAnchorEl(null);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    handleCloseMenus();
  };

  const handleToggleFavorite = (scenarioId: string) => {
    setScenarios(
      scenarios.map((scenario) =>
        scenario.id === scenarioId
          ? { ...scenario, isFavorite: !scenario.isFavorite }
          : scenario
      )
    );
  };

  const filteredScenarios = scenarios.filter((scenario) => {
    // Apply tab filters
    if (activeTab === 1 && !scenario.isPurchased) return false;
    if (activeTab === 2 && !scenario.isFavorite) return false;
    
    // Apply category filter
    if (selectedCategory && scenario.category !== selectedCategory) return false;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        scenario.title.toLowerCase().includes(query) ||
        scenario.description.toLowerCase().includes(query) ||
        scenario.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        scenario.aircraft.some((aircraft) => aircraft.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  const difficultyLabels: Record<number, string> = {
    1: 'Very Easy',
    2: 'Easy',
    3: 'Moderate',
    4: 'Difficult',
    5: 'Very Difficult',
  };

  return (
    <Box>
      <Box className="flex justify-between items-center mb-6">
        <Typography variant="h5">Training Scenario Marketplace</Typography>
        <Button variant="contained" color="primary" startIcon={<FlightTakeoff />}>
          Submit New Scenario
        </Button>
      </Box>

      <Box className="mb-6">
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search scenarios..."
              variant="outlined"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box className="flex gap-2">
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                onClick={handleFilterClick}
                fullWidth
              >
                {selectedCategory || 'All Categories'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<Sort />}
                onClick={handleSortClick}
                fullWidth
              >
                Sort By: Popularity
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Box className="mb-6">
        <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
          <Tab label="All Scenarios" />
          <Tab label="My Scenarios" />
          <Tab label="Favorites" />
        </Tabs>
      </Box>

      {filteredScenarios.length === 0 ? (
        <Box className="text-center py-12">
          <Typography variant="h6" color="textSecondary">
            No scenarios found matching your criteria
          </Typography>
          <Button
            variant="text"
            color="primary"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory(null);
              setActiveTab(0);
            }}
            className="mt-3"
          >
            Clear Filters
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredScenarios.map((scenario) => (
            <Grid item xs={12} sm={6} lg={4} key={scenario.id}>
              <Card className="h-full flex flex-col">
                <Box 
                  className="h-48 bg-gray-200 relative"
                  style={{
                    backgroundImage: scenario.thumbnail ? `url(${scenario.thumbnail})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <Box className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-3">
                    <Box className="flex justify-between items-center">
                      <Chip 
                        label={scenario.category} 
                        size="small" 
                        color="primary" 
                      />
                      <Box className="flex">
                        <IconButton 
                          size="small" 
                          className="text-white"
                          onClick={() => handleToggleFavorite(scenario.id)}
                        >
                          {scenario.isFavorite ? (
                            <Favorite className="text-red-500" />
                          ) : (
                            <FavoriteBorder className="text-white" />
                          )}
                        </IconButton>
                      </Box>
                    </Box>
                    <Typography variant="h6" className="text-white mt-1">
                      {scenario.title}
                    </Typography>
                  </Box>
                </Box>
                
                <CardContent className="flex-grow">
                  <Box className="flex items-center mb-2">
                    <Rating 
                      value={scenario.rating} 
                      precision={0.1} 
                      readOnly 
                      size="small"
                    />
                    <Typography variant="body2" color="textSecondary" className="ml-1">
                      ({scenario.reviews})
                    </Typography>
                    <Box className="flex-grow" />
                    <Chip 
                      label={difficultyLabels[scenario.difficulty]} 
                      size="small" 
                      color={
                        scenario.difficulty <= 2 ? 'success' :
                        scenario.difficulty === 3 ? 'info' :
                        'warning'
                      }
                    />
                  </Box>
                  
                  <Typography variant="body2" color="textSecondary" className="mb-3 line-clamp-3">
                    {scenario.description}
                  </Typography>
                  
                  <Box className="flex flex-wrap gap-1 mb-3">
                    {scenario.tags.slice(0, 3).map((tag) => (
                      <Chip 
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                    {scenario.tags.length > 3 && (
                      <Chip 
                        label={`+${scenario.tags.length - 3}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  
                  <Box className="flex items-center">
                    <Avatar 
                      src={scenario.author.avatar}
                      className="mr-2"
                      sx={{ width: 24, height: 24 }}
                    >
                      {scenario.author.name.charAt(0)}
                    </Avatar>
                    <Typography variant="body2" color="textSecondary">
                      {scenario.author.name}
                    </Typography>
                    
                    <Typography variant="caption" color="textSecondary" className="ml-auto">
                      {new Date(scenario.updatedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>
                
                <Divider />
                
                <CardActions>
                  <Box className="flex items-center mr-auto">
                    <CloudDownload fontSize="small" className="text-gray-500 mr-1" />
                    <Typography variant="body2" color="textSecondary">
                      {scenario.downloads}
                    </Typography>
                  </Box>
                  
                  <Typography 
                    variant="subtitle1" 
                    color="primary"
                    className="font-medium"
                  >
                    {scenario.price === null ? 'Free' : `$${scenario.price.toFixed(2)}`}
                  </Typography>
                  
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={scenario.isPurchased ? <Download /> : undefined}
                  >
                    {scenario.isPurchased ? 'Download' : 'Purchase'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Category Filter Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={handleCloseMenus}
      >
        <MenuItem 
          onClick={() => handleCategorySelect(null)}
          selected={selectedCategory === null}
        >
          All Categories
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => handleCategorySelect('Emergency')}
          selected={selectedCategory === 'Emergency'}
        >
          Emergency Procedures
        </MenuItem>
        <MenuItem 
          onClick={() => handleCategorySelect('Approach')}
          selected={selectedCategory === 'Approach'}
        >
          Approach Procedures
        </MenuItem>
        <MenuItem 
          onClick={() => handleCategorySelect('CRM')}
          selected={selectedCategory === 'CRM'}
        >
          CRM Scenarios
        </MenuItem>
        <MenuItem 
          onClick={() => handleCategorySelect('Technical')}
          selected={selectedCategory === 'Technical'}
        >
          Technical Training
        </MenuItem>
      </Menu>

      {/* Sort Menu */}
      <Menu
        anchorEl={sortAnchorEl}
        open={Boolean(sortAnchorEl)}
        onClose={handleCloseMenus}
      >
        <MenuItem onClick={handleCloseMenus}>
          Popularity
        </MenuItem>
        <MenuItem onClick={handleCloseMenus}>
          Highest Rated
        </MenuItem>
        <MenuItem onClick={handleCloseMenus}>
          Newest
        </MenuItem>
        <MenuItem onClick={handleCloseMenus}>
          Price: Low to High
        </MenuItem>
        <MenuItem onClick={handleCloseMenus}>
          Price: High to Low
        </MenuItem>
      </Menu>
    </Box>
  );
};

// components/community/ForumDiscussions.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  Divider,
  Button,
  TextField,
  Avatar,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
} from '@mui/material';
import {
  ChatBubble,
  ThumbUp,
  ThumbUpOutlined,
  MoreVert,
  Forum,
  Sort,
  Add,
  Search,
  FilterList,
  Close,
  Person,
  School,
} from '@mui/icons-material';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
    organization?: string;
  };
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  replies: number;
  views: number;
  likes: number;
  isLiked: boolean;
  isPinned: boolean;
  isResolved: boolean;
  lastReplyBy?: {
    id: string;
    name: string;
    avatar?: string;
  };
  lastReplyAt?: string;
}

export const ForumDiscussions: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [newPostDialogOpen, setNewPostDialogOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('');
  const [newPostTags, setNewPostTags] = useState('');

  const [posts, setPosts] = useState<ForumPost[]>([
    {
      id: 'post-1',
      title: 'Handling engine failure during cruise - best practices',
      content: 'I\'ve been practicing engine failure scenarios and wanted to share some techniques that helped me improve my response time...',
      author: {
        id: 'user-1',
        name: 'John Miller',
        role: 'Instructor',
        organization: 'Global Aviation Academy',
      },
      category: 'Emergency Procedures',
      tags: ['Engine Failure', 'B737', 'Cruise'],
      createdAt: '2023-08-10T14:30:00Z',
      updatedAt: '2023-08-10T14:30:00Z',
      replies: 24,
      views: 342,
      likes: 56,
      isLiked: true,
      isPinned: true,
      isResolved: true,
      lastReplyBy: {
        id: 'user-3',
        name: 'Sarah Johnson',
      },
      lastReplyAt: '2023-08-15T09:45:00Z',
    },
    {
      id: 'post-2',
      title: 'Questions about cross-wind landing techniques on A320',
      content: 'I\'m having difficulty with consistent cross-wind landings on the A320. Specifically, I\'m struggling with the transition from crab to...',
      author: {
        id: 'user-2',
        name: 'Maria Garcia',
        avatar: 'https://randomuser.me/api/portraits/women/42.jpg',
        role: 'Trainee',
        organization: 'AirEurope',
      },
      category: 'Landing Techniques',
      tags: ['A320', 'Crosswind', 'Landing'],
      createdAt: '2023-08-12T10:15:00Z',
      updatedAt: '2023-08-12T10:15:00Z',
      replies: 18,
      views: 276,
      likes: 32,
      isLiked: false,
      isPinned: false,
      isResolved: false,
      lastReplyBy: {
        id: 'user-4',
        name: 'Robert Chen',
        avatar: 'https://randomuser.me/api/portraits/men/35.jpg',
      },
      lastReplyAt: '2023-08-16T11:20:00Z',
    },
    {
      id: 'post-3',
      title: 'Understanding MCAS on the 737 MAX',
      content: 'I\'m trying to better understand the MCAS system on the 737 MAX. Can someone explain how it differs from traditional stall protection systems and what...',
      author: {
        id: 'user-3',
        name: 'Sarah Johnson',
        role: 'Instructor',
        organization: 'Aviation Training International',
      },
      category: 'Aircraft Systems',
      tags: ['B737-MAX', 'MCAS', 'Systems'],
      createdAt: '2023-08-08T16:45:00Z',
      updatedAt: '2023-08-08T16:45:00Z',
      replies: 32,
      views: 510,
      likes: 78,
      isLiked: true,
      isPinned: false,
      isResolved: true,
      lastReplyBy: {
        id: 'user-1',
        name: 'John Miller',
      },
      lastReplyAt: '2023-08-15T14:30:00Z',
    },
    {
      id: 'post-4',
      title: 'Tips for organizing flight bag and documents',
      content: 'I\'m a new trainee and looking for advice on how experienced pilots organize their documents, charts, and other materials...',
      author: {
        id: 'user-4',
        name: 'Robert Chen',
        avatar: 'https://randomuser.me/api/portraits/men/35.jpg',
        role: 'Trainee',
        organization: 'Pacific Airways',
      },
      category: 'General Discussion',
      tags: ['Organization', 'EFB', 'Flight Deck'],
      createdAt: '2023-08-14T09:30:00Z',
      updatedAt: '2023-08-14T09:30:00Z',
      replies: 12,
      views: 198,
      likes: 24,
      isLiked: false,
      isPinned: false,
      isResolved: false,
      lastReplyBy: {
        id: 'user-2',
        name: 'Maria Garcia',
        avatar: 'https://randomuser.me/api/portraits/women/42.jpg',
      },
      lastReplyAt: '2023-08-16T08:15:00Z',
    },
  ]);

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleSortClick = (event: React.MouseEvent<HTMLElement>) => {
    setSortAnchorEl(event.currentTarget);
  };

  const handleCloseMenus = () => {
    setFilterAnchorEl(null);
    setSortAnchorEl(null);
  };

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    handleCloseMenus();
  };

  const handleToggleLike = (postId: string) => {
    setPosts(
      posts.map((post) =>
        post.id === postId
          ? { 
              ...post, 
              isLiked: !post.isLiked, 
              likes: post.isLiked ? post.likes - 1 : post.likes + 1 
            }
          : post
      )
    );
  };

  const handleNewPostSubmit = () => {
    // In a real app, you would submit to API
    // For demo, just close the dialog
    setNewPostDialogOpen(false);
    setNewPostTitle('');
    setNewPostContent('');
    setNewPostCategory('');
    setNewPostTags('');
  };

  const filteredPosts = posts.filter((post) => {
    // Apply category filter
    if (selectedCategory && post.category !== selectedCategory) return false;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        post.title.toLowerCase().includes(query) ||
        post.content.toLowerCase().includes(query) ||
        post.author.name.toLowerCase().includes(query) ||
        post.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  // Sort posts: pinned first, then by last activity
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    // Pinned posts first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    
    // Then by last activity (either last reply or post update)
    const aLastActivity = a.lastReplyAt || a.updatedAt;
    const bLastActivity = b.lastReplyAt || b.updatedAt;
    return new Date(bLastActivity).getTime() - new Date(aLastActivity).getTime();
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 6) {
      return date.toLocaleDateString();
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <Box>
      <Box className="flex justify-between items-center mb-6">
        <Typography variant="h5">Community Forum</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<Add />}
          onClick={() => setNewPostDialogOpen(true)}
        >
          New Discussion
        </Button>
      </Box>

      <Box className="mb-6 flex flex-wrap gap-3">
        <TextField
          placeholder="Search discussions..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <Search className="mr-2 text-gray-500" />
            ),
          }}
          className="flex-grow"
        />
        
        <Button
          variant="outlined"
          startIcon={<FilterList />}
          onClick={handleFilterClick}
        >
          {selectedCategory || 'All Categories'}
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<Sort />}
          onClick={handleSortClick}
        >
          Most Recent
        </Button>
      </Box>

      <Paper variant="outlined">
        <List className="p-0">
          {sortedPosts.length === 0 ? (
            <Box className="p-6 text-center">
              <Typography variant="subtitle1" color="textSecondary">
                No discussions found matching your criteria
              </Typography>
              <Button
                variant="text"
                color="primary"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                }}
                className="mt-3"
              >
                Clear Filters
              </Button>
            </Box>
          ) : (
            sortedPosts.map((post, index) => (
              <React.Fragment key={post.id}>
                {index > 0 && <Divider />}
                <ListItem
                  className={`p-4 hover:bg-gray-50 ${post.isPinned ? 'bg-blue-50' : ''}`}
                  button
                >
                  <Box className="flex w-full">
                    <Avatar
                      src={post.author.avatar}
                      className="mr-3"
                    >
                      {post.author.name.charAt(0)}
                    </Avatar>
                    
                    <Box className="flex-grow">
                      <Box className="flex items-center mb-1">
                        {post.isPinned && (
                          <Chip 
                            label="Pinned" 
                            size="small" 
                            color="primary"
                            className="mr-2"
                          />
                        )}
                        {post.isResolved && (
                          <Chip 
                            label="Resolved" 
                            size="small" 
                            color="success"
                            className="mr-2"
                          />
                        )}
                        <Typography variant="h6">
                          {post.title}
                        </Typography>
                      </Box>
                      
                      <Typography 
                        variant="body2" 
                        color="textSecondary"
                        className="line-clamp-1 mb-2"
                      >
                        {post.content}
                      </Typography>
                      
                      <Box className="flex flex-wrap gap-1 mb-2">
                        <Chip
                          label={post.category}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        {post.tags.slice(0, 2).map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                        {post.tags.length > 2 && (
                          <Chip
                            label={`+${post.tags.length - 2}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      
                      <Box className="flex items-center text-sm text-gray-500">
                        <Typography variant="body2" className="flex items-center">
                          <Person fontSize="small" className="mr-1" />
                          {post.author.name}
                          {post.author.role === 'Instructor' && (
                            <Chip
                              label="Instructor"
                              size="small"
                              color="secondary"
                              icon={<School />}
                              className="ml-2"
                            />
                          )}
                        </Typography>
                        
                        <Typography variant="body2" className="ml-4">
                          {post.lastReplyAt ? 'Last reply' : 'Posted'}: {formatDate(post.lastReplyAt || post.createdAt)}
                          {post.lastReplyBy && ` by ${post.lastReplyBy.name}`}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box className="flex flex-col items-end justify-between ml-4">
                      <Box className="flex items-center">
                        <Box className="flex items-center mr-3">
                          <ChatBubble fontSize="small" className="text-gray-500 mr-1" />
                          <Typography variant="body2">{post.replies}</Typography>
                        </Box>
                        
                        <Box className="flex items-center">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleLike(post.id);
                            }}
                          >
                            {post.isLiked ? (
                              <ThumbUp color="primary" fontSize="small" />
                            ) : (
                              <ThumbUpOutlined fontSize="small" />
                            )}
                          </IconButton>
                          <Typography variant="body2">{post.likes}</Typography>
                        </Box>
                      </Box>
                      
                      <Typography variant="caption" color="textSecondary">
                        {post.views} views
                      </Typography>
                    </Box>
                  </Box>
                </ListItem>
              </React.Fragment>
            ))
          )}
        </List>
      </Paper>

      {/* Category Filter Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={handleCloseMenus}
      >
        <MenuItem 
          onClick={() => handleCategorySelect(null)}
          selected={selectedCategory === null}
        >
          All Categories
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => handleCategorySelect('Emergency Procedures')}
          selected={selectedCategory === 'Emergency Procedures'}
        >
          Emergency Procedures
        </MenuItem>
        <MenuItem 
          onClick={() => handleCategorySelect('Landing Techniques')}
          selected={selectedCategory === 'Landing Techniques'}
        >
          Landing Techniques
        </MenuItem>
        <MenuItem 
          onClick={() => handleCategorySelect('Aircraft Systems')}
          selected={selectedCategory === 'Aircraft Systems'}
        >
          Aircraft Systems
        </MenuItem>
        <MenuItem 
          onClick={() => handleCategorySelect('General Discussion')}
          selected={selectedCategory === 'General Discussion'}
        >
          General Discussion
        </MenuItem>
      </Menu>

      {/* Sort Menu */}
      <Menu
        anchorEl={sortAnchorEl}
        open={Boolean(sortAnchorEl)}
        onClose={handleCloseMenus}
      >
        <MenuItem onClick={handleCloseMenus}>
          Most Recent
        </MenuItem>
        <MenuItem onClick={handleCloseMenus}>
          Most Popular
        </MenuItem>
        <MenuItem onClick={handleCloseMenus}>
          Most Viewed
        </MenuItem>
        <MenuItem onClick={handleCloseMenus}>
          Most Replies
        </MenuItem>
      </Menu>

      {/* New Post Dialog */}
      <Dialog
        open={newPostDialogOpen}
        onClose={() => setNewPostDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Start New Discussion
          <IconButton
            onClick={() => setNewPostDialogOpen(false)}
            className="absolute right-2 top-2"
          >
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          <Box className="space-y-4">
            <TextField
              label="Title"
              variant="outlined"
              fullWidth
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
            />
            
            <TextField
              label="Content"
              variant="outlined"
              fullWidth
              multiline
              rows={6}
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
            />
            
            <Box className="flex gap-4">
              <TextField
                label="Category"
                variant="outlined"
                fullWidth
                select
                value={newPostCategory}
                onChange={(e) => setNewPostCategory(e.target.value)}
              >
                <MenuItem value="Emergency Procedures">Emergency Procedures</MenuItem>
                <MenuItem value="Landing Techniques">Landing Techniques</MenuItem>
                <MenuItem value="Aircraft Systems">Aircraft Systems</MenuItem>
                <MenuItem value="General Discussion">General Discussion</MenuItem>
              </TextField>
              
              <TextField
                label="Tags (comma separated)"
                variant="outlined"
                fullWidth
                value={newPostTags}
                onChange={(e) => setNewPostTags(e.target.value)}
                placeholder="e.g. B737, Crosswind, Landing"
              />
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setNewPostDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleNewPostSubmit}
            disabled={!newPostTitle || !newPostContent || !newPostCategory}
          >
            Post Discussion
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// components/gamification/AchievementTracker.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Tooltip,
  Avatar,
  Chip,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import {
  EmojiEvents,
  CheckCircle,
  Lock,
  Star,
  DirectionsRun,
  FlightTakeoff,
  School,
  Visibility,
  LocalFireDepartment,
} from '@mui/icons-material';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  progress: number; // 0-100
  isCompleted: boolean;
  isLocked: boolean;
  completedDate?: string;
  rewardPoints: number;
  nextMilestone?: {
    description: string;
    requiredValue: number;
    currentValue: number;
  };
}

export const AchievementTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: 'ach-1',
      title: 'Take-off Master',
      description: 'Complete 50 successful takeoffs across all aircraft types',
      icon: 'flight_takeoff',
      category: 'Flying Skills',
      progress: 100,
      isCompleted: true,
      isLocked: false,
      completedDate: '2023-07-15T14:30:00Z',
      rewardPoints: 500,
      nextMilestone: {
        description: 'Complete 100 successful takeoffs',
        requiredValue: 100,
        currentValue: 72,
      },
    },
    {
      id: 'ach-2',
      title: 'Emergency Response',
      description: 'Successfully handle 10 different emergency scenarios',
      icon: 'warning',
      category: 'Emergency Procedures',
      progress: 70,
      isCompleted: false,
      isLocked: false,
      rewardPoints: 1000,
      nextMilestone: {
        description: 'Handle emergency scenarios',
        requiredValue: 10,
        currentValue: 7,
      },
    },
    {
      id: 'ach-3',
      title: 'Perfect Landing',
      description: 'Achieve 25 landings with "excellent" grading',
      icon: 'flight_land',
      category: 'Flying Skills',
      progress: 40,
      isCompleted: false,
      isLocked: false,
      rewardPoints: 750,
      nextMilestone: {
        description: 'Excellent landings',
        requiredValue: 25,
        currentValue: 10,
      },
    },
    {
      id: 'ach-4',
      title: 'Systems Expert',
      description: 'Complete all aircraft systems training modules with perfect scores',
      icon: 'settings',
      category: 'Knowledge',
      progress: 0,
      isCompleted: false,
      isLocked: true,
      rewardPoints: 1500,
    },
    {
      id: 'ach-5',
      title: 'Crew Communication',
      description: 'Receive "excellent" CRM ratings in 15 sessions',
      icon: 'people',
      category: 'Soft Skills',
      progress: 60,
      isCompleted: false,
      isLocked: false,
      rewardPoints: 800,
      nextMilestone: {
        description: 'Excellent CRM ratings',
        requiredValue: 15,
        currentValue: 9,
      },
    },
    {
      id: 'ach-6',
      title: 'Weather Navigator',
      description: 'Successfully complete 10 approaches in adverse weather conditions',
      icon: 'cloud',
      category: 'Flying Skills',
      progress: 90,
      isCompleted: false,
      isLocked: false,
      rewardPoints: 1200,
      nextMilestone: {
        description: 'Approaches in adverse weather',
        requiredValue: 10,
        currentValue: 9,
      },
    },
  ]);

  const [streaks, setStreaks] = useState({
    current: 12,
    longest: 21,
    thisWeek: 5,
    lastCompleted: '2023-08-16T09:15:00Z',
  });

  const [leaderboard, setLeaderboard] = useState([
    {
      id: 'user-1',
      name: 'Alex Morgan',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      points: 8750,
      rank: 1,
      achievements: 27,
      isCurrentUser: false,
    },
    {
      id: 'user-2',
      name: 'Sarah Johnson',
      avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
      points: 8400,
      rank: 2,
      achievements: 25,
      isCurrentUser: false,
    },
    {
      id: 'user-3',
      name: 'John Smith',
      points: 7900,
      rank: 3,
      achievements: 24,
      isCurrentUser: true,
    },
    {
      id: 'user-4',
      name: 'Maria Garcia',
      avatar: 'https://randomuser.me/api/portraits/women/42.jpg',
      points: 7300,
      rank: 4,
      achievements: 22,
      isCurrentUser: false,
    },
    {
      id: 'user-5',
      name: 'Robert Chen',
      avatar: 'https://randomuser.me/api/portraits/men/35.jpg',
      points: 6800,
      rank: 5,
      achievements: 21,
      isCurrentUser: false,
    },
  ]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'flight_takeoff':
        return <FlightTakeoff />;
      case 'warning':
        return <Warning />;
      case 'flight_land':
        return <FlightTakeoff style={{ transform: 'rotate(180deg)' }} />;
      case 'settings':
        return <Settings />;
      case 'people':
        return <School />;
      case 'cloud':
        return <Cloud />;
      default:
        return <Star />;
    }
  };

  // Filter achievements based on tab
  const filteredAchievements = achievements.filter((ach) => {
    if (activeTab === 0) return true; // All
    if (activeTab === 1) return ach.isCompleted; // Completed
    if (activeTab === 2) return !ach.isCompleted && !ach.isLocked; // In Progress
    return ach.isLocked; // Locked
  });

  const completedCount = achievements.filter((ach) => ach.isCompleted).length;
  const totalCount = achievements.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  return (
    <Grid container spacing={4}>
      <Grid item xs={12} md={8}>
        <Paper elevation={2} className="overflow-hidden">
          <Box className="p-4 bg-blue-500 text-white">
            <Box className="flex items-center">
              <EmojiEvents className="mr-2" />
              <Typography variant="h6">Achievements & Milestones</Typography>
            </Box>
          </Box>
          
          <Box className="p-4">
            <Box className="flex justify-between items-center mb-4">
              <Box>
                <Typography variant="subtitle1" className="mb-1">
                  Overall Completion
                </Typography>
                <Box className="flex items-center">
                  <Typography variant="h5" className="mr-2">
                    {completionPercentage}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ({completedCount}/{totalCount} achievements)
                  </Typography>
                </Box>
              </Box>
              <Box className="flex items-center">
                <CircularProgress
                  variant="determinate"
                  value={completionPercentage}
                  size={60}
                  thickness={5}
                  color="primary"
                  className="mr-3"
                />
                <Box>
                  <Typography variant="subtitle2" color="primary">
                    Pilot Level: 14
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={75}
                    className="w-32 mt-1"
                  />
                  <Typography variant="caption" color="textSecondary">
                    7,900 / 10,000 XP to next level
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="fullWidth"
              className="mb-4"
            >
              <Tab label="All" />
              <Tab label="Completed" />
              <Tab label="In Progress" />
              <Tab label="Locked" />
            </Tabs>
            
            <Grid container spacing={3}>
              {filteredAchievements.map((achievement) => (
                <Grid item xs={12} sm={6} key={achievement.id}>
                  <Card
                    variant="outlined"
                    className={`h-full ${
                      achievement.isCompleted
                        ? 'border-green-300 bg-green-50'
                        : achievement.isLocked
                        ? 'border-gray-300 bg-gray-50'
                        : ''
                    }`}
                  >
                    <CardContent>
                      <Box className="flex items-start">
                        <Avatar
                          className={`mr-3 ${
                            achievement.isCompleted
                              ? 'bg-green-500'
                              : achievement.isLocked
                              ? 'bg-gray-400'
                              : 'bg-blue-500'
                          }`}
                        >
                          {achievement.isLocked ? (
                            <Lock />
                          ) : (
                            getIconComponent(achievement.icon)
                          )}
                        </Avatar>
                        
                        <Box className="flex-grow">
                          <Box className="flex items-center">
                            <Typography variant="subtitle1" className="mr-2">
                              {achievement.title}
                            </Typography>
                            {achievement.isCompleted && (
                              <CheckCircle className="text-green-500" fontSize="small" />
                            )}
                          </Box>
                          
                          <Chip
                            label={achievement.category}
                            size="small"
                            color="primary"
                            variant="outlined"
                            className="mb-2 mt-1"
                          />
                          
                          <Typography variant="body2" color="textSecondary" className="mb-2">
                            {achievement.description}
                          </Typography>
                          
                          {!achievement.isCompleted && !achievement.isLocked && achievement.nextMilestone && (
                            <Box className="mb-2">
                              <Box className="flex justify-between items-center mb-1">
                                <Typography variant="caption" color="textSecondary">
                                  {achievement.nextMilestone.description}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {achievement.nextMilestone.currentValue}/
                                  {achievement.nextMilestone.requiredValue}
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={(achievement.nextMilestone.currentValue / achievement.nextMilestone.requiredValue) * 100}
                              />
                            </Box>
                          )}
                          
                          <Box className="flex justify-between items-center">
                            {achievement.isCompleted ? (
                              <Typography variant="caption" color="textSecondary">
                                Completed on {formatDate(achievement.completedDate!)}
                              </Typography>
                            ) : achievement.isLocked ? (
                              <Typography variant="caption" color="error">
                                Complete previous achievements to unlock
                              </Typography>
                            ) : (
                              <Typography
                                variant="caption"
                                color="primary"
                                className="font-medium"
                              >
                                {achievement.progress}% complete
                              </Typography>
                            )}
                            
                            <Chip
                              label={`+${achievement.rewardPoints} XP`}
                              size="small"
                              className={achievement.isCompleted ? 'bg-green-100' : ''}
                            />
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Paper elevation={2} className="overflow-hidden">
              <Box className="p-3 bg-amber-500 text-white">
                <Box className="flex items-center">
                  <LocalFireDepartment className="mr-2" />
                  <Typography variant="h6">Training Streak</Typography>
                </Box>
              </Box>
              
              <Box className="p-4">
                <Box className="flex justify-between mb-3">
                  <Box className="text-center">
                    <Typography variant="h4" className="font-bold text-amber-500">
                      {streaks.current}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Current Streak
                    </Typography>
                  </Box>
                  
                  <Box className="text-center">
                    <Typography variant="h4" className="font-bold text-amber-500">
                      {streaks.longest}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Longest Streak
                    </Typography>
                  </Box>
                  
                  <Box className="text-center">
                    <Typography variant="h4" className="font-bold text-amber-500">
                      {streaks.thisWeek}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      This Week
                    </Typography>
                  </Box>
                </Box>
                
                <Typography variant="caption" color="textSecondary" className="block text-center">
                  Last completed: {formatDate(streaks.lastCompleted)}
                </Typography>
                
                <Button
                  variant="contained"
                  color="warning"
                  fullWidth
                  className="mt-3"
                >
                  Complete Today's Training
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12}>
            <Paper elevation={2} className="overflow-hidden">
              <Box className="p-3 bg-purple-500 text-white">
                <Box className="flex items-center">
                  <EmojiEvents className="mr-2" />
                  <Typography variant="h6">Leaderboard</Typography>
                </Box>
              </Box>
              
              <List>
                {leaderboard.map((user) => (
                  <ListItem
                    key={user.id}
                    className={user.isCurrentUser ? 'bg-blue-50' : ''}
                  >
                    <Box
                      className={`w-8 h-8 flex items-center justify-center mr-2 rounded-full ${
                        user.rank === 1
                          ? 'bg-amber-100 text-amber-800'
                          : user.rank === 2
                          ? 'bg-gray-200 text-gray-800'
                          : user.rank === 3
                          ? 'bg-amber-200 text-amber-800'
                          : 'bg-blue-50 text-blue-800'
                      }`}
                    >
                      {user.rank}
                    </Box>
                    
                    <ListItemAvatar>
                      <Avatar src={user.avatar}>
                        {user.name.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={
                        <Box className="flex items-center">
                          {user.name}
                          {user.isCurrentUser && (
                            <Chip
                              label="You"
                              size="small"
                              color="primary"
                              className="ml-2"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box className="flex items-center">
                          <Star className="text-amber-500 mr-1" fontSize="small" />
                          <Typography variant="body2">
                            {user.points.toLocaleString()} points • {user.achievements} achievements
                          </Typography>
                        </Box>
                      }
                    />
                    
                    <IconButton size="small">
                      <Visibility fontSize="small" />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
              
              <Box className="p-3 border-t">
                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                >
                  View Full Leaderboard
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

// components/gamification/DailyChallenge.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  LinearProgress,
  Avatar,
  Divider,
} from '@mui/material';
import {
  AccessTime,
  DirectionsRun,
  CheckCircle,
  StarOutline,
  Star,
  Check,
  FlightTakeoff,
  LocalAirport,
  NavigationOutlined,
  Cloud,
  Settings,
} from '@mui/icons-material';

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 1 | 2 | 3;
  xpReward: number;
  status: 'active' | 'completed' | 'expired';
  icon: JSX.Element;
  progress?: number;
  expiresAt?: string;
  completedAt?: string;
}

export const DailyChallenge: React.FC = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([
    {
      id: 'challenge-1',
      title: 'Crosswind Master',
      description: 'Complete 3 successful landings with crosswind components above 15 knots',
      category: 'Landing',
      difficulty: 3,
      xpReward: 500,
      status: 'active',
      icon: <NavigationOutlined />,
      progress: 67,
      expiresAt: '2023-08-17T23:59:59Z',
    },
    {
      id: 'challenge-2',
      title: 'System Malfunction',
      description: 'Successfully manage a dual hydraulic system failure scenario',
      category: 'Emergency',
      difficulty: 2,
      xpReward: 300,
      status: 'completed',
      icon: <Settings />,
      completedAt: '2023-08-16T14:30:00Z',
    },
    {
      id: 'challenge-3',
      title: 'Perfect Take-off',
      description: 'Perform a take-off with less than 2° deviation from centerline',
      category: 'Take-off',
      difficulty: 1,
      xpReward: 200,
      status: 'active',
      icon: <FlightTakeoff />,
      expiresAt: '2023-08-17T23:59:59Z',
    },
    {
      id: 'challenge-4',
      title: 'Adverse Weather Navigation',
      description: 'Complete a full flight in thunderstorm conditions without deviating from flight plan',
      category: 'Navigation',
      difficulty: 3,
      xpReward: 450,
      status: 'active',
      icon: <Cloud />,
      expiresAt: '2023-08-17T23:59:59Z',
    },
    {
      id: 'challenge-5',
      title: 'Fuel Efficiency',
      description: 'Complete a medium-haul flight with fuel consumption under target by 5%',
      category: 'Efficiency',
      difficulty: 2,
      xpReward: 350,
      status: 'active',
      icon: <LocalAirport />,
      expiresAt: '2023-08-18T23:59:59Z',
    },
  ]);

  const [showCompleted, setShowCompleted] = useState(false);

  const activeTime = new Date('2023-08-17T23:59:59Z').getTime();
  const currentTime = new Date().getTime();
  const timeRemaining = activeTime - currentTime;
  
  // Format time remaining in hours and minutes
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  const activeChallenges = challenges.filter(c => c.status === 'active');
  const completedChallenges = challenges.filter(c => c.status === 'completed');

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCompleteChallenge = (challengeId: string) => {
    setChallenges(
      challenges.map(challenge =>
        challenge.id === challengeId
          ? {
              ...challenge,
              status: 'completed',
              completedAt: new Date().toISOString(),
            }
          : challenge
      )
    );
  };

  return (
    <Box>
      <Box className="flex justify-between items-center mb-6">
        <Box>
          <Typography variant="h5">Daily Challenges</Typography>
          <Typography variant="body2" color="textSecondary">
            Complete challenges to earn XP and advance your pilot career
          </Typography>
        </Box>
        
        <Box className="flex items-center bg-blue-50 p-2 rounded">
          <AccessTime className="text-blue-500 mr-2" />
          <Typography variant="body1" className="font-medium">
            Challenges refresh in: {hoursRemaining}h {minutesRemaining}m
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} lg={8}>
          <Typography variant="h6" className="mb-3">
            Active Challenges
          </Typography>
          
          <Grid container spacing={3}>
            {activeChallenges.map((challenge) => (
              <Grid item xs={12} sm={6} key={challenge.id}>
                <Card className="h-full flex flex-col">
                  <CardContent className="flex-grow">
                    <Box className="flex items-start">
                      <Avatar
                        className={`mr-3 ${
                          challenge.difficulty === 1
                            ? 'bg-green-500'
                            : challenge.difficulty === 2
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        }`}
                      >
                        {challenge.icon}
                      </Avatar>
                      
                      <Box className="flex-grow">
                        <Box className="flex justify-between items-start">
                          <Typography variant="subtitle1">{challenge.title}</Typography>
                          <Chip
                            label={`${challenge.difficulty === 1 ? 'Easy' : challenge.difficulty === 2 ? 'Medium' : 'Hard'}`}
                            size="small"
                            color={
                              challenge.difficulty === 1
                                ? 'success'
                                : challenge.difficulty === 2
                                ? 'warning'
                                : 'error'
                            }
                          />
                        </Box>
                        
                        <Chip
                          label={challenge.category}
                          size="small"
                          variant="outlined"
                          className="my-1"
                        />
                        
                        <Typography variant="body2" color="textSecondary" className="mb-3">
                          {challenge.description}
                        </Typography>
                        
                        {challenge.progress !== undefined && (
                          <Box className="mb-1">
                            <Box className="flex justify-between items-center mb-1">
                              <Typography variant="caption" color="textSecondary">
                                Progress
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {challenge.progress}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={challenge.progress}
                            />
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                  
                  <Divider />
                  
                  <CardActions className="bg-gray-50">
                    <Box className="flex items-center mr-auto">
                      <Star className="text-amber-500 mr-1" />
                      <Typography variant="body2" className="font-medium">
                        +{challenge.xpReward} XP
                      </Typography>
                    </Box>
                    
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={() => handleCompleteChallenge(challenge.id)}
                      startIcon={<Check />}
                    >
                      Complete
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          <Box className="mt-6">
            <Button
              variant="outlined"
              onClick={() => setShowCompleted(!showCompleted)}
              className="mb-3"
            >
              {showCompleted ? 'Hide Completed' : 'Show Completed'} ({completedChallenges.length})
            </Button>
            
            {showCompleted && (
              <Grid container spacing={3}>
                {completedChallenges.map((challenge) => (
                  <Grid item xs={12} sm={6} key={challenge.id}>
                    <Card className="h-full bg-gray-50">
                      <CardContent>
                        <Box className="flex items-start">
                          <Avatar className="mr-3 bg-green-500">
                            <CheckCircle />
                          </Avatar>
                          
                          <Box className="flex-grow">
                            <Box className="flex justify-between items-start">
                              <Typography variant="subtitle1">{challenge.title}</Typography>
                              <Chip
                                label="Completed"
                                size="small"
                                color="success"
                              />
                            </Box>
                            
                            <Chip
                              label={challenge.category}
                              size="small"
                              variant="outlined"
                              className="my-1"
                            />
                            
                            <Typography variant="body2" color="textSecondary" className="mb-2">
                              {challenge.description}
                            </Typography>
                            
                            <Typography variant="caption" color="textSecondary">
                              Completed on: {formatDate(challenge.completedAt!)}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                      
                      <Divider />
                      
                      <CardActions>
                        <Box className="flex items-center mr-auto">
                          <Star className="text-amber-500 mr-1" />
                          <Typography variant="body2" className="font-medium">
                            +{challenge.xpReward} XP
                          </Typography>
                        </Box>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Grid>
        
        <Grid item xs={12} lg={4}>
          <Paper elevation={2} className="overflow-hidden">
            <Box className="p-3 bg-purple-500 text-white">
              <Typography variant="h6">Challenge Statistics</Typography>
            </Box>
            
            <Box className="p-4">
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper variant="outlined" className="p-3 text-center h-full">
                    <Typography variant="h4" className="font-bold text-blue-500">
                      {completedChallenges.length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Completed Today
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={6}>
                  <Paper variant="outlined" className="p-3 text-center h-full">
                    <Typography variant="h4" className="font-bold text-amber-500">
                      {completedChallenges.reduce((sum, c) => sum + c.xpReward, 0)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      XP Earned Today
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={6}>
                  <Paper variant="outlined" className="p-3 text-center h-full">
                    <Typography variant="h4" className="font-bold text-green-500">
                      87%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Completion Rate
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={6}>
                  <Paper variant="outlined" className="p-3 text-center h-full">
                    <Typography variant="h4" className="font-bold text-purple-500">
                      12
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Day Streak
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
              
              <Box className="mt-4">
                <Typography variant="subtitle2" className="mb-2">
                  Weekly Progress
                </Typography>
                <Box className="flex justify-between">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                    <Box key={day} className="text-center">
                      <Box
                        className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 mx-auto ${
                          index < 3
                            ? 'bg-green-500 text-white'
                            : index === 3
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200'
                        }`}
                      >
                        {index < 4 ? <Check /> : null}
                      </Box>
                      <Typography variant="caption">{day}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              
              <Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={<Star />}
                className="mt-4"
              >
                View All Achievements
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// app/community/page.tsx
'use client';

import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Paper 
} from '@mui/material';
import { ScenarioMarketplace } from '@/components/community/ScenarioMarketplace';
import { ForumDiscussions } from '@/components/community/ForumDiscussions';

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box className="py-6">
        <Typography variant="h4" className="mb-6">Community & Knowledge Sharing</Typography>
        
        <Paper elevation={1} className="mb-6">
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Scenario Marketplace" />
            <Tab label="Discussion Forum" />
            <Tab label="Knowledge Base" />
            <Tab label="Instructor Insights" />
          </Tabs>
        </Paper>
        
        {activeTab === 0 && <ScenarioMarketplace />}
        {activeTab === 1 && <ForumDiscussions />}
        {activeTab === 2 && (
          <Typography variant="body1">Knowledge Base Tab Content</Typography>
        )}
        {activeTab === 3 && (
          <Typography variant="body1">Instructor Insights Tab Content</Typography>
        )}
      </Box>
    </Container>
  );
};

// app/gamification/page.tsx
'use client';

import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Paper 
} from '@mui/material';
import { AchievementTracker } from '@/components/gamification/AchievementTracker';
import { DailyChallenge } from '@/components/gamification/DailyChallenge';

export default function GamificationPage() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box className="py-6">
        <Typography variant="h4" className="mb-6">Training Gamification</Typography>
        
        <Paper elevation={1} className="mb-6">
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Achievements & Milestones" />
            <Tab label="Daily Challenges" />
            <Tab label="Training Path" />
            <Tab label="Rewards" />
          </Tabs>
        </Paper>
        
        {activeTab === 0 && <AchievementTracker />}
        {activeTab === 1 && <DailyChallenge />}
        {activeTab === 2 && (
          <Typography variant="body1">Training Path Tab Content</Typography>
        )}
        {activeTab === 3 && (
          <Typography variant="body1">Rewards Tab Content</Typography>
        )}
      </Box>
    </Container>
  );
};
