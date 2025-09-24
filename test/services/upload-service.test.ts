import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { parse } from "parse-multipart-data";
import { UploadService } from "../../src/services/upload-service";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BookingEntity } from "../../src/entities/booking-entity";

jest.mock("@aws-sdk/client-s3", () => {
    const actual = jest.requireActual("@aws-sdk/client-s3"); 
    return {
        ...actual, 
        S3Client: jest.fn(() => ({
            send: jest.fn(),
        })),
        PutObjectCommand: actual.PutObjectCommand, 
        GetObjectCommand: actual.GetObjectCommand, 
    };
});

jest.mock("parse-multipart-data", () => ({
    parse: jest.fn(),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: jest.fn(),
}));

describe("UploadService Tests", () => {
    let mockS3Client: jest.Mocked<S3Client>;
    let uploadService: UploadService;
    const importExportBucketName = "import-export-bucket";

    beforeEach(() => {
        mockS3Client = new S3Client({}) as jest.Mocked<S3Client>;
        uploadService = new UploadService(importExportBucketName, mockS3Client);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("uploadMentorsImport should upload parsed multipart data to S3", async () => {
        const body = "body data";
        const boundary = "boundary";
        const parsedParts = [{ data: Buffer.from("mentor1,data"), filename: "mentors.csv" }];

        (parse as jest.Mock).mockReturnValue(parsedParts);

        (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

        await uploadService.uploadMentorsImport(body, boundary);

        expect(parse).toHaveBeenCalledWith(Buffer.from(body), boundary);

        expect(mockS3Client.send).toHaveBeenCalledWith(
            expect.objectContaining({
                input: {
                    Bucket: importExportBucketName,
                    Key: expect.stringMatching(/^mentors-import\/\d+\/mentors.csv$/),
                    Body: "mentor1,data",
                    ContentType: "text/csv",
                },
            }),
        );
    });

    test("uploadMentorsImport should throw an error if upload fails", async () => {
        const body = "body data";
        const boundary = "boundary";
        const parsedParts = [{ data: Buffer.from("mentor1,data"), filename: "mentors.csv" }];

        (parse as jest.Mock).mockReturnValue(parsedParts);

        const errorMessage = "S3 upload failed";
        (mockS3Client.send as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

        await expect(uploadService.uploadMentorsImport(body, boundary)).rejects.toThrow(
            `Failed to upload mentors import with key mentors-import`
        );
    });

    test("getMentorsImport should fetch the object from S3", async () => {
        const key = "mentors-import/123/mentors.csv";
        const mockBody = Buffer.from("mentor1,data");

        (mockS3Client.send as jest.Mock).mockResolvedValueOnce({
            Body: mockBody,
        });

        const result = await uploadService.getMentorsImport(key);

        expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(GetObjectCommand));
        expect(mockS3Client.send).toHaveBeenCalledWith(
            expect.objectContaining({
                input: {
                    Bucket: importExportBucketName,
                    Key: key,
                },
            }),
        );

        expect(result).toEqual(mockBody);
    });

    test("getMentorsImport should return null if `Body` is empty", async () => {
        const key = "mentors-import/123/mentors.csv";

        (mockS3Client.send as jest.Mock).mockResolvedValueOnce({
            Body: null,
        });

        const result = await uploadService.getMentorsImport(key);

        expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(GetObjectCommand));
        expect(result).toBeNull();
    });

    test("getMentorsImport should throw an error if fetch fails", async () => {
        const key = "mentors-import/123/mentors.csv";
        (mockS3Client.send as jest.Mock).mockRejectedValueOnce(new Error("S3 fetch error"));

        await expect(uploadService.getMentorsImport(key)).rejects.toThrow(`Failed to get mentors import for key ${key}`);
    });

    test("uploadBookingsExport should upload CSV data and return a presigned URL", async () => {
        const bookings: BookingEntity[] = [
            {
                id: "b1",
                mentorId: "m1",
                studentId: "s1",
                timeslotId: "t1",
                status: "confirmed",
            },
            {
                id: "b2",
                mentorId: "m2",
                studentId: "s2",
                timeslotId: "t2",
                status: "completed",
            },
        ];

        const presignedUrl = "https://example.com/bookings.csv";

        (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});
        (getSignedUrl as jest.Mock).mockResolvedValueOnce(presignedUrl);

        const result = await uploadService.uploadBookingsExport(bookings);

        expect(mockS3Client.send).toHaveBeenCalledWith(
            expect.objectContaining({
                input: {
                    Bucket: importExportBucketName,
                    Key: expect.stringMatching(/^booking-exports\/\d+\/bookings.csv$/),
                    Body: "id|mentorId|studentId|timeslotId|status\nb1|m1|s1|t1|confirmed\nb2|m2|s2|t2|completed",
                    ContentType: "text/csv",
                },
            }),
        );

        expect(getSignedUrl).toHaveBeenCalledWith(
            mockS3Client,
            expect.any(GetObjectCommand),
            { expiresIn: 3600 }
        );

        expect(result).toEqual(presignedUrl);
    });

    test("uploadBookingsExport should throw an error if upload fails", async () => {
        const bookings: BookingEntity[] = [
            {
                id: "b1",
                mentorId: "m1",
                studentId: "s1",
                timeslotId: "t1",
                status: "confirmed",
            },
        ];

        (mockS3Client.send as jest.Mock).mockRejectedValueOnce(new Error("S3 upload error"));

        await expect(uploadService.uploadBookingsExport(bookings)).rejects.toThrow(
            `Failed to upload bookings export with key booking-exports`
        );
    });

    test("uploadBookingsExport should throw an error if presigned URL generation fails", async () => {
        const bookings: BookingEntity[] = [
            {
                id: "b1",
                mentorId: "m1",
                studentId: "s1",
                timeslotId: "t1",
                status: "confirmed",
            },
        ];

        (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});
        (getSignedUrl as jest.Mock).mockRejectedValueOnce(new Error("Presigned URL error"));

        await expect(uploadService.uploadBookingsExport(bookings)).rejects.toThrow(
            `Failed to upload bookings export with key booking-exports`
        );
    });
});