// src/backend/simulator/EventDetector.h
#pragma once

#include <vector>
#include <unordered_map>
#include <memory>
#include <functional>
#include <string>

#include "FlightParameters.h"

namespace PilotTraining {
namespace Simulator {

/**
 * @brief Flight event detector
 * 
 * Detects significant events during flight simulation based on telemetry data.
 * Events include things like takeoffs, landings, stalls, phase changes, etc.
 */
class EventDetector {
public:
    /**
     * @brief Construct a new Event Detector
     * 
     * @param parameters Optional event detection parameters
     */
    explicit EventDetector(const EventDetectionParameters& parameters = EventDetectionParameters());
    
    /**
     * @brief Destroy the Event Detector
     */
    ~EventDetector();
    
    /**
     * @brief Set detection parameters
     * 
     * @param parameters New event detection parameters
     */
    void setParameters(const EventDetectionParameters& parameters);
    
    /**
     * @brief Get current detection parameters
     * 
     * @return EventDetectionParameters Current parameters
     */
    EventDetectionParameters getParameters() const;
    
    /**
     * @brief Detect events in telemetry data
     * 
     * @param data Sequence of flight parameters to analyze
     * @return std::vector<FlightEvent> Detected events
     */
    std::vector<FlightEvent> detectEvents(const std::vector<FlightParameters>& data);
    
    /**
     * @brief Register a custom event detector
     * 
     * @param eventType Type of event to detect
     * @param detector Function that returns true if event is detected
     * @param description Human-readable description
     * @param severity Event severity
     * @return true if successfully registered
     * @return false if eventType already has a detector
     */
    bool registerCustomDetector(
        FlightEventType eventType,
        std::function<bool(const std::vector<FlightParameters>&, FlightEvent&)> detector,
        const std::string& description,
        FlightEventSeverity severity
    );
    
    /**
     * @brief Unregister a custom event detector
     * 
     * @param eventType Type of event to remove detector for
     * @return true if successfully unregistered
     * @return false if eventType has no detector
     */
    bool unregisterCustomDetector(FlightEventType eventType);
    
    /**
     * @brief Enable/disable a specific event detector
     * 
     * @param eventType Type of event
     * @param enabled Whether the detector should be enabled
     * @return true if the detector state was changed
     * @return false if the detector does not exist
     */
    bool setDetectorEnabled(FlightEventType eventType, bool enabled);
    
    /**
     * @brief Check if a specific event detector is enabled
     * 
     * @param eventType Type of event
     * @return true if the detector is enabled
     * @return false if the detector is disabled or does not exist
     */
    bool isDetectorEnabled(FlightEventType eventType) const;

private:
    // Internal detector function type
    using DetectorFunc = std::function<bool(const std::vector<FlightParameters>&, FlightEvent&)>;
    
    // Internal detector configuration
    struct DetectorConfig {
        DetectorFunc detector;
        std::string description;
        FlightEventSeverity severity;
        bool enabled;
    };
    
    // Detection parameters
    EventDetectionParameters _parameters;
    
    // Historical data for state tracking
    FlightPhase _lastPhase;
    bool _wasOnGround;
    bool _wasStalled;
    
    // Map of event type to detector
    std::unordered_map<FlightEventType, DetectorConfig> _detectors;
    
    // Internal detection methods
    void initializeDefaultDetectors();
    
    // Default detector implementations
    bool detectTakeoff(const std::vector<FlightParameters>& data, FlightEvent& event);
    bool detectLanding(const std::vector<FlightParameters>& data, FlightEvent& event);
    bool detectStall(const std::vector<FlightParameters>& data, FlightEvent& event);
    bool detectOverspeed(const std::vector<FlightParameters>& data, FlightEvent& event);
    bool detectBankAngleExceeded(const std::vector<FlightParameters>& data, FlightEvent& event);
    bool detectPitchAngleExceeded(const std::vector<FlightParameters>& data, FlightEvent& event);
    bool detectAltitudeDeviation(const std::vector<FlightParameters>& data, FlightEvent& event);
    bool detectHeadingDeviation(const std::vector<FlightParameters>& data, FlightEvent& event);
    bool detectSpeedDeviation(const std::vector<FlightParameters>& data, FlightEvent& event);
    bool detectGearConfiguration(const std::vector<FlightParameters>& data, FlightEvent& event);
    bool detectFlapConfiguration(const std::vector<FlightParameters>& data, FlightEvent& event);
    bool detectSystemFailure(const std::vector<FlightParameters>& data, FlightEvent& event);
    bool detectPhaseChange(const std::vector<FlightParameters>& data, FlightEvent& event);
    bool detectNavigationDeviation(const std::vector<FlightParameters>& data, FlightEvent& event);
    bool detectInstructorAction(const std::vector<FlightParameters>& data, FlightEvent& event);
    
    // Helper methods
    FlightEvent createEvent(
        const FlightParameters& params,
        FlightEventType type,
        FlightEventSeverity severity,
        const std::string& description
    );
};

} // namespace Simulator
} // namespace PilotTraining
