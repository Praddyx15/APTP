#pragma once

#include "document-processor-interface.hpp"
#include "../core/logging-system.hpp"

#include <mutex>
#include <thread>
#include <poppler/cpp/poppler-document.h>
#include <poppler/cpp/poppler-page.h>
#include <poppler/cpp/poppler-page-renderer.h>
#include <tesseract/baseapi.h>
#include <leptonica/allheaders.h>

namespace apt {
namespace document {

/**
 * PDF Document Processor implementation using Poppler and Tesseract
 */
class PdfProcessor : public DocumentProcessor {
public:
    PdfProcessor();
    ~PdfProcessor() override;
    
    std::future<Result<ProcessedDocument, AptException>> processFile(
        const std::filesystem::path& filePath,
        const ProcessorOptions& options = {}) override;
    
    std::future<Result<ProcessedDocument, AptException>> processData(
        const std::vector<uint8_t>& data,
        const std::string& filename,
        const ProcessorOptions& options = {}) override;
    
    bool canProcess(DocumentType type) const override {
        return type == DocumentType::PDF;
    }
    
private:
    Result<ProcessedDocument, AptException> processPdfDocument(
        std::unique_ptr<poppler::document> pdfDocument,
        const std::string& filename,
        const ProcessorOptions& options);
    
    Result<std::string, AptException> extractText(
        poppler::document* document,
        const ProcessorOptions& options,
        ProcessedDocument& result);
    
    Result<void, AptException> extractMetadata(
        poppler::document* document,
        ProcessedDocument& result);
    
    Result<void, AptException> extractEntities(
        const std::string& text,
        const ProcessorOptions& options,
        ProcessedDocument& result);
    
    Result<void, AptException> extractSections(
        poppler::document* document,
        const std::string& text,
        const ProcessorOptions& options,
        ProcessedDocument& result);
    
    Result<void, AptException> extractTables(
        poppler::document* document,
        const ProcessorOptions& options,
        ProcessedDocument& result);
    
    Result<void, AptException> extractImages(
        poppler::document* document,
        const ProcessorOptions& options,
        ProcessedDocument& result);
    
    Result<void, AptException> identifyRegulations(
        const std::string& text,
        const ProcessorOptions& options,
        ProcessedDocument& result);
    
    Result<std::string, AptException> performOcr(
        poppler::document* document,
        const ProcessorOptions& options);
    
