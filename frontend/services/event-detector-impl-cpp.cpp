// src/backend/simulator/EventDetector.cpp
#include "EventDetector.h"
#include "../core/Logger.h"
#include <cmath>
#include <algorithm>

namespace PilotTraining {
namespace Simulator {

EventDetector::EventDetector(const EventDetectionParameters& parameters)
    : _parameters(parameters),
      _lastPhase(FlightPhase::UNKNOWN),
      _wasOnGround(true),
      _wasStalled(false) {
    
    initializeDefaultDetectors();
    Core::Logger::debug("EventDetector initialized");
}

EventDetector::~EventDetector() {
    Core::Logger::debug("EventDetector destroyed");
}

void EventDetector::setParameters(const EventDetectionParameters& parameters) {
    _parameters = parameters;
    Core::Logger::debug("EventDetector parameters updated");
}

EventDetectionParameters EventDetector::getParameters() const {
    return _parameters;
}

std::vector<FlightEvent> EventDetector::detectEvents(const std::vector<FlightParameters>& data) {
    std::vector<FlightEvent> detectedEvents;
    
    if (data.empty()) {
        return detectedEvents;
    }
    
    // Run all enabled detectors
    for (const auto& [eventType, config] : _detectors) {
        if (config.enabled) {
            FlightEvent event;
            if (config.detector(data, event)) {
                detectedEvents.push_back(event);
            }
        }
    }
    
    // Update state for next detection cycle
    const auto& lastParams = data.back();
    _lastPhase = lastParams.phase;
    _wasOnGround = lastParams.onGround;
    _wasStalled = lastParams.stall;
    
    return detectedEvents;
}

bool EventDetector::registerCustomDetector(
    FlightEventType eventType,
    std::function<bool(const std::vector<FlightParameters>&, FlightEvent&)> detector,
    const std::string& description,
    FlightEventSeverity severity) {
    
    // Check if a detector for this event type already exists
    if (_detectors.find(eventType) != _detectors.end()) {
        return false;
    }
    
    // Register the detector
    _detectors[eventType] = {
        detector,
        description,
        severity,
        true // Enabled by default
    };
    
    Core::Logger::debug("Custom detector registered for event type: {}", static_cast<int>(eventType));
    return true;
}

bool EventDetector::unregisterCustomDetector(FlightEventType eventType) {
    // Check if the detector exists
    auto it = _detectors.find(eventType);
    if (it == _detectors.end()) {
        return false;
    }
    
    // Only allow unregistering custom detectors
    if (eventType != FlightEventType::CUSTOM && 
        static_cast<int>(eventType) < static_cast<int>(FlightEventType::CUSTOM)) {
        return false;
    }
    
    // Remove the detector
    _detectors.erase(it);
    
    Core::Logger::debug("Custom detector unregistered for event type: {}", static_cast<int>(eventType));
    return true;
}

bool EventDetector::setDetectorEnabled(FlightEventType eventType, bool enabled) {
    // Check if the detector exists
    auto it = _detectors.find(eventType);
    if (it == _detectors.end()) {
        return false;
    }
    
    // Set enabled state
    it->second.enabled = enabled;
    
    Core::Logger::debug("Detector for event type {} {}", 
        static_cast<int>(eventType), 
        enabled ? "enabled" : "disabled");
    
    return true;
}

bool EventDetector::isDetectorEnabled(FlightEventType eventType) const {
    // Check if the detector exists
    auto it = _detectors.find(eventType);
    if (it == _detectors.end()) {
        return false;
    }
    
    return it->second.enabled;
}

void EventDetector::initializeDefaultDetectors() {
    // Register all default detectors
    _detectors[FlightEventType::TAKEOFF] = {
        [this](const auto& data, auto& event) { return detectTakeoff(data, event); },
        "Aircraft takeoff detected",
        FlightEventSeverity::INFO,
        true
    };
    
    _detectors[FlightEventType::LANDING] = {
        [this](const auto& data, auto& event) { return detectLanding(data, event); },
        "Aircraft landing detected",
        FlightEventSeverity::INFO,
        true
    };
    
    _detectors[FlightEventType::STALL] = {
        [this](const auto& data, auto& event) { return detectStall(data, event); },
        "Aircraft stall detected",
        FlightEventSeverity::WARNING,
        true
    };
    
    _detectors[FlightEventType::OVERSPEED] = {
        [this](const auto& data, auto& event) { return detectOverspeed(data, event); },
        "Aircraft overspeed detected",
        FlightEventSeverity::WARNING,
        true
    };
    
    _detectors[FlightEventType::BANK_ANGLE_EXCEEDED] = {
        [this](const auto& data, auto& event) { return detectBankAngleExceeded(data, event); },
        "Bank angle limit exceeded",
        FlightEventSeverity::CAUTION,
        true
    };
    
    _detectors[FlightEventType::PITCH_ANGLE_EXCEEDED] = {
        [this](const auto& data, auto& event) { return detectPitchAngleExceeded(data, event); },
        "Pitch angle limit exceeded",
        FlightEventSeverity::CAUTION,
        true
    };
    
    _detectors[FlightEventType::ALTITUDE_DEVIATION] = {
        [this](const auto& data, auto& event) { return detectAltitudeDeviation(data, event); },
        "Altitude deviation detected",
        FlightEventSeverity::CAUTION,
        true
    };
    
    _detectors[FlightEventType::HEADING_DEVIATION] = {
        [this](const auto& data, auto& event) { return detectHeadingDeviation(data, event); },
        "Heading deviation detected",
        FlightEventSeverity::CAUTION,
        true
    };
    
    _detectors[FlightEventType::SPEED_DEVIATION] = {
        [this](const auto& data, auto& event) { return detectSpeedDeviation(data, event); },
        "Speed deviation detected",
        FlightEventSeverity::CAUTION,
        true
    };
    
    _detectors[FlightEventType::GEAR_CONFIGURATION] = {
        [this](const auto& data, auto& event) { return detectGearConfiguration(data, event); },
        "Improper gear configuration",
        FlightEventSeverity::WARNING,
        true
    };
    
    _detectors[FlightEventType::FLAP_CONFIGURATION] = {
        [this](const auto& data, auto& event) { return detectFlapConfiguration(data, event); },
        "Improper flap configuration",
        FlightEventSeverity::CAUTION,
        true
    };
    
    _detectors[FlightEventType::SYSTEM_FAILURE] = {
        [this](const auto& data, auto& event) { return detectSystemFailure(data, event); },
        "System failure detected",
        FlightEventSeverity::CRITICAL,
        true
    };
    
    _detectors[FlightEventType::PHASE_CHANGE] = {
        [this](const auto& data, auto& event) { return detectPhaseChange(data, event); },
        "Flight phase change",
        FlightEventSeverity::INFO,
        true
    };
    
    _detectors[FlightEventType::NAVIGATION_DEVIATION] = {
        [this](const auto& data, auto& event) { return detectNavigationDeviation(data, event); },
        "Navigation deviation detected",
        FlightEventSeverity::CAUTION,
        true
    };
    
    _detectors[FlightEventType::INSTRUCTOR_ACTION] = {
        [this](const auto& data, auto& event) { return detectInstructorAction(data, event); },
        "Instructor action detected",
        FlightEventSeverity::INFO,
        true
    };
}

bool EventDetector::detectTakeoff(const std::vector<FlightParameters>& data, FlightEvent& event) {
    // Need at least two data points to detect transition
    if (data.size() < 2) {
        return false;
    }
    
    const auto& current = data.back();
    
    // Check for transition from ground to air
    if (_wasOnGround && !current.onGround && current.indicatedAirspeed > 40.0) {
        event = createEvent(
            current,
            FlightEventType::TAKEOFF,
            FlightEventSeverity::INFO,
            "Aircraft takeoff detected"
        );
        
        // Add event-specific data
        event.numericData["speedKnots"] = current.indicatedAirspeed;
        event.numericData["pitchAngle"] = current.pitch;
        event.numericData["headingDegrees"] = current.heading;
        
        return true;
    }
    
    return false;
}

bool EventDetector::detectLanding(const std::vector<FlightParameters>& data, FlightEvent& event) {
    // Need at least two data points to detect transition
    if (data.size() < 2) {
        return false;
    }
    
    const auto& current = data.back();
    const auto& previous = data[data.size() - 2];
    
    // Check for transition from air to ground
    if (!_wasOnGround && current.onGround) {
        event = createEvent(
            current,
            FlightEventType::LANDING,
            FlightEventSeverity::INFO,
            "Aircraft landing detected"
        );
        
        // Calculate touchdown rate (vertical speed at touchdown)
        double touchdownRate = previous.verticalSpeed;
        
        // Add event-specific data
        event.numericData["touchdownRateFPM"] = touchdownRate;
        event.numericData["touchdownSpeedKnots"] = previous.indicatedAirspeed;
        event.numericData["touchdownPitch"] = previous.pitch;
        event.numericData["touchdownRoll"] = previous.roll;
        event.numericData["touchdownHeading"] = previous.heading;
        
        // Assess landing quality
        if (std::abs(touchdownRate) > 600) {
            event.textData["landingQuality"] = "Hard landing";
            event.severity = FlightEventSeverity::CAUTION;
        } else if (std::abs(touchdownRate) > 300) {
            event.textData["landingQuality"] = "Firm landing";
            event.severity = FlightEventSeverity::INFO;
        } else {
            event.textData["landingQuality"] = "Smooth landing";
            event.severity = FlightEventSeverity::INFO;
        }
        
        return true;
    }
    
    return false;
}

bool EventDetector::detectStall(const std::vector<FlightParameters>& data, FlightEvent& event) {
    if (data.empty()) {
        return false;
    }
    
    const auto& current = data.back();
    
    // Check for transition to stall state
    if (!_wasStalled && current.stall) {
        event = createEvent(
            current,
            FlightEventType::STALL,
            FlightEventSeverity::WARNING,
            "Aircraft stall detected"
        );
        
        // Add event-specific data
        event.numericData["indicatedAirspeed"] = current.indicatedAirspeed;
        event.numericData["pitchAngle"] = current.pitch;
        event.numericData["bankAngle"] = current.roll;
        event.numericData["altitude"] = current.altitude;
        
        return true;
    }
    
    return false;
}

bool EventDetector::detectOverspeed(const std::vector<FlightParameters>& data, FlightEvent& event) {
    if (data.empty()) {
        return false;
    }
    
    const auto& current = data.back();
    
    // Check for overspeed state
    if (current.overspeed) {
        event = createEvent(
            current,
            FlightEventType::OVERSPEED,
            FlightEventSeverity::WARNING,
            "Aircraft overspeed detected"
        );
        
        // Add event-specific data
        event.numericData["indicatedAirspeed"] = current.indicatedAirspeed;
        event.numericData["altitude"] = current.altitude;
        
        return true;
    }
    
    return false;
}

bool EventDetector::detectBankAngleExceeded(const std::vector<FlightParameters>& data, FlightEvent& event) {
    if (data.empty()) {
        return false;
    }
    
    const auto& current = data.back();
    
    // Check if bank angle exceeds threshold
    const double bankAngle = std::abs(current.roll);
    if (bankAngle > _parameters.bankAngleThreshold) {
        event = createEvent(
            current,
            FlightEventType::BANK_ANGLE_EXCEEDED,
            FlightEventSeverity::CAUTION,
            "Bank angle limit exceeded"
        );
        
        // Add event-specific data
        event.numericData["bankAngle"] = current.roll;
        event.numericData["threshold"] = _parameters.bankAngleThreshold;
        event.numericData["exceedAmount"] = bankAngle - _parameters.bankAngleThreshold;
        
        return true;
    }
    
    return false;
}

bool EventDetector::detectPitchAngleExceeded(const std::vector<FlightParameters>& data, FlightEvent& event) {
    if (data.empty()) {
        return false;
    }
    
    const auto& current = data.back();
    
    // Check if pitch angle exceeds threshold
    const double pitchAngle = std::abs(current.pitch);
    if (pitchAngle > _parameters.pitchAngleThreshold) {
        event = createEvent(
            current,
            FlightEventType::PITCH_ANGLE_EXCEEDED,
            FlightEventSeverity::CAUTION,
            "Pitch angle limit exceeded"
        );
        
        // Add event-specific data
        event.numericData["pitchAngle"] = current.pitch;
        event.numericData["threshold"] = _parameters.pitchAngleThreshold;
        event.numericData["exceedAmount"] = pitchAngle - _parameters.pitchAngleThreshold;
        
        return true;
    }
    
    return false;
}

bool EventDetector::detectAltitudeDeviation(const std::vector<FlightParameters>& data, FlightEvent& event) {
    if (data.empty()) {
        return false;
    }
    
    const auto& current = data.back();
    
    // Skip if autopilot is not engaged or there's no selected altitude
    if (!current.autopilotEngaged || current.selectedAltitude < 1.0) {
        return false;
    }
    
    // Check if altitude deviation exceeds threshold
    const double deviation = std::abs(current.altitude - current.selectedAltitude);
    if (deviation > _parameters.altitudeDeviationThreshold) {
        event = createEvent(
            current,
            FlightEventType::ALTITUDE_DEVIATION,
            FlightEventSeverity::CAUTION,
            "Altitude deviation detected"
        );
        
        // Add event-specific data
        event.numericData["actualAltitude"] = current.altitude;
        event.numericData["selectedAltitude"] = current.selectedAltitude;
        event.numericData["deviation"] = deviation;
        event.numericData["threshold"] = _parameters.altitudeDeviationThreshold;
        
        if (current.altitude > current.selectedAltitude) {
            event.textData["direction"] = "above";
        } else {
            event.textData["direction"] = "below";
        }
        
        return true;
    }
    
    return false;
}

bool EventDetector::detectHeadingDeviation(const std::vector<FlightParameters>& data, FlightEvent& event) {
    if (data.empty()) {
        return false;
    }
    
    const auto& current = data.back();
    
    // Skip if autopilot is not engaged or there's no selected heading
    if (!current.autopilotEngaged || current.selectedHeading < 0.0) {
        return false;
    }
    
    // Calculate heading deviation, accounting for the 0/360 wrap
    double deviation = std::abs(current.heading - current.selectedHeading);
    if (deviation > 180.0) {
        deviation = 360.0 - deviation;
    }
    
    // Check if heading deviation exceeds threshold
    if (deviation > _parameters.headingDeviationThreshold) {
        event = createEvent(
            current,
            FlightEventType::HEADING_DEVIATION,
            FlightEventSeverity::CAUTION,
            "Heading deviation detected"
        );
        
        // Add event-specific data
        event.numericData["actualHeading"] = current.heading;
        event.numericData["selectedHeading"] = current.selectedHeading;
        event.numericData["deviation"] = deviation;
        event.numericData["threshold"] = _parameters.headingDeviationThreshold;
        
        return true;
    }
    
    return false;
}

bool EventDetector::detectSpeedDeviation(const std::vector<FlightParameters>& data, FlightEvent& event) {
    if (data.empty()) {
        return false;
    }
    
    const auto& current = data.back();
    
    // Skip if autopilot is not engaged or there's no selected speed
    if (!current.autopilotEngaged || current.selectedSpeed < 1.0) {
        return false;
    }
    
    // Check if speed deviation exceeds threshold
    const double deviation = std::abs(current.indicatedAirspeed - current.selectedSpeed);
    if (deviation > _parameters.speedDeviationThreshold) {
        event = createEvent(
            current,
            FlightEventType::SPEED_DEVIATION,
            FlightEventSeverity::CAUTION,
            "Speed deviation detected"
        );
        
        // Add event-specific data
        event.numericData["actualSpeed"] = current.indicatedAirspeed;
        event.numericData["selectedSpeed"] = current.selectedSpeed;
        event.numericData["deviation"] = deviation;
        event.numericData["threshold"] = _parameters.speedDeviationThreshold;
        
        if (current.indicatedAirspeed > current.selectedSpeed) {
            event.textData["direction"] = "above";
        } else {
            event.textData["direction"] = "below";
        }
        
        return true;
    }
    
    return false;
}

bool EventDetector::detectGearConfiguration(const std::vector<FlightParameters>& data, FlightEvent& event) {
    if (data.empty()) {
        return false;
    }
    
    const auto& current = data.back();
    
    // Check gear configuration against speed thresholds
    for (const auto& [speedThreshold, gearPosition] : _parameters.speedGearThresholds) {
        // Gear should be up above threshold, down below threshold
        if (current.indicatedAirspeed > speedThreshold && current.gearPosition != 0) {
            event = createEvent(
                current,
                FlightEventType::GEAR_CONFIGURATION,
                FlightEventSeverity::WARNING,
                "Gear should be retracted at this speed"
            );
            
            // Add event-specific data
            event.numericData["airspeed"] = current.indicatedAirspeed;
            event.numericData["gearPosition"] = current.gearPosition;
            event.numericData["speedThreshold"] = speedThreshold;
            
            return true;
        } else if (current.indicatedAirspeed < speedThreshold && current.gearPosition != gearPosition) {
            event = createEvent(
                current,
                FlightEventType::GEAR_CONFIGURATION,
                FlightEventSeverity::WARNING,
                "Gear should be extended at this speed"
            );
            
            // Add event-specific data
            event.numericData["airspeed"] = current.indicatedAirspeed;
            event.numericData["gearPosition"] = current.gearPosition;
            event.numericData["speedThreshold"] = speedThreshold;
            
            return true;
        }
    }
    
    return false;
}

bool EventDetector::detectFlapConfiguration(const std::vector<FlightParameters>& data, FlightEvent& event) {
    if (data.empty()) {
        return false;
    }
    
    const auto& current = data.back();
    
    // Check flap configuration against speed thresholds
    for (const auto& [speedThreshold, flapPosition] : _parameters.speedFlapThresholds) {
        // Flaps should not exceed position limit at this speed
        if (current.indicatedAirspeed > speedThreshold && current.flapsPosition > flapPosition) {
            event = createEvent(
                current,
                FlightEventType::FLAP_CONFIGURATION,
                FlightEventSeverity::CAUTION,
                "Flap setting too high for current airspeed"
            );
            
            // Add event-specific data
            event.numericData["airspeed"] = current.indicatedAirspeed;
            event.numericData["flapsPosition"] = current.flapsPosition;
            event.numericData["maxFlapsPosition"] = flapPosition;
            event.numericData["speedThreshold"] = speedThreshold;
            
            return true;
        }
    }
    
    return false;
}

bool EventDetector::detectSystemFailure(const std::vector<FlightParameters>& data, FlightEvent& event) {
    if (data.empty()) {
        return false;
    }
    
    const auto& current = data.back();
    
    // Check for any system failure
    if (current.failureActive || 
        !current.electricalSystemOk ||
        !current.hydraulicSystemOk ||
        !current.fuelSystemOk ||
        !current.engineSystemOk ||
        !current.avionicsSystemOk) {
        
        event = createEvent(
            current,
            FlightEventType::SYSTEM_FAILURE,
            FlightEventSeverity::CRITICAL,
            "System failure detected"
        );
        
        // Add event-specific data
        event.textData["failures"] = "";
        
        if (!current.electricalSystemOk) {
            event.textData["failures"] += "Electrical system; ";
        }
        if (!current.hydraulicSystemOk) {
            event.textData["failures"] += "Hydraulic system; ";
        }
        if (!current.fuelSystemOk) {
            event.textData["failures"] += "Fuel system; ";
        }
        if (!current.engineSystemOk) {
            event.textData["failures"] += "Engine system; ";
        }
        if (!current.avionicsSystemOk) {
            event.textData["failures"] += "Avionics system; ";
        }
        
        // Add specific failures from aircraft
        if (!current.activeFailures.empty()) {
            for (const auto& failure : current.activeFailures) {
                event.textData["failures"] += failure + "; ";
            }
        }
        
        return true;
    }
    
    return false;
}

bool EventDetector::detectPhaseChange(const std::vector<FlightParameters>& data, FlightEvent& event) {
    if (data.empty()) {
        return false;
    }
    
    const auto& current = data.back();
    
    // Check for flight phase change
    if (current.phase != _lastPhase && current.phase != FlightPhase::UNKNOWN) {
        std::string phaseStr;
        
        switch (current.phase) {
            case FlightPhase::PREFLIGHT: phaseStr = "Preflight"; break;
            case FlightPhase::TAXI: phaseStr = "Taxi"; break;
            case FlightPhase::TAKEOFF: phaseStr = "Takeoff"; break;
            case FlightPhase::CLIMB: phaseStr = "Climb"; break;
            case FlightPhase::CRUISE: phaseStr = "Cruise"; break;
            case FlightPhase::DESCENT: phaseStr = "Descent"; break;
            case FlightPhase::APPROACH: phaseStr = "Approach"; break;
            case FlightPhase::LANDING: phaseStr = "Landing"; break;
            case FlightPhase::ROLLOUT: phaseStr = "Rollout"; break;
            case FlightPhase::GO_AROUND: phaseStr = "Go-around"; break;
            default: phaseStr = "Unknown";
        }
        
        event = createEvent(
            current,
            FlightEventType::PHASE_CHANGE,
            FlightEventSeverity::INFO,
            "Flight phase changed to: " + phaseStr
        );
        
        // Add event-specific data
        event.textData["newPhase"] = phaseStr;
        event.numericData["phaseValue"] = static_cast<int>(current.phase);
        
        std::string previousPhaseStr;
        switch (_lastPhase) {
            case FlightPhase::PREFLIGHT: previousPhaseStr = "Preflight"; break;
            case FlightPhase::TAXI: previousPhaseStr = "Taxi"; break;
            case FlightPhase::TAKEOFF: previousPhaseStr = "Takeoff"; break;
            case FlightPhase::CLIMB: previousPhaseStr = "Climb"; break;
            case FlightPhase::CRUISE: previousPhaseStr = "Cruise"; break;
            case FlightPhase::DESCENT: previousPhaseStr = "Descent"; break;
            case FlightPhase::APPROACH: previousPhaseStr = "Approach"; break;
            case FlightPhase::LANDING: previousPhaseStr = "Landing"; break;
            case FlightPhase::ROLLOUT: previousPhaseStr = "Rollout"; break;
            case FlightPhase::GO_AROUND: previousPhaseStr = "Go-around"; break;
            default: previousPhaseStr = "Unknown";
        }
        
        event.textData["previousPhase"] = previousPhaseStr;
        event.numericData["previousPhaseValue"] = static_cast<int>(_lastPhase);
        
        return true;
    }
    
    return false;
}

bool EventDetector::detectNavigationDeviation(const std::vector<FlightParameters>& data, FlightEvent& event) {
    if (data.empty()) {
        return false;
    }
    
    const auto& current = data.back();
    
    // Check for ILS approach deviations (glideslope and localizer)
    if (current.phase == FlightPhase::APPROACH && 
        (std::abs(current.glideSlope) > _parameters.glideslopeDeviationThreshold ||
         std::abs(current.localizer) > _parameters.localizerDeviationThreshold)) {
        
        event = createEvent(
            current,
            FlightEventType::NAVIGATION_DEVIATION,
            FlightEventSeverity::CAUTION,
            "Navigation deviation detected"
        );
        
        // Add event-specific data
        event.numericData["glideslopeDeviation"] = current.glideSlope;
        event.numericData["localizerDeviation"] = current.localizer;
        event.numericData["glideslopeThreshold"] = _parameters.glideslopeDeviationThreshold;
        event.numericData["localizerThreshold"] = _parameters.localizerDeviationThreshold;
        
        if (std::abs(current.glideSlope) > _parameters.glideslopeDeviationThreshold) {
            event.textData["deviationType"] = "Glideslope";
            if (current.glideSlope > 0) {
                event.textData["direction"] = "Above glidepath";
            } else {
                event.textData["direction"] = "Below glidepath";
            }
        } else {
            event.textData["deviationType"] = "Localizer";
            if (current.localizer > 0) {
                event.textData["direction"] = "Right of centerline";
            } else {
                event.textData["direction"] = "Left of centerline";
            }
        }
        
        return true;
    }
    
    return false;
}

bool EventDetector::detectInstructorAction(const std::vector<FlightParameters>& data, FlightEvent& event) {
    if (data.empty()) {
        return false;
    }
    
    const auto& current = data.back();
    
    // Check for instructor actions
    if (current.instructorPause || current.instructorReset) {
        event = createEvent(
            current,
            FlightEventType::INSTRUCTOR_ACTION,
            FlightEventSeverity::INFO,
            "Instructor action detected"
        );
        
        // Add event-specific data
        if (current.instructorPause) {
            event.textData["action"] = "Pause";
        } else if (current.instructorReset) {
            event.textData["action"] = "Reset";
        }
        
        return true;
    }
    
    return false;
}

FlightEvent EventDetector::createEvent(
    const FlightParameters& params,
    FlightEventType type,
    FlightEventSeverity severity,
    const std::string& description) {
    
    FlightEvent event;
    event.timestamp = params.timestamp;
    event.sessionId = params.sessionId;
    event.type = type;
    event.severity = severity;
    event.description = description;
    
    // Copy key flight parameters
    event.latitude = params.latitude;
    event.longitude = params.longitude;
    event.altitude = params.altitude;
    event.heading = params.heading;
    event.pitch = params.pitch;
    event.roll = params.roll;
    event.indicatedAirspeed = params.indicatedAirspeed;
    
    return event;
}

} // namespace Simulator
} // namespace PilotTraining
