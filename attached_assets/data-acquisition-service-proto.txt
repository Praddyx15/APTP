syntax = "proto3";

package data_acquisition;

// Service definition for data acquisition
service DataAcquisitionService {
  // Stream real-time data
  rpc StreamData (StreamDataRequest) returns (stream DataPoint);
  
  // Get historical data
  rpc GetHistoricalData (HistoricalDataRequest) returns (DataSeries);
  
  // Start recording data
  rpc StartRecording (RecordingRequest) returns (RecordingResponse);
  
  // Stop recording data
  rpc StopRecording (StopRecordingRequest) returns (RecordingResponse);
  
  // Get available devices
  rpc GetAvailableDevices (DeviceRequest) returns (DeviceList);
  
  // Configure device
  rpc ConfigureDevice (DeviceConfig) returns (DeviceConfigResponse);
}

// Device types
enum DeviceType {
  UNKNOWN_DEVICE = 0;
  EYE_TRACKER = 1;
  HEART_RATE_MONITOR = 2;
  EEG = 3;
  SIMULATOR = 4;
  CAMERA = 5;
}

// Data types
enum DataType {
  UNKNOWN_DATA = 0;
  GAZE = 1;
  PUPIL = 2;
  HEART_RATE = 3;
  EEG_SIGNAL = 4;
  SIMULATOR_POSITION = 5;
  SIMULATOR_CONTROL = 6;
  SIMULATOR_INSTRUMENT = 7;
  VIDEO_FRAME = 8;
}

// Request to stream data
message StreamDataRequest {
  string session_id = 1;
  repeated DeviceConfig devices = 2;
  int32 sample_rate_hz = 3;
  bool apply_filtering = 4;
}

// Device configuration
message DeviceConfig {
  string device_id = 1;
  DeviceType device_type = 2;
  repeated DataType data_types = 3;
  map<string, string> parameters = 4;
}

// Single data point
message DataPoint {
  string device_id = 1;
  DataType data_type = 2;
  int64 timestamp = 3;  // Microseconds since epoch
  oneof value {
    GazeData gaze = 4;
    PupilData pupil = 5;
    HeartRateData heart_rate = 6;
    EegData eeg = 7;
    SimulatorPositionData sim_position = 8;
    SimulatorControlData sim_control = 9;
    SimulatorInstrumentData sim_instrument = 10;
    VideoFrameData video_frame = 11;
  }
}

// Gaze data (eye tracking)
message GazeData {
  double x = 1;  // X position in normalized coordinates (0-1)
  double y = 2;  // Y position in normalized coordinates (0-1)
  double z = 3;  // Distance from screen in mm
  double confidence = 4;  // Confidence level (0-1)
}

// Pupil data (eye tracking)
message PupilData {
  double left_diameter = 1;  // Left pupil diameter in mm
  double right_diameter = 2;  // Right pupil diameter in mm
  double left_confidence = 3;  // Confidence level (0-1)
  double right_confidence = 4;  // Confidence level (0-1)
}

// Heart rate data
message HeartRateData {
  double bpm = 1;  // Beats per minute
  double confidence = 2;  // Confidence level (0-1)
}

// EEG data
message EegData {
  repeated double channels = 1;  // Raw EEG channel values
  repeated string channel_names = 2;  // Channel names
  double sampling_rate = 3;  // Sampling rate in Hz
}

// Simulator position data
message SimulatorPositionData {
  double latitude = 1;
  double longitude = 2;
  double altitude = 3;
  double heading = 4;
  double pitch = 5;
  double roll = 6;
  double ground_speed = 7;
}

// Simulator control data
message SimulatorControlData {
  double aileron = 1;  // -1 to 1
  double elevator = 2;  // -1 to 1
  double rudder = 3;  // -1 to 1
  double throttle = 4;  // 0 to 1
  repeated double engine_controls = 5;  // Multiple engine controls
}

// Simulator instrument data
message SimulatorInstrumentData {
  map<string, double> instrument_values = 1;  // Name-value pairs for instruments
}

// Video frame data
message VideoFrameData {
  bytes frame_data = 1;  // Compressed image data
  string format = 2;  // Format (e.g., "jpeg", "h264")
  int32 width = 3;
  int32 height = 4;
}

// Historical data request
message HistoricalDataRequest {
  string session_id = 1;
  repeated DeviceType device_types = 2;
  repeated DataType data_types = 3;
  int64 start_time = 4;  // Start time in microseconds since epoch
  int64 end_time = 5;  // End time in microseconds since epoch
  int32 max_points = 6;  // Maximum number of points to return (0 for all)
}

// Data series with multiple points
message DataSeries {
  string session_id = 1;
  repeated DataPoint data_points = 2;
}

// Recording request
message RecordingRequest {
  string session_id = 1;
  string user_id = 2;
  string exercise_id = 3;
  repeated DeviceConfig devices = 4;
  map<string, string> metadata = 5;
}

// Stop recording request
message StopRecordingRequest {
  string session_id = 1;
}

// Recording response
message RecordingResponse {
  bool success = 1;
  string session_id = 2;
  string error_message = 3;
  string recording_path = 4;
}

// Device request
message DeviceRequest {
  repeated DeviceType device_types = 1;
}

// Device list
message DeviceList {
  repeated Device devices = 1;
}

// Device information
message Device {
  string device_id = 1;
  DeviceType device_type = 2;
  string model = 3;
  string serial_number = 4;
  string firmware_version = 5;
  repeated DataType supported_data_types = 6;
  map<string, string> capabilities = 7;
  bool is_connected = 8;
  string connection_info = 9;
}

// Device configuration response
message DeviceConfigResponse {
  bool success = 1;
  string device_id = 2;
  string error_message = 3;
}