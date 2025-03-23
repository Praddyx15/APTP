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
                    pixImage = pixCreate(img.width(), img.height(), 32);
                    if (!pixImage) {
                        LOG_WARN("document", "PdfProcessor") << "Failed to create PIX image for OCR";
                        continue;
                    }
                    
                    // Copy RGB data to PIX
                    for (int y = 0; y < img.height(); ++y) {
                        for (int x = 0; x < img.width(); ++x) {
                            uint8_t r = img.data()[y * img.bytes_per_row() + x * 3];
                            uint8_t g = img.data()[y * img.bytes_per_row() + x * 3 + 1];
                            uint8_t b = img.data()[y * img.bytes_per_row() + x * 3 + 2];
                            
                            uint32_t pixel = (0xFF << 24) | (r << 16) | (g << 8) | b;
                            pixSetPixel(pixImage, x, y, pixel);
                        }
                    }
                }
                
                // Perform OCR on the image
                std::string ocrText;
                if (pixImage) {
                    std::lock_guard<std::mutex> lock(tesseractMutex_);
                    tesseract_->SetImage(pixImage);
                    char* text = tesseract_->GetUTF8Text();
                    if (text) {
                        ocrText = text;
                        delete[] text;
                    }
                    tesseract_->Clear();
                    pixDestroy(&pixImage);
                }
                
                pageText = ocrText;
            }
            
            // Append page text to full document text
            if (!pageText.empty()) {
                if (!text.empty()) {
                    text += "\n\n"; // Add page separator
                }
                text += pageText;
            }
        }
        
        return Result<std::string, AptException>::success(text);
    } catch (const std::exception& e) {
        return Result<std::string, AptException>::error(
            AptException(ErrorCode::DOC_PARSING_ERROR, "Error extracting text from PDF: " + std::string(e.what()))
        );
    }
}

// Implementation of extractMetadata
inline Result<void, AptException> PdfProcessor::extractMetadata(
    poppler::document* document,
    ProcessedDocument& result) {
    
    try {
        DocumentMetadata metadata;
        
        // Extract document info
        if (document->has_info()) {
            // Title
            if (document->info_key("Title")) {
                metadata.title = document->info_key("Title")->to_latin1();
            }
            
            // Author
            if (document->info_key("Author")) {
                metadata.author = document->info_key("Author")->to_latin1();
            }
            
            // Creation date
            if (document->info_key("CreationDate")) {
                std::string dateStr = document->info_key("CreationDate")->to_latin1();
                // Parse PDF date format (D:YYYYMMDDHHmmSS)
                if (dateStr.length() >= 16 && dateStr.substr(0, 2) == "D:") {
                    try {
                        std::tm tm = {};
                        tm.tm_year = std::stoi(dateStr.substr(2, 4)) - 1900;
                        tm.tm_mon = std::stoi(dateStr.substr(6, 2)) - 1;
                        tm.tm_mday = std::stoi(dateStr.substr(8, 2));
                        tm.tm_hour = std::stoi(dateStr.substr(10, 2));
                        tm.tm_min = std::stoi(dateStr.substr(12, 2));
                        tm.tm_sec = std::stoi(dateStr.substr(14, 2));
                        
                        auto timePoint = std::chrono::system_clock::from_time_t(std::mktime(&tm));
                        metadata.creationDate = timePoint;
                    } catch (...) {
                        // Ignore date parsing errors
                    }
                }
            }
            
            // Modification date
            if (document->info_key("ModDate")) {
                std::string dateStr = document->info_key("ModDate")->to_latin1();
                // Parse PDF date format
                if (dateStr.length() >= 16 && dateStr.substr(0, 2) == "D:") {
                    try {
                        std::tm tm = {};
                        tm.tm_year = std::stoi(dateStr.substr(2, 4)) - 1900;
                        tm.tm_mon = std::stoi(dateStr.substr(6, 2)) - 1;
                        tm.tm_mday = std::stoi(dateStr.substr(8, 2));
                        tm.tm_hour = std::stoi(dateStr.substr(10, 2));
                        tm.tm_min = std::stoi(dateStr.substr(12, 2));
                        tm.tm_sec = std::stoi(dateStr.substr(14, 2));
                        
                        auto timePoint = std::chrono::system_clock::from_time_t(std::mktime(&tm));
                        metadata.modificationDate = timePoint;
                    } catch (...) {
                        // Ignore date parsing errors
                    }
                }
            }
            
            // Extract custom properties
            for (const std::string& key : document->info_keys()) {
                if (key != "Title" && key != "Author" && key != "CreationDate" && key != "ModDate") {
                    metadata.customProperties[key] = document->info_key(key)->to_latin1();
                }
            }
        }
        
        // If title is empty, try to extract it from the first page
        if (metadata.title.empty() && document->pages() > 0) {
            std::unique_ptr<poppler::page> page(document->create_page(0));
            if (page) {
                std::string firstPageText = page->text().to_latin1();
                
                // Simple heuristic: use the first non-empty line as the title
                std::istringstream iss(firstPageText);
                std::string line;
                while (std::getline(iss, line)) {
                    if (!line.empty()) {
                        metadata.title = line;
                        break;
                    }
                }
            }
        }
        
        // If title is still empty, use the filename
        if (metadata.title.empty()) {
            metadata.title = result.originalFilename;
        }
        
        result.metadata = metadata;
        return Result<void, AptException>::success({});
    } catch (const std::exception& e) {
        return Result<void, AptException>::error(
            AptException(ErrorCode::DOC_PARSING_ERROR, "Error extracting metadata from PDF: " + std::string(e.what()))
        );
    }
}

