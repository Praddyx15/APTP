// src/backend/simulator/LockFreeRingBuffer.h
#pragma once

#include <atomic>
#include <vector>
#include <optional>
#include <memory>
#include <cassert>

namespace PilotTraining {
namespace Simulator {

/**
 * @brief A lock-free ring buffer implementation for storing continuous data streams
 * 
 * This ring buffer is designed for high-performance telemetry data storage.
 * It supports multiple producers and multiple consumers with no locks,
 * ideal for real-time data processing. When the buffer is full, new writes
 * will overwrite the oldest data (circular buffer behavior).
 * 
 * @tparam T Type of elements in the buffer
 */
template<typename T>
class LockFreeRingBuffer {
private:
    // Pad to avoid false sharing
    struct alignas(64) PaddedAtomic {
        std::atomic<size_t> value;
        
        PaddedAtomic() : value(0) {}
        explicit PaddedAtomic(size_t val) : value(val) {}
        
        PaddedAtomic(const PaddedAtomic&) = delete;
        PaddedAtomic& operator=(const PaddedAtomic&) = delete;
    };
    
    // Element with sequence number for synchronization
    struct Element {
        std::atomic<size_t> sequence;
        T data;
        
        Element() : sequence(0) {}
    };
    
    std::vector<Element> _buffer;           // Actual data storage
    const size_t _capacity;                 // Fixed buffer capacity
    std::unique_ptr<PaddedAtomic> _readIdx; // Read index (where consumers read from)
    std::unique_ptr<PaddedAtomic> _writeIdx; // Write index (where producers write to)
    
public:
    /**
     * @brief Construct a new Lock Free Ring Buffer
     * 
     * @param capacity Buffer capacity (must be a power of 2)
     */
    explicit LockFreeRingBuffer(size_t capacity) 
        : _buffer(capacity),
          _capacity(capacity),
          _readIdx(std::make_unique<PaddedAtomic>(0)),
          _writeIdx(std::make_unique<PaddedAtomic>(0)) {
        
        // Ensure capacity is a power of 2
        assert((capacity & (capacity - 1)) == 0 && "Capacity must be a power of 2");
        
        // Initialize sequence numbers
        for (size_t i = 0; i < capacity; ++i) {
            _buffer[i].sequence.store(i);
        }
    }
    
    /**
     * @brief Copy constructor (deleted)
     */
    LockFreeRingBuffer(const LockFreeRingBuffer&) = delete;
    
    /**
     * @brief Move constructor
     */
    LockFreeRingBuffer(LockFreeRingBuffer&&) = default;
    
    /**
     * @brief Assignment operator (deleted)
     */
    LockFreeRingBuffer& operator=(const LockFreeRingBuffer&) = delete;
    
    /**
     * @brief Move assignment operator
     */
    LockFreeRingBuffer& operator=(LockFreeRingBuffer&&) = default;
    
    /**
     * @brief Destroy the Lock Free Ring Buffer
     */
    ~LockFreeRingBuffer() = default;
    
    /**
     * @brief Write an element to the buffer
     * 
     * @param value Element to write
     * @return true Always returns true (overwrites oldest data when full)
     */
    bool write(const T& value) {
        // Get the next write position
        const size_t writePos = _writeIdx->value.fetch_add(1) % _capacity;
        
        // Wait until the sequence number matches the position
        size_t expectedSequence = writePos;
        while (_buffer[writePos].sequence.load() != expectedSequence) {
            // If sequence is greater, it means a full cycle has occurred
            if (_buffer[writePos].sequence.load() > expectedSequence) {
                expectedSequence += _capacity;
            }
        }
        
        // Write the data
        _buffer[writePos].data = value;
        
        // Update the sequence to signal that the write is complete
        _buffer[writePos].sequence.store(writePos + _capacity);
        
        return true;
    }
    
    /**
     * @brief Write an element to the buffer (move semantics)
     * 
     * @param value Element to write
     * @return true Always returns true (overwrites oldest data when full)
     */
    bool write(T&& value) {
        // Get the next write position
        const size_t writePos = _writeIdx->value.fetch_add(1) % _capacity;
        
        // Wait until the sequence number matches the position
        size_t expectedSequence = writePos;
        while (_buffer[writePos].sequence.load() != expectedSequence) {
            // If sequence is greater, it means a full cycle has occurred
            if (_buffer[writePos].sequence.load() > expectedSequence) {
                expectedSequence += _capacity;
            }
        }
        
        // Write the data
        _buffer[writePos].data = std::move(value);
        
        // Update the sequence to signal that the write is complete
        _buffer[writePos].sequence.store(writePos + _capacity);
        
        return true;
    }
    
