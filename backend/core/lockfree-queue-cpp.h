// src/backend/simulator/LockFreeQueue.h
#pragma once

#include <atomic>
#include <memory>
#include <optional>

namespace PilotTraining {
namespace Simulator {

/**
 * @brief A lock-free queue implementation using a linked list
 * 
 * This queue supports multiple producers and multiple consumers
 * with no locks, providing high throughput for high-frequency data
 * processing. It uses atomic operations to ensure thread safety.
 * 
 * @tparam T Type of elements in the queue
 */
template<typename T>
class LockFreeQueue {
private:
    struct Node {
        std::shared_ptr<T> data;
        std::atomic<Node*> next;
        
        Node() : next(nullptr) {}
        
        explicit Node(const T& value) : data(std::make_shared<T>(value)), next(nullptr) {}
        explicit Node(T&& value) : data(std::make_shared<T>(std::move(value))), next(nullptr) {}
    };
    
    std::atomic<Node*> _head;
    std::atomic<Node*> _tail;
    std::atomic<size_t> _size;
    std::atomic<size_t> _capacity;
    std::atomic<size_t> _enqueueCount;
    std::atomic<size_t> _dequeueCount;

public:
    /**
     * @brief Construct a new Lock Free Queue
     * 
     * @param capacity Maximum capacity of the queue (0 for unlimited)
     */
    explicit LockFreeQueue(size_t capacity = 0) 
        : _size(0), _capacity(capacity), _enqueueCount(0), _dequeueCount(0) {
        // Create a dummy node as the initial head/tail
        Node* dummy = new Node();
        _head.store(dummy);
        _tail.store(dummy);
    }
    
    /**
     * @brief Destroy the Lock Free Queue
     */
    ~LockFreeQueue() {
        // Clean up all remaining nodes
        T value;
        while (dequeue(value)) {}
        
        // Clean up the dummy node
        Node* dummy = _head.load();
        delete dummy;
    }
    
    /**
     * @brief Add an element to the queue
     * 
     * @param value Value to add
     * @return true if successful, false if the queue is full
     */
    bool enqueue(const T& value) {
        // Check capacity limit if set
        if (_capacity.load() > 0) {
            if (_size.load() >= _capacity.load()) {
                return false;
            }
        }
        
        // Create a new node with the value
        Node* newNode = new Node(value);
        
        // Keep trying until the node is successfully added
        while (true) {
            Node* currentTail = _tail.load();
            Node* nextNode = currentTail->next.load();
            
            // Check if tail is still valid
            if (currentTail == _tail.load()) {
                // If the next node is null, try to add the new node
                if (nextNode == nullptr) {
                    // Try to set the next pointer of the current tail to the new node
                    if (currentTail->next.compare_exchange_weak(nextNode, newNode)) {
                        // Successfully added, try to move the tail to the new node
                        _tail.compare_exchange_strong(currentTail, newNode);
                        _size.fetch_add(1);
                        _enqueueCount.fetch_add(1);
                        return true;
                    }
                } else {
                    // Tail was not pointing to the end, try to move it forward
                    _tail.compare_exchange_strong(currentTail, nextNode);
                }
            }
        }
    }
    
    /**
     * @brief Add an element to the queue (move semantics)
     * 
     * @param value Value to add
     * @return true if successful, false if the queue is full
     */
    bool enqueue(T&& value) {
        // Check capacity limit if set
        if (_capacity.load() > 0) {
            if (_size.load() >= _capacity.load()) {
                return false;
            }
        }
        
        // Create a new node with the value
        Node* newNode = new Node(std::move(value));
        
        // Keep trying until the node is successfully added
        while (true) {
            Node* currentTail = _tail.load();
            Node* nextNode = currentTail->next.load();
            
            // Check if tail is still valid
            if (currentTail == _tail.load()) {
                // If the next node is null, try to add the new node
                if (nextNode == nullptr) {
                    // Try to set the next pointer of the current tail to the new node
                    if (currentTail->next.compare_exchange_weak(nextNode, newNode)) {
                        // Successfully added, try to move the tail to the new node
                        _tail.compare_exchange_strong(currentTail, newNode);
                        _size.fetch_add(1);
                        _enqueueCount.fetch_add(1);
                        return true;
                    }
                } else {
                    // Tail was not pointing to the end, try to move it forward
                    _tail.compare_exchange_strong(currentTail, nextNode);
                }
            }
        }
    }
    