// Implementation of extractEntities
inline Result<void, AptException> PdfProcessor::extractEntities(
    const std::string& text,
    const ProcessorOptions& options,
    ProcessedDocument& result) {
    
    // This is a placeholder implementation that would typically call a more sophisticated
    // NLP service or library for entity extraction
    
    try {
        // For demonstration, we'll just extract some basic entities using regex patterns
        
        // Helper function to add an entity
        auto addEntity = [&result](const std::string& value, EntityType type, 
                                 size_t startOffset, size_t endOffset,
                                 double confidence = 0.8) {
            Entity entity;
            entity.id = "entity_" + std::to_string(result.entities.size() + 1);
            entity.type = type;
            entity.value = value;
            entity.normalizedValue = value; // In a real impl, we'd normalize this
            entity.span.startOffset = startOffset;
            entity.span.endOffset = endOffset;
            entity.span.text = value;
            entity.confidence = confidence;
            
            result.entities.push_back(entity);
        };
        
        // Example of date extraction
        std::regex datePattern(R"((\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4}))");
        std::sregex_iterator dateIt(text.begin(), text.end(), datePattern);
        std::sregex_iterator dateEnd;
        
        for (; dateIt != dateEnd; ++dateIt) {
            std::smatch match = *dateIt;
            addEntity(match.str(), EntityType::DATE, match.position(), match.position() + match.length());
        }
        
        // In a real implementation, we would extract many more entity types and use
        // more sophisticated NLP techniques
        
        return Result<void, AptException>::success({});
    } catch (const std::exception& e) {
        return Result<void, AptException>::error(
            AptException(ErrorCode::DOC_PARSING_ERROR, "Error extracting entities from PDF: " + std::string(e.what()))
        );
    }
}

// Implementation of extractSections
inline Result<void, AptException> PdfProcessor::extractSections(
    poppler::document* document,
    const std::string& text,
    const ProcessorOptions& options,
    ProcessedDocument& result) {
    
    try {
        // Extract sections from document outline (TOC)
        std::vector<DocumentSection> sections;
        
        // In a real implementation, we would:
        // 1. Extract the document outline/bookmarks
        // 2. Use text analysis to identify section boundaries
        // 3. Build a hierarchy of sections
        
        // For now, let's create a simple example with a placeholder implementation
        DocumentSection rootSection;
        rootSection.id = "section_1";
        rootSection.title = "Document Root";
        rootSection.level = 0;
        rootSection.span.startOffset = 0;
        rootSection.span.endOffset = text.length();
        rootSection.span.text = text;
        
        result.sections.push_back(rootSection);
        
        return Result<void, AptException>::success({});
    } catch (const std::exception& e) {
        return Result<void, AptException>::error(
            AptException(ErrorCode::DOC_PARSING_ERROR, "Error extracting sections from PDF: " + std::string(e.what()))
        );
    }
}

