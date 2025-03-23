// src/backend/simulator/FlightParameters.h
#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <cstdint>
#include <array>

namespace PilotTraining {
namespace Simulator {

/**
 * @brief Type of aircraft
 */
enum class AircraftType {
    FIXED_WING,
    ROTARY_WING,
    OTHER
};

/**
 * @brief Flight phase
 */
enum class FlightPhase {
    UNKNOWN,
    PREFLIGHT,
    TAXI,
    TAKEOFF,
    CLIMB,
    CRUISE,
    DESCENT,
    APPROACH,
    LANDING,
    ROLLOUT,
    GO_AROUND
};

/**
 * @brief Weather conditions
 */
enum class WeatherConditions {
    VMC,  // Visual Meteorological Conditions
    IMC   // Instrument Meteorological Conditions
};

/**
 * @brief Comprehensive set of flight parameters
 * 
 * This structure contains all telemetry data for a single point in time,
 * including position, attitude, engine parameters, system states, etc.
 */
struct FlightParameters {
    // Timestamp and identification
    int64_t timestamp;       // Microseconds since epoch
    std::string sessionId;   // Training session identifier
    std::string aircraftId;  // Aircraft identifier
    AircraftType aircraftType = AircraftType::FIXED_WING;
    
    // Position and attitude
    double latitude;         // degrees, -90 to 90
    double longitude;        // degrees, -180 to 180
    double altitude;         // feet above mean sea level
    double heading;          // degrees, 0 to 360
    double pitch;            // degrees, -90 to 90
    double roll;             // degrees, -180 to 180
    double groundSpeed;      // knots
    double indicatedAirspeed; // knots
    double trueAirspeed;     // knots
    double verticalSpeed;    // feet per minute
    
    // Engine parameters (supports multi-engine aircraft)
    std::vector<double> engineRpm;       // RPM for each engine
    std::vector<double> enginePower;     // Power setting (%)
    std::vector<double> engineTemp;      // Temperature (°C)
    std::vector<double> engineFuelFlow;  // Fuel flow (gallons/hour)
    std::vector<double> engineOilPressure; // Oil pressure (PSI)
    std::vector<double> engineOilTemp;   // Oil temperature (°C)
    
    // Control inputs
    double controlPitch;     // Elevator/cyclic position, -1.0 to 1.0
    double controlRoll;      // Aileron/cyclic position, -1.0 to 1.0
    double controlYaw;       // Rudder/pedal position, -1.0 to 1.0
    double controlThrottle;  // Throttle position, 0.0 to 1.0
    double controlCollective; // Collective position (for rotary-wing), 0.0 to 1.0
    double controlFlaps;     // Flap position, 0.0 to 1.0
    double controlGear;      // Landing gear position, 0.0 to 1.0 (0=up, 1=down)
    double controlSpoilers;  // Spoiler/speedbrake position, 0.0 to 1.0
    
    // Navigation and autopilot
    bool autopilotEngaged;        // Is autopilot engaged
    int autopilotMode;            // Autopilot mode
    double selectedAltitude;      // Selected altitude (feet)
    double selectedHeading;       // Selected heading (degrees)
    double selectedSpeed;         // Selected speed (knots)
    double selectedVerticalSpeed; // Selected vertical speed (feet/minute)
    std::array<double, 2> navFrequency; // Navigation radio frequencies
    std::array<double, 2> comFrequency; // Communication radio frequencies
    std::string navMode;          // Navigation mode (e.g., NAV, VOR, ILS, GPS)
    
    // Aircraft configuration
    int flapsPosition;       // Flap position (notches/degrees)
    int gearPosition;        // Gear position (0=up, 1=in transit, 2=down)
    bool spoilersDeployed;   // Are spoilers/speedbrakes deployed
    double fuelRemaining;    // Total fuel remaining (gallons)
    std::vector<double> fuelTankLevels; // Fuel level in each tank (gallons)
    double grossWeight;      // Aircraft gross weight (pounds)
    
    // Environmental conditions
    double outsideAirTemp;   // Outside air temperature (°C)
    double windSpeed;        // Wind speed (knots)
    double windDirection;    // Wind direction (degrees)
    double visibility;       // Visibility (statute miles)
    int cloudCeiling;        // Cloud ceiling (feet AGL)
    WeatherConditions weatherConditions = WeatherConditions::VMC;
    
    // Flight state
    FlightPhase phase = FlightPhase::UNKNOWN;
    bool onGround;           // Is the aircraft on the ground
    bool stall;              // Is the aircraft stalled
    bool overspeed;          // Is the aircraft overspeeding
    
    // System states
    bool electricalSystemOk; // Electrical system status
    bool hydraulicSystemOk;  // Hydraulic system status
    bool fuelSystemOk;       // Fuel system status
    bool engineSystemOk;     // Engine system status
    bool avionicsSystemOk;   // Avionics system status
    
    // Flight instructor inputs
    bool instructorPause;    // Has instructor paused the simulation
    bool instructorReset;    // Has instructor reset the simulation
    bool failureActive;      // Is any failure scenario active
    std::vector<std::string> activeFailures; // List of active failures
    