    // Tesseract OCR instance (thread-safe usage with mutex)
    std::unique_ptr<tesseract::TessBaseAPI> tesseract_;
    std::mutex tesseractMutex_;
};

// Constructor
inline PdfProcessor::PdfProcessor() {
    // Initialize Tesseract OCR
    tesseract_ = std::make_unique<tesseract::TessBaseAPI>();
    
    // Initialize with English language
    if (tesseract_->Init(nullptr, "eng")) {
        LOG_ERROR("document", "PdfProcessor") << "Could not initialize Tesseract";
        throw AptException(ErrorCode::DOC_PARSING_ERROR, "Failed to initialize Tesseract OCR");
    }
    
    // Set page segmentation mode
    tesseract_->SetPageSegMode(tesseract::PSM_AUTO);
    
    // Register this processor with the factory
    DocumentProcessorFactory::registerProcessor(std::make_shared<PdfProcessor>(*this));
}

// Destructor
inline PdfProcessor::~PdfProcessor() {
    // Clean up Tesseract
    if (tesseract_) {
        tesseract_->End();
    }
}

// Implementation of processFile
inline std::future<Result<ProcessedDocument, AptException>> PdfProcessor::processFile(
    const std::filesystem::path& filePath,
    const ProcessorOptions& options) {
    
    return std::async(std::launch::async, [this, filePath, options]() -> Result<ProcessedDocument, AptException> {
        try {
            // Check if file exists
            if (!std::filesystem::exists(filePath)) {
                return Result<ProcessedDocument, AptException>::error(
                    AptException(ErrorCode::DOC_IO_ERROR, "File does not exist: " + filePath.string())
                );
            }
            
            // Open PDF document
            std::unique_ptr<poppler::document> document(poppler::document::load_from_file(filePath.string()));
            
            if (!document) {
                return Result<ProcessedDocument, AptException>::error(
                    AptException(ErrorCode::DOC_PARSING_ERROR, "Failed to open PDF document: " + filePath.string())
                );
            }
            
            return processPdfDocument(std::move(document), filePath.filename().string(), options);
        } catch (const std::exception& e) {
            return Result<ProcessedDocument, AptException>::error(
                AptException(ErrorCode::DOC_PARSING_ERROR, "Error processing PDF file: " + std::string(e.what()))
            );
        }
    });
}

// Implementation of processData
inline std::future<Result<ProcessedDocument, AptException>> PdfProcessor::processData(
    const std::vector<uint8_t>& data,
    const std::string& filename,
    const ProcessorOptions& options) {
    
    return std::async(std::launch::async, [this, data, filename, options]() -> Result<ProcessedDocument, AptException> {
        try {
            // Create a temporary file to store the data
            std::filesystem::path tempDir = std::filesystem::temp_directory_path();
            std::filesystem::path tempFile = tempDir / std::filesystem::path(filename);
            
            // Write data to temporary file
            std::ofstream file(tempFile, std::ios::binary);
            if (!file.is_open()) {
                return Result<ProcessedDocument, AptException>::error(
                    AptException(ErrorCode::DOC_IO_ERROR, "Failed to create temporary file: " + tempFile.string())
                );
            }
            file.write(reinterpret_cast<const char*>(data.data()), data.size());
            file.close();
            
            // Create a unique pointer with custom deleter to ensure temp file cleanup
            auto pdfDocument = std::unique_ptr<poppler::document>(
                poppler::document::load_from_file(tempFile.string()),
                [tempFile](poppler::document* doc) {
                    delete doc;
                    std::filesystem::remove(tempFile);
                }
            );
            
            if (!pdfDocument) {
                std::filesystem::remove(tempFile);
                return Result<ProcessedDocument, AptException>::error(
                    AptException(ErrorCode::DOC_PARSING_ERROR, "Failed to open PDF document from memory")
                );
            }
            
            return processPdfDocument(std::move(pdfDocument), filename, options);
        } catch (const std::exception& e) {
            return Result<ProcessedDocument, AptException>::error(
                AptException(ErrorCode::DOC_PARSING_ERROR, "Error processing PDF data: " + std::string(e.what()))
            );
        }
    });
}

// Implementation of processPdfDocument
inline Result<ProcessedDocument, AptException> PdfProcessor::processPdfDocument(
    std::unique_ptr<poppler::document> pdfDocument,
    const std::string& filename,
    const ProcessorOptions& options) {
    
    ProcessedDocument result;
    result.id = "doc_" + std::to_string(std::chrono::system_clock::now().time_since_epoch().count());
    result.originalFilename = filename;
    result.documentType = DocumentType::PDF;
    result.status = ProcessingStatus::PROCESSING;
    result.progress = 0.0f;
    result.startTime = std::chrono::system_clock::now();
    result.uploadTime = result.startTime;
    
    try {
        // Update progress callback
        if (options.progressCallback) {
            options.progressCallback(0.0f, "Starting PDF processing");
        }
        
        // Extract metadata
        auto metadataResult = extractMetadata(pdfDocument.get(), result);
        if (metadataResult.isError()) {
            return Result<ProcessedDocument, AptException>::error(metadataResult.error());
        }
        
        result.progress = 0.1f;
        if (options.progressCallback) {
            options.progressCallback(result.progress, "Metadata extracted");
        }
        
        // Extract text (or perform OCR if needed)
        std::string text;
        if (options.extractText) {
            auto textResult = extractText(pdfDocument.get(), options, result);
            if (textResult.isError()) {
                return Result<ProcessedDocument, AptException>::error(textResult.error());
            }
            text = textResult.value();
            result.textContent = text;
        }
        
        result.progress = 0.3f;
        if (options.progressCallback) {
            options.progressCallback(result.progress, "Text extraction completed");
        }
        
        // Extract entities if requested
        if (options.extractEntities && !text.empty()) {
            auto entitiesResult = extractEntities(text, options, result);
            if (entitiesResult.isError()) {
                return Result<ProcessedDocument, AptException>::error(entitiesResult.error());
            }
        }
        
        result.progress = 0.5f;
        if (options.progressCallback) {
            options.progressCallback(result.progress, "Entity extraction completed");
        }
        
        // Extract sections if requested
        if (options.extractSections && !text.empty()) {
            auto sectionsResult = extractSections(pdfDocument.get(), text, options, result);
            if (sectionsResult.isError()) {
                return Result<ProcessedDocument, AptException>::error(sectionsResult.error());
            }
        }
        
        result.progress = 0.6f;
        if (options.progressCallback) {
            options.progressCallback(result.progress, "Section extraction completed");
        }
        
        // Extract tables if requested
        if (options.extractTables) {
            auto tablesResult = extractTables(pdfDocument.get(), options, result);
            if (tablesResult.isError()) {
                return Result<ProcessedDocument, AptException>::error(tablesResult.error());
            }
        }
        
        result.progress = 0.7f;
        if (options.progressCallback) {
            options.progressCallback(result.progress, "Table extraction completed");
        }
        
        // Extract images if requested
        if (options.extractImages) {
            auto imagesResult = extractImages(pdfDocument.get(), options, result);
            if (imagesResult.isError()) {
                return Result<ProcessedDocument, AptException>::error(imagesResult.error());
            }
        }
        
        result.progress = 0.8f;
        if (options.progressCallback) {
            options.progressCallback(result.progress, "Image extraction completed");
        }
        
        // Identify regulations if requested
        if (options.identifyRegulations && !text.empty()) {
            auto regulationsResult = identifyRegulations(text, options, result);
            if (regulationsResult.isError()) {
                return Result<ProcessedDocument, AptException>::error(regulationsResult.error());
            }
        }
        
        result.progress = 0.9f;
        if (options.progressCallback) {
            options.progressCallback(result.progress, "Regulation identification completed");
        }
        
        // Set status to completed
        result.status = ProcessingStatus::COMPLETED;
        result.progress = 1.0f;
        result.endTime = std::chrono::system_clock::now();
        
        if (options.progressCallback) {
            options.progressCallback(1.0f, "PDF processing completed");
        }
        
        return Result<ProcessedDocument, AptException>::success(result);
    } catch (const std::exception& e) {
        result.status = ProcessingStatus::FAILED;
        result.errorMessage = e.what();
        result.endTime = std::chrono::system_clock::now();
        
        return Result<ProcessedDocument, AptException>::error(
            AptException(ErrorCode::DOC_PARSING_ERROR, "Error processing PDF document: " + std::string(e.what()))
        );
    }
}

// Implementation of extractText
inline Result<std::string, AptException> PdfProcessor::extractText(
    poppler::document* document,
    const ProcessorOptions& options,
    ProcessedDocument& result) {
    
    try {
        std::string text;
        int numPages = document->pages();
        
        // Extract text from each page
        for (int i = 0; i < numPages; ++i) {
            // Update progress
            if (options.progressCallback) {
                float progress = 0.1f + (0.2f * static_cast<float>(i) / numPages);
                options.progressCallback(progress, "Extracting text: page " + std::to_string(i + 1) + " of " + std::to_string(numPages));
            }
            
            std::unique_ptr<poppler::page> page(document->create_page(i));
            if (!page) {
                continue;
            }
            
            // Extract text from page
            std::string pageText = page->text().to_latin1();
            
            // If page text is empty and OCR is enabled, perform OCR on the page
            if (pageText.empty() && options.performOcr) {
                // Render the page to an image
                poppler::page_renderer renderer;
                renderer.set_render_hint(poppler::page_renderer::antialiasing, true);
                renderer.set_render_hint(poppler::page_renderer::text_antialiasing, true);
                
                // Render at 300 DPI
                poppler::image img = renderer.render_page(page.get(), 300, 300);
                
                if (!img.is_valid()) {
                    LOG_WARN("document", "PdfProcessor") << "Failed to render page " << i << " for OCR";
                    continue;
                }
                
                // Convert poppler image to format usable by Tesseract
                Pix* pixImage = nullptr;
                
                if (img.format() == poppler::image::format_rgb24) {
                    // Create a 32-bit PIX with the RGB data (no alpha)
                    pixImage = pixCreate(img