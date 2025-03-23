// components/debriefing/SessionReplayPlayer.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  IconButton,
  Tooltip,
  Grid,
  Divider,
  Chip,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  FastForward,
  FastRewind,
  SkipNext,
  SkipPrevious,
  Flag,
  Bookmark,
  FlagOutlined,
  BookmarkOutlined,
} from '@mui/icons-material';

interface TimelineEvent {
  id: string;
  timestamp: number; // in seconds
  type: 'flag' | 'bookmark' | 'system' | 'annotation';
  title: string;
  description?: string;
  severity?: 'info' | 'warning' | 'critical';
  parameters?: Record<string, any>;
}

interface SessionReplayPlayerProps {
  videoUrl: string;
  duration: number; // in seconds
  events: TimelineEvent[];
  onAddEvent?: (type: 'flag' | 'bookmark', timestamp: number) => void;
  onEventClick?: (event: TimelineEvent) => void;
}

export const SessionReplayPlayer: React.FC<SessionReplayPlayerProps> = ({
  videoUrl,
  duration,
  events,
  onAddEvent,
  onEventClick,
}) => {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('ended', () => setPlaying(false));

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('ended', () => setPlaying(false));
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (playing) {
      video.pause();
    } else {
      video.play();
    }
    setPlaying(!playing);
  };

  const handleSliderChange = (_: Event, newValue: number | number[]) => {
    const time = newValue as number;
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleFastForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime += 10;
    }
  };

  const handleRewind = () => {
    if (videoRef.current) {
      videoRef.current.currentTime -= 10;
    }
  };

  const handleAddFlag = () => {
    onAddEvent?.('flag', currentTime);
  };

  const handleAddBookmark = () => {
    onAddEvent?.('bookmark', currentTime);
  };

  const handleEventSeek = (timestamp: number) => {
    setCurrentTime(timestamp);
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
    }
  };

  // Sort events by timestamp
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

  // Find the nearest event to current time
  const currentEventIndex = sortedEvents.findIndex(
    (event) => event.timestamp > currentTime
  ) - 1;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getEventColor = (type: string, severity?: string) => {
    if (type === 'flag') {
      return severity === 'critical'
        ? 'text-red-500'
        : severity === 'warning'
        ? 'text-amber-500'
        : 'text-blue-500';
    }
    if (type === 'bookmark') return 'text-purple-500';
    if (type === 'annotation') return 'text-green-500';
    return 'text-gray-500';
  };

  const getEventIcon = (type: string, severity?: string) => {
    if (type === 'flag') {
      return severity === 'critical' ? (
        <Flag className="text-red-500" />
      ) : severity === 'warning' ? (
        <Flag className="text-amber-500" />
      ) : (
        <FlagOutlined className="text-blue-500" />
      );
    }
    if (type === 'bookmark') return <BookmarkOutlined className="text-purple-500" />;
    if (type === 'annotation') return <Bookmark className="text-green-500" />;
    return null;
  };

  return (
    <Paper elevation={3} className="overflow-hidden">
      <Box className="bg-black relative">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full aspect-video"
          onClick={togglePlay}
        />

        {/* Video overlay for playback control */}
        <Box
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={togglePlay}
        >
          <IconButton size="large" className="text-white">
            {playing ? (
              <Pause fontSize="large" />
            ) : (
              <PlayArrow fontSize="large" />
            )}
          </IconButton>
        </Box>

        {/* Timeline events markers */}
        <Box
          className="absolute bottom-8 left-0 right-0"
          sx={{ pointerEvents: 'none' }}
        >
          {events.map((event) => (
            <Tooltip
              key={event.id}
              title={event.title}
              placement="top"
              arrow
            >
              <Box
                className={`absolute w-4 h-4 -ml-2 rounded-full cursor-pointer ${getEventColor(
                  event.type,
                  event.severity
                )}`}
                style={{
                  left: `${(event.timestamp / duration) * 100}%`,
                  bottom: '12px',
                }}
                sx={{ pointerEvents: 'auto' }}
                onClick={() => handleEventSeek(event.timestamp)}
              />
            </Tooltip>
          ))}
        </Box>
      </Box>

      <Box className="p-3 bg-gray-100">
        <Grid container spacing={2} alignItems="center">
          <Grid item xs>
            <Slider
              value={currentTime}
              min={0}
              max={duration}
              onChange={handleSliderChange}
              aria-labelledby="video-progress-slider"
              className="mt-1"
            />
          </Grid>
          <Grid item>
            <Typography variant="body2" className="whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </Typography>
          </Grid>
        </Grid>

        <Box className="flex items-center justify-between mt-2">
          <Box className="flex items-center">
            <IconButton onClick={handleRewind} size="small">
              <FastRewind />
            </IconButton>
            <IconButton onClick={togglePlay} size="small" className="mx-1">
              {playing ? <Pause /> : <PlayArrow />}
            </IconButton>
            <IconButton onClick={handleFastForward} size="small">
              <FastForward />
            </IconButton>
          </Box>

          <Box className="flex items-center">
            <Tooltip title="Add Flag">
              <IconButton onClick={handleAddFlag} size="small">
                <FlagOutlined />
              </IconButton>
            </Tooltip>
            <Tooltip title="Add Bookmark">
              <IconButton onClick={handleAddBookmark} size="small">
                <BookmarkOutlined />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      <Divider />

      <Box className="p-3 bg-white max-h-60 overflow-y-auto">
        <Typography variant="subtitle2" className="mb-2">
          Timeline Events
        </Typography>

        {sortedEvents.length === 0 ? (
          <Typography variant="body2" color="textSecondary" className="text-center py-2">
            No events in timeline
          </Typography>
        ) : (
          <Box className="space-y-2">
            {sortedEvents.map((event, index) => (
              <Box
                key={event.id}
                className={`p-2 rounded border ${
                  index === currentEventIndex ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
                } cursor-pointer hover:bg-gray-50`}
                onClick={() => {
                  handleEventSeek(event.timestamp);
                  onEventClick?.(event);
                }}
              >
                <Box className="flex items-center">
                  {getEventIcon(event.type, event.severity)}
                  <Typography variant="body2" className="font-medium ml-2">
                    {event.title}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" className="ml-auto">
                    {formatTime(event.timestamp)}
                  </Typography>
                </Box>
                {event.description && (
                  <Typography variant="caption" className="block mt-1 ml-6">
                    {event.description}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

// components/debriefing/TelemetryDataViewer.tsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Grid,
  FormControlLabel,
  Checkbox,
  Tooltip,
  Card,
  CardContent,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from 'recharts';
import { Info, Warning } from '@mui/icons-material';

interface Parameter {
  id: string;
  name: string;
  unit: string;
  color: string;
  range?: [number, number]; // min, max values
  thresholds?: {
    min?: number;
    max?: number;
    target?: number;
  };
}

interface ParameterGroup {
  id: string;
  name: string;
  parameters: Parameter[];
}

interface TelemetryData {
  timestamp: number; // in seconds
  [key: string]: number;
}

interface TelemetryDataViewerProps {
  data: TelemetryData[];
  parameterGroups: ParameterGroup[];
  currentTime: number;
  onParameterClick?: (parameterId: string) => void;
}

export const TelemetryDataViewer: React.FC<TelemetryDataViewerProps> = ({
  data,
  parameterGroups,
  currentTime,
  onParameterClick,
}) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [selectedParameters, setSelectedParameters] = useState<Record<string, boolean>>(
    Object.fromEntries(
      parameterGroups.flatMap((group) => 
        group.parameters.map((param) => [param.id, param.id === parameterGroups[0].parameters[0].id])
      )
    )
  );
  const [timeWindow, setTimeWindow] = useState(60); // seconds of data to show

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTabIndex(newValue);
  };

  const handleParameterToggle = (parameterId: string) => {
    setSelectedParameters({
      ...selectedParameters,
      [parameterId]: !selectedParameters[parameterId],
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter data for the currently visible time window
  const visibleStartTime = Math.max(0, currentTime - timeWindow / 2);
  const visibleEndTime = currentTime + timeWindow / 2;
  const visibleData = data.filter(
    (point) => point.timestamp >= visibleStartTime && point.timestamp <= visibleEndTime
  );

  const activeGroup = parameterGroups[activeTabIndex];
  const activeParameters = activeGroup.parameters.filter(
    (param) => selectedParameters[param.id]
  );

  // Get min/max values for parameters to set chart domain
  const yDomains: Record<string, [number, number]> = {};
  activeParameters.forEach((param) => {
    if (param.range) {
      yDomains[param.id] = param.range;
    } else {
      const values = visibleData.map((d) => d[param.id]).filter((v) => v !== undefined);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const padding = (max - min) * 0.1;
      yDomains[param.id] = [min - padding, max + padding];
    }
  });

  return (
    <Paper elevation={3} className="overflow-hidden">
      <Box className="p-3 bg-gray-50 border-b">
        <Typography variant="subtitle1">Telemetry Data</Typography>
      </Box>

      <Box className="p-3">
        <Tabs
          value={activeTabIndex}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          className="mb-3"
        >
          {parameterGroups.map((group) => (
            <Tab key={group.id} label={group.name} />
          ))}
        </Tabs>

        <Grid container spacing={3}>
          <Grid item xs={12} md={9}>
            <Paper variant="outlined" className="p-3">
              <Box className="mb-2 flex justify-between items-center">
                <Typography variant="subtitle2">
                  {activeGroup.name} Parameters
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Time Window: {timeWindow}s
                </Typography>
              </Box>

              {activeParameters.length === 0 ? (
                <Box className="flex justify-center items-center h-64 bg-gray-50">
                  <Typography color="textSecondary">
                    Select parameters to display
                  </Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart
                    data={visibleData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      domain={[visibleStartTime, visibleEndTime]}
                      tickFormatter={formatTime}
                    />
                    <RechartsTooltip
                      formatter={(value: number, name: string) => {
                        const param = activeGroup.parameters.find((p) => p.id === name);
                        return [`${value} ${param?.unit || ''}`, param?.name || name];
                      }}
                      labelFormatter={(label: number) => `Time: ${formatTime(label)}`}
                    />
                    <Legend />

                    {/* Current time reference line */}
                    <ReferenceLine
                      x={currentTime}
                      stroke="#666"
                      strokeDasharray="3 3"
                      label={{ value: 'Current', position: 'insideTopRight' }}
                    />

                    {activeParameters.map((param) => (
                      <React.Fragment key={param.id}>
                        <YAxis
                          yAxisId={param.id}
                          orientation={
                            activeParameters.indexOf(param) % 2 === 0
                              ? 'left'
                              : 'right'
                          }
                          domain={yDomains[param.id]}
                          tickFormatter={(value) => `${value} ${param.unit}`}
                          hide={activeParameters.length > 2}
                        />
                        <Line
                          type="monotone"
                          dataKey={param.id}
                          name={param.name}
                          stroke={param.color}
                          yAxisId={param.id}
                          dot={false}
                          activeDot={{ r: 8 }}
                        />

                        {/* Thresholds */}
                        {param.thresholds?.min !== undefined && (
                          <ReferenceLine
                            y={param.thresholds.min}
                            yAxisId={param.id}
                            stroke={param.color}
                            strokeDasharray="3 3"
                            opacity={0.5}
                          />
                        )}
                        {param.thresholds?.max !== undefined && (
                          <ReferenceLine
                            y={param.thresholds.max}
                            yAxisId={param.id}
                            stroke={param.color}
                            strokeDasharray="3 3"
                            opacity={0.5}
                          />
                        )}
                        {param.thresholds?.target !== undefined && (
                          <ReferenceLine
                            y={param.thresholds.target}
                            yAxisId={param.id}
                            stroke={param.color}
                            strokeDasharray="5 5"
                            opacity={0.7}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={3}>
            <Paper variant="outlined" className="p-3">
              <Typography variant="subtitle2" className="mb-2">
                Parameters
              </Typography>

              <Box className="space-y-1 max-h-80 overflow-y-auto">
                {activeGroup.parameters.map((param) => (
                  <Box
                    key={param.id}
                    className={`
                      p-2 rounded border cursor-pointer
                      ${
                        selectedParameters[param.id]
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }
                    `}
                    onClick={() => handleParameterToggle(param.id)}
                  >
                    <Box className="flex items-center">
                      <Box
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: param.color }}
                      />
                      <Typography variant="body2">{param.name}</Typography>
                    </Box>
                    {selectedParameters[param.id] && (
                      <Box className="mt-1 pl-5">
                        <Typography variant="caption" color="textSecondary">
                          Current: {data[data.length - 1]?.[param.id] || 'N/A'} {param.unit}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Paper>

            <Box className="mt-3">
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Current Values
                  </Typography>
                  {activeParameters.length === 0 ? (
                    <Typography variant="body2" color="textSecondary">
                      No parameters selected
                    </Typography>
                  ) : (
                    <Box className="space-y-2">
                      {activeParameters.map((param) => {
                        const currentValue = data.find(
                          (d) => Math.abs(d.timestamp - currentTime) < 0.1
                        )?.[param.id];

                        let status = 'normal';
                        if (currentValue !== undefined && param.thresholds) {
                          if (
                            (param.thresholds.min !== undefined &&
                              currentValue < param.thresholds.min) ||
                            (param.thresholds.max !== undefined &&
                              currentValue > param.thresholds.max)
                          ) {
                            status = 'warning';
                          }
                        }

                        return (
                          <Box
                            key={param.id}
                            className={`p-2 rounded ${
                              status === 'warning'
                                ? 'bg-amber-50 border border-amber-200'
                                : 'bg-gray-50'
                            }`}
                          >
                            <Typography variant="body2" className="flex items-center">
                              {status === 'warning' && (
                                <Warning
                                  className="text-amber-500 mr-1"
                                  fontSize="small"
                                />
                              )}
                              {param.name}
                            </Typography>
                            <Typography
                              variant="h6"
                              className="font-medium"
                              style={{ color: param.color }}
                            >
                              {currentValue !== undefined
                                ? `${currentValue} ${param.unit}`
                                : 'N/A'}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

// components/debriefing/PerformanceAssessmentGrid.tsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Rating,
  TextField,
  Button,
  Chip,
  Divider,
  IconButton,
  Collapse,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Add,
  Save,
  WarningAmber,
  CheckCircle,
  Info,
} from '@mui/icons-material';

interface CompetencyArea {
  id: string;
  name: string;
  description: string;
  elements: CompetencyElement[];
}

interface CompetencyElement {
  id: string;
  name: string;
  description: string;
  required: boolean;
  regulatoryReference?: string;
  grading?: {
    score: number;
    notes: string;
    instructor: string;
    timestamp: string;
  };
  aiSuggestion?: {
    score: number;
    reasoning: string;
  };
}

interface PerformanceAssessmentGridProps {
  competencyAreas: CompetencyArea[];
  onSaveGrading: (elementId: string, score: number, notes: string) => void;
  onFinalize?: () => void;
}

export const PerformanceAssessmentGrid: React.FC<PerformanceAssessmentGridProps> = ({
  competencyAreas,
  onSaveGrading,
  onFinalize,
}) => {
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>(
    Object.fromEntries(competencyAreas.map((area) => [area.id, true]))
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const toggleArea = (areaId: string) => {
    setExpandedAreas({
      ...expandedAreas,
      [areaId]: !expandedAreas[areaId],
    });
  };

  const handleRatingChange = (elementId: string, newValue: number | null) => {
    if (newValue === null) return;
    setRatings({
      ...ratings,
      [elementId]: newValue,
    });
  };

  const handleNotesChange = (elementId: string, value: string) => {
    setNotes({
      ...notes,
      [elementId]: value,
    });
  };

  const handleSaveGrading = (elementId: string) => {
    const score = ratings[elementId] || 0;
    const noteText = notes[elementId] || '';
    onSaveGrading(elementId, score, noteText);
  };

  // Calculate completion percentage
  const totalElements = competencyAreas.reduce(
    (sum, area) => sum + area.elements.length,
    0
  );
  const gradedElements = competencyAreas.reduce(
    (sum, area) =>
      sum +
      area.elements.filter(
        (element) => element.grading?.score || ratings[element.id]
      ).length,
    0
  );
  const completionPercentage = Math.round((gradedElements / totalElements) * 100);

  return (
    <Paper elevation={3} className="overflow-hidden">
      <Box className="p-4 bg-gray-50 border-b">
        <Box className="flex justify-between items-center">
          <Typography variant="h6">Performance Assessment</Typography>
          <Box className="text-right">
            <Typography variant="body2">
              Completion: {completionPercentage}%
            </Typography>
            <Box className="w-40 h-2 bg-gray-200 rounded-full mt-1">
              <Box
                className="h-2 bg-blue-500 rounded-full"
                style={{ width: `${completionPercentage}%` }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      <Box className="p-4">
        <Box className="mb-4">
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Typography variant="subtitle1">Grading Scale:</Typography>
            </Grid>
            <Grid item>
              <Chip label="1 - Unsatisfactory" color="error" />
            </Grid>
            <Grid item>
              <Chip label="2 - Below Standard" color="warning" />
            </Grid>
            <Grid item>
              <Chip label="3 - Satisfactory" color="success" />
            </Grid>
            <Grid item>
              <Chip label="4 - Excellent" color="primary" />
            </Grid>
          </Grid>
        </Box>

        <Box className="space-y-4">
          {competencyAreas.map((area) => (
            <Paper key={area.id} variant="outlined" className="overflow-hidden">
              <Box
                className="p-3 bg-gray-50 flex items-center justify-between cursor-pointer"
                onClick={() => toggleArea(area.id)}
              >
                <Typography variant="subtitle1" className="font-medium">
                  {area.name}
                </Typography>
                {expandedAreas[area.id] ? <ExpandLess /> : <ExpandMore />}
              </Box>

              <Collapse in={expandedAreas[area.id]}>
                <Box className="p-3">
                  <Typography variant="body2" color="textSecondary" className="mb-3">
                    {area.description}
                  </Typography>

                  <Box className="space-y-4">
                    {area.elements.map((element) => {
                      const grading = element.grading;
                      const currentRating = ratings[element.id] ?? grading?.score ?? 0;
                      const currentNotes = notes[element.id] ?? grading?.notes ?? '';
                      const hasAiSuggestion = !!element.aiSuggestion;
                      const aiDifference =
                        hasAiSuggestion &&
                        currentRating > 0 &&
                        Math.abs(currentRating - element.aiSuggestion!.score) >= 2;

                      return (
                        <Box key={element.id} className="border rounded p-3">
                          <Box className="flex justify-between items-start">
                            <Box>
                              <Box className="flex items-center">
                                <Typography variant="subtitle2">
                                  {element.name}
                                </Typography>
                                {element.required && (
                                  <Chip
                                    label="Required"
                                    size="small"
                                    color="primary"
                                    className="ml-2"
                                  />
                                )}
                                {element.regulatoryReference && (
                                  <Tooltip title={`Regulatory Reference: ${element.regulatoryReference}`}>
                                    <Info
                                      fontSize="small"
                                      className="ml-2 text-gray-500"
                                    />
                                  </Tooltip>
                                )}
                              </Box>
                              <Typography
                                variant="body2"
                                color="textSecondary"
                                className="mt-1"
                              >
                                {element.description}
                              </Typography>
                            </Box>

                            {hasAiSuggestion && (
                              <Tooltip
                                title={
                                  <Box>
                                    <Typography variant="subtitle2">
                                      AI Suggested Score: {element.aiSuggestion!.score}
                                    </Typography>
                                    <Typography variant="body2">
                                      {element.aiSuggestion!.reasoning}
                                    </Typography>
                                  </Box>
                                }
                              >
                                <Chip
                                  icon={<Info />}
                                  label="AI Suggestion"
                                  variant="outlined"
                                  size="small"
                                  color={aiDifference ? 'warning' : 'default'}
                                />
                              </Tooltip>
                            )}
                          </Box>

                          <Box className="mt-3">
                            <Grid container spacing={3}>
                              <Grid item xs={12} md={6}>
                                <Box className="flex items-center">
                                  <Typography
                                    component="span"
                                    variant="body2"
                                    className="mr-2"
                                  >
                                    Rating:
                                  </Typography>
                                  <Rating
                                    value={currentRating}
                                    onChange={(_, newValue) =>
                                      handleRatingChange(element.id, newValue)
                                    }
                                    max={4}
                                  />
                                  <Typography
                                    component="span"
                                    variant="body2"
                                    className="ml-2"
                                  >
                                    {currentRating > 0
                                      ? currentRating === 1
                                        ? 'Unsatisfactory'
                                        : currentRating === 2
                                        ? 'Below Standard'
                                        : currentRating === 3
                                        ? 'Satisfactory'
                                        : 'Excellent'
                                      : 'Not Rated'}
                                  </Typography>
                                </Box>

                                {grading && (
                                  <Box className="mt-1">
                                    <Typography
                                      variant="caption"
                                      color="textSecondary"
                                    >
                                      Graded by {grading.instructor} on{' '}
                                      {new Date(
                                        grading.timestamp
                                      ).toLocaleDateString()}
                                    </Typography>
                                  </Box>
                                )}
                              </Grid>

                              <Grid item xs={12} md={6}>
                                <TextField
                                  label="Notes"
                                  variant="outlined"
                                  fullWidth
                                  multiline
                                  rows={2}
                                  size="small"
                                  value={currentNotes}
                                  onChange={(e) =>
                                    handleNotesChange(element.id, e.target.value)
                                  }
                                />
                              </Grid>
                            </Grid>

                            <Box className="mt-2 flex justify-end">
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<Save />}
                                onClick={() => handleSaveGrading(element.id)}
                                disabled={
                                  !ratings[element.id] &&
                                  !notes[element.id] &&
                                  !!grading
                                }
                              >
                                Save
                              </Button>
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Collapse>
            </Paper>
          ))}
        </Box>

        <Box className="mt-6 flex justify-end">
          <Button
            variant="contained"
            color="primary"
            onClick={onFinalize}
            disabled={completionPercentage < 100}
            startIcon={<CheckCircle />}
          >
            Finalize Assessment
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

// components/debriefing/AnnotationTool.tsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Flag,
  Bookmark,
  Add,
  Delete,
  Edit,
  Share,
  MoreVert,
  Comment,
  Warning,
  Info,
  Error as ErrorIcon,
} from '@mui/icons-material';

interface Annotation {
  id: string;
  type: 'flag' | 'bookmark' | 'comment';
  timestamp: number;
  title: string;
  description: string;
  severity?: 'info' | 'warning' | 'critical';
  author: string;
  createdAt: string;
}

interface AnnotationToolProps {
  annotations: Annotation[];
  currentTime: number;
  onAddAnnotation: (annotation: Omit<Annotation, 'id' | 'author' | 'createdAt'>) => void;
  onEditAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onJumpToAnnotation: (timestamp: number) => void;
}

export const AnnotationTool: React.FC<AnnotationToolProps> = ({
  annotations,
  currentTime,
  onAddAnnotation,
  onEditAnnotation,
  onDeleteAnnotation,
  onJumpToAnnotation,
}) => {
  const [newAnnotationType, setNewAnnotationType] = useState<'flag' | 'bookmark' | 'comment'>('comment');
  const [newAnnotationTitle, setNewAnnotationTitle] = useState('');
  const [newAnnotationDescription, setNewAnnotationDescription] = useState('');
  const [newAnnotationSeverity, setNewAnnotationSeverity] = useState<'info' | 'warning' | 'critical'>('info');
  
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, annotation: Annotation) => {
    setAnchorEl(event.currentTarget);
    setSelectedAnnotation(annotation);
  };
  
  const handleActionMenuClose = () => {
    setAnchorEl(null);
    setSelectedAnnotation(null);
  };
  
  const handleEdit = () => {
    setEditingAnnotation(selectedAnnotation);
    setEditDialogOpen(true);
    handleActionMenuClose();
  };
  
  const handleDelete = () => {
    if (selectedAnnotation) {
      onDeleteAnnotation(selectedAnnotation.id);
    }
    handleActionMenuClose();
  };
  
  const handleJumpTo = () => {
    if (selectedAnnotation) {
      onJumpToAnnotation(selectedAnnotation.timestamp);
    }
    handleActionMenuClose();
  };
  
  const handleAddAnnotation = () => {
    onAddAnnotation({
      type: newAnnotationType,
      timestamp: currentTime,
      title: newAnnotationTitle,
      description: newAnnotationDescription,
      severity: newAnnotationType === 'flag' ? newAnnotationSeverity : undefined,
    });
    
    // Reset form
    setNewAnnotationTitle('');
    setNewAnnotationDescription('');
  };
  
  const handleEditDialogSave = () => {
    if (editingAnnotation) {
      onEditAnnotation(editingAnnotation.id, {
        title: editingAnnotation.title,
        description: editingAnnotation.description,
        severity: editingAnnotation.severity,
      });
    }
    setEditDialogOpen(false);
    setEditingAnnotation(null);
  };
  
  const handleEditDialogCancel = () => {
    setEditDialogOpen(false);
    setEditingAnnotation(null);
  };
  
  const getTypeIcon = (type: string, severity?: string) => {
    if (type === 'flag') {
      return severity === 'critical' ? (
        <Flag className="text-red-500" />
      ) : severity === 'warning' ? (
        <Flag className="text-amber-500" />
      ) : (
        <Flag className="text-blue-500" />
      );
    }
    if (type === 'bookmark') return <Bookmark className="text-purple-500" />;
    return <Comment className="text-green-500" />;
  };
  
  const getSeverityChip = (severity?: string) => {
    if (!severity || severity === 'info') {
      return <Chip size="small" icon={<Info />} label="Info" color="info" />;
    }
    if (severity === 'warning') {
      return <Chip size="small" icon={<Warning />} label="Warning" color="warning" />;
    }
    return <Chip size="small" icon={<ErrorIcon />} label="Critical" color="error" />;
  };
  
  // Sort annotations by timestamp
  const sortedAnnotations = [...annotations].sort((a, b) => a.timestamp - b.timestamp);
  
  return (
    <Paper elevation={3} className="overflow-hidden">
      <Box className="p-4 bg-gray-50 border-b">
        <Typography variant="h6">Annotations & Comments</Typography>
      </Box>
      
      <Box className="p-4">
        <Paper variant="outlined" className="p-3 mb-4">
          <Typography variant="subtitle2" className="mb-2">
            Add Annotation at {formatTime(currentTime)}
          </Typography>
          
          <Box className="mb-3 flex flex-wrap gap-2">
            <Button
              variant={newAnnotationType === 'comment' ? 'contained' : 'outlined'}
              size="small"
              startIcon={<Comment />}
              onClick={() => setNewAnnotationType('comment')}
            >
              Comment
            </Button>
            <Button
              variant={newAnnotationType === 'flag' ? 'contained' : 'outlined'}
              size="small"
              startIcon={<Flag />}
              onClick={() => setNewAnnotationType('flag')}
            >
              Flag
            </Button>
            <Button
              variant={newAnnotationType === 'bookmark' ? 'contained' : 'outlined'}
              size="small"
              startIcon={<Bookmark />}
              onClick={() => setNewAnnotationType('bookmark')}
            >
              Bookmark
            </Button>
          </Box>
          
          {newAnnotationType === 'flag' && (
            <Box className="mb-3 flex flex-wrap gap-2">
              <Button
                variant={newAnnotationSeverity === 'info' ? 'contained' : 'outlined'}
                size="small"
                color="info"
                onClick={() => setNewAnnotationSeverity('info')}
              >
                Info
              </Button>
              <Button
                variant={newAnnotationSeverity === 'warning' ? 'contained' : 'outlined'}
                size="small"
                color="warning"
                onClick={() => setNewAnnotationSeverity('warning')}
              >
                Warning
              </Button>
              <Button
                variant={newAnnotationSeverity === 'critical' ? 'contained' : 'outlined'}
                size="small"
                color="error"
                onClick={() => setNewAnnotationSeverity('critical')}
              >
                Critical
              </Button>
            </Box>
          )}
          
          <TextField
            label="Title"
            variant="outlined"
            fullWidth
            size="small"
            value={newAnnotationTitle}
            onChange={(e) => setNewAnnotationTitle(e.target.value)}
            className="mb-3"
          />
          
          <TextField
            label="Description"
            variant="outlined"
            fullWidth
            multiline
            rows={2}
            value={newAnnotationDescription}
            onChange={(e) => setNewAnnotationDescription(e.target.value)}
            className="mb-3"
          />
          
          <Box className="flex justify-end">
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={handleAddAnnotation}
              disabled={!newAnnotationTitle}
            >
              Add
            </Button>
          </Box>
        </Paper>
        
        <Typography variant="subtitle2" className="mb-2">
          All Annotations
        </Typography>
        
        {sortedAnnotations.length === 0 ? (
          <Typography variant="body2" color="textSecondary" className="text-center py-4">
            No annotations yet
          </Typography>
        ) : (
          <Box className="space-y-3 max-h-96 overflow-y-auto">
            {sortedAnnotations.map((annotation) => (
              <Paper
                key={annotation.id}
                variant="outlined"
                className="p-3 hover:bg-gray-50"
              >
                <Box className="flex justify-between items-start">
                  <Box className="flex items-start">
                    <Box className="mr-3 mt-1">
                      {getTypeIcon(annotation.type, annotation.severity)}
                    </Box>
                    
                    <Box>
                      <Box className="flex items-center">
                        <Typography variant="subtitle2" className="mr-2">
                          {annotation.title}
                        </Typography>
                        {annotation.type === 'flag' && getSeverityChip(annotation.severity)}
                      </Box>
                      
                      <Typography variant="body2" className="mt-1">
                        {annotation.description}
                      </Typography>
                      
                      <Box className="flex items-center mt-2">
                        <Typography variant="caption" color="textSecondary">
                          {annotation.author} • {new Date(annotation.createdAt).toLocaleString()}
                        </Typography>
                        <Tooltip title={`Jump to ${formatTime(annotation.timestamp)}`}>
                          <Button
                            size="small"
                            onClick={() => onJumpToAnnotation(annotation.timestamp)}
                            className="ml-2"
                          >
                            {formatTime(annotation.timestamp)}
                          </Button>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Box>
                  
                  <IconButton
                    size="small"
                    onClick={(e) => handleActionMenuOpen(e, annotation)}
                  >
                    <MoreVert />
                  </IconButton>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
      
      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleActionMenuClose}
      >
        <MenuItem onClick={handleJumpTo}>
          <ListItemIcon>
            <Bookmark fontSize="small" />
          </ListItemIcon>
          <ListItemText>Jump to</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleActionMenuClose}>
          <ListItemIcon>
            <Share fontSize="small" />
          </ListItemIcon>
          <ListItemText>Share</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDelete} className="text-red-600">
          <ListItemIcon>
            <Delete fontSize="small" className="text-red-600" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleEditDialogCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Annotation</DialogTitle>
        <DialogContent>
          <Box className="pt-2">
            {editingAnnotation?.type === 'flag' && (
              <Box className="mb-3 flex flex-wrap gap-2">
                <Button
                  variant={editingAnnotation.severity === 'info' ? 'contained' : 'outlined'}
                  size="small"
                  color="info"
                  onClick={() => setEditingAnnotation({...editingAnnotation, severity: 'info'})}
                >
                  Info
                </Button>
                <Button
                  variant={editingAnnotation.severity === 'warning' ? 'contained' : 'outlined'}
                  size="small"
                  color="warning"
                  onClick={() => setEditingAnnotation({...editingAnnotation, severity: 'warning'})}
                >
                  Warning
                </Button>
                <Button
                  variant={editingAnnotation.severity === 'critical' ? 'contained' : 'outlined'}
                  size="small"
                  color="error"
                  onClick={() => setEditingAnnotation({...editingAnnotation, severity: 'critical'})}
                >
                  Critical
                </Button>
              </Box>
            )}
            
            <TextField
              label="Title"
              variant="outlined"
              fullWidth
              value={editingAnnotation?.title || ''}
              onChange={(e) => editingAnnotation && setEditingAnnotation({...editingAnnotation, title: e.target.value})}
              className="mb-3"
            />
            
            <TextField
              label="Description"
              variant="outlined"
              fullWidth
              multiline
              rows={3}
              value={editingAnnotation?.description || ''}
              onChange={(e) => editingAnnotation && setEditingAnnotation({...editingAnnotation, description: e.target.value})}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditDialogCancel}>Cancel</Button>
          <Button onClick={handleEditDialogSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

// app/debriefing/[sessionId]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
} from '@mui/material';
import {
  Download,
  Print,
  Share,
  FileDownload,
  Close,
  CloudDownload,
  Assessment,
  Save,
} from '@mui/icons-material';
import { SessionReplayPlayer } from '@/components/debriefing/SessionReplayPlayer';
import { TelemetryDataViewer } from '@/components/debriefing/TelemetryDataViewer';
import { PerformanceAssessmentGrid } from '@/components/debriefing/PerformanceAssessmentGrid';
import { AnnotationTool } from '@/components/debriefing/AnnotationTool';
import { debriefingApi } from '@/lib/api/apiClient';

// Mock session data
const mockSessionData = {
  id: 'session-123',
  title: 'B737-800 Type Rating - Session 5',
  date: '2023-08-15T14:30:00Z',
  trainee: {
    id: 'trainee-456',
    name: 'John Smith',
    position: 'First Officer',
  },
  instructor: {
    id: 'instructor-789',
    name: 'Captain Sarah Johnson',
  },
  scenario: {
    id: 'scenario-101',
    title: 'Engine Failure After Takeoff',
    description: 'Practice handling of engine failure shortly after takeoff from KJFK',
  },
  duration: 3600, // in seconds
  status: 'completed',
  videoUrl: 'https://example.com/mock-video.mp4', // This would be a real URL in production
};

// Mock timeline events
const mockTimelineEvents = [
  {
    id: 'event-1',
    timestamp: 120, // in seconds
    type: 'system',
    title: 'Takeoff',
    description: 'Aircraft rotated at V2+10',
    severity: 'info',
  },
  {
    id: 'event-2',
    timestamp: 180,
    type: 'system',
    title: 'Engine 1 Failure',
    description: 'Simulated engine failure was triggered',
    severity: 'critical',
  },
  {
    id: 'event-3',
    timestamp: 195,
    type: 'flag',
    title: 'Delayed Response',
    description: 'Trainee took 15 seconds to identify engine failure',
    severity: 'warning',
  },
  {
    id: 'event-4',
    timestamp: 240,
    type: 'system',
    title: 'Engine Secured',
    description: 'Engine shutdown procedure completed',
    severity: 'info',
  },
  {
    id: 'event-5',
    timestamp: 300,
    type: 'bookmark',
    title: 'Good CRM Example',
    description: 'Clear communication and task delegation',
  },
  {
    id: 'event-6',
    timestamp: 420,
    type: 'annotation',
    title: 'ATC Communication',
    description: 'Proper emergency declaration with all required elements',
  },
];

// Mock telemetry data
const generateTelemetryData = () => {
  const data = [];
  for (let i = 0; i < 3600; i += 5) {
    // Generate a data point every 5 seconds
    const point: Record<string, number> = {
      timestamp: i,
      altitude: 5000 + Math.sin(i / 100) * 1000 + (i < 200 ? i * 25 : 0),
      speed: 250 + Math.sin(i / 120) * 20,
      heading: 270 + Math.sin(i / 150) * 10,
      pitch: Math.sin(i / 50) * 5,
      roll: Math.sin(i / 40) * 8,
      n1_engine1: i < 180 ? 90 + Math.sin(i / 30) * 2 : 0,
      n1_engine2: 90 + Math.sin(i / 30) * 2,
      flaps: i < 300 ? 15 - Math.min(15, Math.floor(i / 60) * 5) : 0,
      gear: i < 150 ? 1 : 0,
    };
    data.push(point);
  }
  return data;
};

const mockTelemetryData = generateTelemetryData();

// Mock parameter groups
const mockParameterGroups = [
  {
    id: 'aircraft',
    name: 'Aircraft Parameters',
    parameters: [
      {
        id: 'altitude',
        name: 'Altitude',
        unit: 'ft',
        color: '#3b82f6',
      },
      {
        id: 'speed',
        name: 'Indicated Airspeed',
        unit: 'kts',
        color: '#f59e0b',
        thresholds: {
          min: 180,
          max: 320,
        },
      },
      {
        id: 'heading',
        name: 'Heading',
        unit: '°',
        color: '#10b981',
      },
    ],
  },
  {
    id: 'attitude',
    name: 'Attitude',
    parameters: [
      {
        id: 'pitch',
        name: 'Pitch',
        unit: '°',
        color: '#8b5cf6',
        thresholds: {
          min: -10,
          max: 15,
        },
      },
      {
        id: 'roll',
        name: 'Roll',
        unit: '°',
        color: '#ec4899',
        thresholds: {
          min: -30,
          max: 30,
        },
      },
    ],
  },
  {
    id: 'engines',
    name: 'Engines',
    parameters: [
      {
        id: 'n1_engine1',
        name: 'N1 Engine 1',
        unit: '%',
        color: '#ef4444',
      },
      {
        id: 'n1_engine2',
        name: 'N1 Engine 2',
        unit: '%',
        color: '#84cc16',
      },
    ],
  },
  {
    id: 'configuration',
    name: 'Configuration',
    parameters: [
      {
        id: 'flaps',
        name: 'Flaps Position',
        unit: '°',
        color: '#6366f1',
      },
      {
        id: 'gear',
        name: 'Landing Gear',
        unit: '',
        color: '#f43f5e',
      },
    ],
  },
];

// Mock annotations
const mockAnnotations = [
  {
    id: 'annotation-1',
    type: 'flag',
    timestamp: 195,
    title: 'Delayed Response',
    description: 'Trainee took 15 seconds to identify engine failure',
    severity: 'warning',
    author: 'Capt. Johnson',
    createdAt: '2023-08-15T14:35:00Z',
  },
  {
    id: 'annotation-2',
    type: 'bookmark',
    timestamp: 300,
    title: 'Good CRM Example',
    description: 'Clear communication and task delegation',
    author: 'Capt. Johnson',
    createdAt: '2023-08-15T14:40:00Z',
  },
  {
    id: 'annotation-3',
    type: 'comment',
    timestamp: 420,
    title: 'ATC Communication',
    description: 'Proper emergency declaration with all required elements',
    author: 'Capt. Johnson',
    createdAt: '2023-08-15T14:45:00Z',
  },
];

// Mock competency areas
const mockCompetencyAreas = [
  {
    id: 'area-1',
    name: 'Technical',
    description: 'Technical operation of the aircraft systems, instruments and controls',
    elements: [
      {
        id: 'element-1-1',
        name: 'Aircraft Systems Knowledge',
        description: 'Demonstrates knowledge of aircraft systems and limitations',
        required: true,
        regulatoryReference: 'EASA FCL.725.A(b)(1)',
        grading: {
          score: 3,
          notes: 'Good overall systems knowledge, but hesitated on electrical bus isolation procedure',
          instructor: 'Capt. Johnson',
          timestamp: '2023-08-15T16:30:00Z',
        },
      },
      {
        id: 'element-1-2',
        name: 'Normal Procedures',
        description: 'Properly executes normal checklists and procedures',
        required: true,
        grading: {
          score: 4,
          notes: 'Excellent execution of all normal procedures with proper flow and timing',
          instructor: 'Capt. Johnson',
          timestamp: '2023-08-15T16:31:00Z',
        },
      },
      {
        id: 'element-1-3',
        name: 'Abnormal/Emergency Procedures',
        description: 'Correctly identifies, assesses and manages abnormal situations',
        required: true,
        regulatoryReference: 'EASA FCL.725.A(b)(3)',
        aiSuggestion: {
          score: 2,
          reasoning: 'Detected 15-second delay in engine failure recognition and non-standard memory items execution',
        },
      },
    ],
  },
  {
    id: 'area-2',
    name: 'Non-Technical',
    description: 'Crew Resource Management, decision making, leadership and teamwork',
    elements: [
      {
        id: 'element-2-1',
        name: 'Communication',
        description: 'Communicates clearly with ATC, cabin crew and other flight crew',
        required: true,
        grading: {
          score: 3,
          notes: 'Generally clear communication but missed readback of runway assignment',
          instructor: 'Capt. Johnson',
          timestamp: '2023-08-15T16:33:00Z',
        },
      },
      {
        id: 'element-2-2',
        name: 'Decision Making',
        description: 'Makes appropriate decisions based on all available information',
        required: true,
        aiSuggestion: {
          score: 4,
          reasoning: 'Consistently made appropriate decisions throughout the emergency scenario',
        },
      },
      {
        id: 'element-2-3',
        name: 'Workload Management',
        description: 'Prioritizes tasks effectively and manages workload',
        required: false,
      },
    ],
  },
];

export default function DebriefingSessionPage({ params }: { params: { sessionId: string } }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState(mockSessionData);
  const [timelineEvents, setTimelineEvents] = useState(mockTimelineEvents);
  const [telemetryData, setTelemetryData] = useState(mockTelemetryData);
  const [parameterGroups, setParameterGroups] = useState(mockParameterGroups);
  const [annotations, setAnnotations] = useState(mockAnnotations);
  const [competencyAreas, setCompetencyAreas] = useState(mockCompetencyAreas);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportOptions, setReportOptions] = useState({
    includeAnnotations: true,
    includeAssessment: true,
    includeCharts: true,
    additionalComments: '',
  });
  
  useEffect(() => {
    // Fetch session data
    const fetchSessionData = async () => {
      setLoading(true);
      try {
        // In a real app, you would fetch real data here
        // const data = await debriefingApi.getSessionDetails(params.sessionId);
        // setSessionData(data.sessionData);
        // setTimelineEvents(data.timelineEvents);
        // setTelemetryData(data.telemetryData);
        // setParameterGroups(data.parameterGroups);
        // setAnnotations(data.annotations);
        // setCompetencyAreas(data.competencyAreas);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Using mock data for this example
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load session data');
        setLoading(false);
      }
    };
    
    fetchSessionData();
  }, [params.sessionId]);
  
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  const handleAddAnnotation = (annotation: any) => {
    const newAnnotation = {
      ...annotation,
      id: `annotation-${Date.now()}`,
      author: 'Capt. Johnson', // Would come from current user in real app
      createdAt: new Date().toISOString(),
    };
    
    setAnnotations([...annotations, newAnnotation]);
    
    // Also add to timeline events for the player
    if (annotation.type !== 'comment') {
      const newEvent = {
        id: `event-${Date.now()}`,
        timestamp: annotation.timestamp,
        type: annotation.type,
        title: annotation.title,
        description: annotation.description,
        severity: annotation.severity,
      };
      
      setTimelineEvents([...timelineEvents, newEvent]);
    }
  };
  
  const handleEditAnnotation = (id: string, updates: any) => {
    const updatedAnnotations = annotations.map(anno => 
      anno.id === id ? { ...anno, ...updates } : anno
    );
    setAnnotations(updatedAnnotations);
    
    // Also update timeline events
    const annotation = annotations.find(a => a.id === id);
    if (annotation && annotation.type !== 'comment') {
      const eventId = timelineEvents.find(e => 
        e.type === annotation.type && 
        e.timestamp === annotation.timestamp && 
        e.title === annotation.title
      )?.id;
      
      if (eventId) {
        const updatedEvents = timelineEvents.map(event =>
          event.id === eventId ? { 
            ...event, 
            title: updates.title || event.title,
            description: updates.description || event.description,
            severity: updates.severity || event.severity
          } : event
        );
        setTimelineEvents(updatedEvents);
      }
    }
  };
  
  const handleDeleteAnnotation = (id: string) => {
    const annotation = annotations.find(a => a.id === id);
    setAnnotations(annotations.filter(a => a.id !== id));
    
    // Also remove from timeline events
    if (annotation && annotation.type !== 'comment') {
      const eventId = timelineEvents.find(e => 
        e.type === annotation.type && 
        e.timestamp === annotation.timestamp && 
        e.title === annotation.title
      )?.id;
      
      if (eventId) {
        setTimelineEvents(timelineEvents.filter(e => e.id !== eventId));
      }
    }
  };
  
  const handleJumpToTime = (timestamp: number) => {
    setCurrentTime(timestamp);
  };
  
  const handleSaveGrading = (elementId: string, score: number, notes: string) => {
    const updatedAreas = competencyAreas.map(area => ({
      ...area,
      elements: area.elements.map(element =>
        element.id === elementId
          ? {
              ...element,
              grading: {
                score,
                notes,
                instructor: 'Capt. Johnson', // Would come from current user
                timestamp: new Date().toISOString(),
              },
            }
          : element
      ),
    }));
    
    setCompetencyAreas(updatedAreas);
  };
  
  const handleAddEvent = (type: 'flag' | 'bookmark', timestamp: number) => {
    const newEvent = {
      id: `event-${Date.now()}`,
      timestamp,
      type,
      title: `New ${type === 'flag' ? 'Flag' : 'Bookmark'}`,
      description: '',
      severity: type === 'flag' ? 'info' : undefined,
    };
    
    setTimelineEvents([...timelineEvents, newEvent]);
  };
  
  const handleEventClick = (event: any) => {
    // Could be used to show more details or edit the event
    console.log('Event clicked:', event);
  };
  
  const handleGenerateReport = async () => {
    setReportGenerating(true);
    
    try {
      // In a real app, call the API to generate the report
      // const blob = await debriefingApi.generateReport(params.sessionId, {
      //   format: 'pdf',
      //   options: reportOptions
      // });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock download a PDF
      const link = document.createElement('a');
      link.href = '#';
      link.download = `Debrief_${params.sessionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setReportDialogOpen(false);
    } catch (err: any) {
      console.error('Failed to generate report', err);
    } finally {
      setReportGenerating(false);
    }
  };
  
  const handleFinalizeAssessment = () => {
    // In a real app, would submit the assessment
    alert('Assessment finalized and submitted to training record');
  };
  
  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box className="py-12 flex flex-col items-center">
          <CircularProgress size={60} className="mb-4" />
          <Typography variant="h6">Loading Session Data...</Typography>
        </Box>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="xl">
        <Box className="py-12 text-center">
          <Typography variant="h6" color="error" className="mb-4">
            {error}
          </Typography>
          <Button variant="contained" color="primary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="xl">
      <Box className="py-6">
        <Box className="flex justify-between items-start mb-6">
          <Box>
            <Typography variant="h4" className="mb-1">
              {sessionData.title}
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              {new Date(sessionData.date).toLocaleString()} • {sessionData.scenario.title}
            </Typography>
          </Box>
          
          <Box className="flex space-x-2">
            <Button 
              variant="outlined" 
              startIcon={<Download />}
              onClick={() => setReportDialogOpen(true)}
            >
              Generate Report
            </Button>
            <Button variant="outlined" startIcon={<Print />}>
              Print
            </Button>
            <Button variant="outlined" startIcon={<Share />}>
              Share
            </Button>
          </Box>
        </Box>
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Paper className="p-4 mb-4">
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Trainee
                  </Typography>
                  <Typography variant="body1">
                    {sessionData.trainee.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {sessionData.trainee.position}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Instructor
                  </Typography>
                  <Typography variant="body1">
                    {sessionData.instructor.name}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Scenario
                  </Typography>
                  <Typography variant="body1">
                    {sessionData.scenario.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {sessionData.scenario.description}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
            
            <SessionReplayPlayer 
              videoUrl={sessionData.videoUrl}
              duration={sessionData.duration}
              events={timelineEvents}
              onAddEvent={handleAddEvent}
              onEventClick={handleEventClick}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper elevation={1} className="mb-4">
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="Telemetry" />
                <Tab label="Assessment" />
                <Tab label="Annotations" />
              </Tabs>
            </Paper>
            
            {activeTab === 0 && (
              <TelemetryDataViewer
                data={telemetryData}
                parameterGroups={parameterGroups}
                currentTime={currentTime}
              />
            )}
            
            {activeTab === 1 && (
              <PerformanceAssessmentGrid
                competencyAreas={competencyAreas}
                onSaveGrading={handleSaveGrading}
                onFinalize={handleFinalizeAssessment}
              />
            )}
            
            {activeTab === 2 && (
              <AnnotationTool
                annotations={annotations}
                currentTime={currentTime}
                onAddAnnotation={handleAddAnnotation}
                onEditAnnotation={handleEditAnnotation}
                onDeleteAnnotation={handleDeleteAnnotation}
                onJumpToAnnotation={handleJumpToTime}
              />
            )}
          </Grid>
        </Grid>
      </Box>
      
      {/* Generate Report Dialog */}
      <Dialog 
        open={reportDialogOpen} 
        onClose={() => setReportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Generate Debrief Report
          <IconButton
            onClick={() => setReportDialogOpen(false)}
            className="absolute right-2 top-2"
          >
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          <Box className="space-y-4">
            <Typography variant="subtitle2">
              Report Options
            </Typography>
            
            <Box className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={reportOptions.includeAnnotations}
                  onChange={(e) => setReportOptions({...reportOptions, includeAnnotations: e.target.checked})}
                  className="h-4 w-4"
                />
                <span>Include annotations and timeline events</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={reportOptions.includeAssessment}
                  onChange={(e) => setReportOptions({...reportOptions, includeAssessment: e.target.checked})}
                  className="h-4 w-4"
                />
                <span>Include competency assessment</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={reportOptions.includeCharts}
                  onChange={(e) => setReportOptions({...reportOptions, includeCharts: e.target.checked})}
                  className="h-4 w-4"
                />
                <span>Include telemetry charts</span>
              </label>
            </Box>
            
            <Divider />
            
            <Box>
              <Typography variant="subtitle2" className="mb-2">
                Additional Comments
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                variant="outlined"
                placeholder="Add any additional comments for the report..."
                value={reportOptions.additionalComments}
                onChange={(e) => setReportOptions({...reportOptions, additionalComments: e.target.value})}
              />
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setReportDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={reportGenerating ? <CircularProgress size={20} /> : <Assessment />}
            onClick={handleGenerateReport}
            disabled={reportGenerating}
          >
            {reportGenerating ? 'Generating...' : 'Generate PDF'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
