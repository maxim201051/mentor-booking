import { handleUploadMentors } from "../../src/handlers/upload-mentors";
import { UploadService } from "../../src/services/upload-service";

describe("handleUploadMentors Tests", () => {
    let mockUploadService: jest.Mocked<UploadService>;

    beforeEach(() => {
        // Mocking UploadService
        mockUploadService = {
            uploadMentorsImport: jest.fn(), 
        } as unknown as jest.Mocked<UploadService>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const validMultipartEvent = {
        body: "mock-body-data",
        multiValueHeaders: {
            "Content-Type": ["multipart/form-data; boundary=mock-boundary"],
        },
    };

    const eventWithMissingContentType = {
        body: "mock-body-data",
        multiValueHeaders: {
            // No Content-Type header
        },
    };

    const eventWithMissingBoundary = {
        body: "mock-body-data",
        multiValueHeaders: {
            "Content-Type": ["multipart/form-data"], 
        },
    };

    test("handleUploadMentors should successfully upload mentors with valid multipart data", async () => {
        mockUploadService.uploadMentorsImport.mockResolvedValueOnce();

        const result = await handleUploadMentors(validMultipartEvent, {
            uploadService: mockUploadService,
        });

        expect(result).toEqual({
            statusCode: 200,
            body: JSON.stringify({
                message: "Mentors import file was successfully uploaded",
            }),
        });

        expect(mockUploadService.uploadMentorsImport).toHaveBeenCalledWith("mock-body-data", "mock-boundary");
    });

    test("handleUploadMentors should return 500 when 'Content-Type' header is missing", async () => {
        const result = await handleUploadMentors(eventWithMissingContentType, {
            uploadService: mockUploadService,
        });
        expect(result).toEqual({
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        });

        expect(mockUploadService.uploadMentorsImport).not.toHaveBeenCalled();
    });

    test("handleUploadMentors should return 500 when boundary is missing in 'Content-Type' header", async () => {
        const result = await handleUploadMentors(eventWithMissingBoundary, {
            uploadService: mockUploadService,
        });
        expect(result).toEqual({
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        });

        expect(mockUploadService.uploadMentorsImport).not.toHaveBeenCalled();
    });

    test("handleUploadMentors should return 500 on unexpected errors during mentor upload", async () => {
        const simulatedError = new Error("Simulated upload error");
        mockUploadService.uploadMentorsImport.mockRejectedValueOnce(simulatedError);

        const result = await handleUploadMentors(validMultipartEvent, {
            uploadService: mockUploadService,
        });

        expect(result).toEqual({
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        });

        expect(mockUploadService.uploadMentorsImport).toHaveBeenCalledWith("mock-body-data", "mock-boundary");
    });
});