// Implementation of extractTables
inline Result<void, AptException> PdfProcessor::extractTables(
    poppler::document* document,
    const ProcessorOptions& options,
    ProcessedDocument& result) {
    
    try {
        // In a real implementation, we would use specialized table extraction algorithms
        // to identify and extract tables from the PDF
        
        // This is a placeholder implementation
        return Result<void, AptException>::success({});
    } catch (const std::exception& e) {
        return Result<void, AptException>::error(
            AptException(ErrorCode::DOC_PARSING_ERROR, "Error extracting tables from PDF: " + std::string(e.what()))
        );
    }
}

// Implementation of extractImages
inline Result<void, AptException> PdfProcessor::extractImages(
    poppler::document* document,
    const ProcessorOptions& options,
    ProcessedDocument& result) {
    
    try {
        // In a real implementation, we would extract images from the PDF
        
        // This is a placeholder implementation
        return Result<void, AptException>::success({});
    } catch (const std::exception& e) {
        return Result<void, AptException>::error(
            AptException(ErrorCode::DOC_PARSING_ERROR, "Error extracting images from PDF: " + std::string(e.what()))
        );
    }
}

// Implementation of identifyRegulations
inline Result<void, AptException> PdfProcessor::identifyRegulations(
    const std::string& text,
    const ProcessorOptions& options,
    ProcessedDocument& result) {
    
    try {
        // Simple regex patterns to detect common regulatory references
        // In a real implementation, this would be much more sophisticated
        
        // FAA regulations (e.g., 14 CFR Part 91, FAR 121.333)
        std::regex faaPattern(R"((?:14\s*CFR\s*(?:Part\s*)?|FAR\s*)(\d+)(?:\.(\d+))?)");
        std::sregex_iterator faaIt(text.begin(), text.end(), faaPattern);
        std::sregex_iterator faaEnd;
        
        for (; faaIt != faaEnd; ++faaIt) {
            std::smatch match = *faaIt;
            
            RegulatoryReference ref;
            ref.id = "reg_" + std::to_string(result.regulatoryReferences.size() + 1);
            ref.authority = "FAA";
            ref.document = "14 CFR Part " + match[1].str();
            if (match[2].matched) {
                ref.section = match[2].str();
            }
            ref.text = match.str();
            
            result.regulatoryReferences.push_back(ref);
        }
        
        // EASA regulations (e.g., CS-25, AMC 25.1309)
        std::regex easaPattern(R"((?:CS|AMC|GM)-(\d+)(?:\.(\d+))?)");
        std::sregex_iterator easaIt(text.begin(), text.end(), easaPattern);
        std::sregex_iterator easaEnd;
        
        for (; easaIt != easaEnd; ++easaIt) {
            std::smatch match = *easaIt;
            
            RegulatoryReference ref;
            ref.id = "reg_" + std::to_string(result.regulatoryReferences.size() + 1);
            ref.authority = "EASA";
            ref.document = "CS-" + match[1].str();
            if (match[2].matched) {
                ref.section = match[2].str();
            }
            ref.text = match.str();
            
            result.regulatoryReferences.push_back(ref);
        }
        
        // ICAO regulations (e.g., ICAO Annex 6, ICAO Doc 9859)
        std::regex icaoPattern(R"(ICAO\s+(?:Annex|Doc)\s+(\d+))");
        std::sregex_iterator icaoIt(text.begin(), text.end(), icaoPattern);
        std::sregex_iterator icaoEnd;
        
        for (; icaoIt != icaoEnd; ++icaoIt) {
            std::smatch match = *icaoIt;
            
            RegulatoryReference ref;
            ref.id = "reg_" + std::to_string(result.regulatoryReferences.size() + 1);
            ref.authority = "ICAO";
            ref.document = match.str();
            ref.text = match.str();
            
            result.regulatoryReferences.push_back(ref);
        }
        
        return Result<void, AptException>::success({});
    } catch (const std::exception& e) {
        return Result<void, AptException>::error(
            AptException(ErrorCode::DOC_PARSING_ERROR, "Error identifying regulations in PDF: " + std::string(e.what()))
        );
    }
}

// Implementation of performOcr
inline Result<std::string, AptException> PdfProcessor::performOcr(
    poppler::document* document,
    const ProcessorOptions& options) {
    
    try {
        // In a real implementation, we would render each page and perform OCR
        
        // This is just a placeholder
        return Result<std::string, AptException>::success("");
    } catch (const std::exception& e) {
        return Result<std::string, AptException>::error(
            AptException(ErrorCode::DOC_PARSING_ERROR, "Error performing OCR on PDF: " + std::string(e.what()))
        );
    }
}