    /**
     * @brief Read the next element from the buffer
     * 
     * @param[out] value Reference to store the read value
     * @return true if successful, false if no data is available
     */
    bool read(T& value) {
        // Get the current read index
        size_t currentReadIdx = _readIdx->value.load();
        
        // Check if there's data available
        if (currentReadIdx >= _writeIdx->value.load()) {
            return false;
        }
        
        // Try to update the read index
        if (!_readIdx->value.compare_exchange_strong(currentReadIdx, currentReadIdx + 1)) {
            return false; // Another thread got there first
        }
        
        // Calculate the read position
        const size_t readPos = currentReadIdx % _capacity;
        
        // Wait until the sequence number indicates the data is ready
        size_t expectedSequence = readPos + _capacity;
        while (_buffer[readPos].sequence.load() < expectedSequence) {
            // Busy wait - data not yet written
        }
        
        // Read the data
        value = _buffer[readPos].data;
        
        // Update the sequence for the next cycle
        _buffer[readPos].sequence.store(readPos + (_capacity * 2));
        
        return true;
    }
    
    /**
     * @brief Read the next element from the buffer using std::optional
     * 
     * @return std::optional<T> Value if read, empty optional if no data is available
     */
    std::optional<T> read() {
        T value;
        if (read(value)) {
            return value;
        }
        return std::nullopt;
    }
    
    /**
     * @brief Get a batch of elements from the buffer
     * 
     * @param[out] values Vector to store the read values
     * @param maxItems Maximum number of items to read
     * @return size_t Number of items actually read
     */
    size_t readBatch(std::vector<T>& values, size_t maxItems) {
        size_t itemsRead = 0;
        values.clear();
        values.reserve(maxItems);
        
        T value;
        while (itemsRead < maxItems && read(value)) {
            values.push_back(value);
            itemsRead++;
        }
        
        return itemsRead;
    }
    
    /**
     * @brief Try to read all available elements from the buffer
     * 
     * @param[out] values Vector to store the read values
     * @return size_t Number of items read
     */
    size_t readAll(std::vector<T>& values) {
        const size_t availableItems = _writeIdx->value.load() - _readIdx->value.load();
        return readBatch(values, availableItems);
    }
    
    /**
     * @brief Get the current size (number of unread items) of the buffer
     * 
     * @return size_t Current size
     */
    size_t size() const {
        const size_t writeIdx = _writeIdx->value.load();
        const size_t readIdx = _readIdx->value.load();
        return writeIdx > readIdx ? writeIdx - readIdx : 0;
    }
    
    /**
     * @brief Get the capacity of the buffer
     * 
     * @return size_t Capacity
     */
    size_t capacity() const {
        return _capacity;
    }
    
    /**
     * @brief Check if the buffer is empty
     * 
     * @return true if empty, false otherwise
     */
    bool isEmpty() const {
        return size() == 0;
    }
    
    /**
     * @brief Check if the buffer is full
     * 
     * @return true if full, false otherwise
     */
    bool isFull() const {
        return size() >= _capacity;
    }
    
    /**
     * @brief Get the current buffer utilization percentage
     * 
     * @return double Percentage of buffer used (0.0 to 100.0)
     */
    double utilization() const {
        return static_cast<double>(size()) / _capacity * 100.0;
    }
    
    /**
     * @brief Reset the buffer, discarding all data
     */
    void reset() {
        // First, set read index to catch up with write index
        _readIdx->value.store(_writeIdx->value.load());
        
        // Then, reset sequence numbers
        for (size_t i = 0; i < _capacity; ++i) {
            _buffer[i].sequence.store(i);
        }
    }
    
    /**
     * @brief Get a historical snapshot of data from the buffer
     * 
     * @param[out] values Vector to store the snapshot
     * @param count Number of items to retrieve (capped at capacity)
     * @return size_t Number of items actually retrieved
     */
    size_t getSnapshot(std::vector<T>& values, size_t count) {
        values.clear();
        const size_t available = size();
        const size_t actualCount = std::min(count, available);
        
        if (actualCount == 0) {
            return 0;
        }
        
        values.reserve(actualCount);
        
        // Calculate the starting read position
        const size_t readIdxVal = _readIdx->value.load();
        const size_t startPos = readIdxVal % _capacity;
        
        // Read the data without advancing the read index
        for (size_t i = 0; i < actualCount; ++i) {
            const size_t pos = (startPos + i) % _capacity;
            values.push_back(_buffer[pos].data);
        }
        
        return actualCount;
    }
    
    /**
     * @brief Get all available data from the buffer without removing it
     * 
     * @param[out] values Vector to store the data
     * @return size_t Number of items retrieved
     */
    size_t getAllData(std::vector<T>& values) {
        return getSnapshot(values, _capacity);
    }
};

} // namespace Simulator
} // namespace PilotTraining