    // Performance metrics
    double glideSlope;       // Glide slope deviation (dots)
    double localizer;        // Localizer deviation (dots)
    double touchdownRate;    // Touchdown rate (feet/minute)
    double touchdownDistance; // Distance from runway threshold at touchdown (feet)
    double touchdownHeading; // Heading at touchdown (degrees)
    double touchdownPitch;   // Pitch at touchdown (degrees)
    double touchdownRoll;    // Roll at touchdown (degrees)
    
    // Additional fields for custom data
    std::unordered_map<std::string, double> customNumericData;
    std::unordered_map<std::string, std::string> customTextData;
    std::unordered_map<std::string, bool> customBoolData;
    
    // Constructors
    FlightParameters() : timestamp(0), latitude(0), longitude(0), altitude(0),
                        heading(0), pitch(0), roll(0), groundSpeed(0),
                        indicatedAirspeed(0), trueAirspeed(0), verticalSpeed(0),
                        controlPitch(0), controlRoll(0), controlYaw(0),
                        controlThrottle(0), controlCollective(0), controlFlaps(0),
                        controlGear(0), controlSpoilers(0), autopilotEngaged(false),
                        autopilotMode(0), selectedAltitude(0), selectedHeading(0),
                        selectedSpeed(0), selectedVerticalSpeed(0), flapsPosition(0),
                        gearPosition(0), spoilersDeployed(false), fuelRemaining(0),
                        grossWeight(0), outsideAirTemp(0), windSpeed(0),
                        windDirection(0), visibility(0), cloudCeiling(0),
                        onGround(true), stall(false), overspeed(false),
                        electricalSystemOk(true), hydraulicSystemOk(true),
                        fuelSystemOk(true), engineSystemOk(true), avionicsSystemOk(true),
                        instructorPause(false), instructorReset(false),
                        failureActive(false), glideSlope(0), localizer(0),
                        touchdownRate(0), touchdownDistance(0), touchdownHeading(0),
                        touchdownPitch(0), touchdownRoll(0) {
        // Initialize radio frequencies
        navFrequency = {0.0, 0.0};
        comFrequency = {0.0, 0.0};
    }
    
    // Simulate default parameters for a Cessna 172 at takeoff
    static FlightParameters createDefaultC172Parameters() {
        FlightParameters params;
        params.timestamp = 0;
        params.sessionId = "default-session";
        params.aircraftId = "C172";
        params.aircraftType = AircraftType::FIXED_WING;
        
        params.latitude = 37.621312;
        params.longitude = -122.378906;
        params.altitude = 10.0;
        params.heading = 270.0;
        params.pitch = 0.0;
        params.roll = 0.0;
        params.groundSpeed = 0.0;
        params.indicatedAirspeed = 0.0;
        params.trueAirspeed = 0.0;
        params.verticalSpeed = 0.0;
        
        // Engine parameters (single engine for C172)
        params.engineRpm = {0.0};
        params.enginePower = {0.0};
        params.engineTemp = {77.0};
        params.engineFuelFlow = {0.0};
        params.engineOilPressure = {78.0};
        params.engineOilTemp = {75.0};
        
        // Control inputs at idle
        params.controlPitch = 0.0;
        params.controlRoll = 0.0;
        params.controlYaw = 0.0;
        params.controlThrottle = 0.0;
        params.controlFlaps = 0.0;
        params.controlGear = 1.0; // Gear down (fixed gear on C172)
        params.controlSpoilers = 0.0;
        
        // Navigation and autopilot
        params.autopilotEngaged = false;
        params.selectedAltitude = 3000.0;
        params.selectedHeading = 270.0;
        params.selectedSpeed = 100.0;
        params.selectedVerticalSpeed = 500.0;
        params.navFrequency = {108.0, 0.0};
        params.comFrequency = {118.1, 0.0};
        params.navMode = "GPS";
        
        // Aircraft configuration
        params.flapsPosition = 0;
        params.gearPosition = 2; // Down (fixed gear)
        params.spoilersDeployed = false;
        params.fuelRemaining = 40.0;
        params.fuelTankLevels = {20.0, 20.0}; // Left and right tanks
        params.grossWeight = 2300.0;
        
        // Environmental conditions
        params.outsideAirTemp = 15.0;
        params.windSpeed = 5.0;
        params.windDirection = 270.0;
        params.visibility = 10.0;
        params.cloudCeiling = 3000;
        params.weatherConditions = WeatherConditions::VMC;
        
        // Flight state
        params.phase = FlightPhase::PREFLIGHT;
        params.onGround = true;
        params.stall = false;
        params.overspeed = false;
        
        // System states
        params.electricalSystemOk = true;
        params.hydraulicSystemOk = true;
        params.fuelSystemOk = true;
        params.engineSystemOk = true;
        params.avionicsSystemOk = true;
        
        // Instructor inputs
        params.instructorPause = false;
        params.instructorReset = false;
        params.failureActive = false;
        
        return params;
    }
};

/**
 * @brief Flight event type
 */
enum class FlightEventType {
    TAKEOFF,
    LANDING,
    STALL,
    OVERSPEED,
    BANK_ANGLE_EXCEEDED,
    PITCH_ANGLE_EXCEEDED,
    ALTITUDE_DEVIATION,
    HEADING_DEVIATION,
    SPEED_DEVIATION,
    GEAR_CONFIGURATION,
    FLAP_CONFIGURATION,
    SYSTEM_FAILURE,
    PHASE_CHANGE,
    NAVIGATION_DEVIATION,
    INSTRUCTOR_ACTION,
    CUSTOM
};

/**
 * @brief Flight event severity
 */
enum class FlightEventSeverity {
    INFO,
    WARNING,
    CAUTION,
    CRITICAL
};

/**
 * @brief Flight event detected during simulation
 */
struct FlightEvent {
    int64_t timestamp;            // Event timestamp (microseconds since epoch)
    std::string sessionId;        // Training session identifier
    FlightEventType type;         // Event type
    FlightEventSeverity severity; // Event severity
    std::string description;      // Human-readable description
    