    /**
     * @brief Remove and return an element from the queue
     * 
     * @param[out] value Reference to store the dequeued value
     * @return true if successful, false if the queue is empty
     */
    bool dequeue(T& value) {
        while (true) {
            Node* currentHead = _head.load();
            Node* currentTail = _tail.load();
            Node* nextNode = currentHead->next.load();
            
            // Check if head is still valid
            if (currentHead == _head.load()) {
                // If head and tail are the same, the queue might be empty
                if (currentHead == currentTail) {
                    // If next is null, the queue is empty
                    if (nextNode == nullptr) {
                        return false;
                    }
                    
                    // Tail is falling behind, try to move it forward
                    _tail.compare_exchange_strong(currentTail, nextNode);
                } else {
                    // Try to get the value from the next node
                    if (nextNode->data) {
                        value = *nextNode->data;
                        
                        // Try to move the head to the next node
                        if (_head.compare_exchange_weak(currentHead, nextNode)) {
                            _size.fetch_sub(1);
                            _dequeueCount.fetch_add(1);
                            delete currentHead;
                            return true;
                        }
                    } else {
                        // If we're here, we're dealing with a dummy node
                        // Try to move the head to the next node
                        if (_head.compare_exchange_weak(currentHead, nextNode)) {
                            delete currentHead;
                            continue;
                        }
                    }
                }
            }
        }
    }
    
    /**
     * @brief Remove and return an element from the queue using std::optional
     * 
     * @return std::optional<T> Value if dequeued, empty optional if queue is empty
     */
    std::optional<T> dequeue() {
        T value;
        if (dequeue(value)) {
            return value;
        }
        return std::nullopt;
    }
    
    /**
     * @brief Try to peek at the front element without removing it
     * 
     * Note: This is not guaranteed to be accurate in a multi-consumer scenario
     * 
     * @param[out] value Reference to store the front value
     * @return true if successful, false if the queue is empty
     */
    bool peek(T& value) const {
        Node* currentHead = _head.load();
        Node* nextNode = currentHead->next.load();
        
        // If next is null, the queue is empty
        if (nextNode == nullptr) {
            return false;
        }
        
        // Try to get the value from the next node
        if (nextNode->data) {
            value = *nextNode->data;
            return true;
        }
        
        return false;
    }
    
    /**
     * @brief Check if the queue is empty
     * 
     * @return true if empty, false otherwise
     */
    bool isEmpty() const {
        return _size.load() == 0;
    }
    
    /**
     * @brief Get the current size of the queue
     * 
     * @return size_t Current size
     */
    size_t size() const {
        return _size.load();
    }
    
    /**
     * @brief Get the capacity of the queue
     * 
     * @return size_t Capacity (0 for unlimited)
     */
    size_t capacity() const {
        return _capacity.load();
    }
    
    /**
     * @brief Set the capacity of the queue
     * 
     * @param capacity New capacity (0 for unlimited)
     */
    void setCapacity(size_t capacity) {
        _capacity.store(capacity);
    }
    
    /**
     * @brief Get the total number of enqueue operations
     * 
     * @return size_t Enqueue count
     */
    size_t getEnqueueCount() const {
        return _enqueueCount.load();
    }
    
    /**
     * @brief Get the total number of dequeue operations
     * 
     * @return size_t Dequeue count
     */
    size_t getDequeueCount() const {
        return _dequeueCount.load();
    }
    
    /**
     * @brief Clear all elements from the queue
     */
    void clear() {
        T value;
        while (dequeue(value)) {}
    }
};

} // namespace Simulator
} // namespace PilotTraining