    // Event-specific data
    std::unordered_map<std::string, double> numericData;
    std::unordered_map<std::string, std::string> textData;
    
    // Snapshot of key flight parameters at event time
    double latitude;
    double longitude;
    double altitude;
    double heading;
    double pitch;
    double roll;
    double indicatedAirspeed;
    
    FlightEvent() : timestamp(0), type(FlightEventType::CUSTOM),
                   severity(FlightEventSeverity::INFO), latitude(0), longitude(0),
                   altitude(0), heading(0), pitch(0), roll(0), indicatedAirspeed(0) {}
};

/**
 * @brief Flight anomaly type
 */
enum class FlightAnomalyType {
    CONTROL_INPUT_ANOMALY,
    INSTRUMENT_ANOMALY,
    NAVIGATION_ANOMALY,
    SYSTEM_ANOMALY,
    TRAJECTORY_ANOMALY,
    PROCEDURE_ANOMALY,
    COMMUNICATION_ANOMALY,
    CUSTOM
};

/**
 * @brief Flight anomaly detected during simulation
 */
struct FlightAnomaly {
    int64_t timestamp;            // Anomaly timestamp (microseconds since epoch)
    std::string sessionId;        // Training session identifier
    FlightAnomalyType type;       // Anomaly type
    double confidence;            // Detection confidence (0.0 to 1.0)
    std::string description;      // Human-readable description
    
    // Anomaly-specific data
    std::unordered_map<std::string, double> parameters;
    std::string expectedBehavior;
    std::string actualBehavior;
    
    // Reference to normal behavior model
    std::string modelReference;
    double deviationScore;
    
    FlightAnomaly() : timestamp(0), type(FlightAnomalyType::CUSTOM),
                     confidence(0.0), deviationScore(0.0) {}
};

/**
 * @brief Parameters for event detection
 */
struct EventDetectionParameters {
    double bankAngleThreshold;    // Maximum bank angle (degrees)
    double pitchAngleThreshold;   // Maximum pitch angle (degrees)
    double altitudeDeviationThreshold; // Maximum altitude deviation (feet)
    double headingDeviationThreshold;  // Maximum heading deviation (degrees)
    double speedDeviationThreshold;    // Maximum speed deviation (knots)
    double vsiThreshold;          // Maximum vertical speed (feet/minute)
    double glideslopeDeviationThreshold; // Maximum glideslope deviation (dots)
    double localizerDeviationThreshold;  // Maximum localizer deviation (dots)
    
    // Gear and flap configuration thresholds
    std::vector<std::pair<double, int>> speedGearThresholds; // Speed/gear position pairs
    std::vector<std::pair<double, int>> speedFlapThresholds; // Speed/flap position pairs
    
    EventDetectionParameters() : bankAngleThreshold(45.0), pitchAngleThreshold(30.0),
                                altitudeDeviationThreshold(200.0), headingDeviationThreshold(10.0),
                                speedDeviationThreshold(10.0), vsiThreshold(1000.0),
                                glideslopeDeviationThreshold(1.0), localizerDeviationThreshold(1.0) {
        // Default gear speed thresholds (knots/position)
        speedGearThresholds = {{140, 0}, {120, 1}}; // Gear up above 140, down below 120
        
        // Default flap speed thresholds (knots/position)
        speedFlapThresholds = {{120, 0}, {100, 1}, {80, 2}}; // Various flap settings
    }
};

/**
 * @brief Parameters for anomaly detection
 */
struct AnomalyDetectionParameters {
    double confidenceThreshold;   // Minimum confidence for detection (0.0 to 1.0)
    double controlInputDeviation; // Anomalous control input deviation threshold
    double trajectoryDeviation;   // Anomalous trajectory deviation threshold
    double systemParameterDeviation; // Anomalous system parameter deviation threshold
    double procedureComplianceThreshold; // Procedure compliance threshold (0.0 to 1.0)
    
    AnomalyDetectionParameters() : confidenceThreshold(0.7), controlInputDeviation(0.5),
                                  trajectoryDeviation(0.5), systemParameterDeviation(0.5),
                                  procedureComplianceThreshold(0.8) {}
};

} // namespace Simulator
} // namespace PilotTraining
